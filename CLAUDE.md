# RentFlow frontend

Next.js App Router + TypeScript + Tailwind + Radix/shadcn-style primitives.

## Status

The monolith-to-routes refactor (Phase 1, 13 steps) is **complete**. Plan, decisions and follow-ups: `docs/FRONTEND_REFACTOR_PLAN.md` — read its "PHASE 1 COMPLETE" section before starting new work.

## Layout

- `app/(dashboard)/<route>/page.tsx` — one route per nav item (`lib/nav.ts`); `app/(dashboard)/layout.tsx` is the shell and mounts the cross-cutting `SourceDrawer`, `RecordEntryDialog`, `NewAgreementDialog`.
- `lib/store-context.tsx` — all state and mutations. Forms return `Promise<string|null>` (error message or null).
- `components/shared/` reusable domain components, `components/features/<area>/` screen-specific pieces, `components/ui/` shadcn-style primitives.

## Rules

- Do not change the backend contract (`lib/api.ts`, `statement()`/`totals()`/`money()` in `lib/demo.ts`); every money-changing POST keeps its `Idempotency-Key`.
- Add shadcn primitives by hand-copying into `components/ui/`, not via `npx shadcn add` (it would clobber the bespoke theme in `app/globals.css`).
- Pin `@tanstack/react-table` to 8.x (9.x has a different API).
- List state lives in the URL (`?q=`, `?owner=`, `?status=`, `?sort=`, `?selected=`) via `lib/use-list-filters.ts`.

## Verify

`npm run typecheck && npm run build`, then `npm run start` and `node scripts/smoke.mjs http://localhost:3000`. If typecheck complains about `.next/**` types after deleting a route, delete `.next/`.
