create table if not exists api_keys (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  key_hash     text        not null unique,
  label        text        not null
               check (char_length(label) between 1 and 100),
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

alter table api_keys enable row level security;

create policy "owner can read own keys"
  on api_keys for select to authenticated
  using (user_id = auth.uid());

create policy "owner can insert own keys"
  on api_keys for insert to authenticated
  with check (user_id = auth.uid());

create policy "owner can delete own keys"
  on api_keys for delete to authenticated
  using (user_id = auth.uid());
