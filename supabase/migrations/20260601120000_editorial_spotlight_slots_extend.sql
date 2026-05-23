-- Three additional admin-curated editorial spotlight slots (enum values only).
-- Must be separate from the hub function update: PG forbids using new enum values in the same transaction.

alter type public.editorial_spotlight_slot add value if not exists 'new_release';
alter type public.editorial_spotlight_slot add value if not exists 'artist_spotlight';
alter type public.editorial_spotlight_slot add value if not exists 'must_spin';
