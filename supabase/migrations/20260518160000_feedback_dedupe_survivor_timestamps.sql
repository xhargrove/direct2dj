begin;

-- Follow-up for databases that already applied an older `20260518150000` revision that deduped by
-- UUID order only. Idempotent when duplicates are gone (deletes 0 rows).

delete from public.feedback f
where f.id not in (
  select distinct on (track_id, dj_id) id
  from public.feedback
  order by
    track_id,
    dj_id,
    updated_at desc nulls last,
    created_at desc nulls last,
    id desc
);

commit;
