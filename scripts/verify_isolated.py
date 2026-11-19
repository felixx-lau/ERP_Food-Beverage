"""Run mutating verification only in an automatically created temporary project.

Never changes a database in the application directory. Reuses installed packages.
"""
from pathlib import Path
from contextlib import closing
import argparse, hashlib, json, os, re, shutil, sqlite3, subprocess, tempfile

parser = argparse.ArgumentParser()
parser.add_argument('--suites', nargs='*', default=['test_phase2_3', 'test_phase4', 'test_phase5', 'test_phase6', 'test_phase7', 'test_phase8', 'test_charts'])
parser.add_argument('--audit-probes', action='store_true', help='Run the maintained PDF and transaction-integrity probes')
parser.add_argument('--build', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
scratch = Path(tempfile.mkdtemp(prefix='rasa-aruna-verification-'))
prisma_dir = root/'prisma'
registry = prisma_dir/'companies.json'
companies = json.loads(registry.read_text()) if registry.exists() else []
snapshots = {db.relative_to(prisma_dir): db for db in prisma_dir.rglob('*.db')}
for index, company in enumerate(companies):
    raw = Path(company.get('dbFile') or 'erp.db')
    source = (prisma_dir/raw).resolve()
    local = source.relative_to(prisma_dir) if source.is_relative_to(prisma_dir) else Path('companies')/f'external-{index}.db'
    if local in snapshots and snapshots[local].resolve() != source:
        raise SystemExit('Conflicting tenant snapshot path')
    snapshots[local] = source
    company['dbFile'] = str(local)
originals = [*snapshots.values(), *([registry] if registry.exists() else [])]
before = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in originals}
for folder in ['src', 'scripts']:
    shutil.copytree(root/folder, scratch/folder)
shutil.copytree(prisma_dir, scratch/'prisma', ignore=shutil.ignore_patterns('*.db','*-wal','*-shm','*-journal'))
(scratch/'prisma/companies.json').write_text(json.dumps(companies, ensure_ascii=False))
for relative, source in snapshots.items():
    destination = scratch/'prisma'/relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(source.as_uri()+'?mode=ro', uri=True)) as reader, closing(sqlite3.connect(destination)) as writer:
        reader.backup(writer)
for name in ['package.json', 'tsconfig.json', 'next-env.d.ts', 'next.config.mjs', 'tailwind.config.ts', 'postcss.config.mjs']:
    shutil.copy2(root/name, scratch/name)
(scratch/'node_modules').symlink_to(root/'node_modules', target_is_directory=True)
subprocess.run(['python3', str(scratch/'scripts/migrate_loyalty.py'), '--apply', '--database', str(scratch/'prisma/erp.db')], check=True, cwd=scratch)
subprocess.run(['python3', str(scratch/'scripts/migrate_advanced.py'), '--apply', '--database', str(scratch/'prisma/erp.db')], check=True, cwd=scratch)
env = os.environ.copy()
env.update(DATABASE_URL='file:'+str(scratch/'prisma/erp.db'), JWT_SECRET='isolated-verification-secret-not-for-production-2026')
for name in ['VERCEL', 'AWS_LAMBDA_FUNCTION_NAME']:
    env.pop(name, None)
results = []
def run(name, command):
    result = subprocess.run(command, cwd=scratch, env=env, capture_output=True, text=True)
    output = result.stdout+result.stderr
    (scratch/(name+'.log')).write_text(output)
    passes = output.count('[PASS]') + len(re.findall(r'^(?:ok \d+ -|✔ |PASS:)', output, re.MULTILINE))
    failures = output.count('[FAIL]') + len(re.findall(r'^(?:not ok \d+ -|✖ |FAIL:)', output, re.MULTILINE))
    item = dict(suite=name, exit=result.returncode, passes=passes, failures=failures)
    results.append(item); print(json.dumps(item), flush=True)
suites = list(dict.fromkeys(args.suites + (['test_pdf_cases', 'test_integrity'] if args.audit_probes else [])))
for name in suites:
    if not name.replace('_', '').isalnum() or not (scratch/'scripts'/(name+'.ts')).exists():
        raise SystemExit('Unknown suite')
    run(name, ['node', '--import', 'tsx', 'scripts/'+name+'.ts'])
run('typecheck', ['node', 'node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false'])
if args.build:
    env['NEXT_TELEMETRY_DISABLED'] = '1'
    run('build', ['node', 'node_modules/next/dist/bin/next', 'build'])
after = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in originals if p.exists()}
if before != after:
    raise SystemExit('Original database hashes changed during verification')
(scratch/'results.json').write_text(json.dumps(dict(results=results, originalDatabaseHashes=before), indent=2))
print('Evidence:', scratch, flush=True)
raise SystemExit(1 if any(r.get('exit', 0) or r['failures'] for r in results) else 0)
