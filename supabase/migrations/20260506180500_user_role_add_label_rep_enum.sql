-- PostgreSQL does not allow using a newly added enum literal in the same transaction (55P04).
-- Commit happens between migrations, so `label_rep` is safe to use in 20260506190000_label_rep.sql.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'user_role'
      and e.enumlabel = 'label_rep'
  ) then
    alter type public.user_role add value 'label_rep';
  end if;
end $$;
