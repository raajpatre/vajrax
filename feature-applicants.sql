create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'applicant_status'
  ) then
    create type public.applicant_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

create table if not exists public.applicants (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  encrypted_password text not null,
  current_semester integer not null,
  purpose text not null,
  status public.applicant_status not null default 'pending',
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint applicants_current_semester_check
    check (current_semester >= 1 and current_semester <= 8),
  constraint applicants_email_format_check
    check (position('@' in email) > 1)
);

create index if not exists applicants_status_created_at_idx
  on public.applicants (status, created_at desc);

create index if not exists applicants_email_idx
  on public.applicants (lower(email));

create or replace function public.set_applicants_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists applicants_set_updated_at on public.applicants;
create trigger applicants_set_updated_at
before update on public.applicants
for each row
execute function public.set_applicants_updated_at();

alter table public.applicants enable row level security;
