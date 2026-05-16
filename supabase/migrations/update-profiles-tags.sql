-- Add custom_tags array column to profiles table
-- This allows assigning multiple descriptive tags to a member (e.g., 'Core Team', 'Marketing Lead')
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_tags TEXT[] DEFAULT '{}'::text[];

-- Notify Supabase Realtime of the schema change if needed
NOTIFY pgrst, 'reload schema';
