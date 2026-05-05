-- Digital Service Pack — foundation schema, RLS, private promo storage
-- Apply with Supabase CLI (`supabase db push`) or Dashboard SQL editor.

begin;

create extension if not exists "pgcrypto";

create type public.user_role as enum ('artist', 'dj', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'artist',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stripe_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_customer_id text not null,
  created_at timestamptz not null default now(),
  constraint stripe_customers_user_id_key unique (user_id),
  constraint stripe_customers_stripe_id_key unique (stripe_customer_id)
);

create index profiles_role_idx on public.profiles (role);
create index stripe_customers_user_id_idx on public.stripe_customers (user_id);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Avoid RLS self-join recursion when checking admin in policies.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'admin'
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;

create or replace function public.profiles_guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.role is distinct from new.role then
    if not public.is_admin(auth.uid()) then
      raise exception 'Only admins can change roles' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_role_guard
  before update on public.profiles
  for each row execute function public.profiles_guard_role_change();

alter table public.profiles enable row level security;
alter table public.stripe_customers enable row level security;

create policy "profiles_select_visible"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin(auth.uid()));

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.is_admin(auth.uid()))
  with check (auth.uid() = id or public.is_admin(auth.uid()));

create policy "profiles_no_direct_insert"
  on public.profiles for insert
  to authenticated
  with check (false);

create policy "stripe_customers_select_own"
  on public.stripe_customers for select
  to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('promos', 'promos', false)
on conflict (id) do nothing;

create policy "promos_insert_own_prefix"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'promos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "promos_select_own_prefix"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'promos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "promos_update_own_prefix"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'promos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "promos_delete_own_prefix"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'promos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

commit;
