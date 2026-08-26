# Localijambo — Session Handoff

**Date:** 2026-08-25
**Status:** All 33 code units implemented & verified. Blocked on one manual user step (Unit 9: Supabase project).

## What this is
Offline-first, mobile PWA to locate/save/track jambo vermelho (*Syzygium malaccense*) fruit trees in NE Brazil. Walk + capture via GPS, or drop manually on a map. Multi-user with sharing.

## Stack (as built)
Vite 7 + React 19 + TS 5.9 · react-router 8 · vite-plugin-pwa 1.3 (Workbox) · MapLibre GL 5 + OSM raster · Supabase (Postgres/PostGIS + Auth + Storage) via @supabase/supabase-js 2 · IndexedDB via idb 8 · Vitest 4.

## Spec docs
- `docs/specs/localijambo.md` — master spec, 33 units in 7 phases.
- `docs/specs/localijambo-data-model.md` — schema, RLS, storage, Supabase runbook.
- `docs/specs/localijambo-offline-sync.md` — idb stores, flush/backoff, upsert_tree RPC, background sync.

## Progress (Architect → Implementer flow)
- ✅ Phase A (1–4) Skeleton — Vite/React/TS, tooling, theme/palette, router + bottom nav.
- ✅ Phase B (5–7) PWA — manifest, icons, Workbox runtime caching (OSM CacheFirst, REST NetworkFirst).
- ✅ Phase C code (8,10,11) — env.ts, supabase client, AuthProvider/useAuth, magic-link LoginScreen + route guard.
- ⬜ **Unit 9 (MANUAL, USER)** — create Supabase project + run schema/RLS/RPC/storage; fill `.env`. **Blocks live use.**
- ✅ Phase D (12–17) — types, treesRepo (upsert_tree RPC + trees_view), MapView/MapLibre, markers, list, detail w/ owner controls.
- ✅ Phase E (18–23) — geo watch + accuracy tiers, live GPS capture, manual reticle drop, TreeForm, photo resize + upload.
- ✅ Phase F (24–30) — idb queue, online status/indicators, offline-first create, flush + backoff + SyncProvider, photo offline sync, listVisible merge/dedupe, background sync.
- ✅ Phase G (31–33) — branded jambo icons + header logo, empty/error/loading states, tests (10 passing).

## Verification (last run, all green)
`npx tsc --noEmit` · `npm run lint` · `npm run build` · `npx vitest run` (3 files, 10 tests).

## NEXT STEP (blocking)
Complete **Unit 9** using the runbook in `docs/specs/localijambo-data-model.md §7` + the `upsert_tree` RPC in `docs/specs/localijambo-offline-sync.md §3`. Then copy Project URL + anon key into `.env` (see `.env.example`) and run `npm run dev`.

## Notes / deviations
- react-router resolved to v8 (spec floor ^7) — current major, accepted.
- Species fixed to *Syzygium malaccense* (jambo-specific app); only `variety` is user-editable.
- Icon PNGs are procedurally generated from an SVG glyph (no image deps) — good enough for install; refine art later if desired.
- Bundle size advisory (~1.5MB MapLibre+Supabase chunk) — non-blocking; lazy-load/code-split is a future perf task.
- `trees_cache` idb keyPath is `clientId` (camelCase) vs spec's snake_case note — internally consistent.

## Open questions (defaulted, non-blocking)
1. Auth: magic-link only (default) vs also password.
2. Shared trees visible to logged-out/anon? Default: authenticated-only (one-line RLS addition to open up).
3. OSM tiles fine for personal use; move to a tile CDN before public launch.
4. Region tile pre-download (true offline map) deferred to v2.
