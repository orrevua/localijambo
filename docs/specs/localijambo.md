# Localijambo — Implementation Spec

**Status:** Approved
**Date:** 2026-08-25
**Related:** none (greenfield). Supporting docs: `docs/specs/localijambo-data-model.md`, `docs/specs/localijambo-offline-sync.md`.

---

## 1. Overview, Goals, Non-Goals

### Overview
Localijambo is a mobile-first Progressive Web App to locate, save, and track **jambo vermelho** (*Syzygium malaccense*, Malay apple) fruit trees in northeast Brazil. Users walk around and capture tree positions via GPS, or drop trees manually on a map. All saved trees are viewable on a shared map. The app is **offline-first**: it works with no connectivity and syncs when back online.

### Goals
- Capture a tree in ≤ 3 taps while walking, using live GPS.
- Drop trees manually on the map when not physically present.
- View all owned + shared trees on a map and in a list.
- Attach one photo per tree (optional).
- Work fully offline: cache app shell + map tiles, queue writes + photos in IndexedDB, sync automatically on reconnect.
- Multi-user with Supabase Auth; each user owns their trees; trees can be marked shared/public.
- Row Level Security enforcing ownership + sharing.

### Non-Goals (explicitly out of scope for v1)
- Editing/moving another user's tree.
- Real-time collaborative updates (no live subscriptions in v1).
- Multiple photos per tree, video, or offline photo *viewing* of others' trees.
- Native app store packaging (PWA install only).
- Full offline map for arbitrary pan/zoom worldwide — offline tiles are opportunistically cached (runtime), not pre-downloaded for a region in v1 (see §6, flagged as v2 candidate).
- Social features (comments, likes, following).
- Push notifications.

---

## 2. Tech Stack

| Concern | Choice | Version (pin at install) | Rationale |
|---|---|---|---|
| Build tool | **Vite** | ^7 | Fast, first-class PWA plugin support. |
| Framework | **React + TypeScript** | React ^19, TS ^5.6 | Requested default; largest ecosystem for map + PWA; type safety across data model. |
| PWA | **vite-plugin-pwa** | ^1 | Workbox-based SW generation, manifest injection, auto-update. |
| Map | **MapLibre GL JS** | ^5 | Vector-capable, OSS fork of Mapbox GL, GPU-rendered, smooth on mobile, easy raster OSM source. Chosen over Leaflet for smoother mobile gestures + built-in geolocate control; raster OSM tiles used to avoid vector tile hosting cost. |
| Map tiles | **OpenStreetMap raster** | — | Free, no key. Respect OSM tile usage policy; set a proper `User-Agent`/attribution. For production volume, switch to a tile CDN (MapTiler/Protomaps) — flagged, not blocking. |
| Backend/DB | **Supabase** (Postgres + PostGIS) | Postgres 15+, PostGIS 3+ | Managed, RLS, Auth, Storage in one. No custom server needed. |
| Auth | **Supabase Auth** | supabase-js ^2 | Email magic-link (passwordless) primary; email+password optional. |
| Storage | **Supabase Storage** | — | Photo bucket with RLS. |
| Client DB | **IndexedDB via `idb`** | idb ^8 | Thin promise wrapper; offline write queue + cached tree cache. |
| State | **React Context + hooks** (+ optional Zustand ^5 if state grows) | — | Avoid heavy state libs; sync state is small. Start with Context. |
| Router | **React Router** | ^7 | Screen routing. |
| Styling | **CSS Modules + CSS variables** | — | No heavy UI framework; keep bundle small for offline. Palette via CSS custom props. |
| Lint/format | ESLint + Prettier | latest | Consistency. |
| Tests | **Vitest** + **@testing-library/react** | latest | Unit + component tests. Playwright optional later. |

> Pin exact versions in `package.json` at install time; the carets above are floors.

---

## 3. Data Model

Full DDL, PostGIS indexing, and RLS policies live in **`docs/specs/localijambo-data-model.md`**. Summary here:

- Table **`profiles`** — 1:1 with `auth.users`, holds display name.
- Table **`trees`** — owner, `location geography(Point,4326)`, species/variety, notes, fruiting status enum, ripeness enum, photo path, `is_shared` boolean, timestamps, `client_id` (UUID from client for idempotent sync).
- GIST index on `location`; btree on `owner_id`, `is_shared`.
- RLS: owner full CRUD; shared rows are SELECT-only for authenticated users (and optionally public/anon).
- Storage bucket **`tree-photos`** with path convention `{owner_id}/{tree_client_id}.jpg` and RLS matching tree visibility.

---

## 4. Supabase Setup Steps

Documented as an ordered runbook in the data-model spec (§ "Supabase Setup"). High level:
1. Create project; note Project URL + `anon` public key.
2. `create extension if not exists postgis;`
3. Run schema DDL (tables, enums, indexes).
4. Enable RLS on all tables; apply policies.
5. Create `profiles` auto-insert trigger on `auth.users`.
6. Create Storage bucket `tree-photos` (private); apply storage policies.
7. Auth: enable Email provider (magic link). Set Site URL + redirect URLs (`http://localhost:5173`, prod URL). Disable email confirmations only if desired for dev.
8. Copy URL + anon key into `.env` (§9).

---

## 5. App Architecture

### Folder structure
```
localijambo/
  index.html
  vite.config.ts
  .env                      # gitignored
  .env.example
  public/
    icons/                  # PWA icons (see §8)
    map-style/              # optional maplibre style json for OSM raster
  src/
    main.tsx                # app entry, router, providers
    App.tsx                 # shell + route outlet + offline indicator
    env.ts                  # typed import.meta.env access
    lib/
      supabase.ts           # supabase client singleton
      idb.ts                # IndexedDB open + typed stores
      geo.ts                # geolocation helpers (watch, accuracy)
      photo.ts              # image capture/resize helpers
    types/
      tree.ts               # Tree domain types + enums (mirrors DB)
    data/
      treesRepo.ts          # read/write trees: online + offline queue
      syncQueue.ts          # enqueue/flush pending mutations
      photoSync.ts          # upload queued photos
    sync/
      SyncProvider.tsx      # online/offline + sync orchestration context
      useOnlineStatus.ts    # navigator.onLine + events
    auth/
      AuthProvider.tsx      # session context
      useAuth.ts
    features/
      map/
        MapView.tsx         # main map screen
        useMap.ts           # maplibre instance lifecycle
        treeMarkers.ts      # render tree markers/source
      add-tree/
        AddTreeScreen.tsx   # mode switch: live GPS | manual drop
        LiveGpsCapture.tsx
        ManualDrop.tsx
        TreeForm.tsx        # species, notes, fruiting, ripeness, photo, shared
      tree-detail/
        TreeDetailScreen.tsx
      tree-list/
        TreeListScreen.tsx
      auth/
        LoginScreen.tsx
    components/
      OfflineIndicator.tsx
      SyncStatusBadge.tsx
      Button.tsx, Field.tsx, ... (primitives)
    styles/
      theme.css             # CSS variables (palette)
      global.css
    sw/                     # (if custom SW) — else vite-plugin-pwa injectManifest
```

### Screens / routes
| Route | Screen | Purpose |
|---|---|---|
| `/login` | LoginScreen | Magic-link sign-in. |
| `/` | MapView | All owned + shared trees; FAB to add; geolocate control. |
| `/add` | AddTreeScreen | Choose Live-GPS or Manual-Drop, then TreeForm. |
| `/tree/:id` | TreeDetailScreen | Photo, fields, share toggle (owner only), delete (owner only). |
| `/list` | TreeListScreen | Sortable list (distance/date). |

Bottom nav: Map · List · Add (+). Auth-gated routes redirect to `/login` when no session.

### Key contracts
- `treesRepo.listVisible(): Promise<Tree[]>` — merges Supabase results with locally-queued (not-yet-synced) trees; dedupe by `client_id`.
- `treesRepo.create(input: NewTree): Promise<Tree>` — writes to IndexedDB queue immediately (optimistic), attempts online push; returns local optimistic entity.
- `syncQueue.flush(): Promise<SyncResult>` — drains pending mutations + photos when online.

---

## 6. Offline / Sync Strategy

Full detail in **`docs/specs/localijambo-offline-sync.md`**. Summary:
- **App shell**: precached by vite-plugin-pwa (Workbox `generateSW`), `registerType: 'autoUpdate'`.
- **Map tiles**: runtime `CacheFirst` with expiration (maxEntries ~500, maxAgeSeconds 30d) for OSM tile hosts.
- **Supabase REST GET**: `NetworkFirst` with fallback to cache for tree reads.
- **Writes**: never sent directly from UI; enqueued in IndexedDB `pending_mutations`. A `SyncProvider` flushes on `online` event + on app focus + Background Sync API (where supported), with exponential backoff.
- **Photos**: stored as Blob in IndexedDB `pending_photos`; uploaded to Storage during flush, then tree row patched with `photo_path`.
- **Idempotency**: every tree carries a client-generated `client_id` (UUID v4). Server `upsert` on `client_id` prevents duplicates on retry.
- **Conflict handling**: last-write-wins on `updated_at`; v1 has no multi-device edit merge (owner edits own trees; conflicts rare). Documented.

---

## 7. Geolocation UX

- Request permission lazily — only when user enters Live-GPS capture, not on app load.
- Use `navigator.geolocation.watchPosition` with `{ enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }` while the capture screen is open; clear watch on unmount.
- Show live accuracy radius (meters) and a colored quality badge: green ≤ 15 m, amber 15–40 m, red > 40 m.
- "Capture here" button disabled until first fix; warn (not block) if accuracy > 40 m.
- MapLibre `GeolocateControl` on MapView for centering/tracking.
- Handle denied/unavailable: fallback message + suggest Manual-Drop.
- Manual-Drop: center crosshair on map; user pans map under a fixed reticle; `map.getCenter()` on confirm.

---

## 8. PWA Manifest + Branding

### Palette (`theme.css` CSS variables)
```
--color-crimson:   #C21030;  /* jambo fruit skin */
--color-magenta:   #B0165A;  /* accent / active states */
--color-leaf:      #2E7D32;  /* leaf green */
--color-leaf-dark: #1B5E20;
--color-cream:     #FFF7F2;  /* background */
--color-ink:       #241016;  /* text */
```

### Logo concept
Pear-shaped crimson jambo fruit, slightly asymmetric, with a small 4-point green crown/calyx at the bottom tip and a single green leaf angled off the top stem. Flat, high-contrast, works at 48px. Fruit fill crimson→magenta vertical gradient (or flat crimson for simplicity), leaf `--color-leaf`, on transparent or cream background per icon variant.

### Manifest fields
- `name`: "Localijambo", `short_name`: "Jambo"
- `theme_color`: `#C21030`, `background_color`: `#FFF7F2`
- `display`: `standalone`, `orientation`: `portrait`, `start_url`: `/`, `scope`: `/`

### Icon assets needed (`public/icons/`)
| File | Size | Purpose |
|---|---|---|
| `icon-192.png` | 192×192 | any |
| `icon-512.png` | 512×512 | any |
| `maskable-192.png` | 192×192 | maskable (safe zone padding) |
| `maskable-512.png` | 512×512 | maskable |
| `apple-touch-icon.png` | 180×180 | iOS |
| `favicon.svg` | vector | browser tab |
| `logo.svg` | vector | in-app header |

> Icon generation is a design task; for the walking skeleton, placeholder solid-crimson PNGs with a leaf glyph are acceptable and flagged for replacement (Unit 3 / final polish).

---

## 9. Environment / Config

`.env` (gitignored) and `.env.example` (committed):
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
- Only the **anon public** key ships to the client — it is safe *because* RLS is enforced. Never put the service-role key in the client or repo.
- `env.ts` validates presence at startup and throws a clear error if missing.
- `.gitignore` must include `.env`, `node_modules`, `dist`.

---

## 10. Implementation Units

Ordered so the app is runnable as early as possible (walking skeleton → auth → data → capture → offline → polish). Each unit ≈ ≤50 LOC. Acceptance criteria are verifiable.

### Phase A — Skeleton (runnable app)
1. **Scaffold Vite React-TS project** — files: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`. Change: minimal app rendering "Localijambo". — **Acceptance:** `npm run dev` serves a page; `npx tsc --noEmit` passes.
2. **Add ESLint/Prettier + .gitignore + .env.example** — files: config files, `.env.example`, `.gitignore`. — **Acceptance:** `npm run lint` runs clean; `.env` ignored.
3. **Theme + global styles + palette variables** — files: `src/styles/theme.css`, `global.css`, imported in `main.tsx`. — **Acceptance:** CSS vars available; background is cream, sample crimson button.
4. **Router + bottom nav + placeholder screens** — files: `src/main.tsx`, `App.tsx`, empty screen components for Map/List/Add/Login/Detail. — **Acceptance:** navigating routes renders each placeholder; bottom nav highlights active.

### Phase B — PWA baseline
5. **Install & configure vite-plugin-pwa (autoUpdate) + manifest** — files: `vite.config.ts`. — **Acceptance:** build produces `manifest.webmanifest` + SW; app installable (Lighthouse PWA installable check).
6. **Placeholder icons + apple/favicon links** — files: `public/icons/*`, `index.html`. — **Acceptance:** manifest icons resolve; no 404s.
7. **Workbox runtime caching config (tiles + REST)** — files: `vite.config.ts` `workbox.runtimeCaching`. — **Acceptance:** after one online load, reloading offline still serves app shell (DevTools offline).

### Phase C — Supabase + Auth
8. **`env.ts` + `lib/supabase.ts` client singleton** — files: those two. — **Acceptance:** importing client doesn't throw when env set; throws clear error when missing.
9. **Apply DB schema + RLS in Supabase** (manual, per data-model spec) — files: none in repo (SQL run in Supabase). — **Acceptance:** tables exist; RLS on; a smoke insert as user A is invisible to user B unless shared.
10. **AuthProvider + useAuth + session persistence** — files: `src/auth/AuthProvider.tsx`, `useAuth.ts`. — **Acceptance:** session restored on reload; `user` exposed via context.
11. **LoginScreen (magic link) + route guard** — files: `LoginScreen.tsx`, guard in router. — **Acceptance:** unauthenticated users redirected to `/login`; magic link email sends; post-login lands on `/`.

### Phase D — Data + Map (online happy path)
12. **`types/tree.ts` domain types + enums** — files: that file. — **Acceptance:** types compile; mirror DB columns/enums exactly.
13. **`treesRepo` online read (`listVisible`) + create (direct)** — files: `data/treesRepo.ts`. — **Acceptance:** create inserts a row; list returns owned + shared trees for the user.
14. **MapView with MapLibre + OSM raster + geolocate control** — files: `features/map/MapView.tsx`, `useMap.ts`. — **Acceptance:** map renders over Recife/NE Brazil; geolocate button centers on user.
15. **Render tree markers on map from `listVisible`** — files: `features/map/treeMarkers.ts`, wired in MapView. — **Acceptance:** existing trees appear as crimson markers; tapping opens `/tree/:id`.
16. **TreeListScreen** — files: `tree-list/TreeListScreen.tsx`. — **Acceptance:** lists visible trees; sorted by created date.
17. **TreeDetailScreen (read + owner delete + share toggle)** — files: `tree-detail/TreeDetailScreen.tsx`. — **Acceptance:** shows fields; owner can toggle `is_shared` and delete; non-owner sees read-only.

### Phase E — Capture flows
18. **`lib/geo.ts` watchPosition helper + accuracy classify** — files: `lib/geo.ts`. — **Acceptance:** hook returns live coords + accuracy tier; cleans up watch on unmount.
19. **AddTreeScreen mode switch + LiveGpsCapture** — files: `add-tree/AddTreeScreen.tsx`, `LiveGpsCapture.tsx`. — **Acceptance:** live coords + accuracy badge shown; "Capture here" enabled after fix.
20. **ManualDrop (reticle over pannable map)** — files: `add-tree/ManualDrop.tsx`. — **Acceptance:** confirm returns map center coords.
21. **TreeForm (species/variety, notes, fruiting, ripeness, shared) + submit via repo** — files: `add-tree/TreeForm.tsx`. — **Acceptance:** submitting creates a tree at captured coords; appears on map/list.
22. **`lib/photo.ts` capture+resize + optional photo in TreeForm** — files: `lib/photo.ts`, TreeForm edit. — **Acceptance:** selecting a photo downsizes to ≤1600px JPEG; preview shown.
23. **Photo upload to Storage + link on tree (online)** — files: `data/photoSync.ts` (online path), repo wiring. — **Acceptance:** photo uploads to `tree-photos/{owner}/{client_id}.jpg`; detail shows it.

### Phase F — Offline / Sync
24. **`lib/idb.ts` — open DB + stores (`pending_mutations`, `pending_photos`, `trees_cache`)** — files: `lib/idb.ts`. — **Acceptance:** stores created; typed put/get roundtrip works.
25. **`useOnlineStatus` + OfflineIndicator + SyncStatusBadge** — files: `sync/useOnlineStatus.ts`, `components/OfflineIndicator.tsx`, `SyncStatusBadge.tsx`. — **Acceptance:** indicator reflects DevTools offline toggle; badge shows pending count.
26. **`syncQueue` enqueue + `treesRepo.create` offline-first (optimistic + queue)** — files: `data/syncQueue.ts`, `treesRepo.ts` edit. — **Acceptance:** creating a tree offline stores it in `pending_mutations` and shows optimistically on map/list.
27. **`syncQueue.flush` (upsert by `client_id`) + `SyncProvider` on `online`/focus** — files: `sync/SyncProvider.tsx`, `syncQueue.ts`. — **Acceptance:** going online drains queue; server rows created; pending count → 0; no duplicates on double-flush.
28. **Photo offline queue + upload during flush** — files: `photoSync.ts`, `syncQueue.ts` edit. — **Acceptance:** offline capture with photo syncs blob after reconnect; tree row patched with `photo_path`.
29. **`listVisible` merges cache + pending (dedupe by `client_id`)** — files: `treesRepo.ts` edit. — **Acceptance:** offline reload still shows previously loaded + queued trees; no dupes after sync.
30. **Background Sync registration (progressive enhancement)** — files: SW/`SyncProvider`. — **Acceptance:** where supported, queue flushes after reconnect without app in foreground; graceful no-op elsewhere.

### Phase G — Polish
31. **Real branded icons + logo.svg in header** — files: `public/icons/*`, header component. — **Acceptance:** manifest + Lighthouse PWA pass with maskable icons; logo visible.
32. **Empty/error/loading states + permission-denied fallbacks** — files: relevant screens. — **Acceptance:** denied geolocation routes to Manual-Drop suggestion; empty map shows CTA.
33. **Tests: geo classify, syncQueue dedupe/idempotency, repo merge** — files: `*.test.ts`. — **Acceptance:** `npx vitest run` green for these units.

---

## Open Questions
1. **Auth method**: magic-link only, or also email+password? Default: magic-link only for v1.
2. **Public/anon visibility**: should shared trees be visible to logged-out visitors, or only authenticated users? Default: authenticated-only (simpler RLS); anon read is a one-line policy addition if desired.
3. **OSM tile volume**: acceptable for personal use; switch to MapTiler/Protomaps before any public launch. Non-blocking.
4. **Region pre-download of tiles** (true offline map for a chosen area): deferred to v2.
