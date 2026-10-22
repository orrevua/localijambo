-- Localijambo — public map + "added by" names.
-- Paste-and-run in the Supabase SQL editor on an existing project. Safe to re-run.
-- (Also included at the end of schema.sql for fresh projects.)

-- 1. Every user has a profile with a public display name ---------------------
insert into public.profiles (id, display_name)
select u.id, coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

update public.profiles p
set display_name = split_part(u.email, '@', 1)
from auth.users u
where u.id = p.id and (p.display_name is null or p.display_name = '');

-- 2. Public display-name lookup ----------------------------------------------
-- profiles stays private (own row only); this exposes just the name, never email.
create or replace function public.owner_display_name(p_owner uuid)
returns text language sql stable security definer set search_path = public as $$
  select display_name from public.profiles where id = p_owner;
$$;
revoke all on function public.owner_display_name(uuid) from public;
grant execute on function public.owner_display_name(uuid) to anon, authenticated;

-- 3. trees_view gains owner_name (column appended, so replace is allowed) ----
create or replace view public.trees_view with (security_invoker = true) as
select
  id, client_id, owner_id,
  ST_X(location::geometry) as lon,
  ST_Y(location::geometry) as lat,
  species, variety, notes, fruiting_status, ripeness,
  photo_path, is_shared, created_at, updated_at,
  public.owner_display_name(owner_id) as owner_name
from public.trees;

-- 4. Signed-out visitors can read shared trees (read-only) -------------------
-- trees_select_visible already allows `is_shared = true` for any role; anon
-- just needs the table/view privileges. Writes stay owner-only via RLS.
grant select on public.trees to anon;
grant select on public.trees_view to anon, authenticated;
-- Shared photos: the existing tree_photos_read policy already covers anon.
