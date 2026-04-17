-- Add creator_token column for ownership claim security.
-- The token is generated server-side on POST and returned to the client.
-- Claiming (setting user_id) requires presenting the correct token in the PUT
-- body; the Worker verifies it before calling Supabase. The token is nulled
-- after a successful claim so it cannot be reused.
alter table docs add column if not exists creator_token text;

-- Allow an authenticated user to claim an unowned doc.
-- Token verification is done in the Worker (app layer) before this PATCH fires.
-- RLS ensures the doc must be unowned (user_id IS NULL) and the new owner
-- can only set user_id to their own auth.uid().
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'docs'
      and policyname = 'auth can claim unowned docs'
  ) then
    create policy "auth can claim unowned docs"
      on docs for update to authenticated
      using (user_id is null)
      with check (user_id = auth.uid());
  end if;
end $$;
