# RentFlow frontend: break the single-page app into real architecture (Phase 1)

> **For any AI session / developer picking this up:** this file is the source of truth for the in-progress frontend refactor. Read it fully, resume at the first unchecked step in the Progress checklist below, and tick the box (with a short note of what was done and verified) as soon as each step lands. Do not skip steps or re-do checked ones. Run `cd frontend && npm run typecheck && npm run build` after every step.

## Progress (update this checklist as each sequencing step lands)

- [x] Step 1 — Scaffolded `app/(dashboard)/layout.tsx` (shell + cross-cutting drawer/dialogs) + `lib/store-context.tsx` (extracted state/mutations, logic unchanged) + `lib/nav.ts` (real route config, incl. the new Documents item) + `lib/use-list-filters.ts` (URL-backed `?selected=`). Old app preserved verbatim at `app/legacy/page.tsx`; old `app/page.tsx` deleted since `(dashboard)/page.tsx` now serves `/`. Verified: `npm run typecheck`, `npm run build`, both `/` and `/legacy` return 200.
- [x] Step 2 — Built `components/shared/{money,empty-state,error-state,loading-state}.tsx`. Wired the previously-dead `ready` flag into a real loading gate in the dashboard layout (Suspense fallback + a `!ready` check both render `LoadingState`). `apiError` now renders through `ErrorState` with a working retry (`location.reload()`) instead of a plain div. `legacy/shared.tsx`'s `Empty` is now a thin adapter over `EmptyState` (marked `@deprecated`, callers should migrate to `EmptyState` directly as each screen migrates). Overview's metric cards, activity list, and accrual snapshot use `Money`. Added minimal new CSS to `globals.css` for `.loading-skeleton`/`.skeleton-line` and empty/error layout tweaks — additive only, no existing classes' colors/spacing changed. Verified: typecheck, build, and a running-server curl check for skeleton markup + 200s on both routes.
- [x] Step 3 — Added `components/ui/{card,badge,checkbox,dropdown-menu,popover,textarea}.tsx` (hand-written, same style as existing ui files). **`form.tsx` deliberately deferred to Step 10** because it imports `react-hook-form`, which isn't installed until then. `ui/card.tsx` and `ui/badge.tsx` render through the app's existing `.card soft-shadow` / `.badge .badge-<tone>` classes (NOT shadcn's default utility styling) so surfaces and the `.card [data-slot=table]` CSS rules stay identical; only difference is `<div>` instead of `<section>` (no CSS targets `section`). Overview now imports `Card` from `ui/card`; `legacy/shared.tsx`'s `Badge` is a thin adapter over `ui/badge` (so Overview's account table uses it). Verified: typecheck + build green. Not done: a real browser pixel diff (no browser tooling in the session) — class strings are byte-identical, so a manual eyeball of `/` vs `/legacy` is still worthwhile.
- [x] Step 4 — Installed `@tanstack/react-table` **pinned to 8.21.3** (npm's default `latest` is 9.x with a different API; stay on v8). Built `components/shared/{ledger-table,filter-toolbar,party-chip}.tsx`; added `useSortParam` to `lib/use-list-filters.ts` (`?sort=col` / `?sort=-col`, default never written to URL). `LedgerTable` has controlled sorting, `aria-sort` on headers, a labelled sort `<button>`, an optional per-row action button, and column `meta:{align,className}`. `app/(dashboard)/agreements/page.tsx` is fully migrated (`?q=`, `?owner=`, `?sort=`, `?selected=`). Also wired the topbar global search (was a dead `defaultValue=""` input in the layout) to `?q=` with a 250ms debounce. Fixed a Step-1 regression: sidebar "Actor portal preview" became a `<Link>` but its CSS targeted `button` — added `.sidebar-foot a` rules. Deliberate change: legacy Agreements showed a Status filter that did nothing; the new toolbar only has the Owner filter. Verified in headless Chromium (Playwright, scratch install outside the repo): sort toggles + persists across refresh, search filters, empty state, row click opens drawer with `?selected=`, Overview matches `/legacy` visually, typecheck + build green. Note: `router.replace` means filter changes don't add history entries (so Back leaves the page rather than undoing a filter). Sidebar links to not-yet-migrated routes currently 404 (prefetch 404s in console are expected until steps 5–8/12 land); `/legacy` still has everything. Not yet built: the `Popover` "more filters" affordance on `FilterToolbar` (add when a screen needs it).
- [x] Step 5 — Migrated Vehicles, Customers, Owners, Drivers. New `lib/use-related-agreements.ts` (shared `?q=`/`?owner=` matching, exports `ALL_OWNERS`; Agreements page now uses it too) and `components/features/parties/party-accounts.tsx` (one `PartyAccounts role=` component behind the three party routes; sortable via `?sort=party|gross|due`). Deliberate small changes: default sort is by the party's own name (legacy sorted every party page by customer), heading reads "Customer accounts" not "Customers accounts". Verified in headless Chromium: rendered row/card text for all four routes is identical to `/legacy?view=…` for the same data; sort, empty state and row→`?selected=` drawer work; typecheck + build green.
- [x] Step 6 — Migrated Expenses, Billing, Owner payables, Payroll, Cashbook, Reports. New: `lib/reports.ts` (`reportConfig`, `reportTypes`, `csv`, `exportEntriesCsv`, `exportReportCsv`, `partyName`; logic copied unchanged), `components/features/entries/entries-ledger.tsx`, `components/features/accounts/{accounts-ledger,statement-ledger}.tsx` (`StatementLedger` serves Owner payables, Payroll and every report type; `AccountsLedger` serves Billing and Overview). Overview's account table now uses `AccountsLedger` (sort in `?sort=`). `components/legacy/shared.tsx` shrank to `Badge`/`SectionHeading`/`Empty`/`fmtDate` — `AccountTable`, `EntryTable`, `ReportTable`, `reportConfig`, `csv` were deleted (nothing else imported them; `app/legacy/page.tsx` has its own copies). Report type is in `?type=`. Verified in headless Chromium against `/legacy`: same row content on all routes, Billing mini-metrics identical, all 5 report CSVs identical (timestamp column stripped) with identical filenames, entries CSV byte-identical. **Intentional differences:** (1) Expenses/Cashbook default order is newest event date first (`?sort=-date`) — legacy used raw insertion order; (2) party tables default-sort by party name. **Known legacy quirk preserved, worth a product decision:** Cashbook "Export CSV" exports all entries filtered by status only — it ignores the owner/search scope the table shows.
- [x] Step 7 — Migrated Settlements (`app/(dashboard)/settlements/page.tsx`). Extracted `components/features/settlements/settlement-statement.tsx` (the 4 party tabs + Terms; now uses `Money signed` instead of the hand-rolled minus), `components/features/agreements/agreement-context.tsx`, `components/shared/approval-banner.tsx`. The dashboard layout's drawer now renders `AgreementContext` + `SettlementStatement` (its inline copies were removed). Verified in headless Chromium: settlement banner/cards text identical to `/legacy`, all 5 drawer tabs' text identical, close flow (dialog → confirm → `1/4 closed`) persists across reload.
- [x] Step 8 — Migrated Notifications and Settings; extracted `components/shared/delivery-status.tsx`. `lib/store-context.tsx` gained `markNoticeRead`, `retryNotice` (moved out of the drawer's inline handler; API-mode branch unchanged, still posts `/notifications/{id}/retry`) and `resetDemo`. Drawer notice block uses `DeliveryStatus` + `rf.retryNotice`. Verified in headless Chromium (demo mode): both pages' text identical to `/legacy`; clicking a notice marks it read and opens the drawer; Retry delivery shows the demo toast and clears `?selected=`; Reset sample data (with confirm) restores the seed (`0/4 closed`). API-mode retry not exercised (no backend run this session).
- [x] Step 9 — Built `components/shared/source-drawer.tsx` (`SourceDrawer` + `resolveSubject(store,id)` → `{kind:'agreement'|'entry'|'notice',record}`; the layout mounts `<SourceDrawer/>` once and the drawer reads `?selected=` itself; opens only when the id resolves, so a garbage `?selected=` no longer opens an empty sheet). Extracted `allocation-panel.tsx` (read-only; shown on Posted payment/payout/advance entries — **new UI, additive**) and `entry-consequence-preview.tsx` (wording unchanged; the layout's entry dialog uses it). Verified in headless Chromium against `/legacy`: drawer text identical for all 15 entries, 4 agreements and 4 notifications (only the new Allocation block differs, and only on Posted payments); preview text for empty and ৳8,000 expense correct; typecheck + build green.
- [x] Step 10 — Installed `react-hook-form` 7.89.0, `zod` 4.6.5, `@hookform/resolvers` 5.9.1 (exact pins). Hand-wrote `components/ui/form.tsx` (`FormItem` is a `<div>` + real `<label htmlFor>` rather than shadcn's label-wraps-control, so the messages don't pollute the accessible name; matching CSS appended to `globals.css`). New `lib/forms.ts` holds zod schemas (`entrySchema`, `agreementSchema`), defaults, the legacy `WIZARD_INCOMPLETE` message and a field→wizard-step map. New `components/features/entries/record-entry-dialog.tsx` and `components/features/agreements/new-agreement-dialog.tsx` own their form state; the layout just mounts `<RecordEntryDialog/>` and `<NewAgreementDialog/>`. **Store contract changed:** `lib/store-context.tsx` no longer holds any `entry*`/`newAgreement`/`wizard*` state; it exposes `entryInit`, `openEntry`, and `submitEntry(values)` / `createAgreement(values)` which return `Promise<string|null>` (an error message to display, or null on success and the store closes the dialog). Store-dependent rules (closed month, duplicate reference, balance limits, API/period checks, registration clash) stay in the store with unchanged messages; all API payloads are unchanged. Callers now just `rf.setAgreementOpen(true)`. Verified in headless Chromium side by side with `/legacy` (demo mode): duplicate-reference, over-balance, preview text, save/toast, closed-dialog, expense ≥ ৳5,000 → pending, wizard preview text, incomplete message, duplicate registration and successful creation are all identical. **Intentional differences:** an empty submit shows both field errors inline at once (legacy showed the first only); a failed wizard submit jumps to the first step with an error; Enter now submits the form; selection after save is reflected in the URL (`?selected=`). **Gotcha to remember:** the wizard's Continue and Activate buttons need distinct `key`s — otherwise React reuses the DOM node and flips `type` to submit mid-click, submitting the form early. API-mode submits were not exercised (no backend run this session).
- [x] Step 11 — Added `app/(dashboard)/documents/page.tsx` + `components/features/documents/document-viewer.tsx` (empty-state placeholder; nav item was already in `lib/nav.ts`, sits between Notifications and Settings — 16 items verified). Added `components/features/agreements/expense-responsibility-matrix.tsx` (read-only Fuel/Repair from `agreement.rules`) and `components/shared/audit-timeline.tsx` ("No activity recorded yet."), both rendered in the drawer's agreement view. Verified in headless Chromium: Documents highlights in nav and renders, drawer shows both blocks, no console errors.
- [x] Step 12 — Migrated the Actor portal preview to `app/(dashboard)/actor-preview/page.tsx` (role/account state local to the page). The sidebar workspace switcher is now a real `DropdownMenu` (one workspace, "Add workspace" disabled/labelled not available — there is no multi-workspace backend). The 4 dead imports (`MoreHorizontal`, `Send`, `ShieldCheck`, `SlidersHorizontal`) only existed in the legacy monolith and go away with it in Step 13. Verified in headless Chromium: phone-frame text identical to `/legacy` for every role × account (Owner 3, Driver 4, Customer 4), sidebar-foot link opens `/actor-preview`, dropdown opens, all 18 routes return 200 with no console errors.
- [x] Step 13 — Deleted `app/legacy/page.tsx` and the whole `components/legacy/` folder (its last helpers moved to `components/shared/section-heading.tsx` and `lib/format.ts`; the legacy page remains recoverable from the frontend repo's `first commit`, `git show a23e992:app/legacy/page.tsx`). Cleared stale generated types by deleting the gitignored `.next/` (they still referenced `app/legacy`), then `npm run typecheck` and `npm run build` are green with 17 static routes. Added `scripts/smoke.mjs` (`node scripts/smoke.mjs http://localhost:3000` after `npm run start` → all 17 routes 200). Final headless-Chromium regression (demo mode, no legacy to compare against) passed 32/32 with zero console/network errors: all 16 nav items, filter+sort survive reload, back-navigation restores state, all 5 entry types (≥ ৳5,000 expense lands "Pending approval"), approve, reverse, agreement wizard, persistence across reload, close-settlement sticks, both CSV exports, reset demo, mobile width renders.

## PHASE 1 COMPLETE (all 13 steps done)

Not covered / follow-ups for whoever continues:
- **API mode (`NEXT_PUBLIC_RENTFLOW_API_MODE=1`) was never run this refactor** — no Django backend in the sessions. Request payloads and idempotency keys were carried over unchanged, but the LoadingState → ErrorState paths, live snapshot, retry/approve/reverse/close/entry/agreement POSTs need one manual pass against a running backend (`docker compose up -d`, migrate, `seed_demo`, sign in via `/admin/`).
- Decisions worth a human look: Cashbook CSV export ignores the on-screen owner/search scope (legacy behaviour kept); `FilterToolbar` has no "more filters" `Popover` yet; the workspace switcher lists a single workspace.
- Later-phase, backend-dependent work (explicitly out of scope here): editable `ExpenseResponsibilityMatrix`, multi-invoice `AllocationPanel`, real `AuditTimeline`/`DocumentViewer` data, settlement readiness/exceptions/PDF, effective-dated agreement versions, `[id]` detail routes (swap the `SourceDrawer` wrapper), the whole backend model gap listed in Context.
- Nothing in either repo has been committed; `frontend/` changes are all uncommitted working-tree edits on top of `first commit`.

Files touched so far (all new unless noted): `frontend/lib/demo.ts` (added `today` export only), `frontend/lib/nav.ts`, `frontend/lib/use-list-filters.ts`, `frontend/lib/store-context.tsx`, `frontend/components/legacy/shared.tsx`, `frontend/app/(dashboard)/layout.tsx`, `frontend/app/(dashboard)/page.tsx`, `frontend/app/legacy/page.tsx` (moved from `frontend/app/page.tsx`, untouched), `frontend/components/shared/{money,empty-state,error-state,loading-state}.tsx`, `frontend/app/globals.css` (additive rules only).

## Context

`RentFlow` (in `F:\Clients Work\Vextorion\Rent A Car`) is a one-shot ChatGPT-generated rent-a-car accounting app. The project's `README.md` and `Rent a car_Wireframe prompt.txt` describe the full target product — a Django/Django Ninja accounting backend plus a Next.js management portal and actor portal with ~16 nav screens, 15 reusable domain components, and a deep accounting/settlement domain model. An audit of the current repo found large gaps on both sides:

- **Backend**: a working vertical slice (orgs, agreements, periods, expenses, payments, balanced journal, idempotency) but missing most spec structures (no `AgreementVersion`, `ExpenseRule`, `DriverAssignment`, `Document`, `Approval`, `AuditEvent`, persisted `Settlement`).
- **Frontend**: the *entire app* is one 89-line component (`frontend/app/page.tsx`) faking navigation via `useState` and a `?view=` query param. None of the required nav routes are real Next.js routes, none of the 15 required shared components exist, and TanStack Table / React Hook Form / Zod aren't installed.

The user chose to tackle **frontend architecture first**, scoped to just this phase: break the monolith into real routes and build the foundational shared components/libraries, migrating existing functionality without regressing it — not building out full final content for every screen (deep wizard/settlement/matrix content is later-phase, backend-dependent work). Backend model work is an explicitly separate future phase.

This plan was produced by an Explore audit of `frontend/` (confirmed by directly reading all 89 lines of `page.tsx`) and a Plan agent's detailed design, cross-checked against the real file.

## Key facts driving the design

- No `components.json` exists. The 7 current `components/ui/*` files (button, dialog, input, select, sheet, table, tabs) were hand-copied from shadcn in the newer generator style (`radix-ui` unified import, `data-slot` attributes, `cva`, `cn()`). New primitives should be added the same way — **not** via `npx shadcn add`, which would run `shadcn init` and risk clobbering the bespoke theme tokens already in `app/globals.css` (~500 lines of custom classes + two vendored CSS files under `frontend/vendor/`).
- The backend contract must not change: `liveSnapshot()`/`livePost()` in `frontend/lib/api.ts` and the pure `statement()`/`totals()`/`money()` helpers in `frontend/lib/demo.ts` keep their exact signatures; only their *callers* move out of `page.tsx`.
- Confirmed real bugs to fix as part of this refactor (not scope creep — they're direct casualties of the monolith structure):
  - `ready` (`page.tsx:26`) is set but never read to gate rendering — there is no real loading state today.
  - `money()` (`lib/demo.ts`) never applies a sign; every negative-value call site hand-rolls `{value<0?'−':''}` (`page.tsx:76`, `:88`) — duplicated logic `Money` should absorb.
  - Dead controls: the workspace-switcher chevron (`page.tsx:58`) has no `onClick`; imports `MoreHorizontal`, `Send`, `ShieldCheck`, `SlidersHorizontal` (`page.tsx:3`) are unused, signalling planned-but-never-built controls.
- Required nav (from the wireframe) has 16 items; current `nav` array (`page.tsx:15`) has 15 — **Documents** is missing entirely (no page, no route). "Actor portal" is a separate sidebar-foot preview link, not one of the 16 nav items — keep it that way.

## Route plan

Replace `frontend/app/page.tsx` with a real App Router tree:

```
frontend/app/
├── layout.tsx                     # unchanged
├── (dashboard)/
│   ├── layout.tsx                 # NEW: left rail + header shell (from page.tsx:57-61) wrapping a store provider
│   ├── page.tsx                   # Overview
│   ├── agreements/page.tsx
│   ├── vehicles/page.tsx
│   ├── customers/page.tsx
│   ├── owners/page.tsx
│   ├── drivers/page.tsx
│   ├── expenses/page.tsx
│   ├── billing/page.tsx
│   ├── owner-payables/page.tsx
│   ├── payroll/page.tsx
│   ├── settlements/page.tsx
│   ├── cashbook/page.tsx
│   ├── reports/page.tsx
│   ├── notifications/page.tsx
│   ├── documents/page.tsx         # NEW route, empty-state only — fills the missing nav item
│   ├── settings/page.tsx
│   └── actor-preview/page.tsx     # non-nav preview, sidebar-foot link only
```

No `[id]` detail routes yet — full detail-page content is out of scope this phase. Instead, keep the "click a row → open a drawer" pattern but make it **URL-real**: each list route reads/writes `?selected=<id>` via `useSearchParams`/`useRouter`, so back/forward and refresh both work. Structure that drawer as its own `SourceDrawer` component so a future phase can promote it to a real `[id]` page by swapping the wrapper only.

## Shared state and data layer

- New `frontend/lib/store-context.tsx`: a client Context provider that owns exactly what `Home()` owns today — `store`, `ready`, `apiError`, `apiBusy`, `toast`, and every mutation (`refreshLive`, `openEntry`, `submitEntry`, `approve`, `reverse`, `closeSettlement`, `createAgreement`, `exportEntries`, `exportReport`). Mechanical extraction of `page.tsx:26-54`, logic unchanged. `(dashboard)/layout.tsx` wraps `children` in it.
- This is also where the `ready`/loading-state bug gets fixed and where `apiError` is finally routed through a real `ErrorState` component.
- No server-component data fetching in this phase — demo mode is `localStorage`-bound and API mode relies on browser-sent session/CSRF cookies (`lib/api.ts`), so keep the fetch client-side as it is today; just move it out of the render function.
- Per-screen filters: each list route owns its own filter state via `useSearchParams()`/`router.replace()`, through a new small hook `frontend/lib/use-list-filters.ts`, replacing the single shared filter state (`page.tsx:28`, `filterURL`/`changeSearch`/`changeOwner`/`changeStatus` at `:37-40`) that doesn't make sense once each screen is its own route.
- `lib/demo.ts` and `lib/api.ts`: no signature changes.

## Screen-by-screen migration (source → destination)

| Screen (page.tsx) | New route | Notes |
|---|---|---|
| Overview (`:62`) | `(dashboard)/page.tsx` | metric cards, per-agreement table, activity, attention queue, quick actions |
| Agreements (`:63`) | `agreements/page.tsx` | first full conversion — pairs with `LedgerTable`/`FilterToolbar`/`PartyChip` |
| Vehicles (`:64`) | `vehicles/page.tsx` | vehicle-card grid |
| Customers/Owners/Drivers (`:65`) | `customers/`, `owners/`, `drivers/page.tsx` | split combined branch into 3 pages sharing one parameterized feature component |
| Expenses (`:66`) | `expenses/page.tsx` | |
| Billing (`:67`) | `billing/page.tsx` | |
| Owner payables (`:68`) | `owner-payables/page.tsx` | |
| Payroll (`:69`) | `payroll/page.tsx` | |
| Settlements (`:70`) | `settlements/page.tsx` | banner + card grid + confirm-close dialog |
| Cashbook (`:71`) | `cashbook/page.tsx` | |
| Reports (`:72`) | `reports/page.tsx` | `reportConfig`/`ReportTable` (`:87-88`) move to `lib/reports.ts` |
| Notifications (`:73`) | `notifications/page.tsx` | |
| — | `documents/page.tsx` | new, `DocumentViewer` shell + `Empty` |
| Settings (`:74`) | `settings/page.tsx` | |
| Actor portal (`:75`) | `actor-preview/page.tsx` | |
| Detail Sheet (`:77`) | cross-cutting | → `SourceDrawer`, mounted once in the dashboard layout |
| Entry Dialog (`:78-79`) | cross-cutting | → `RecordEntryDialog` |
| Agreement wizard (`:80`) | cross-cutting | → `NewAgreementDialog` |

New folders: `frontend/components/shared/` for the 15 global components, `frontend/components/features/<screen>/` for screen-specific presentational pieces, `components/ui/` stays pure shadcn primitives only.

## Component plan

**Build fully now:**
- `Money` (`components/shared/money.tsx`) — `{value, signed?, className?}`; wraps `money()` and fixes the sign-duplication bug. First use: Overview metric cards.
- `Empty` — promote the local helper (`page.tsx:22`) to `components/shared/empty-state.tsx` with `{icon?, title, description?, action?}`. Replaces all 5 existing `<Empty text=.../>` sites; gives Documents its first real empty state.
- `ErrorState` (new) — `{message, onRetry?}`. Replaces the raw `apiError` div (`page.tsx:61`).
- `LoadingState` (new) — page-shell skeleton. Wired into the `ready` gate in `store-context.tsx` (this is the actual bug fix).
- `BalanceBreakdown` — `{title?, lines: {label, value, emphasis?}[]}`. Near drop-in for the Sheet's statement tab bodies (`page.tsx:77`) and the `mini-metrics`/`settlement-figures` blocks (`:67`, `:70`), which are already the same `{label,value}` shape.
- `PartyChip` — `{name, role, onClick?}`. Replaces plain name cells in Agreements/Owner payables/Payroll/Customers-Owners-Drivers tables.
- `LedgerTable` — built on `@tanstack/react-table` + existing `components/ui/table.tsx`, with real keyboard-accessible sortable headers (`aria-sort`), fixing today's unlabeled sort `<button>` (`page.tsx:85`). Replaces `AccountTable` (`:85`), `EntryTable` (`:86`), `ReportTable` (`:88`), and the inline tables at `:65`, `:68`, `:69`.
- `FilterToolbar` — replaces the `tableFilter` constant (`page.tsx:55`), backed by `use-list-filters`.

**Shell-only (explicitly not final — flag as later-phase domain work):**
- `AgreementContext` — minimal relation strip, no editing/history yet.
- `ExpenseResponsibilityMatrix` — read-only, 2 rows (fuel/repair) for now; full 8-row editable matrix is later-phase.
- `AllocationPanel` — read-only single allocation; multi-invoice split UI is later-phase (Screen F).
- `EntryConsequencePreview` — straight extraction of the existing `.consequence` JSX (`page.tsx:79`), logic unchanged.
- `SettlementStatement` — extraction of the 4-tab Tabs block (`page.tsx:77`); readiness badges/exceptions/PDF are later-phase.
- `SourceDrawer` — generalizes the Sheet's 3-way ternary (`current`/`currentEntry`/`currentNotice`) behind a `{subject:{kind,id}}` prop.
- `ApprovalBanner` — shared banner for pending-approval state, replacing scattered conditional buttons.
- `DeliveryStatus` — thin badge wrapper around the existing status→tone mapping.
- `AuditTimeline` — pure placeholder ("No activity recorded yet") — there's no audit endpoint on the backend at all yet.
- `DocumentViewer` — pure placeholder for the new Documents route — no backend document model exists yet.

## Libraries

Add: `@tanstack/react-table` (first used in `LedgerTable`/Agreements), `react-hook-form` + `zod` + `@hookform/resolvers` (first used in `RecordEntryDialog`, replacing the manual `useState` fields and hand-rolled validation in `submitEntry` at `page.tsx:45-48` with an equivalent zod schema — a port, not new rules).

Add missing shadcn primitives **by hand-copying** (matching the existing file style, not the CLI): `card`, `badge`, `checkbox`, `dropdown-menu`, `popover`, `textarea`, `form` into `components/ui/`. First uses: `Card`/`Badge` replace the local helpers (`page.tsx:19-20`) on the first migrated screen; `Checkbox` replaces raw checkboxes (`:78`, `:80`); `DropdownMenu` finally wires the dead workspace-switcher chevron (`:58`) and gives `MoreHorizontal` a destination (row actions in `LedgerTable`); `Popover` gives `SlidersHorizontal` a destination ("more filters" on `FilterToolbar`); `Textarea` optionally replaces the `window.prompt()` reverse-reason (`:50`); `Form` pairs with React Hook Form.

## Sequencing (independently testable steps)

1. Scaffold `(dashboard)/layout.tsx` + `store-context.tsx` (mechanical extraction, logic unchanged). Move the current file to `app/legacy/page.tsx` so it stays reachable during migration. New root `(dashboard)/page.tsx` initially just re-renders the Overview JSX inline.
   - Verify: `npm run typecheck && npm run build`; `/` and `/legacy` render identically in demo and API mode.
2. Build `Money`, `Empty`, `ErrorState`, `LoadingState`; wire the `ready`/`apiError` gates into `store-context.tsx`.
   - Verify: stop the Django backend, reload in API mode → see `ErrorState`, not a blank screen.
3. Hand-copy `card`, `badge`, `checkbox`, `dropdown-menu`, `popover`, `textarea`, `form`. Swap `Badge`/`Card` on the Overview screen only.
   - Verify: visual diff Overview old vs. new is pixel-identical.
4. Install `@tanstack/react-table`. Build `LedgerTable`, `FilterToolbar`, `PartyChip`, `use-list-filters`. Fully migrate `agreements/page.tsx` with real `?q=/?owner=/?status=/?sort=/?selected=`.
   - Verify: sort/filter state survives browser back/forward and hard refresh; demo and API mode both list correctly.
5. Migrate Vehicles, Customers, Owners, Drivers onto the same foundation.
   - Verify: figures match `/legacy` for the same data.
6. Migrate Expenses, Billing, Owner payables, Payroll, Cashbook, Reports (move `reportConfig`/CSV helpers to `lib/reports.ts`, logic unchanged).
   - Verify: exported CSVs are byte-identical to `/legacy`'s.
7. Migrate Settlements; extract `SettlementStatement`, `AgreementContext`, `ApprovalBanner` shells.
   - Verify: close flow still posts/persists and the "Closed" badge sticks after reload.
8. Migrate Notifications and Settings; extract `DeliveryStatus`.
   - Verify: retry-failed-notice and reset-demo-data both still work.
9. Build the real `SourceDrawer` (replacing the 3-way ternary everywhere via `?selected=`); extract `AllocationPanel` and `EntryConsequencePreview`.
   - Verify: opening an agreement/entry/notice from any migrated screen shows the same content as `/legacy`'s Sheet.
10. Install `react-hook-form`+`zod`+`@hookform/resolvers`; rebuild `RecordEntryDialog` and the agreement wizard dialog on RHF+zod with inline errors.
    - Verify: invalid input shows the same validation messages as today's manual checks.
11. Add the Documents route (`DocumentViewer` + `Empty`); insert "Documents" into the nav config between Notifications and Settings. Add `ExpenseResponsibilityMatrix` (read-only) and `AuditTimeline` placeholder into `SourceDrawer`'s agreement view.
    - Verify: Documents appears correctly positioned in the rail; empty state renders; no console errors.
12. Migrate the Actor portal preview to `actor-preview/page.tsx`; wire the dead workspace chevron to `DropdownMenu`; remove or use the 4 dead imports.
    - Verify: sidebar-foot link still opens the same phone-mock UI.
13. Delete `app/page.tsx` and `app/legacy/page.tsx`. Final `npm run typecheck && npm run build` and full manual regression pass.

## Verification

- Automated, must stay green throughout: `cd frontend && npm run typecheck && npm run build` (per existing README).
- Optional/cheap addition: a tiny `frontend/scripts/smoke.mjs` using built-in `fetch` to hit all 16 dashboard routes + root after `npm run build && npm run start`, asserting HTTP 200 — no new test framework needed for this phase.
- Manual, demo mode (`NEXT_PUBLIC_RENTFLOW_API_MODE=0`): click through all 16 nav items; verify filter/sort/search state survives back-navigation and hard refresh on every list screen; submit all 5 entry types including one ≥ ৳5,000 expense (must land "Pending approval"); complete the agreement wizard; close a settlement; retry a failed notification; reset demo data; reload mid-session and confirm `localStorage` persistence.
- Manual, API mode (`NEXT_PUBLIC_RENTFLOW_API_MODE=1`, backend running, signed in via Django admin first): confirm `LoadingState` shows then resolves; stop the backend and confirm `ErrorState` renders instead of a blank page; record one of each entry type, approve/reverse an expense, retry a notification, close a period — confirm each POST still carries `Idempotency-Key` and hits the same endpoints as before.

## Critical files

- `frontend/app/page.tsx` (source of the migration)
- `frontend/lib/demo.ts`, `frontend/lib/api.ts` (contracts to preserve)
- `frontend/app/globals.css` (existing classes/tokens new components must render into)
- `frontend/components/ui/button.tsx` (reference for the hand-copy style of new primitives)
- `backend/rentals/api.py` (confirms the `/snapshot` and POST payload shapes that must keep working unchanged)
