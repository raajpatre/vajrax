-- Remove the deprecated feed feature and its notification plumbing.

-- Realtime cleanup
do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime drop table public.notifications;
  end if;
exception
  when undefined_object then
    null;
end $$;

-- Feed-related triggers/functions
drop trigger if exists trg_notify_equipment_request_status on public.equipment_requests;
drop trigger if exists trg_notify_post_comment on public.comments;

drop function if exists public.notify_equipment_request_status() cascade;
drop function if exists public.notify_post_comment() cascade;

-- Feed-related tables
drop table if exists public.post_likes cascade;
drop table if exists public.comments cascade;
drop table if exists public.posts cascade;
drop table if exists public.notifications cascade;
