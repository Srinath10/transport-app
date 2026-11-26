-- Trip Manager: multi-tenant schema for Supabase (Postgres).
-- DRAFT for phase 2 (cloud sync). Not applied anywhere yet.
--
-- Tenancy: every row carries org_id; row-level security keyed on org membership
-- keeps one owner's data invisible to another.
-- Roles: owner (everything), driver (append-only on assigned vehicles, never sees money),
-- accountant (read-only).
-- Money is kept OUT of the legs table (in leg_charges) because RLS is row-level:
-- drivers can read their legs, but have no policy at all on leg_charges.

create extension if not exists pgcrypto;

-- ---------- tenancy ----------
create table orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lang text not null default 'en' check (lang in ('en', 'ta')),
  number_format text not null default 'intl' check (number_format in ('intl', 'indian')),
  fuel_prices jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create type member_role as enum ('owner', 'driver', 'accountant');

create table org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  user_id uuid references auth.users on delete set null, -- null until the invite is accepted
  role member_role not null,
  name text not null,
  phone text not null default '',
  lang text check (lang in ('en', 'ta')),
  invite_code text unique,
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- Helpers (security definer so policies don't recurse into org_members' own RLS)
create or replace function my_role(o uuid) returns member_role
language sql stable security definer set search_path = public as $$
  select role from org_members where org_id = o and user_id = auth.uid() limit 1
$$;

create or replace function my_member_id(o uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from org_members where org_id = o and user_id = auth.uid() limit 1
$$;

-- ---------- fleet ----------
create table vehicles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  reg_no text not null,
  type text not null check (type in ('lorry', 'tipper', 'container', 'pickup', 'tractor', 'bus')),
  fuel text not null check (fuel in ('diesel', 'petrol')),
  archived boolean not null default false,
  unique (org_id, reg_no)
);

create table member_vehicles (
  member_id uuid not null references org_members on delete cascade,
  vehicle_id uuid not null references vehicles on delete cascade,
  org_id uuid not null references orgs on delete cascade,
  primary key (member_id, vehicle_id)
);

create or replace function drives(v uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from member_vehicles mv join org_members m on m.id = mv.member_id
    where mv.vehicle_id = v and m.user_id = auth.uid()
  )
$$;

create table categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  built_in text check (built_in in ('fuel', 'salary', 'bata', 'loading', 'unloading', 'broker', 'toll', 'parking', 'other')),
  name text not null default '',
  hidden boolean not null default false,
  sort_order int not null default 0,
  vehicle_types text[] -- null = all types
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  name text not null,
  kind text not null check (kind in ('customer', 'broker')),
  phone text not null default '',
  unique (org_id, kind, name)
);

-- ---------- trips ----------
create table trips (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  vehicle_id uuid not null references vehicles,
  driver_id uuid references org_members on delete set null,
  start_date date not null,
  end_date date,
  status text not null default 'open' check (status in ('open', 'closed')),
  distance_km numeric,
  created_by uuid references org_members,
  created_at timestamptz not null default now()
);

create table legs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  trip_id uuid not null references trips on delete cascade,
  seq int not null default 0,
  from_place text not null,
  to_place text not null,
  empty boolean not null default false,
  cargo text not null default '',
  client text not null default '',
  broker text not null default '',
  timing text not null default '',
  created_by uuid references org_members,
  created_at timestamptz not null default now()
);

-- Money for a leg. Owner/accountant only: drivers have no policy here.
create table leg_charges (
  leg_id uuid primary key references legs on delete cascade,
  org_id uuid not null references orgs on delete cascade,
  rate_type text not null default 'fixed' check (rate_type in ('fixed', 'per_kg', 'per_tonne', 'per_km', 'per_day', 'per_bag')),
  quantity numeric not null default 0,
  rate numeric not null default 0,
  income numeric generated always as (case when rate_type = 'fixed' then round(rate) else round(quantity * rate) end) stored,
  payment text not null default 'unset' check (payment in ('unset', 'due', 'paid'))
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  trip_id uuid not null references trips on delete cascade,
  category_id uuid not null references categories,
  amount numeric not null check (amount > 0),
  litres numeric,
  price_per_litre numeric,
  note text not null default '',
  receipt_path text, -- storage: receipts/<org_id>/<expense_id>.jpg
  created_by uuid references org_members,
  created_at timestamptz not null default now()
);

create table vehicle_expenses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  vehicle_id uuid not null references vehicles on delete cascade,
  date date not null,
  description text not null,
  amount numeric not null check (amount > 0)
);

create index on trips (org_id, start_date);
create index on legs (trip_id);
create index on expenses (trip_id);

-- ---------- row-level security ----------
alter table orgs enable row level security;
alter table org_members enable row level security;
alter table vehicles enable row level security;
alter table member_vehicles enable row level security;
alter table categories enable row level security;
alter table contacts enable row level security;
alter table trips enable row level security;
alter table legs enable row level security;
alter table leg_charges enable row level security;
alter table expenses enable row level security;
alter table vehicle_expenses enable row level security;

-- Everyone in the org can read the org, people, vehicles and categories they need.
create policy org_read on orgs for select using (my_role(id) is not null);
create policy org_owner on orgs for update using (my_role(id) = 'owner');

create policy members_read on org_members for select using (my_role(org_id) is not null);
create policy members_owner on org_members for all using (my_role(org_id) = 'owner') with check (my_role(org_id) = 'owner');

create policy vehicles_read on vehicles for select
  using (my_role(org_id) in ('owner', 'accountant') or (my_role(org_id) = 'driver' and drives(id)));
create policy vehicles_owner on vehicles for all using (my_role(org_id) = 'owner') with check (my_role(org_id) = 'owner');

create policy mv_read on member_vehicles for select using (my_role(org_id) is not null);
create policy mv_owner on member_vehicles for all using (my_role(org_id) = 'owner') with check (my_role(org_id) = 'owner');

create policy cats_read on categories for select using (my_role(org_id) is not null);
create policy cats_owner on categories for all using (my_role(org_id) = 'owner') with check (my_role(org_id) = 'owner');

create policy contacts_read on contacts for select using (my_role(org_id) is not null);
create policy contacts_driver_add on contacts for insert with check (my_role(org_id) in ('owner', 'driver'));
create policy contacts_owner on contacts for all using (my_role(org_id) = 'owner') with check (my_role(org_id) = 'owner');

-- Trips: owner/accountant read all; drivers read their own trips on assigned vehicles.
create policy trips_read on trips for select using (
  my_role(org_id) in ('owner', 'accountant')
  or (my_role(org_id) = 'driver' and drives(vehicle_id) and driver_id = my_member_id(org_id))
);
create policy trips_owner on trips for all using (my_role(org_id) = 'owner') with check (my_role(org_id) = 'owner');
create policy trips_driver_add on trips for insert with check (
  my_role(org_id) = 'driver' and drives(vehicle_id) and driver_id = my_member_id(org_id)
);
-- Drivers may record km once (null → value) on an open trip; nothing else.
create policy trips_driver_km on trips for update
  using (my_role(org_id) = 'driver' and driver_id = my_member_id(org_id) and status = 'open' and distance_km is null)
  with check (driver_id = my_member_id(org_id) and status = 'open');

-- Legs & expenses: drivers append only (insert, never update/delete) → no offline edit conflicts.
create policy legs_read on legs for select using (exists (select 1 from trips t where t.id = trip_id));
create policy legs_owner on legs for all using (my_role(org_id) = 'owner') with check (my_role(org_id) = 'owner');
create policy legs_driver_add on legs for insert with check (
  my_role(org_id) = 'driver' and created_by = my_member_id(org_id)
  and exists (select 1 from trips t where t.id = trip_id and t.status = 'open' and t.driver_id = my_member_id(org_id))
);

create policy charges_read on leg_charges for select using (my_role(org_id) in ('owner', 'accountant'));
create policy charges_owner on leg_charges for all using (my_role(org_id) = 'owner') with check (my_role(org_id) = 'owner');

create policy exp_read on expenses for select using (exists (select 1 from trips t where t.id = trip_id));
create policy exp_owner on expenses for all using (my_role(org_id) = 'owner') with check (my_role(org_id) = 'owner');
create policy exp_driver_add on expenses for insert with check (
  my_role(org_id) = 'driver' and created_by = my_member_id(org_id)
  and exists (select 1 from trips t where t.id = trip_id and t.status = 'open' and t.driver_id = my_member_id(org_id))
);

create policy vexp_read on vehicle_expenses for select using (my_role(org_id) in ('owner', 'accountant'));
create policy vexp_owner on vehicle_expenses for all using (my_role(org_id) = 'owner') with check (my_role(org_id) = 'owner');

-- ---------- receipts storage ----------
-- insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false);
-- create policy receipts_read on storage.objects for select
--   using (bucket_id = 'receipts' and my_role(((storage.foldername(name))[1])::uuid) is not null);
-- create policy receipts_add on storage.objects for insert
--   with check (bucket_id = 'receipts' and my_role(((storage.foldername(name))[1])::uuid) in ('owner', 'driver'));

-- ---------- onboarding ----------
-- Creates the org, the caller as owner, and default categories in one call.
create or replace function create_org(p_name text, p_lang text)
returns uuid language plpgsql security definer set search_path = public as $$
declare o uuid;
begin
  insert into orgs (name, lang) values (p_name, p_lang) returning id into o;
  insert into org_members (org_id, user_id, role, name) values (o, auth.uid(), 'owner', p_name);
  insert into categories (org_id, built_in, sort_order, vehicle_types) values
    (o, 'fuel', 0, null), (o, 'salary', 1, null), (o, 'bata', 2, null),
    (o, 'loading', 3, '{lorry,tipper,container,pickup,tractor}'),
    (o, 'unloading', 4, '{lorry,tipper,container,pickup,tractor}'),
    (o, 'broker', 5, '{lorry,tipper,container,pickup}'),
    (o, 'toll', 6, '{lorry,tipper,container,pickup,bus}'),
    (o, 'parking', 7, '{lorry,container,pickup,bus}'),
    (o, 'other', 8, null);
  return o;
end $$;
