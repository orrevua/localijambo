# Localijambo — Data Model & Supabase Setup

**Status:** Approved
**Date:** 2026-08-25
**Related:** `docs/specs/localijambo.md`

This document is the authoritative source for the Postgres schema, PostGIS indexing, RLS policies, Storage config, and Supabase setup runbook. SQL is run in the Supabase SQL editor. It is **not** committed as migrations for v1 (single-project greenfield); optionally captured under `supabase/migrations/` if the CLI is adopted later.

---

## 1. Enums

```sql
create type fruiting_status as enum ('none', 'flowering', 'fruiting');
create type ripeness       as enum ('unknown', 'unripe', 'ripening', 'ripe', 'overripe');
```

---

## 2. Tables

### profiles (1:1 with auth.users)
```sql
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);
```

### trees
```sql
create table public.trees (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null,                          -- idempotency key from client
  owner_id        uuid not null references auth.users(id) on delete cascade,
  location        geography(Point, 4326) not null,        -- WGS84 lon/lat
  species         text not null default 'Syzygium malaccense',
  variety         text,                                   -- e.g. 'jambo vermelho'
  notes           text,
  fruiting_status fruiting_status not null default 'none',
  ripeness        ripeness        not null default 'unknown',
  photo_path      text,                                   -- storage path in tree-photos, nullable
  is_shared       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (owner_id, client_id)                            -- enables upsert-on-conflict for sync
);
```

> **Coordinate convention:** `geography(Point,4326)` stores **lon, lat** order. Insert via
> `ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography`. When reading for the client, expose lon/lat
> (e.g. a view or `ST_X`/`ST_Y`, see §5).

### updated_at trigger
```sql
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_trees_updated_at
  before update on public.trees
  for each row execute function public.set_updated_at();
```

---

## 3. Indexes

```sql
create index trees_location_gist on public.trees using gist (location);
create index trees_owner_idx     on public.trees (owner_id);
create index trees_shared_idx    on public.trees (is_shared) where is_shared = true;
```

The GIST index accelerates spatial queries (e.g. `ST_DWithin` for "trees near me").

---

## 4. Row Level Security

```sql
alter table public.profiles enable row level security;
alter table public.trees    enable row level security;

-- profiles: a user sees & edits only their own profile
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);
create policy profiles_upsert_own on public.profiles
  for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id);

-- trees: visible if you own it OR it is shared
create policy trees_select_visible on public.trees
  for select using (auth.uid() = owner_id or is_shared = true);

-- trees: only owner may insert (and must set themselves as owner)
create policy trees_insert_own on public.trees
  for insert with check (auth.uid() = owner_id);

-- trees: only owner may update
create policy trees_update_own on public.trees
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- trees: only owner may delete
create policy trees_delete_own on public.trees
  for delete using (auth.uid() = owner_id);
```

> **Optional public/anon read** (Open Question #2): to let logged-out visitors see shared trees, add a
> policy granting `select` to the `anon` role `using (is_shared = true)`. Deferred by default.

---

## 5. Profile auto-provision trigger

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### Client-friendly read view (lon/lat as numbers)
```sql
create or replace view public.trees_view as
select
  id, client_id, owner_id,
  ST_X(location::geometry) as lon,
  ST_Y(location::geometry) as lat,
  species, variety, notes, fruiting_status, ripeness,
  photo_path, is_shared, created_at, updated_at
from public.trees;
```
> Views inherit table RLS in Supabase when defined with `security_invoker` (Postgres 15+): create with
> `create view public.trees_view with (security_invoker = true) as ...`. Confirm invoker mode so RLS applies.

---

## 6. Storage — tree-photos bucket

- Bucket id: `tree-photos`, **private** (not public).
- Path convention: `{owner_id}/{client_id}.jpg`.
- Photos served via signed URLs (`createSignedUrl`) or authenticated download.

### Storage policies (on `storage.objects`)
```sql
-- owner can upload/update their own folder
create policy tree_photos_write_own on storage.objects
  for insert with check (
    bucket_id = 'tree-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy tree_photos_update_own on storage.objects
  for update using (
    bucket_id = 'tree-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy tree_photos_delete_own on storage.objects
  for delete using (
    bucket_id = 'tree-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
-- read: owner always; shared-tree photos readable by any authenticated user
create policy tree_photos_read on storage.objects
  for select using (
    bucket_id = 'tree-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.trees t
        where t.owner_id::text = (storage.foldername(name))[1]
          and t.photo_path = storage.objects.name
          and t.is_shared = true
      )
    )
  );
```

---

## 7. Supabase Setup Runbook (ordered)

1. Create a Supabase project; record **Project URL** and **anon public key**.
2. SQL editor: `create extension if not exists postgis;`
3. Run §1 enums, §2 tables + trigger, §3 indexes.
4. Run §4 RLS enable + policies.
5. Run §5 auto-provision trigger + `trees_view` (invoker mode).
6. Storage: create private bucket `tree-photos`; run §6 storage policies.
7. Auth → Providers: enable **Email** (magic link). Auth → URL Configuration: set Site URL and add redirect URLs `http://localhost:5173` and the production origin.
8. (Dev convenience) optionally disable email confirmation; re-enable for production.
9. Put URL + anon key into `.env` per main spec §9.

### Smoke test (acceptance for Unit 9)
- As user A: insert a tree (via app or SQL with A's JWT) → visible to A.
- As user B: `select * from trees_view` → A's private tree **not** returned.
- Set A's tree `is_shared = true` → now returned to B (read-only; B cannot update/delete).
- Attempt B updating A's tree → rejected by RLS.

---

## 8. Client Type Mapping (`src/types/tree.ts`)

```ts
type FruitingStatus = 'none' | 'flowering' | 'fruiting';
type Ripeness = 'unknown' | 'unripe' | 'ripening' | 'ripe' | 'overripe';

interface Tree {
  id: string;
  clientId: string;
  ownerId: string;
  lon: number; lat: number;
  species: string;
  variety?: string;
  notes?: string;
  fruitingStatus: FruitingStatus;
  ripeness: Ripeness;
  photoPath?: string;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

type NewTree = Pick<Tree,
  'clientId'|'lon'|'lat'|'species'|'variety'|'notes'|'fruitingStatus'|'ripeness'|'isShared'>;
```
Reads use `trees_view` (flat lon/lat). Writes to `trees` build the geography with
`ST_SetSRID(ST_MakePoint(lon,lat),4326)` — done via an RPC or by sending WKT/GeoJSON; see offline-sync spec §insert.
