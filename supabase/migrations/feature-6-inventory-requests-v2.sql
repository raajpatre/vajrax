alter table public.equipment_requests
    add column if not exists approved_quantity integer,
    add column if not exists reviewed_at timestamptz;

alter table public.equipment_requests
    drop constraint if exists equipment_requests_approved_quantity_check;

alter table public.equipment_requests
    add constraint equipment_requests_approved_quantity_check
    check (
        approved_quantity is null
        or (approved_quantity >= 0 and approved_quantity <= quantity)
    );

update public.equipment_requests
set
    approved_quantity = case
        when status in ('approved', 'returned') then quantity
        when status = 'rejected' then 0
        else approved_quantity
    end,
    reviewed_at = case
        when status in ('approved', 'returned', 'rejected', 'revoked') then coalesce(reviewed_at, updated_at, created_at)
        else reviewed_at
    end
where approved_quantity is null or reviewed_at is null;

create table if not exists public.equipment_request_return_units (
    id uuid primary key default gen_random_uuid(),
    request_id uuid not null references public.equipment_requests(id) on delete cascade,
    item_id uuid not null references public.inventory_items(id) on delete cascade,
    unit_index integer not null check (unit_index > 0),
    lifecycle_status text not null default 'return_pending'
        check (lifecycle_status in ('return_pending', 'returned')),
    return_condition text
        check (return_condition in ('perfect', 'moderate', 'poor', 'disposable')),
    returned_at timestamptz,
    returned_by uuid references public.profiles(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (request_id, unit_index)
);

create index if not exists idx_equipment_request_return_units_request_id
    on public.equipment_request_return_units(request_id);

create index if not exists idx_equipment_request_return_units_lifecycle_status
    on public.equipment_request_return_units(lifecycle_status);

create or replace function public.has_inventory_review_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and role in ('faculty', 'president', 'vice_president', 'inventory_manager')
    );
$$;

alter table public.equipment_request_return_units enable row level security;

drop policy if exists "requesters and reviewers can view return units" on public.equipment_request_return_units;
create policy "requesters and reviewers can view return units"
on public.equipment_request_return_units
for select
using (
    public.has_inventory_review_access()
    or exists (
        select 1
        from public.equipment_requests
        where id = request_id
          and requester_id = auth.uid()
    )
);

drop policy if exists "reviewers can insert return units" on public.equipment_request_return_units;
create policy "reviewers can insert return units"
on public.equipment_request_return_units
for insert
with check (public.has_inventory_review_access());

drop policy if exists "reviewers can update return units" on public.equipment_request_return_units;
create policy "reviewers can update return units"
on public.equipment_request_return_units
for update
using (public.has_inventory_review_access())
with check (public.has_inventory_review_access());
