-- Enum values must be committed before use in CHECK constraints (Postgres 55P04).
-- See follow-up: 20260603120100_admin_broadcast_user_outreach_schema.sql

alter type public.admin_broadcast_audience add value if not exists 'pending_djs';
alter type public.admin_broadcast_audience add value if not exists 'single_profile';
