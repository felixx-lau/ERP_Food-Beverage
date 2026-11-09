"""Run mutating verification only in an automatically created temporary project.

Never changes a database in the application directory. Reuses installed packages.
"""
from pathlib import Path
import argparse, hashlib, json, os, shutil, sqlite3, subprocess, tempfile

parser = argparse.ArgumentParser()
parser.add_argument('--suites', nargs='*', default=['test_phase2_3', 'test_phase4', 'test_phase5', 'test_phase6', 'test_phase7', 'test_phase8', 'test_charts'])
parser.add_argument('--audit-probes', action='store_true')
parser.add_argument('--build', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
scratch = Path(tempfile.mkdtemp(prefix='rasa-aruna-verification-'))
originals = list((root/'prisma').rglob('*.db')) + [root/'prisma/companies.json']
before = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in originals if p.exists()}
for folder in ['src', 'scripts', 'prisma']:
    shutil.copytree(root/folder, scratch/folder)
for name in ['package.json', 'tsconfig.json', 'next-env.d.ts', 'next.config.mjs', 'tailwind.config.ts', 'postcss.config.mjs']:
    shutil.copy2(root/name, scratch/name)
(scratch/'node_modules').symlink_to(root/'node_modules', target_is_directory=True)
source = sqlite3.connect((root/'prisma/erp.db').as_uri()+'?mode=ro', uri=True)
target = sqlite3.connect(scratch/'prisma/erp.db')
source.backup(target); target.close(); source.close()
subprocess.run(['python3', str(scratch/'scripts/migrate_loyalty.py'), '--apply', '--database', str(scratch/'prisma/erp.db')], check=True, cwd=scratch)
env = os.environ.copy()
env.update(DATABASE_URL='file:'+str(scratch/'prisma/erp.db'), JWT_SECRET='isolated-verification-secret-not-for-production-2026')
for name in ['VERCEL', 'AWS_LAMBDA_FUNCTION_NAME']:
    env.pop(name, None)
results = []
def run(name, command):
    result = subprocess.run(command, cwd=scratch, env=env, capture_output=True, text=True)
    output = result.stdout+result.stderr
    (scratch/(name+'.log')).write_text(output)
    item = dict(suite=name, exit=result.returncode, passes=output.count('[PASS]'), failures=output.count('[FAIL]'))
    results.append(item); print(json.dumps(item), flush=True)
for name in args.suites:
    if not name.replace('_', '').isalnum() or not (scratch/'scripts'/(name+'.ts')).exists():
        raise SystemExit('Unknown suite')
    run(name, ['node', '--import', 'tsx', 'scripts/'+name+'.ts'])
if args.audit_probes:
    folder = scratch/'docs/compliance-audit'; folder.mkdir(parents=True)
    shutil.copy2(root/'docs/compliance-audit/probe.ts', folder/'probe.ts')
    run('audit-probes', ['node', '--import', 'tsx', 'docs/compliance-audit/probe.ts'])
    probes = json.loads((folder/'probe-results.json').read_text())
    results.append(dict(suite='audit-expectations', passes=sum(p['status']=='PASS' for p in probes), failures=sum(p['status']!='PASS' for p in probes)))
    print(json.dumps(results[-1]), flush=True)
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
