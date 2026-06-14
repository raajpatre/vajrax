-- Add file attachments (code / STL files) to project progress-log entries.
-- attachments is a JSONB array of objects: [{ "url": "...", "name": "main.py", "kind": "code" | "stl" }]
-- Run this in the Supabase SQL Editor.

ALTER TABLE project_updates
    ADD COLUMN IF NOT EXISTS attachments jsonb;
np