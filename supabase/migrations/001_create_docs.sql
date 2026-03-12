create table if not exists docs (
  slug        text        primary key,
  content     text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table docs enable row level security;

-- Anyone with a slug can read that document
create policy "anon can read docs"
  on docs for select to anon
  using (true);

-- Anyone can create a new document (slug is generated server-side)
create policy "anon can create docs"
  on docs for insert to anon
  with check (true);

-- Anyone with the slug URL can update that document
create policy "anon can update docs"
  on docs for update to anon
  using (true)
  with check (true);
