-- Enum value must be committed before use in policies (separate migration).

alter type public.user_role add value if not exists 'co_admin';
