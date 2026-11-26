"""Provision a fresh grading project or validate a previously provisioned baseline."""
import argparse
from contextlib import closing
import json
import os
from pathlib import Path
import secrets
import shutil
import sqlite3
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'rasa-aruna-grading-'
MARKER = '.erp-grading-demo.json'
MARK = {'environment': 'grading-demo', 'database': 'prisma/erp.db'}
PRICES = [
    ('V01', 'RICE-CHICK-S', 26000), ('V01', 'RICE-CHICK-L', 34000),
    ('V01', 'RICE-BEEF-S', 31000), ('V01', 'RICE-BEEF-L', 42000),
    ('V02', 'NOOD-VEG-S', 19000), ('V02', 'NOOD-VEG-L', 27000),
    ('V02', 'SALAD-GRN-S', 21000), ('V02', 'SALAD-GRN-L', 30000),
    ('V03', 'COF-LATT-HOT', 12000), ('V03', 'COF-LATT-ICE', 13000),
    ('V03', 'TEA-LEMN-HOT', 8000), ('V03', 'TEA-LEMN-ICE', 9000),
    ('V04', 'COOKIE-CHO-1', 9000), ('V04', 'COOKIE-CHO-3', 25000),
    ('V03', 'JUICE-ORN-350', 15000),
]


def demo_database(project):
    project = project.resolve(strict=True)
    marker = project / MARKER
    if not project.name.startswith(PREFIX) or marker.is_symlink() or not marker.is_file():
        raise ValueError('Gunakan folder demo yang dibuat oleh prepare_grading_demo.py.')
    if json.loads(marker.read_text()) != MARK:
        raise ValueError('Penanda lingkungan demo tidak valid.')
    database = project / MARK['database']
    if database.resolve() != database or not database.is_file() or database.stat().st_nlink != 1:
        raise ValueError('Target harus berupa database mandiri di dalam folder demo.')
    return database


def validate(project):
    database = demo_database(project)
    with closing(sqlite3.connect(database.as_uri() + '?mode=ro', uri=True)) as db:
        db.execute('PRAGMA query_only = ON')
        def rows(sql):
            return db.execute(sql).fetchall()

        def check(label, actual, expected):
            if actual != expected:
                raise ValueError(f'{label}: expected {expected}, actual {actual}')
            return actual

        def one(label, sql, expected):
            return check(label, rows(sql)[0][0], expected)

        result = {
            'activeSku': one('SKU', 'SELECT COUNT(*) FROM ProductVariant WHERE archivedAt IS NULL', 15),
            'customers': one('Pelanggan', "SELECT COUNT(*) FROM Contact WHERE type='CUSTOMER' AND archivedAt IS NULL", 6),
            'vendors': one('Vendor', "SELECT COUNT(*) FROM Contact WHERE type='VENDOR' AND archivedAt IS NULL", 4),
            'vendorPricelist': len(check('Pricelist', sorted(rows(
                "SELECT vendorId,productSku,price,minimumQty,currency FROM VendorPrice WHERE archivedAt IS NULL"
            )), sorted((*item, 1, 'IDR') for item in PRICES))),
            'stockByLocation': check('Stok fisik, valuasi dan reservasi per lokasi', rows("""
                SELECT s.locationCode, sum(s.onHand), sum(s.onHand * p.standardCost), sum(s.reserved)
                FROM StockLevel s JOIN ProductVariant p ON p.sku=s.productSku GROUP BY s.locationCode ORDER BY s.locationCode
            """), [('CAFE-JKT', 206, 3614000, 0), ('WH-JKT', 410, 8600000, 6)]),
            'accounts': check('Saldo akun', rows("""
                SELECT code,currentBalance FROM Account WHERE code IN ('1010','1020','1030','2010') ORDER BY code
            """), [('1010', 20000000), ('1020', 1500000), ('1030', 12214000), ('2010', 1000000)]),
            'openingJournal': check('Jurnal pembuka', rows("""
                SELECT j.entryNumber,sum(i.debit),sum(i.credit)
                FROM JournalItem i JOIN JournalEntry j ON j.id=i.journalEntryId
                WHERE j.state='POSTED' AND j.isOpening=1 GROUP BY j.entryNumber
            """), [('JE/OPENING/0001', 33714000, 33714000)]),
            'lead': check('LD0003', rows("SELECT stage,contactId,expectedRevenue FROM CrmLead WHERE id='LD0003'"),
                          [('QUALIFIED', 'C03', 1200000)]),
            'salesOrder': check('S00006', rows("""
                SELECT o.status,l.productSku,l.quantity,r.locationCode,r.quantity
                FROM SalesOrder o JOIN SalesOrderLine l ON l.salesOrderId=o.id
                JOIN StockReservation r ON r.salesOrderLineId=l.id WHERE o.orderNumber='S00006'
            """), [('CONFIRMED', 'RICE-CHICK-S', 6, 'WH-JKT', 6)]),
            'purchaseOrder': check('P00006', rows("""
                SELECT o.status,o.vendorId,l.productSku,l.orderedQty,l.unitPrice,o.taxAmount
                FROM PurchaseOrder o JOIN PurchaseOrderLine l ON l.purchaseOrderId=o.id WHERE o.poNumber='P00006'
            """), [('CONFIRMED', 'V03', 'COF-LATT-HOT', 10, 12000, 0)]),
        }
        result['stockUnits'] = sum(row[1] for row in result['stockByLocation'])
        result['inventoryValuation'] = sum(row[2] for row in result['stockByLocation'])
        result['reconciliation'] = check('Valuasi dan GL 1030', rows("""
            SELECT sum(i.debit-i.credit) FROM JournalItem i JOIN JournalEntry j ON j.id=i.journalEntryId
            WHERE j.state='POSTED' AND i.accountCode='1030'
        """), [(result['inventoryValuation'],)])
        check('Role seed aktif', rows("SELECT role FROM User WHERE active=1 ORDER BY role"),
              [(x,) for x in ('CASHIER', 'FINANCE', 'HEAD_ADMIN', 'OWNER', 'PROCUREMENT', 'SALES', 'WAREHOUSE')])
        check('Foreign keys', rows('PRAGMA foreign_key_check'), [])
        return result


def create():
    base = ROOT / '.local'
    base.mkdir(exist_ok=True)
    project = Path(tempfile.mkdtemp(prefix=PREFIX, dir=base))
    for folder in ('src', 'scripts'):
        shutil.copytree(ROOT / folder, project / folder, ignore=shutil.ignore_patterns('__pycache__'))
    (project / 'prisma').mkdir()
    shutil.copy2(ROOT / 'prisma/schema.prisma', project / 'prisma/schema.prisma')
    for name in ('package.json', 'tsconfig.json', 'next-env.d.ts', 'next.config.mjs', 'postcss.config.mjs', 'tailwind.config.ts'):
        shutil.copy2(ROOT / name, project / name)
    (project / 'node_modules').symlink_to(ROOT / 'node_modules', target_is_directory=True)
    (project / MARKER).write_text(json.dumps(MARK))
    (project / 'prisma/companies.json').write_text(json.dumps([{
        'id': 'default', 'name': 'PT Rasa Aruna Bersama', 'brand': 'Rasa Aruna Kitchen', 'dbFile': 'erp.db',
        'isDefault': True, 'description': 'Demo Penilaian Group 03', 'city': 'Jakarta', 'currency': 'IDR',
        'taxRate': 10, 'createdAt': '2026-10-20T00:00:00.000Z',
    }]))
    db = project / MARK['database']
    db.touch(exist_ok=False)
    demo_database(project)
    password = secrets.token_urlsafe(18)
    secret = secrets.token_hex(32)
    env = {k: os.environ[k] for k in ('PATH', 'TMPDIR', 'HOME') if k in os.environ}
    env.update(DATABASE_URL=f'file:{db}', JWT_SECRET=secret, DEMO_GRADING_SEED_PASSWORD=password)
    subprocess.run(['node', 'node_modules/prisma/build/index.js', 'db', 'push', '--skip-generate'], cwd=project, env=env, check=True)
    subprocess.run(['node', '--import', 'tsx', 'scripts/seed_grading_demo.ts'], cwd=project, env=env, check=True)
    result = validate(project)
    (project / '.env.local').write_text(f'DATABASE_URL="file:{db}"\nJWT_SECRET="{secret}"\n')
    (project / 'demo-credentials.txt').write_text(f'Password lokal untuk tujuh akun seed: {password}\n')
    (project / '.env.local').chmod(0o600)
    (project / 'demo-credentials.txt').chmod(0o600)
    (project / 'baseline-validation.json').write_text(json.dumps(result, indent=2))
    print(f'Demo siap: {project}')
    print(f'Kredensial lokal: {project / "demo-credentials.txt"}')
    print(f'Bukti baseline: {project / "baseline-validation.json"}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--validate', type=Path, help='Validasi baseline dari folder demo yang sudah dibuat')
    args = parser.parse_args()
    try:
        if args.validate:
            print(json.dumps(validate(args.validate), indent=2))
        else:
            create()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error)) from error
