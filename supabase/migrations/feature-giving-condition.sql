-- VajraX inventory: per-unit "giving condition" + new condition vocabulary
-- New vocabulary: perfect / partly_damaged / trash
-- (previously: perfect / moderate / poor / disposable)

-- ── 1. Migrate the return_condition vocabulary ────────────────────────────────

-- Drop the old inline check constraint (auto-named by Postgres)
alter table public.equipment_request_return_units
    drop constraint if exists equipment_request_return_units_return_condition_check;

-- Map existing rows onto the new vocabulary
update public.equipment_request_return_units
set return_condition = case return_condition
    when 'moderate'   then 'partly_damaged'
    when 'poor'       then 'partly_damaged'
    when 'disposable' then 'trash'
    else return_condition
end
where return_condition in ('moderate', 'poor', 'disposable');

-- Re-add the constraint with the new allowed values
alter table public.equipment_request_return_units
    add constraint equipment_request_return_units_return_condition_check
    check (
        return_condition is null
        or return_condition in ('perfect', 'partly_damaged', 'trash')
    );

-- ── 2. Per-unit giving condition (condition when the unit was handed out) ──────

alter table public.equipment_request_return_units
    add column if not exists giving_condition text;

alter table public.equipment_request_return_units
    drop constraint if exists equipment_request_return_units_giving_condition_check;

alter table public.equipment_request_return_units
    add constraint equipment_request_return_units_giving_condition_check
    check (
        giving_condition is null
        or giving_condition in ('perfect', 'partly_damaged', 'trash')
    );

-- Backfill existing units (already borrowed/returned) with a sensible default
update public.equipment_request_return_units
set giving_condition = 'perfect'
where giving_condition is null;
