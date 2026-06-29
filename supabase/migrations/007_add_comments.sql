create table if not exists comments (
  id          uuid        primary key default gen_random_uuid(),
  doc_slug    text        not null references docs(slug) on delete cascade,
  user_id     uuid        references auth.users(id) on delete set null,
  author_name text        not null default 'Anonymous'
                          check (char_length(author_name) between 1 and 100),
  content     text        not null
                          check (char_length(content) between 1 and 2000),
  anchor_text text        check (anchor_text is null or char_length(anchor_text) between 1 and 500),
  resolved    boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index comments_doc_slug_idx on comments (doc_slug, created_at asc);

alter table comments enable row level security;

create policy "anyone can read comments"
  on comments for select
  using (true);

create policy "anyone can insert comments"
  on comments for insert
  with check (true);

create policy "anyone can update comments"
  on comments for update
  using (true)
  with check (true);

create policy "doc owner can delete comments"
  on comments for delete to authenticated
  using (
    exists (
      select 1 from docs
      where docs.slug = comments.doc_slug
        and docs.user_id = auth.uid()
    )
  );
