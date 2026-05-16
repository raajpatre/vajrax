create extension if not exists pgcrypto;

create table if not exists public.sponsors (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    logo_url text not null,
    tier text not null check (tier in ('Platinum', 'Gold', 'Silver')),
    website_link text,
    is_active boolean not null default true,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists sponsors_is_active_idx on public.sponsors (is_active);
create index if not exists sponsors_tier_idx on public.sponsors (tier);

create or replace function public.set_sponsors_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists sponsors_set_updated_at on public.sponsors;
create trigger sponsors_set_updated_at
before update on public.sponsors
for each row
execute function public.set_sponsors_updated_at();

alter table public.sponsors enable row level security;

drop policy if exists "Sponsors are publicly readable" on public.sponsors;
create policy "Sponsors are publicly readable"
on public.sponsors
for select
using (true);

drop policy if exists "Faculty and presidents can insert sponsors" on public.sponsors;
create policy "Faculty and presidents can insert sponsors"
on public.sponsors
for insert
with check (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('faculty', 'president')
    )
);

drop policy if exists "Faculty and presidents can update sponsors" on public.sponsors;
create policy "Faculty and presidents can update sponsors"
on public.sponsors
for update
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('faculty', 'president')
    )
)
with check (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('faculty', 'president')
    )
);

drop policy if exists "Faculty and presidents can delete sponsors" on public.sponsors;
create policy "Faculty and presidents can delete sponsors"
on public.sponsors
for delete
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('faculty', 'president')
    )
);
