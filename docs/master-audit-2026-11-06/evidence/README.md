# Audit evidence

Executed on 6 November 2026 against copied source and a disposable SQLite database. Original files were read only.

- `summary.json`: counts and execution boundary.
- `regression-results.json`, `test_phase*.log`, `test_charts.log`: actual seven-suite execution, 128 passed assertions.
- `probe-results.json` / `probe.log`: re-executed A01–A14 probes, 1 pass / 13 fail.
- `crud-probe-results.json` / `crud-probes.log`: B01–B17, 0 pass / 17 fail; B06 independently checks contact persistence with another Prisma client.
- `*.executed.ts.txt`: exact diagnostic sources; these reseed and mutate disposable fixtures. Do not run them against operational data or from the original project.
- `t-case-assertion-evidence.json`: legacy log lines mentioning each T-ID. These are not full PDF case acceptance.
- `typecheck.log`: empty output from successful TypeScript check, exit 0.
- `preservation.json`: before/after SHA-256 for 134 protected original files; zero changed.
- `original-database-readonly-checks.json`: mode=ro SQLite counts/quick_check/FK checks for all four original databases.
- `endpoint-inventory.json`: all 49 route files, methods and declaration lines; lexical user-check flags are not proof of engine authorization.
- `screen-inventory.json`: all 17 page files and their fetch/action declarations.
- `source-inventory.json`: all 111 files under src with sizes/line counts.
- `pdf-wireframe-contact-*.png`: rendered assignment pages 16–31. Full 34-page text was read; extraction was kept in temporary storage.

No browser, live HTTP, public deployment or concurrent-request tests were executed. No production readiness or 32/32 PDF acceptance is claimed.
