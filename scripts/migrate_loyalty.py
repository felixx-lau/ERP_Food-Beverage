"""Validate SR-20 additive migration on copies; --apply saves SQLite backups first."""
from pathlib import Path
import argparse, hashlib, json, sqlite3, tempfile
from datetime import datetime, timezone

root = Path(__file__).resolve().parents[1]
path = root/'prisma/migrations/20261109_loyalty/migration.sql'
sql = path.read_text()
checksum = hashlib.sha256(sql.encode()).hexdigest()
name = path.parent.name

def migrate(db):
    db.execute('PRAGMA foreign_keys=ON')
    row = db.execute('SELECT checksum FROM SchemaMigration WHERE name=?', (name,)).fetchone()
    if row:
        if row[0] != checksum: raise RuntimeError('Migration checksum mismatch')
        return 'already applied'
    db.execute('BEGIN IMMEDIATE')
    try:
        for stmt in sql.split(';'):
            if stmt.strip(): db.execute(stmt)
        db.execute('INSERT INTO SchemaMigration(name,checksum) VALUES (?,?)', (name,checksum))
        if db.execute('PRAGMA foreign_key_check').fetchall(): raise RuntimeError('Foreign key check failed')
        db.commit()
        return 'applied'
    except Exception:
        db.rollback(); raise

parser=argparse.ArgumentParser()
parser.add_argument('--apply', action='store_true')
parser.add_argument('--database', type=Path)
args=parser.parse_args()
databases = [args.database.resolve()] if args.database else [root/'prisma/erp.db', *sorted((root/'prisma/companies').glob('*.db'))]
with tempfile.TemporaryDirectory(prefix='loyalty-migration-') as tmp:
    for i, path in enumerate(databases):
        source=sqlite3.connect(path.as_uri()+'?mode=ro',uri=True)
        copy=sqlite3.connect(str(Path(tmp)/f'{i}.db')); source.backup(copy); source.close()
        print(path.name, migrate(copy), '(copy verified)'); copy.close()
if args.apply:
    backup=root/'backups'/('loyalty-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    backup.mkdir(parents=True)
    manifest=[]
    for i,path in enumerate(databases):
        db=sqlite3.connect(path); target=sqlite3.connect(backup/f'{i}-{path.name}'); db.backup(target); target.close()
        result=migrate(db); db.close(); manifest.append({'database':str(path),'backup':str(backup/f'{i}-{path.name}'),'result':result})
    (backup/'manifest.json').write_text(json.dumps(manifest,indent=2)); print('Backups:',backup)
