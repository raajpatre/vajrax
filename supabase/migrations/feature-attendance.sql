-- ============================================================
-- Feature: Attendance Tracking
-- ============================================================
-- 1. Add columns to meeting_minutes
-- 2. Create mom_attendances table
-- 3. DB trigger to auto-populate attendance on MOM insert
-- 4. RLS policies for visibility and attendance
-- 5. Update notification trigger for closed_session
-- 6. Helper SQL function for attendance stats
-- ============================================================

-- ─── 1. Extend meeting_minutes ────────────────────────────────

alter table public.meeting_minutes
  add column if not exists session_scope     text    not null default 'open_session',
  add column if not exists counts_attendance boolean not null default true,
  add column if not exists attendee_ids      uuid[]  not null default '{}';

comment on column public.meeting_minutes.session_scope is
  'open_session: all active members get session counted (absent = absent). closed_session: only attendees get session counted, others unaffected.';
comment on column public.meeting_minutes.counts_attendance is
  'If false, this MOM does not affect any member attendance (e.g. optional workshop).';
comment on column public.meeting_minutes.attendee_ids is
  'Array of profile IDs present at the meeting. Locked after insert — attendance rows auto-written via trigger.';

-- ─── 2. mom_attendances table ─────────────────────────────────

create table if not exists public.mom_attendances (
  id          uuid        primary key default gen_random_uuid(),
  mom_id      uuid        not null references public.meeting_minutes(id) on delete cascade,
  member_id   uuid        not null references public.profiles(id) on delete cascade,
  present     boolean     not null default true,
  recorded_at timestamptz not null default now(),
  unique(mom_id, member_id)
);

create index if not exists mom_attendances_mom_idx    on public.mom_attendances (mom_id);
create index if not exists mom_attendances_member_idx on public.mom_attendances (member_id);

alter table public.mom_attendances enable row level security;

do $$
begin
  -- Admins can see all attendance records
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mom_attendances' and policyname = 'att_select_admin'
  ) then
    create policy att_select_admin
      on public.mom_attendances
      for select
      using (
        exists (
          select 1 from public.profiles
          where id = auth.uid()
            and role in ('faculty', 'president', 'vice_president')
        )
      );
  end if;

  -- Members can see their own attendance rows
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mom_attendances' and policyname = 'att_select_own'
  ) then
    create policy att_select_own
      on public.mom_attendances
      for select
      using (auth.uid() = member_id);
  end if;

  -- Only admins can insert attendance records (trigger runs as security definer)
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mom_attendances' and policyname = 'att_insert_admin'
  ) then
    create policy att_insert_admin
      on public.mom_attendances
      for insert
      with check (
        exists (
          select 1 from public.profiles
          where id = auth.uid()
            and role in ('faculty', 'president', 'vice_president')
        )
      );
  end if;
end
$$;

-- ─── 3. Update meeting_minutes RLS for closed_session ─────────

-- Drop the existing broad select policy and replace with scope-aware one
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'meeting_minutes' and policyname = 'mom_select_authenticated'
  ) then
    drop policy mom_select_authenticated on public.meeting_minutes;
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'meeting_minutes' and policyname = 'mom_select_scoped'
  ) then
    drop policy mom_select_scoped on public.meeting_minutes;
  end if;
end
$$;

-- New policy: open_session MOMs -> all authenticated; closed_session -> attendees + admins
create policy mom_select_scoped
  on public.meeting_minutes
  for select
  using (
    auth.uid() is not null
    and (
      session_scope = 'open_session'
      or auth.uid() = any(attendee_ids)
      or exists (
        select 1 from public.profiles
        where id = auth.uid()
          and role in ('faculty', 'president', 'vice_president')
      )
    )
  );

-- ─── 4. Trigger: auto-populate attendance on MOM insert ───────

create or replace function public.populate_mom_attendance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec         record;
  attendee_id uuid;
begin
  if not new.counts_attendance then
    return new;
  end if;

  if new.session_scope = 'open_session' then
    for rec in
      select id from public.profiles
      where date_trunc('day', created_at at time zone 'UTC') <= new.meeting_date::date
    loop
      insert into public.mom_attendances (mom_id, member_id, present)
      values (
        new.id,
        rec.id,
        rec.id = any(new.attendee_ids)
      )
      on conflict (mom_id, member_id) do nothing;
    end loop;

  elsif new.session_scope = 'closed_session' then
    foreach attendee_id in array new.attendee_ids
    loop
      insert into public.mom_attendances (mom_id, member_id, present)
      values (new.id, attendee_id, true)
      on conflict (mom_id, member_id) do nothing;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_populate_mom_attendance on public.meeting_minutes;
create trigger trg_populate_mom_attendance
after insert on public.meeting_minutes
for each row
execute function public.populate_mom_attendance();

-- ─── 5. Update notification trigger for session scope ─────────

create or replace function public.notify_mom_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec         record;
  attendee_id uuid;
begin
  if new.session_scope = 'open_session' then
    for rec in
      select id from public.profiles
    loop
      if rec.id <> coalesce(new.created_by, '00000000-0000-0000-0000-000000000000'::uuid) then
        insert into public.notifications (user_id, type, message, related_entity_id)
        values (
          rec.id,
          'mom_published',
          'New minutes published: ' || new.title,
          new.id
        );
      end if;
    end loop;

  elsif new.session_scope = 'closed_session' then
    foreach attendee_id in array new.attendee_ids
    loop
      if attendee_id <> coalesce(new.created_by, '00000000-0000-0000-0000-000000000000'::uuid) then
        insert into public.notifications (user_id, type, message, related_entity_id)
        values (
          attendee_id,
          'mom_published',
          'New closed-session minutes published: ' || new.title,
          new.id
        );
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_mom_published on public.meeting_minutes;
create trigger trg_notify_mom_published
after insert on public.meeting_minutes
for each row
execute function public.notify_mom_published();

-- ─── 6. Attendance stats function (for sidebar widget) ────────

create or replace function public.get_member_attendance_stats(p_member_id uuid)
returns table (
  sessions_eligible int,
  sessions_attended int,
  attendance_pct    numeric
)
language sql
security definer
set search_path = public
as $$
  select
    count(*)::int                                                    as sessions_eligible,
    count(*) filter (where present = true)::int                     as sessions_attended,
    case
      when count(*) = 0 then 100::numeric
      else round(count(*) filter (where present = true)::numeric / count(*) * 100, 1)
    end                                                              as attendance_pct
  from public.mom_attendances
  where member_id = p_member_id;
$$;

-- ─── 7. Bulk attendance stats view (for admin page) ──────────

create or replace view public.member_attendance_summary as
select
  p.id                                                                            as member_id,
  p.display_name,
  p.avatar_url,
  p.role,
  p.created_at                                                                    as joined_at,
  count(a.mom_id)::int                                                            as sessions_eligible,
  count(a.mom_id) filter (where a.present = true)::int                           as sessions_attended,
  case
    when count(a.mom_id) = 0 then 100::numeric
    else round(count(a.mom_id) filter (where a.present = true)::numeric / count(a.mom_id) * 100, 1)
  end                                                                             as attendance_pct,
  (
    case
      when count(a.mom_id) = 0 then false
      else (round(count(a.mom_id) filter (where a.present = true)::numeric / count(a.mom_id) * 100, 1)) < 75
    end
  )                                                                               as is_flagged
from public.profiles p
left join public.mom_attendances a on a.member_id = p.id
group by p.id, p.display_name, p.avatar_url, p.role, p.created_at;
