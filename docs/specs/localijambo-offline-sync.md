# Localijambo — Offline & Sync Strategy

**Status:** Approved
**Date:** 2026-08-25
**Related:** `docs/specs/localijambo.md`, `docs/specs/localijambo-data-model.md`

Authoritative source for service-worker caching, IndexedDB schema, the write queue, photo sync, idempotency, and conflict handling.

---

## 1. Service Worker (vite-plugin-pwa, Workbox `generateSW`)

- `registerType: 'autoUpdate'` — new SW activates and reloads clients.
- **Precache (app shell):** all built JS/CSS/HTML + manifest + icons (default `globPatterns`).
- **Runtime caching (`workbox.runtimeCaching`):**

| Route / match | Handler | Cache | Options |
|---|---|---|---|
| OSM tile hosts (`https://*.tile.openstreetmap.org/*` and any configured tile CDN) | `CacheFirst` | `osm-tiles` | `maxEntries: 500`, `maxAgeSeconds: 2592000` (30d), `cacheableResponse {statuses:[0,200]}` |
| Supabase REST reads (`${SUPABASE_URL}/rest/v1/trees_view*`) | `NetworkFirst` | `supabase-reads` | `networkTimeoutSeconds: 4`, `maxEntries: 200` |
| Map style/glyphs/sprites (if any) | `StaleWhileRevalidate` | `map-assets` | `maxEntries: 50` |

- **Never cache** Supabase writes (`POST/PATCH/DELETE`) or Auth endpoints — writes go through the app's own queue, not the SW.
- **navigateFallback:** app `index.html` for SPA offline navigation.

---

## 2. IndexedDB Schema (`lib/idb.ts`, via `idb`)

Database `localijambo`, version `1`.

| Store | Key | Value shape | Purpose |
|---|---|---|---|
| `trees_cache` | `client_id` | `Tree` | Last-known visible trees for offline reads. |
| `pending_mutations` | `id` (autoinc) | `PendingMutation` | Queued create/update/delete ops. |
| `pending_photos` | `client_id` | `{ clientId, blob, contentType }` | Photo blobs awaiting upload. |

```ts
type MutationOp = 'create' | 'update' | 'delete';
interface PendingMutation {
  id?: number;             // autoincrement
  op: MutationOp;
  clientId: string;        // tree client_id (idempotency)
  payload: Partial<Tree>;  // full for create, diff for update, {clientId} for delete
  attempts: number;
  lastError?: string;
  enqueuedAt: number;
}
```

Indexes: `pending_mutations` on `clientId` (to collapse multiple ops on the same tree before flush).

---

## 3. Write Path (offline-first)

`treesRepo.create(input: NewTree)`:
1. Generate `clientId = crypto.randomUUID()` (caller supplies in `NewTree`).
2. Build optimistic `Tree` (`ownerId` from session, timestamps = now, `id` = temp = `clientId`).
3. `put` into `trees_cache` (optimistic visibility).
4. If a photo is attached → `put` into `pending_photos`.
5. Enqueue `PendingMutation{op:'create', clientId, payload}` into `pending_mutations`.
6. If online → trigger `syncQueue.flush()` (fire-and-forget). If offline → rely on `SyncProvider` events.
7. Return optimistic `Tree`.

Update/delete follow the same enqueue pattern.

### Server insert of geography
The client sends lon/lat. To construct `geography(Point,4326)`, use a Postgres **RPC** (preferred) so PostGIS builds the geometry server-side:

```sql
create or replace function public.upsert_tree(
  p_client_id uuid, p_lon double precision, p_lat double precision,
  p_species text, p_variety text, p_notes text,
  p_fruiting_status fruiting_status, p_ripeness ripeness, p_is_shared boolean
) returns public.trees language plpgsql security invoker as $$
declare rec public.trees;
begin
  insert into public.trees as t (client_id, owner_id, location, species, variety, notes,
    fruiting_status, ripeness, is_shared)
  values (p_client_id, auth.uid(),
    ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
    p_species, p_variety, p_notes, p_fruiting_status, p_ripeness, p_is_shared)
  on conflict (owner_id, client_id) do update set
    location = excluded.location, species = excluded.species, variety = excluded.variety,
    notes = excluded.notes, fruiting_status = excluded.fruiting_status,
    ripeness = excluded.ripeness, is_shared = excluded.is_shared, updated_at = now()
  returning * into rec;
  return rec;
end; $$;
```
`ON CONFLICT (owner_id, client_id)` makes retries idempotent (no duplicate trees). Called from client via `supabase.rpc('upsert_tree', {...})`.

Photo path patch after upload uses a separate `update trees set photo_path=... where owner_id=auth.uid() and client_id=...` (or a tiny RPC).

---

## 4. Flush (`syncQueue.flush`)

Guarded by an in-flight lock (no concurrent flushes). Steps:
1. Read all `pending_mutations` ordered by `id`.
2. Collapse per `clientId` (e.g. create+update → single upsert; create+delete → drop both).
3. For each effective mutation:
   - `create/update` → `supabase.rpc('upsert_tree', payload)`.
   - `delete` → `supabase.from('trees').delete().eq('client_id', clientId)`.
   - On success: remove the mutation(s); refresh `trees_cache` with returned row.
   - On failure: increment `attempts`, store `lastError`; leave in queue for retry with **exponential backoff** (e.g. base 2s, cap 5 min). After N=8 attempts, mark as `failed` and surface in UI.
4. After mutations, run photo sync (§5).
5. Emit sync-status update (pending count, last-synced timestamp).

Triggers for flush:
- `window 'online'` event.
- App visibility/focus (`visibilitychange`).
- Successful login.
- Background Sync `sync` event (§6).

---

## 5. Photo Sync (`photoSync`)

For each entry in `pending_photos` whose tree is already synced (row exists server-side):
1. `supabase.storage.from('tree-photos').upload('{ownerId}/{clientId}.jpg', blob, { upsert:true, contentType })`.
2. On success: patch tree `photo_path = '{ownerId}/{clientId}.jpg'`; remove blob from `pending_photos`; update `trees_cache`.
3. On failure: keep blob; retry with backoff.
Ordering: photos are uploaded **after** their tree row exists so `photo_path` FK-by-convention resolves and storage RLS (which checks the tree row for shared reads) is consistent.

---

## 6. Background Sync (progressive enhancement)

- On enqueue, if `'sync' in registration`, call `registration.sync.register('localijambo-flush')`.
- SW listens for `sync` event tag `localijambo-flush`; since flush logic lives in app code with the Supabase client (needs auth token), the SW `sync` handler posts a message to any client to run `flush()`, and if no client is open, defers to next app open. (Full headless flush would require the auth token in the SW — out of scope v1.)
- Where Background Sync is unsupported (iOS Safari), the `online`/`visibilitychange` triggers cover it. No functional regression.

---

## 7. Read Path (`treesRepo.listVisible`)

1. If online: `supabase.from('trees_view').select('*')` → results.
2. Write results into `trees_cache`.
3. If offline (or network error): read all from `trees_cache`.
4. **Merge** with `pending_mutations` not yet synced: overlay optimistic creates/updates, remove pending deletes.
5. **Dedupe by `clientId`** — server row wins once synced; optimistic entry replaced. This guarantees no visual duplicates during/after sync.

---

## 8. Conflict Handling (v1)

- Single-owner edits; conflicts are rare. Policy: **last-write-wins by `updated_at`**, enforced naturally by the `upsert_tree` RPC setting `updated_at = now()`.
- No CRDT/merge in v1. If the same tree is edited on two offline devices, the later flush wins.
- Deletes always win over concurrent updates (delete removes the row; a later update upsert would recreate it — acceptable and documented; v2 could add a `deleted_at` tombstone to prevent resurrection).

---

## 9. Failure & Edge Cases

| Case | Behavior |
|---|---|
| Offline create then app closed before sync | Persisted in IndexedDB; flushed next launch when online. |
| Photo captured offline, tree synced but photo upload keeps failing | Tree visible without photo; badge shows "1 photo pending"; retries with backoff. |
| Auth token expired during flush | Supabase client auto-refreshes; on hard failure, mutation stays queued; user re-auth triggers flush. |
| RLS rejects (e.g. editing others' tree) | Mutation marked `failed` (not retried); surfaced as error. Should not occur given UI guards. |
| Quota exceeded in IndexedDB (many photos) | Warn user; block new photo capture until pending drains. |

---

## 10. Acceptance Summary (maps to main-spec units 24–30)

- Create offline → row in `pending_mutations` + optimistic on map (U26).
- Reconnect → queue drains, server rows via `upsert_tree`, pending count 0, double-flush yields no duplicates (U27).
- Offline photo → uploaded after reconnect, `photo_path` patched (U28).
- Offline reload → cached + pending trees visible, no dupes after sync (U29).
- Background Sync fires where supported, graceful no-op elsewhere (U30).
