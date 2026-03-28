alter table public.gallery_items
add column if not exists tag text,
add column if not exists location_city text,
add column if not exists location_country text;

update public.gallery_items
set
  tag = coalesce(tag, 'Gallery'),
  location_city = coalesce(location_city, 'Bengaluru'),
  location_country = coalesce(location_country, 'India')
where tag is null
   or location_city is null
   or location_country is null;
