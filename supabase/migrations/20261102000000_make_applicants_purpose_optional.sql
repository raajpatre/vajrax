-- Make purpose optional in applicants table
alter table public.applicants alter column purpose set default '';
alter table public.applicants alter column purpose drop not null;
