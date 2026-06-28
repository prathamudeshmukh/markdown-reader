alter table docs
  add column if not exists edit_access boolean not null default false;

-- Allow unauthenticated visitors to edit docs the owner has opened to the public.
-- WITH CHECK keeps edit_access pinned to true so non-owners cannot revoke the flag.
create policy "anon can update docs with edit_access"
  on docs for update to anon
  using (edit_access = true)
  with check (edit_access = true);

-- Same grant for signed-in non-owners.
create policy "auth can update docs with edit_access"
  on docs for update to authenticated
  using (edit_access = true)
  with check (edit_access = true);
