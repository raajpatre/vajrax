-- Feature 1: Notification system
-- Safe, additive migration for VajraX.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  related_entity_id uuid null
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read)
  where is_read = false;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;

alter table public.notifications enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'notifications_select_own'
  ) then
    create policy notifications_select_own
      on public.notifications
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'notifications_update_own'
  ) then
    create policy notifications_update_own
      on public.notifications
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

-- Trigger: notify requester when equipment request is approved.
create or replace function public.notify_equipment_request_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'pending'
     and new.status in ('approved', 'returned')
     and old.status is distinct from new.status then
    insert into public.notifications (user_id, type, message, related_entity_id)
    values (
      new.requester_id,
      'equipment_request_approved',
      'Your equipment request has been approved.',
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_equipment_request_approved on public.equipment_requests;
create trigger trg_notify_equipment_request_approved
after update on public.equipment_requests
for each row
execute function public.notify_equipment_request_approved();

-- Trigger: notify post author when someone else comments on a post.
create or replace function public.notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
begin
  select author_id into post_author
  from public.posts
  where id = new.post_id;

  if post_author is not null and post_author <> new.author_id then
    insert into public.notifications (user_id, type, message, related_entity_id)
    values (
      post_author,
      'post_comment',
      'Someone commented on your post.',
      new.post_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_post_comment on public.comments;
create trigger trg_notify_post_comment
after insert on public.comments
for each row
execute function public.notify_post_comment();
