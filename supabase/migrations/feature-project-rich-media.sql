alter table public.project_updates
add column if not exists source_urls text[] default '{}'::text[];

alter table public.project_updates
add column if not exists image_urls text[] default '{}'::text[];
