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
        journals = db.execute("SELECT COUNT(*) FROM JournalEntry WHERE state='POSTED'").fetchone()[0]
        value = sum(line["valuation"] for line in stock)
        account = accounts[0] if accounts else None
        stored = account["currentBalance"] if account else None
        posted = account["postedBalance"] if account else None
        return {
            "inventoryValuation": value, "stockByLocationAndSku": stock,
            "account1030": account, "postedJournalCount": journals,
            "physicalMinusCached": value - stored if account else None,
            "physicalMinusPosted": value - posted if account else None,
            "cachedMinusPosted": stored - posted if account else None,
            "status": "MATCH" if value == stored == posted else "REVIEW",
            "action": "No change" if value == stored == posted else "Require signed opening inventory and trial balance before proposing a posting",
        }


if __name__ == "__main__":
    folder = Path(__file__).resolve().parents[1] / "prisma"
    companies = json.loads((folder / "companies.json").read_text())
    report = [{"company": c["name"], "id": c["id"], **inspect(folder / c["dbFile"])} for c in companies]
    print(json.dumps({"mode": "read-only", "companies": report}, ensure_ascii=False, indent=2))
