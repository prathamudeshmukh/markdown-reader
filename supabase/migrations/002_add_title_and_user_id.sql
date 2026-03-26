alter table docs
  add column if not exists title text;

alter table docs
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists docs_user_id_idx on docs(user_id);

-- Replace blanket anon-read policy with two scoped policies
drop policy if exists "anon can read docs" on docs;
drop policy if exists "anon can read public docs" on docs;
drop policy if exists "auth can read own and public docs" on docs;
drop policy if exists "auth can create own docs" on docs;
drop policy if exists "anon can update unowned docs" on docs;
drop policy if exists "auth can update own docs" on docs;

-- Replace blanket anon-update policy with two scoped policies
drop policy if exists "anon can update docs" on docs;

-- Unauthenticated users can only read public (unowned) docs
create policy "anon can read public docs"
  on docs for select to anon
  using (user_id is null);

-- Authenticated users can read their own docs and public docs
create policy "auth can read own and public docs"
  on docs for select to authenticated
  using (user_id is null or user_id = auth.uid());

-- Authenticated users can create docs owned by themselves (or public)
create policy "auth can create own docs"
  on docs for insert to authenticated
  with check (user_id is null or user_id = auth.uid());

-- Unauthenticated users can only update unowned docs
create policy "anon can update unowned docs"
  on docs for update to anon
  using (user_id is null)
  with check (user_id is null);

-- Authenticated users can only update their own docs
create policy "auth can update own docs"
  on docs for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
