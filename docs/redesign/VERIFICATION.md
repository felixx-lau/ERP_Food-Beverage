# Redesign verification

## Completed

- TypeScript: `npx tsc --noEmit` passed.
- Optimized Next.js build: `NEXT_TELEMETRY_DISABLED=1 npm run build` passed. Build includes type validation and static generation.
- Existing business and chart regression suites: **128 / 128 assertions passed**.

| Suite | Passed |
| --- | ---: |
| Phase 2/3: authentication, RBAC and baseline | 23 |
| Phase 4: CRM, sales, credit control, delivery | 27 |
| Phase 5: procurement, QC, three-way matching | 14 |
| Phase 6: invoicing, payments, idempotency | 12 |
| Phase 7: transfers, POS, returns | 19 |
| Phase 8: dashboard and reconciliation | 17 |
| Chart/API regression | 16 |

Logs are in `docs/redesign/qa/`. Tests ran with `DATABASE_URL` pointing to an isolated SQLite copy at `docs/redesign/qa/test.db`. No reset/seed tests were run against the user's databases. SHA-256 comparisons confirmed the original default and company databases remained unchanged during this work. One company database already had local changes before the redesign.

Use `node --import tsx scripts/test_phase4.ts` (and the other suite filenames) with an explicitly isolated DATABASE_URL to reproduce. The `tsx` CLI's IPC socket was unavailable in this execution environment; the Node import loader successfully ran the same scripts.

Backend preservation: no changes to `src/lib`, `src/app/api`, Prisma schema, package dependencies, authentication handlers or transaction calculations. Required collapsible QA panels remain in the pages.

## Verification limitations

Live visual/browser checks could not run: the browser access host was unavailable, shell access to the existing local server failed, and starting a local server returned a socket permission error. No new desktop/mobile screenshots, browser interaction pass, Lighthouse score, or full WCAG conformance claim is provided.

The production build and regression tests establish compilation and core workflow integrity. They do not establish that every responsive state or browser interaction is visually correct.

## Browser acceptance checks still required

1. Start the app and review 1440px, 1280px, 768px, 390px and 320px layouts. Check every module and horizontal table scrolling.
2. Collapse the sidebar, navigate to another page, expand groups, and open/close the mobile drawer. Confirm focus returns to the trigger and background interaction is blocked.
3. Use Ctrl/Command K, search a page, navigate with Tab/Enter, and dismiss with Escape. Verify page results for each role.
4. Open each create/edit/transaction dialog. Test Tab/Shift+Tab containment, Escape, close buttons, validation errors and narrow screens.
5. Search inventory by SKU/name, sort stock/price/name, paginate, and open product detail. Filter payments and sort date/amount across pages.
6. Check login, company selection, account switching, team management and audit drawer. Preserve confirmation flows for destructive/demo actions.
7. Compare dashboard values with the API, including zero values and unavailable/403 responses. Test chart dates, critical-stock details, HTML data equivalents and reduced-motion settings.
8. Run browser accessibility tooling and screen-reader checks; verify contrast and keyboard focus at 200% zoom. Measure page performance with representative data.

The existing Google Fonts import remains an external request with system-font fallbacks. Self-hosting Inter is optional if offline use or a stricter CSP is required.
