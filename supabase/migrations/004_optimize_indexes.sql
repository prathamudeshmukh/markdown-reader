-- Replace the single-column user_id index with a compound index that also
-- covers the ORDER BY updated_at DESC used in getUserDocs. Postgres can now
-- satisfy both the WHERE and ORDER BY in one index scan without a sort step.
drop index if exists docs_user_id_idx;
create index if not exists docs_user_id_updated_at_idx on docs(user_id, updated_at desc);
