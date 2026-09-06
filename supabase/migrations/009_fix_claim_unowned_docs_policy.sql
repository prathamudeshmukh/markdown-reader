-- Fix "auth can claim unowned docs" so a signed-in user can edit the
-- content of an unowned doc without being forced to also claim ownership.
--
-- Bug: this policy's USING clause (user_id is null) makes an unowned doc
-- visible for UPDATE to any authenticated user, but its WITH CHECK clause
-- (user_id = auth.uid()) requires the resulting row to become owned by
-- that user. Postgres combines all applicable permissive policies' WITH
-- CHECK clauses with OR, and no other policy covers "authenticated user,
-- doc stays unowned, edit_access is false" — so a plain content-only edit
-- (no ownership claim) on an unowned doc is rejected with 42501, even
-- though docsRouter.ts's handlePut explicitly allows it at the app layer.
drop policy if exists "auth can claim unowned docs" on docs;

create policy "auth can claim unowned docs"
  on docs for update to authenticated
  using (user_id is null)
  with check (user_id is null or user_id = auth.uid());
