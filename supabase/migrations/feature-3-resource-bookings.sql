-- Feature 3: Workspace & Machinery Booking System
-- Resource bookings with built-in no-overlap constraint.

create table if not exists public.resource_bookings (
  id uuid primary key default gen_random_uuid(),
  resource_name text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'confirmed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resource_bookings_start_before_end check (start_time < end_time),
  constraint resource_bookings_status_check check (status in ('confirmed', 'cancelled'))
);

create index if not exists resource_bookings_resource_time_idx
  on public.resource_bookings (resource_name, start_time desc);

create index if not exists resource_bookings_user_created_idx
  on public.resource_bookings (user_id, created_at desc);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_resource_bookings_updated_at on public.resource_bookings;
create trigger trg_resource_bookings_updated_at
before update on public.resource_bookings
for each row
execute function public.set_updated_at();

-- Enable RLS
alter table public.resource_bookings enable row level security;

-- Read: allow any authenticated user to view bookings (needed for UI slot availability).
drop policy if exists resource_bookings_select_authenticated on public.resource_bookings;
create policy resource_bookings_select_authenticated
on public.resource_bookings
for select
to authenticated
using (auth.uid() is not null);

-- Insert: user can create only their own booking.
drop policy if exists resource_bookings_insert_own on public.resource_bookings;
create policy resource_bookings_insert_own
on public.resource_bookings
for insert
to authenticated
with check (auth.uid() = user_id);

-- Update: user can only cancel their booking.
drop policy if exists resource_bookings_update_cancel_own on public.resource_bookings;
create policy resource_bookings_update_cancel_own
on public.resource_bookings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id and status = 'cancelled');

-- No double-booking: forbid overlapping ranges per resource_name (ignoring cancelled bookings).
create extension if not exists btree_gist;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'resource_bookings_no_overlap'
  ) then
    alter table public.resource_bookings
      add constraint resource_bookings_no_overlap
      exclude using gist (
        resource_name with =,
        tstzrange(start_time, end_time, '[)') with &&
      )
      where (status <> 'cancelled');
  end if;
end
$$;

-- Optional: ensure Supabase realtime knows about this table (if you use subscriptions later).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'resource_bookings'
  ) then
    alter publication supabase_realtime add table public.resource_bookings;
  end if;
end
$$;

-- Notify PostgREST (helps if you generate types right after applying).
notify pgrst, 'reload schema';

