-- Add 'planning' and 'ongoing' to the projects status check constraint.
-- Run this in Supabase SQL Editor.

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE projects
    ADD CONSTRAINT projects_status_check
    CHECK (status IN ('in_progress', 'ongoing', 'planning', 'on_hold', 'completed', 'archived'));
