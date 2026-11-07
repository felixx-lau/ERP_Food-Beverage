# Rasa Aruna enterprise UI

Implemented in the existing Next.js/React application. Business engines, API routes, schema, permissions and transaction handlers are retained. Existing local changes were used as the starting point.

## Audit and design decisions

The initial interface mixed translucent panels, large blur effects, dense uppercase labels, many font weights, and inconsistent borders. Header actions competed with company selection on small screens. Dialogs did not consistently contain or restore keyboard focus. The dashboard displayed hardcoded seed amounts when API results were absent, including replacing legitimate zeros.

The redesign uses opaque surfaces, Inter typography, subtle blue/indigo primary actions, purple secondary accents, and restrained card elevation. Existing `glass-*` class names remain compatibility aliases so all ERP modules adopt the new system without replacing their transaction logic. QA panels and explicitly invoked demo tools remain available.

## Tokens

Source of truth: `src/app/globals.css`; Tailwind aliases: `tailwind.config.ts`.

| Purpose | Value |
| --- | --- |
| Primary / hover | #2563EB / #1D4ED8 |
| Purple / soft purple / indigo | #7C3AED / #A78BFA / #4F46E5 |
| Page / surface / secondary surface | #F8FAFC / #FFFFFF / #F1F5F9 |
| Primary / secondary text | #0F172A / #64748B |
| Border | #E2E8F0 |
| Typeface | Inter, with system sans-serif fallbacks |
| Layout spacing | 8px base, with 4px increments for compact controls |
| Control / card / dialog radius | 10px / 16px / 20px |
| Micro / standard motion | 160ms / 240ms |
| Focus | 2px blue outline, 3px offset |

Primary buttons use a limited blue-to-indigo gradient. Active navigation uses pale blue-to-purple. Green means successful/completed, amber pending/attention, red rejected/error, blue informational. Draft and closed states use neutral styling rather than implying an error.

## Shared components and behavior

| Component | Usage and supported states |
| --- | --- |
| AppLayout | Common page heading, skip link, responsive gutters, persistent sidebar preference |
| Sidebar | Expandable groups, 20px icons, active page semantics, collapsed icon labels/tooltips, mobile drawer |
| Topbar / CompanySwitcher | Linked breadcrumbs, company management, team tools, audit history, existing account switching/logout |
| NavigationSearch | Ctrl/Command K, role-filtered page search, empty results, keyboard-accessible links; searches navigation, not business records |
| KPICard | Neutral/brand/semantic variants, actual value, optional badge/trend, optional keyboard-operable action |
| StatusBadge | Text and optional dot; consistent status meaning independent of color |
| DialogFrame | Body portal, accessible name, modal semantics, Escape/backdrop dismissal, focus containment/return, background inertness and scroll lock |
| LoadingState | Stable card skeletons with a live loading label |
| TableSearch / SortLabel / TablePagination | Labeled search, explicit sorting direction, count/range, bounded previous/next controls |
| useTableView | Non-mutating client-side filter/sort and 10-row pagination; only current page rows render |
| PageTransition | 200ms CSS entrance; children render directly without stale-content state or timers |

Use `.btn-primary`, `.btn-secondary`, `.icon-button`, `.surface-card` and `.input-glass` for new UI. Existing button and surface aliases share the same tokens. Destructive actions retain semantic red styling and their existing confirmation workflows.

Dialog example:

```tsx
{open && (
  <DialogFrame onClose={() => setOpen(false)} label="Tambah pelanggan">
    <div className="bg-white w-full max-w-lg p-6">
      <h2>Tambah pelanggan</h2>
      {/* Existing form and submit handler */}
    </div>
  </DialogFrame>
)}
```

Use the dialog only while open. Give fields a connected label and inputs an appropriate autocomplete attribute. Use a native button or link for every action. Keep table numeric columns right-aligned and use tabular numerals. Scope headers to columns. Include text for loading/error/empty states.

## Coverage

- Login: split desktop layout, compact mobile login, labeled email/password fields, autocomplete, existing demo account selection.
- Home: welcome workspace, four creation shortcuts, existing grid/list application catalog and access indications.
- Dashboard: actual-data KPIs, loading/unavailable states, line/bar/donut charts, date controls, critical stock details, accessible data tables, existing reconciliation and QA tools.
- Sales/CRM: leads, contacts, quotations/orders.
- Procurement: purchase orders/RFQs.
- Inventory: products, delivery, receipts/QC, transfers, returns.
- Accounting: customer invoices, vendor bills, payments, journal entries/general ledger.
- POS: catalog/cart, manual entry and session-close dialogs.
- Shared creation/edit/team/company/reset dialogs and audit drawer.

All module pages use the common shell, typography, data surfaces, tables, badges and controls. Inventory gains product/SKU search, sorting and pagination. Payments retain existing search and method filtering and gain amount/date sorting and pagination. Detail line-item tables preserve their existing workflow and full contents.

## Responsive and accessibility behavior

Desktop uses a 272px sidebar or 80px icon rail. Below 1024px it becomes a modal navigation drawer. KPI grids adapt from one to two/four columns; home shortcuts and module cards use the same rhythm. Header actions condense on mobile; the company menu is positioned within viewport gutters. Dense tables scroll horizontally inside the content area. Mobile controls have 44px minimum height and input text increases to 16px. Dialogs use viewport-constrained height and scrolling.

Reduced motion disables CSS transitions/animations and Chart.js animations. Charts have names and equivalent expandable HTML data tables. Keyboard focus is visible; modal background content becomes inert; current pages and sort direction are announced. These improvements have been reviewed in source; a complete WCAG 2.2 AA audit and assistive-technology verification require a working browser.

## Performance

No dependencies added. Removed ambient full-screen blur layers and backdrop filters from shared surfaces. Removed persistent `will-change` hints and delayed route-content state. Charts remain confined to the dashboard route. Inventory/payment pagination bounds rendered rows; filtering and sorting still run on the API's full result set. Server pagination is a future backend enhancement for much larger datasets.

## Blue and purple color refresh

The follow-up theme increases brand color across the sidebar (deep blue/indigo/purple), home welcome banner, login panel, primary buttons, table headers, and alternating blue/purple module and KPI cards. Data tables retain light surfaces; semantic status colors are unchanged. Small KPI text uses slate-600 for contrast on tinted backgrounds. Changes are presentational only.

## Interaction motion

- Page headings and page content enter with a 280ms fade/5px rise.
- Home module cards and dashboard KPI grids enter in order, with 30ms steps capped at 120ms.
- Pointer hover gently raises cards and scales their icon; primary buttons have a single light sweep on hover.
- Navigation groups expand/collapse over 240ms. Collapsed contents are inert and hidden from assistive technology.
- Profile/company dropdowns fade and scale from the top. Modal backdrops fade; dialogs rise slightly and drawers slide from their corresponding edge.
- Loading skeletons use a transform-based shimmer. Data values remain unchanged.
- All motion is CSS-based with no animation dependency, no render delays, and no fabricated counter values. Reduced-motion preferences disable animations and transitions.
