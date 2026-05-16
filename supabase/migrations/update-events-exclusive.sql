-- Add the is_exclusive column to the events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN DEFAULT FALSE NOT NULL;
