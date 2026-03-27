create table if not exists collections (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  parent_id   uuid        references collections(id) on delete cascade,
  name        text        not null check (char_length(name) between 1 and 200),
  position    integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists collections_user_id_idx on collections(user_id);
create index if not exists collections_parent_id_idx on collections(parent_id);

alter table collections enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'collections' and policyname = 'auth can read own collections'
  ) then
    create policy "auth can read own collections"
      on collections for select to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'collections' and policyname = 'auth can create own collections'
  ) then
    create policy "auth can create own collections"
      on collections for insert to authenticated
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'collections' and policyname = 'auth can update own collections'
  ) then
    create policy "auth can update own collections"
      on collections for update to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'collections' and policyname = 'auth can delete own collections'
  ) then
    create policy "auth can delete own collections"
      on collections for delete to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

-- Add collection FK to docs; docs orphaned to root when collection deleted
alter table docs add column if not exists collection_id uuid references collections(id) on delete set null;

create index if not exists docs_collection_id_idx on docs(collection_id);
