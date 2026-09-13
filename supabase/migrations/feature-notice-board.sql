-- ============================================================
-- Feature: Notice Board
-- Public announcement system for VajraX.
-- Authorised writers: faculty, president, vice_president.
-- Readers: everyone (anonymous + authenticated).
-- ============================================================

-- 1. Table
create table if not exists public.notice_board (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  body        text        not null,    -- stored as Markdown
  is_pinned   boolean     not null default false,
  is_archived boolean     not null default false,
  expires_at  timestamptz,             -- null = never expires
  -- Optional CTA button
  cta_label   text        check (cta_label in ('Download','See','Submit','Apply','Register','More Info')),
  cta_url     text,                    -- null = no CTA button
  author_id   uuid        references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Both CTA fields must be set together, or both null
  constraint cta_both_or_neither check (
    (cta_label is null) = (cta_url is null)
  )
);

-- 2. Indexes
create index if not exists notice_board_feed_idx
  on public.notice_board (is_archived, is_pinned desc, created_at desc);

create index if not exists notice_board_author_idx
  on public.notice_board (author_id);

-- 3. updated_at trigger
create or replace function public.set_notice_board_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists notice_board_set_updated_at on public.notice_board;
create trigger notice_board_set_updated_at
  before update on public.notice_board
  for each row
  execute function public.set_notice_board_updated_at();

-- 4. RLS
alter table public.notice_board enable row level security;

-- Public read: everyone can see non-archived, non-expired notices
drop policy if exists "Notice board is publicly readable" on public.notice_board;
create policy "Notice board is publicly readable"
  on public.notice_board
  for select
  using (true);  -- filtering of archived/expired happens at query time

-- Helper: checks if the calling user is a notice board writer
-- Uses the roles[] array (role-rework migration).
create or replace function public.is_notice_board_writer()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and (
        profiles.role in ('faculty', 'president', 'vice_president')
        or profiles.roles && array['faculty','president','vice_president']
      )
  );
$$;

drop policy if exists "Notice board writers can insert" on public.notice_board;
create policy "Notice board writers can insert"
  on public.notice_board
  for insert
  with check ( public.is_notice_board_writer() );

drop policy if exists "Notice board writers can update" on public.notice_board;
create policy "Notice board writers can update"
  on public.notice_board
  for update
  using ( public.is_notice_board_writer() )
  with check ( public.is_notice_board_writer() );

drop policy if exists "Notice board writers can delete" on public.notice_board;
create policy "Notice board writers can delete"
  on public.notice_board
  for delete
  using ( public.is_notice_board_writer() );

-- 5. Notification trigger: when a notice is created, notify all members
--    (inserts one row per profile — kept lightweight via a single bulk insert)
create or replace function public.notify_all_members_new_notice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, message, related_entity_id)
  select
    p.id,
    'notice_board',
    'New notice: ' || new.title,
    new.id
  from public.profiles p
  where p.id <> coalesce(new.author_id, '00000000-0000-0000-0000-000000000000'::uuid);

  return new;
end;
$$;

drop trigger if exists trg_notify_new_notice on public.notice_board;
create trigger trg_notify_new_notice
  after insert on public.notice_board
  for each row
  execute function public.notify_all_members_new_notice();
