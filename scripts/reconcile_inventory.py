"""Read-only dry run: compare physical stock, account cache and posted GL per company."""
import json
import sqlite3
from contextlib import closing
from pathlib import Path


def inspect(db_file):
    with closing(sqlite3.connect(db_file.resolve().as_uri() + "?mode=ro", uri=True)) as db:
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA query_only = ON")
        db.execute("BEGIN")
        stock = [dict(row) for row in db.execute("""
            SELECT s.locationCode, s.productSku, s.onHand, p.standardCost,
                   s.onHand * p.standardCost AS valuation
            FROM StockLevel s JOIN ProductVariant p ON p.sku = s.productSku
            ORDER BY s.locationCode, s.productSku
        """)]
        accounts = [dict(row) for row in db.execute("""
            SELECT a.code, a.openingBalance, a.currentBalance,
                   COALESCE(posted.balance, 0) AS postedBalance
            FROM Account a LEFT JOIN (
                SELECT i.accountCode, SUM(i.debit - i.credit) AS balance
                FROM JournalItem i JOIN JournalEntry j ON j.id = i.journalEntryId
                WHERE j.state = 'POSTED' GROUP BY i.accountCode
            ) posted ON posted.accountCode = a.code
            WHERE a.code = '1030'
        """)]
        sources = {
            name: [dict(row) for row in db.execute(sql)]
            for name, sql in {
                'openingJournal': """
                    SELECT entryNumber,sourceDocument,state FROM JournalEntry WHERE isOpening=1 ORDER BY entryNumber
                """,
                'inventoryPostings': """
                    SELECT j.entryNumber,j.sourceDocument,j.documentRef,
                           SUM(CASE WHEN i.accountCode='1030' THEN i.debit-i.credit ELSE 0 END) inventoryDelta,
                           SUM(CASE WHEN i.accountCode='5010' THEN i.debit-i.credit ELSE 0 END) costOfGoodsDelta
                    FROM JournalEntry j JOIN JournalItem i ON i.journalEntryId=j.id
                    WHERE j.state='POSTED' AND i.accountCode IN ('1030','5010')
                    GROUP BY j.id ORDER BY j.entryNumber
                """,
                'movements': """
                    SELECT moveNumber,documentType,documentRef,state,reason,productSku,
                           sourceLocation,destLocation,quantity,totalValue FROM StockMove ORDER BY moveNumber
                """,
                'receipts': """
                    SELECT r.receiptNumber,p.poNumber,r.status,r.destLocation,
                           SUM(l.acceptedQty) accepted,SUM(l.rejectedQty) rejected
                    FROM GoodsReceipt r JOIN PurchaseOrder p ON r.purchaseOrderId=p.id
                    LEFT JOIN GoodsReceiptLine l ON l.receiptId=r.id GROUP BY r.id ORDER BY r.receiptNumber
                """,
                'deliveries': """
                    SELECT d.deliveryNumber,s.orderNumber,d.status,d.sourceLocation,SUM(l.deliveredQty) delivered
                    FROM DeliveryOrder d JOIN SalesOrder s ON d.salesOrderId=s.id
                    LEFT JOIN DeliveryOrderLine l ON l.deliveryOrderId=d.id GROUP BY d.id ORDER BY d.deliveryNumber
                """,
                'returns': """
                    SELECT r.returnNumber,r.status,r.inspectionStatus,i.invoiceNumber,c.creditNoteNumber
                    FROM ReturnRequest r JOIN CustomerInvoice i ON r.invoiceId=i.id
                    LEFT JOIN CreditNote c ON c.returnRequestId=r.id ORDER BY r.returnNumber
                """,
            }.items()
        }
        journals = db.execute("SELECT COUNT(*) FROM JournalEntry WHERE state='POSTED'").fetchone()[0]
        value = sum(line["valuation"] for line in stock)
        account = accounts[0] if accounts else None
        stored = account["currentBalance"] if account else None
        posted = account["postedBalance"] if account else None
        matched = value == stored == posted
        explanation = "Valuasi fisik, saldo akun tersimpan dan jurnal posted seimbang."
        if not matched:
            if not sources['openingJournal'] and not sources['inventoryPostings']:
                explanation = "Stok dan saldo akun tersimpan ada tanpa jurnal pembuka atau posting persediaan pendukung."
            else:
                explanation = "Bandingkan sumber mutasi dan jurnal untuk menemukan baris yang belum terhubung."
        return {
            "physicalStockQuantity": sum(line["onHand"] for line in stock),
            "inventoryValuation": value, "stockByLocationAndSku": stock,
            "account1030": account, "postedJournalCount": journals,
            "physicalMinusCached": value - stored if account else None,
            "physicalMinusPosted": value - posted if account else None,
            "cachedMinusPosted": stored - posted if account else None,
            "status": "MATCHED" if matched else "MISMATCH",
            "explanation": explanation,
            "sourceDocuments": sources,
            "action": "Pertahankan saldo dan jejak dokumen." if matched else (
                "Cari stok opname pembukaan dan neraca saldo yang disetujui. Rekonsiliasi per tenant "
                "sebelum mengajukan koreksi melalui proses Finance."
            ),
        }


if __name__ == "__main__":
    folder = Path(__file__).resolve().parents[1] / "prisma"
    companies = json.loads((folder / "companies.json").read_text())
    report = [{"company": c["name"], "id": c["id"], **inspect(folder / c["dbFile"])} for c in companies]
    print(json.dumps({"mode": "read-only", "companies": report}, ensure_ascii=False, indent=2))
