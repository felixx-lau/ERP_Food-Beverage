"""Validate additive migrations on database copies before applying with backups.

Default is validation only. --apply explicitly applies already validated SQL.
"""
from pathlib import Path
import argparse, hashlib, json, sqlite3, tempfile
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT/'prisma/migrations/20261106_dynamic_erp/migration.sql'
NAME = MIGRATION.parent.name
SQL = MIGRATION.read_text()
CHECKSUM = hashlib.sha256(SQL.encode()).hexdigest()

def snapshot(connection):
    result = {}
    for (table,) in connection.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"):
        columns = [row[1] for row in connection.execute(f'PRAGMA table_info("{table}")')]
        rows = sorted(connection.execute('SELECT '+','.join('"'+c+'"' for c in columns)+f' FROM "{table}"').fetchall(), key=repr)
        result[table] = (columns, rows)
    return result

def migrate(connection):
    connection.execute('PRAGMA foreign_keys=ON')
    already = connection.execute("SELECT 1 FROM sqlite_master WHERE name='SchemaMigration'").fetchone()
    if already:
        row = connection.execute('SELECT checksum FROM SchemaMigration WHERE name=?', (NAME,)).fetchone()
        if row:
            if row[0] != CHECKSUM: raise RuntimeError('Applied migration checksum differs')
            return 'already-applied'
    before = snapshot(connection)
    try:
        # executescript is avoided: it can implicitly commit and break rollback.
        connection.execute('BEGIN IMMEDIATE')
        statement = ''
        for line in SQL.splitlines(True):
            statement += line
            if sqlite3.complete_statement(statement):
                connection.execute(statement); statement = ''
        connection.execute('INSERT INTO SchemaMigration(name,checksum) VALUES (?,?)', (NAME,CHECKSUM))
        if connection.execute('PRAGMA foreign_key_check').fetchall(): raise RuntimeError('Foreign key check failed')
        for table,(columns,expected) in before.items():
            actual = sorted(connection.execute('SELECT '+','.join('"'+c+'"' for c in columns)+f' FROM "{table}"').fetchall(), key=repr)
            if actual != expected: raise RuntimeError(f'Existing values changed in {table}')
        allocated = dict(connection.execute('SELECT l.productSku || \'@\' || r.locationCode, SUM(r.quantity) FROM StockReservation r JOIN SalesOrderLine l ON l.id=r.salesOrderLineId GROUP BY l.productSku,r.locationCode'))
        for sku,loc,reserved in connection.execute('SELECT productSku,locationCode,reserved FROM StockLevel'):
            if allocated.get(sku+'@'+loc,0) != reserved: raise RuntimeError('Existing reservations need manual reconciliation')
        connection.commit()
        return 'migrated; original columns and rows preserved'
    except Exception:
        connection.rollback(); raise

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--apply',action='store_true'); parser.add_argument('--database',type=Path)
    args=parser.parse_args()
    databases=[args.database.resolve()] if args.database else sorted((ROOT/'prisma').rglob('*.db'))
    temp=Path(tempfile.mkdtemp(prefix='rasa-migration-validation-'))
    for i,database in enumerate(databases):
        source=sqlite3.connect(database.as_uri()+'?mode=ro',uri=True); copy=sqlite3.connect(temp/f'{i}.db')
        source.backup(copy); source.close()
        result=migrate(copy); copy.close(); print(database.name, result, '(copy verified)',flush=True)
    if args.apply:
        backup=ROOT/'backups'/datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'); backup.mkdir(parents=True)
        manifest=[]
        for i,database in enumerate(databases):
            connection=sqlite3.connect(database); target=sqlite3.connect(backup/f'{i}-{database.name}'); connection.backup(target); target.close()
            result=migrate(connection); connection.close(); manifest.append(dict(database=str(database),backup=str(backup/f'{i}-{database.name}'),result=result))
        (backup/'manifest.json').write_text(json.dumps(manifest,indent=2)); print('Backups:',backup,flush=True)
    print('Validation directory:',temp,flush=True)

if __name__=='__main__': main()
