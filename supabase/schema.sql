-- Localijambo — full Supabase schema (Unit 9)
-- Paste-and-run in the Supabase SQL editor. Safe to re-run (idempotent guards).
-- Source of truth: docs/specs/localijambo-data-model.md + localijambo-offline-sync.md

-- 0. Extensions -------------------------------------------------------------
create extension if not exists postgis;

-- 1. Enums ------------------------------------------------------------------
do $$ begin
  create type fruiting_status as enum ('none', 'flowering', 'fruiting');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ripeness as enum ('unknown', 'unripe', 'ripening', 'ripe', 'overripe');
exception when duplicate_object then null; end $$;

-- 2. Tables -----------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

create table if not exists public.trees (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null,
  owner_id        uuid not null references auth.users(id) on delete cascade,
  location        geography(Point, 4326) not null,
  species         text not null default 'Syzygium malaccense',
  variety         text,
  notes           text,
  fruiting_status fruiting_status not null default 'none',
  ripeness        ripeness        not null default 'unknown',
  photo_path      text,
  is_shared       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (owner_id, client_id)
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_trees_updated_at on public.trees;
create trigger trg_trees_updated_at
  before update on public.trees
  for each row execute function public.set_updated_at();

-- 3. Indexes ----------------------------------------------------------------
create index if not exists trees_location_gist on public.trees using gist (location);
create index if not exists trees_owner_idx     on public.trees (owner_id);
create index if not exists trees_shared_idx     on public.trees (is_shared) where is_shared = true;

-- 4. Row Level Security -----------------------------------------------------
alter table public.profiles enable row level security;
alter table public.trees    enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);
drop policy if exists profiles_upsert_own on public.profiles;
create policy profiles_upsert_own on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id);

-- trees: visible if you own it OR it is shared
drop policy if exists trees_select_visible on public.trees;
create policy trees_select_visible on public.trees
  for select using (auth.uid() = owner_id or is_shared = true);
-- only owner may insert (must set themselves as owner)
drop policy if exists trees_insert_own on public.trees;
create policy trees_insert_own on public.trees
  for insert with check (auth.uid() = owner_id);
-- only owner may update
drop policy if exists trees_update_own on public.trees;
create policy trees_update_own on public.trees
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
-- only owner may delete
drop policy if exists trees_delete_own on public.trees;
create policy trees_delete_own on public.trees
  for delete using (auth.uid() = owner_id);

-- 5. Profile auto-provision trigger + client-friendly view ------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- lon/lat exposed as numbers; security_invoker so table RLS applies
create or replace view public.trees_view with (security_invoker = true) as
select
  id, client_id, owner_id,
  ST_X(location::geometry) as lon,
  ST_Y(location::geometry) as lat,
  species, variety, notes, fruiting_status, ripeness,
  photo_path, is_shared, created_at, updated_at
from public.trees;

-- 6. Upsert RPC (idempotent create/update from the offline queue) -----------
create or replace function public.upsert_tree(
  p_client_id uuid, p_lon double precision, p_lat double precision,
  p_species text, p_variety text, p_notes text,
  p_fruiting fruiting_status, p_ripeness ripeness, p_is_shared boolean
) returns public.trees language plpgsql security invoker as $$
declare rec public.trees;
begin
  insert into public.trees as t (client_id, owner_id, location, species, variety, notes,
    fruiting_status, ripeness, is_shared)
  values (p_client_id, auth.uid(),
    ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
    p_species, p_variety, p_notes, p_fruiting, p_ripeness, p_is_shared)
  on conflict (owner_id, client_id) do update set
    location = excluded.location, species = excluded.species, variety = excluded.variety,
    notes = excluded.notes, fruiting_status = excluded.fruiting_status,
    ripeness = excluded.ripeness, is_shared = excluded.is_shared, updated_at = now()
  returning * into rec;
  return rec;
end; $$;

-- 7. Storage — private tree-photos bucket + policies ------------------------
insert into storage.buckets (id, name, public)
values ('tree-photos', 'tree-photos', false)
on conflict (id) do nothing;

drop policy if exists tree_photos_write_own on storage.objects;
create policy tree_photos_write_own on storage.objects
  for insert with check (
    bucket_id = 'tree-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists tree_photos_update_own on storage.objects;
create policy tree_photos_update_own on storage.objects
  for update using (
    bucket_id = 'tree-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists tree_photos_delete_own on storage.objects;
create policy tree_photos_delete_own on storage.objects
  for delete using (
    bucket_id = 'tree-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists tree_photos_read on storage.objects;
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
