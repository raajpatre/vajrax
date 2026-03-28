alter table public.profiles
add column if not exists current_semester integer;

alter table public.profiles
drop constraint if exists profiles_current_semester_check;

alter table public.profiles
add constraint profiles_current_semester_check
check (
  current_semester is null
  or (current_semester >= 1 and current_semester <= 8)
);
