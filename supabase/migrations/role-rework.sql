-- ============================================================
-- Role System Rework Migration
-- ============================================================

-- 1. Add new enum values
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'lead_developer';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'project_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'social_media_head';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'social_media_co_head';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sponsorship_head';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'workshop_head';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'mechanics_head';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cad_head';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'electronics_head';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'procurement_head';

-- 2. Migrate existing website_manager → lead_developer
UPDATE public.profiles SET role = 'lead_developer' WHERE role = 'website_manager';

-- 3. Add roles[] column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roles text[] DEFAULT '{}';

-- 4. Backfill roles from existing role column
UPDATE public.profiles SET roles = ARRAY[role::text] WHERE roles = '{}' OR roles IS NULL;

-- 5. Set default going forward
ALTER TABLE public.profiles ALTER COLUMN roles SET DEFAULT ARRAY['member'];
