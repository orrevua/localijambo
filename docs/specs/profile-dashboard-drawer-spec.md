# Profile, Dashboard & Side-Menu Drawer — Spec

**Status:** Draft
**Date:** 2026-08-25
**Related:** `docs/HANDOFF.md`, `docs/specs/localijambo.md`, `docs/specs/localijambo-data-model.md`

## Goal
Add three user-facing capabilities to the Localijambo PWA: (1) a slide-in navigation **drawer** (hamburger in the header) to reach Profile, Dashboard, Map and List; (2) a **Profile** page summarizing the signed-in user's own trees; (3) a **Dashboard** that compares the user's trees' phenology/jambo status (ready-now list, season timeline, comparison table, summary charts). All harvest/season logic reuses the existing phenology predictor.

## Context & Current State
- Domain type: `src/types/tree.ts` — `fruitingStatus`, `ripeness`, `isShared`, `ownerId`, `createdAt`, `updatedAt`.
- Phenology predictor: `src/lib/phenology.ts` — `predictFruiting(tree, now)` returns `{ stage, daysToRipeMin, daysToRipeMax, label, inSeason, confidence, windowClosing }`. Exports window constants (`FLOWERING_WINDOW` `{8,2}`, `HARVEST_WINDOW` `{12,5}`, `GREEN_FRUIT_WINDOW`, etc.), `monthInWindow(month, window)`, `localDay`, `daysBetween`. Reuse these; do not reinvent phenology math.
- Data access: `src/data/treesRepo.ts` — `listVisible()` reads `trees_view` with IndexedDB `trees_cache` fallback and `mergePending()` merge. `currentOwnerId()` (private helper, `treesRepo.ts:8`) resolves the signed-in user id from the Supabase session.
- Row mapping: `src/data/treeRow.ts` — `fromRow(row)`, `TreeRow` (snake_case columns incl. `owner_id`).
- IndexedDB helpers: `src/lib/idb.ts` — `idbGetAll('trees_cache')`, `idbPut`. `trees_cache` keyPath is `clientId`.
- Auth: `src/auth/useAuth.ts` → `useAuth()` returns `AuthContextValue` (`src/auth/AuthContext.ts`) incl. `user: User | null` (Supabase `user.id`).
- Routing: `src/main.tsx` — `createBrowserRouter`; `App` layout wraps children (`index → MapView`, `list`, `tree/:id`) under `RequireAuth`.
- Shell/nav: `src/App.tsx` (Header, OfflineIndicator, SyncStatusBadge, Outlet, BottomNav, wrapped by `AddTreeModalProvider`), `src/components/Header.tsx` (logo + wordmark only), `src/components/BottomNav.tsx` (`NavLink` list + Add button).
- Overlay pattern: `src/features/add-tree/AddTreeModalProvider.tsx` — backdrop click close, Escape key handler, `document.body.style.overflow` scroll-lock, `role="dialog"`/`aria-modal`, CSS-module tokens.
- Shared UI: `src/components/StateMessage.tsx` — `{ title, detail?, tone?, action?, children? }` for empty/error/loading.
- Design tokens: `src/styles/theme.css` — `--space-*`, `--color-crimson`, `--color-cream`, `--color-ink`, `--color-leaf`, `--radius-md`, `--header-height`, `--nav-height`.

## Proposed Design

### Data flow (shared)
```
useAuth().user.id ─┐
                   ├─► treesRepo.listMine(ownerId) ──► Tree[] (own public + private, offline-first)
now = new Date() ──┘                                        │
                                                            ▼
                        treeStats.ts (PURE)  buildTreeStats(trees, now) ──► TreeStatsVM
                                                            │
                          ┌─────────────────────────────────┼───────────────────────────────┐
                          ▼                                  ▼                                ▼
                   Profile page                       Dashboard page                    (both consume VM)
```
- Both pages own their own data-loading `useEffect` (same pattern as `TreeListScreen.tsx:12`): call `listMine(user.id)`, then feed result + a single `new Date()` into the pure `buildTreeStats`. `now` is captured once at load and passed down — never called inside pure logic.
- Drawer is navigation-only; it does not load data.

### Repo addition — `listMine(ownerId)`
Add `listMine(ownerId: string): Promise<Tree[]>` to `src/data/treesRepo.ts`.
- Query `trees` (base table, not `trees_view`) `select('*').eq('owner_id', ownerId).order('created_at', { ascending: false })`, `fromRow`, write each into `trees_cache` (`idbPut`), then `mergePending(server)` filtered to `ownerId`.
- On error, fall back to `idbGetAll('trees_cache')` filtered to `ownerId` (also `mergePending`-merged, then filtered).
- **Filtering must happen after `mergePending`** and must filter by `ownerId` so cached shared trees from other owners never appear on Profile/Dashboard.

**Trade-off (decision recorded):** prefer a dedicated `listMine` over filtering `listVisible()`.
- `listVisible()` reads `trees_view`. Whether that view exposes the owner's *private* rows depends on the view definition + RLS. Owner-can-read-own-private is guaranteed at the `trees` table by RLS, but the view may pre-filter to shared-only. Querying `trees` directly with `.eq('owner_id', ...)` is unambiguous and RLS-safe (owner always reads own rows). See Open Questions Q1 — no schema change assumed.
- Cost: one extra small repo function (~20 LOC). Benefit: correctness and clarity; avoids Profile silently undercounting private trees.

### Pure stats module — `src/lib/treeStats.ts`
Signature: `buildTreeStats(trees: Tree[], now: Date): TreeStatsVM`. No `Date.now()`, no I/O. Calls `predictFruiting(tree, now)` per tree once and derives everything from those predictions + tree fields.

```ts
export interface TreeStatEntry {
  tree: Tree;
  prediction: FruitingPrediction;      // from predictFruiting(tree, now)
  daysToRipe: number;                  // sort key; see rules below
  inSeasonNow: boolean;                // prediction.inSeason
  readyNow: boolean;                   // stage 'harvest' || 'overripe' (fruit available)
  lastObservedDays: number | null;     // daysBetween(localDay(updatedAt), localDay(now)); null if unparsable
  stale: boolean;                      // lastObservedDays == null || > STALE_THRESHOLD_DAYS
}

export interface StageCount { stage: PhenologyStage; count: number; }
export interface MonthCount { month: number; count: number; } // 1-12, in-season tree count that month

export interface TimelineBand {                 // one per tree, for the year timeline
  tree: Tree;
  floweringMonths: number[];   // months (1-12) within FLOWERING_WINDOW
  harvestMonths: number[];     // months (1-12) within HARVEST_WINDOW
  peakMonths: number[];        // months within HARVEST_PEAK
}

export interface TreeStatsVM {
  total: number;
  sharedCount: number;
  privateCount: number;
  byFruitingStatus: Record<FruitingStatus, number>;
  byRipeness: Record<Ripeness, number>;
  byStage: StageCount[];             // ordered by PhenologyStage enum order
  inSeasonNowCount: number;          // entries where inSeasonNow
  readyNowCount: number;
  perMonthInSeason: MonthCount[];    // 12 entries, Jan..Dec
  entries: TreeStatEntry[];          // all trees, unsorted (stable input order)
  readyNow: TreeStatEntry[];         // readyNow entries, sorted soonest-first
  upcoming: TreeStatEntry[];         // non-ready entries, sorted by daysToRipe asc
  timeline: TimelineBand[];          // one per tree, input order
}
```

**`daysToRipe` sort key rule:** use `prediction.daysToRipeMin` as the primary sort key (soonest possible harvest). `readyNow` entries all have `daysToRipeMin === 0`; break ties by `updatedAt` descending (most recently observed first) so fresh ripe trees lead. `upcoming` = entries not `readyNow`, sorted `daysToRipe` ascending, tie-break `updatedAt` desc.

**Timeline construction:** for each tree, iterate months 1..12 and use `monthInWindow(m, FLOWERING_WINDOW | HARVEST_WINDOW | HARVEST_PEAK)`. Bands are per-tree but window months are currently species-uniform (all jambo share one calendar), so all bands share the same month sets — still emitted per tree so the UI can render one row per tree. Year-wrap (e.g. `HARVEST_WINDOW {12,5}`) is handled entirely by `monthInWindow`, which already supports wrapping windows — no manual wrap logic in `treeStats`.

**`perMonthInSeason`:** count of the user's trees whose harvest window covers each month = for each month `m`, count trees where `monthInWindow(m, HARVEST_WINDOW)`. (Uniform today, but computed per-tree to stay correct if per-tree calendars are ever introduced.)

### Drawer — `src/features/nav/` (new feature folder)
Follow the `AddTreeModalProvider` overlay conventions.
- `NavDrawerContext.ts` — context `{ open: () => void; close: () => void; isOpen: boolean }`.
- `useNavDrawer.ts` — `use(NavDrawerContext)` guard hook (mirror `useAuth`).
- `NavDrawerProvider.tsx` — state + Escape handler + `document.body.style.overflow` scroll-lock (copy `AddTreeModalProvider.tsx:27-39`). Renders backdrop + left-sliding `<aside role="dialog" aria-modal aria-label="Menu">` with `NavLink`s to `/`, `/list`, `/profile`, `/dashboard`. Each `NavLink onClick={close}` (close on nav). Backdrop click closes. Include a sign-out action calling `useAuth().signOut`.
- `NavDrawer.module.css` — backdrop (fixed, fade), panel (fixed left, translateX transition, `--color-cream`, `max-width: 18rem`, `100%` on very small screens). Works mobile + desktop (drawer is width-capped, not full-bleed on desktop).
- Header gets a hamburger `<button aria-label="Open menu">` that calls `open()`. `NavDrawerProvider` wraps the shell in `App.tsx` (sibling to `AddTreeModalProvider`), so both Header and drawer share context.

### Profile page — `src/features/profile/ProfileScreen.tsx`
- Reads `useAuth().user`; if null, render `StateMessage` (shouldn't happen under `RequireAuth`, defensive only).
- Loads `listMine(user.id)`, builds VM, captures `now` once.
- Renders (no editable display name):
  - Header block: user email (`user.email`) as read-only identity.
  - **Total trees** = `vm.total`.
  - **Shared vs private**: `vm.sharedCount` / `vm.privateCount`.
  - **By fruiting status**: `vm.byFruitingStatus`.
  - **By ripeness**: `vm.byRipeness`.
  - **In season now**: `vm.inSeasonNowCount` (and `vm.readyNowCount` as a sub-stat).
- Loading/empty/error via `StateMessage` (empty: "No trees yet" + action to `/` Add).
- Presentational stat cards use `ProfileScreen.module.css` with tokens.

### Dashboard page — `src/features/dashboard/DashboardScreen.tsx`
Loads `listMine(user.id)` + `buildTreeStats`. Composes four presentational subcomponents (each in `src/features/dashboard/`), all fed VM slices — no data logic in UI:
1. **`ReadyNowList`** — `vm.readyNow` (soonest first): variety/species, `prediction.label`, `inSeasonNow` badge, link to `/tree/:id`. Empty → inline "Nothing ripe right now" message.
2. **`SeasonTimeline`** — `vm.timeline`: one row per tree, a 12-column CSS-grid year bar; flowering months tinted `--color-leaf`, harvest months `--color-crimson`, peak months a stronger crimson. Month headers Jan..Dec. Pure CSS/SVG, no chart lib.
3. **`StatusTable`** — `vm.entries`: columns = tree (variety/species), stage, days-to-ripe (`prediction.daysToRipeMin`–`Max`, or "now"), in-season (yes/no), last observed (`lastObservedDays` humanized; `stale`/"unknown" when null). Sort by `daysToRipeMin` asc for scannability (sort in the component from the VM slice, or expose `vm.entries` pre-sorted — see Unit 3 note).
4. **`SummaryCharts`** — two dependency-free bar charts from `vm.byStage` (trees per stage) and `vm.perMonthInSeason` (trees in-season per month). CSS bars (`height`/`width` %), SVG optional. No lib.

**Charts dependency policy:** CSS/SVG only. A tiny lib is *not* justified for two bar charts; do not add one.

## Scope
- **In scope:** `listMine` repo fn; `treeStats.ts` pure module + tests; nav drawer feature; hamburger in Header; `/profile` and `/dashboard` routes + screens; dashboard subcomponents; CSS modules; empty/offline/error states.
- **Out of scope:** auth changes (keep Supabase magic-link, use current `useAuth().user`); editable display name / profile edit; any schema/RLS/`trees_view` change (assumed unnecessary — see Q1); per-species phenology calendars; BottomNav changes (drawer supersedes need; leave BottomNav as-is).

## Interfaces / Models / Endpoints
- `treesRepo.ts`: `export async function listMine(ownerId: string): Promise<Tree[]>`.
- `treeStats.ts`: `buildTreeStats(trees: Tree[], now: Date): TreeStatsVM` + exported interfaces above.
- `NavDrawerContext` value: `{ isOpen: boolean; open(): void; close(): void }`.
- Routes (children of `App` under `RequireAuth`): `{ path: 'profile', element: <ProfileScreen /> }`, `{ path: 'dashboard', element: <DashboardScreen /> }`.
- No new Supabase RPC, table, view, or column.

## Impact Analysis
- **New routes** in `src/main.tsx` — additive; existing routes untouched.
- **Nav** — Header gains a button; `App.tsx` gains a provider wrapper. BottomNav unchanged. Drawer links include the two new routes + existing Map/List.
- **Repo** — one added exported function; `listVisible`, `mergePending`, `create`, etc. unchanged. `listMine` reuses `fromRow`, `mergePending`, `idb` helpers.
- **Tests** — new `src/lib/treeStats.test.ts` (pure). Existing phenology tests unaffected. No existing test breaks (additive change).
- **Security/perf** — `listMine` returns only own rows (owner-scoped query + post-filter), no PII beyond the session user's own email shown to themselves. Pages load all own trees once; aggregation is O(n) over the user's trees — negligible.
- **Migration/compat** — none; purely additive, offline-first path preserved via `trees_cache`.

### Edge cases (must handle)
- **No trees yet:** `total === 0` → Profile & Dashboard show `StateMessage` empty state with Add action; subcomponents guard empty arrays.
- **Offline:** `listMine` falls back to `trees_cache` filtered by `ownerId`; VM still builds. Pages render cached data (SyncStatusBadge/OfflineIndicator already in shell).
- **Stale / unknown condition:** `predictFruiting` already degrades to calendar confidence past `STALE_THRESHOLD_DAYS`; `TreeStatEntry.stale` flags it; StatusTable shows "unknown"/stale for `lastObservedDays === null` (unparsable `updatedAt`).
- **`ripeness: 'unknown'` / `fruitingStatus: 'none'`:** counted in `byRipeness`/`byFruitingStatus`; predictor yields dormant/calendar stage — no special-casing in stats.
- **Timeline year-wrap:** handled by `monthInWindow` (already supports wrapping windows) — no manual logic.
- **Drawer:** Escape + backdrop + nav-click all close; scroll-lock restored on unmount (copy provider cleanup exactly); focusable hamburger with `aria-label`.

## Implementation Units
1. **Pure stats module** — files: `src/lib/treeStats.ts` — change: implement `buildTreeStats(trees, now)` + exported types; call `predictFruiting`, reuse `monthInWindow`/window constants/`daysBetween`/`localDay`/`STALE_THRESHOLD_DAYS`; implement counts, `readyNow`/`upcoming` sorting, timeline bands, `perMonthInSeason`. **Pure logic.** — acceptance: `tsc` clean; function is total (handles empty array), no `Date.now()` inside.
2. **Stats tests** — files: `src/lib/treeStats.test.ts` — change: Vitest cases with fixed `now` and fixed tree fixtures covering: empty input; shared/private counts; `byRipeness`/`byFruitingStatus`; ready-now sort order (ripe leads, soonest first); in-season count for an in-harvest month; timeline month membership incl. year-wrap (`HARVEST_WINDOW`); stale entry (`updatedAt` old → `stale === true`, calendar confidence). **Pure logic (tested).** — acceptance: `npx vitest run` green; depends on Unit 1.
3. **`listMine` repo fn** — files: `src/data/treesRepo.ts` — change: add owner-scoped `listMine(ownerId)` querying `trees` with `trees_cache` fallback, both filtered by `ownerId` after `mergePending`. — acceptance: `tsc`/lint clean; returns only `ownerId` rows online and offline. Independent of Units 1–2.
4. **Nav drawer context + provider** — files: `src/features/nav/NavDrawerContext.ts`, `src/features/nav/useNavDrawer.ts`, `src/features/nav/NavDrawerProvider.tsx`, `src/features/nav/NavDrawer.module.css` — change: overlay provider mirroring `AddTreeModalProvider` (Escape/backdrop/scroll-lock), left-sliding aside with `NavLink`s to `/`, `/list`, `/profile`, `/dashboard` (close on click) + sign-out via `useAuth`. **UI.** — acceptance: opens/closes via context; Escape/backdrop/nav close; scroll-lock cleaned up; mobile + desktop layouts.
5. **Header hamburger + shell wiring** — files: `src/components/Header.tsx`, `src/components/Header.module.css`, `src/App.tsx` — change: add hamburger button (`aria-label="Open menu"`) calling `useNavDrawer().open()`; wrap shell in `NavDrawerProvider` (sibling to `AddTreeModalProvider`). **UI.** — acceptance: hamburger opens drawer; existing header layout preserved. Depends on Unit 4.
6. **Routes** — files: `src/main.tsx` — change: add `profile` and `dashboard` children under `App`. **UI/config.** — acceptance: both routes render placeholders/screens under `RequireAuth`; existing routes unaffected. (Can land with Unit 7/8.)
7. **Profile screen** — files: `src/features/profile/ProfileScreen.tsx`, `src/features/profile/ProfileScreen.module.css` — change: load `listMine(user.id)`, build VM, render identity + total + shared/private + by-status + by-ripeness + in-season-now; `StateMessage` for loading/empty/error. **UI.** — acceptance: renders real stats; empty/offline states work. Depends on Units 1, 3, 6.
8. **Dashboard screen + subcomponents** — files: `src/features/dashboard/DashboardScreen.tsx`, `.../ReadyNowList.tsx`, `.../SeasonTimeline.tsx`, `.../StatusTable.tsx`, `.../SummaryCharts.tsx`, `src/features/dashboard/Dashboard.module.css` — change: load VM once; compose the four sections from VM slices; dependency-free CSS/SVG charts; empty guards. **UI.** — acceptance: all four sections render from one VM; no chart lib added; empty/offline states work. Depends on Units 1, 3, 6. *(Split into 8a screen+ReadyNowList+StatusTable, 8b SeasonTimeline+SummaryCharts if any file exceeds ~50 LOC.)*

## Open Questions
1. **RLS/view (non-blocking, assume no change):** confirm `trees` RLS lets an owner `SELECT` their own `is_shared = false` rows (expected per `docs/specs/localijambo-data-model.md`). `listMine` queries `trees` directly with `.eq('owner_id', ...)`, which relies on this. If the owner-read-own policy is missing, that is a data-model fix, not a change to this spec. No schema change assumed.
2. **Drawer vs BottomNav overlap:** BottomNav keeps Map/List/Add; drawer adds Profile/Dashboard (+ Map/List for completeness). Acceptable redundancy; revisit if nav feels duplicated after Unit 5.
