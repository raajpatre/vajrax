-- Feature 4: Safety & Training Certifications
-- Adds profile certifications and enforces hazardous request checks.

alter table public.profiles
add column if not exists safety_certifications text[] not null default '{}'::text[];

alter table public.inventory_items
add column if not exists required_safety_certification text null;

comment on column public.profiles.safety_certifications is
  'List of safety/training certifications granted to this member.';

comment on column public.inventory_items.required_safety_certification is
  'If set, requester profile must include this certification to create an equipment request.';

create or replace function public.requester_has_required_certification(
  p_requester_id uuid,
  p_item_id uuid
)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    case
      when i.required_safety_certification is null
           or btrim(i.required_safety_certification) = '' then true
      else i.required_safety_certification = any(coalesce(p.safety_certifications, '{}'::text[]))
    end
  from public.inventory_items i
  join public.profiles p on p.id = p_requester_id
  where i.id = p_item_id;
$$;

create or replace function public.enforce_equipment_request_safety_certification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  required_cert text;
begin
  select required_safety_certification
  into required_cert
  from public.inventory_items
  where id = new.item_id;

  if required_cert is null or btrim(required_cert) = '' then
    return new;
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = new.requester_id
      and required_cert = any(coalesce(p.safety_certifications, '{}'::text[]))
  ) then
    raise exception 'Safety certification "%" is required for this item.', required_cert
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_equipment_requests_cert_gate on public.equipment_requests;
create trigger trg_equipment_requests_cert_gate
before insert or update of item_id, requester_id on public.equipment_requests
for each row
execute function public.enforce_equipment_request_safety_certification();

notify pgrst, 'reload schema';

