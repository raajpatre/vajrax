-- Feature: Minutes of the Meeting (MOM)
-- Creates meeting_minutes and mom_comments tables with RLS and notification trigger.

-- ─── meeting_minutes ─────────────────────────────────────────────────────────

create table if not exists public.meeting_minutes (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  meeting_date  date not null,
  meeting_type  text not null default 'General Body Meeting',
  attendees     int null,
  content       text not null default '',    -- Tiptap HTML
  action_items  jsonb not null default '[]', -- [{task, assignee, due_date}]
  resources     jsonb not null default '[]', -- [{type:'photo'|'url', url, title}]
  created_by    uuid null references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists meeting_minutes_date_idx
  on public.meeting_minutes (meeting_date desc);

create index if not exists meeting_minutes_created_by_idx
  on public.meeting_minutes (created_by);

alter table public.meeting_minutes enable row level security;

do $$
begin
  -- All authenticated members can read MOMs
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'meeting_minutes'
      and policyname = 'mom_select_authenticated'
  ) then
    create policy mom_select_authenticated
      on public.meeting_minutes
      for select
      using (auth.uid() is not null);
  end if;

  -- Only faculty, president, vice_president can insert
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'meeting_minutes'
      and policyname = 'mom_insert_privileged'
  ) then
    create policy mom_insert_privileged
      on public.meeting_minutes
      for insert
      with check (
        auth.uid() is not null
        and exists (
          select 1 from public.profiles
          where id = auth.uid()
            and role in ('faculty', 'president', 'vice_president')
        )
      );
  end if;

  -- Only faculty, president, vice_president can update
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'meeting_minutes'
      and policyname = 'mom_update_privileged'
  ) then
    create policy mom_update_privileged
      on public.meeting_minutes
      for update
      using (
        exists (
          select 1 from public.profiles
          where id = auth.uid()
            and role in ('faculty', 'president', 'vice_president')
        )
      )
      with check (
        exists (
          select 1 from public.profiles
          where id = auth.uid()
            and role in ('faculty', 'president', 'vice_president')
        )
      );
  end if;

  -- Only faculty, president, vice_president can delete
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'meeting_minutes'
      and policyname = 'mom_delete_privileged'
  ) then
    create policy mom_delete_privileged
      on public.meeting_minutes
      for delete
      using (
        exists (
          select 1 from public.profiles
          where id = auth.uid()
            and role in ('faculty', 'president', 'vice_president')
        )
      );
  end if;
end
$$;

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_meeting_minutes_updated_at on public.meeting_minutes;
create trigger trg_meeting_minutes_updated_at
before update on public.meeting_minutes
for each row
execute function public.set_updated_at();

-- ─── mom_comments ─────────────────────────────────────────────────────────────

create table if not exists public.mom_comments (
  id          uuid primary key default gen_random_uuid(),
  mom_id      uuid not null references public.meeting_minutes(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists mom_comments_mom_idx
  on public.mom_comments (mom_id, created_at asc);

alter table public.mom_comments enable row level security;

do $$
begin
  -- All authenticated members can read comments
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mom_comments'
      and policyname = 'mom_comments_select_authenticated'
  ) then
    create policy mom_comments_select_authenticated
      on public.mom_comments
      for select
      using (auth.uid() is not null);
  end if;

  -- Any authenticated member can post a comment
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mom_comments'
      and policyname = 'mom_comments_insert_authenticated'
  ) then
    create policy mom_comments_insert_authenticated
      on public.mom_comments
      for insert
      with check (auth.uid() = author_id);
  end if;

  -- Author can update their own comment
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mom_comments'
      and policyname = 'mom_comments_update_own'
  ) then
    create policy mom_comments_update_own
      on public.mom_comments
      for update
      using (auth.uid() = author_id)
      with check (auth.uid() = author_id);
  end if;

  -- Author or privileged role can delete a comment
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mom_comments'
      and policyname = 'mom_comments_delete_own_or_admin'
  ) then
    create policy mom_comments_delete_own_or_admin
      on public.mom_comments
      for delete
      using (
        auth.uid() = author_id
        or exists (
          select 1 from public.profiles
          where id = auth.uid()
            and role in ('faculty', 'president', 'vice_president')
        )
      );
  end if;
end
$$;

drop trigger if exists trg_mom_comments_updated_at on public.mom_comments;
create trigger trg_mom_comments_updated_at
before update on public.mom_comments
for each row
execute function public.set_updated_at();

-- ─── Notification trigger — broadcast to all members on MOM insert ──────────

create or replace function public.notify_mom_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  -- Insert a notification for every profile
  for rec in
    select id from public.profiles
  loop
    -- Skip the author themselves
    if rec.id <> new.created_by then
      insert into public.notifications (user_id, type, message, related_entity_id)
      values (
        rec.id,
        'mom_published',
        'New minutes published: ' || new.title,
        new.id
      );
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_notify_mom_published on public.meeting_minutes;
create trigger trg_notify_mom_published
after insert on public.meeting_minutes
for each row
execute function public.notify_mom_published();
