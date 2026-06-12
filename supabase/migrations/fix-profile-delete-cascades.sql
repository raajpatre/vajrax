-- Allow deleting a member (profiles row) without hitting foreign-key violations.
-- Re-creates every FK that references profiles(id) with an explicit ON DELETE rule:
--   • CASCADE   → the member's own data is removed with them (NOT NULL columns)
--   • SET NULL  → audit / reviewer / creator references are preserved but de-linked
--                 (nullable columns, so history survives the member's deletion)
--
-- Idempotent: safe to run multiple times. Run this in the Supabase SQL Editor.

-- ── Owned data → CASCADE ───────────────────────────────────────────────
ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_user_id_fkey;
ALTER TABLE project_members ADD CONSTRAINT project_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE project_invites DROP CONSTRAINT IF EXISTS project_invites_invitee_id_fkey;
ALTER TABLE project_invites ADD CONSTRAINT project_invites_invitee_id_fkey
    FOREIGN KEY (invitee_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE project_invites DROP CONSTRAINT IF EXISTS project_invites_inviter_id_fkey;
ALTER TABLE project_invites ADD CONSTRAINT project_invites_inviter_id_fkey
    FOREIGN KEY (inviter_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE post_likes DROP CONSTRAINT IF EXISTS post_likes_user_id_fkey;
ALTER TABLE post_likes ADD CONSTRAINT post_likes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_author_id_fkey;
ALTER TABLE posts ADD CONSTRAINT posts_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_author_id_fkey;
ALTER TABLE comments ADD CONSTRAINT comments_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE project_updates DROP CONSTRAINT IF EXISTS project_updates_author_id_fkey;
ALTER TABLE project_updates ADD CONSTRAINT project_updates_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE inventory_history DROP CONSTRAINT IF EXISTS inventory_history_actor_id_fkey;
ALTER TABLE inventory_history ADD CONSTRAINT inventory_history_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE project_requests DROP CONSTRAINT IF EXISTS project_requests_requester_id_fkey;
ALTER TABLE project_requests ADD CONSTRAINT project_requests_requester_id_fkey
    FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE equipment_requests DROP CONSTRAINT IF EXISTS equipment_requests_requester_id_fkey;
ALTER TABLE equipment_requests ADD CONSTRAINT equipment_requests_requester_id_fkey
    FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE equipment_carts DROP CONSTRAINT IF EXISTS equipment_carts_requester_id_fkey;
ALTER TABLE equipment_carts ADD CONSTRAINT equipment_carts_requester_id_fkey
    FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ── Audit / reviewer / creator references → SET NULL ───────────────────
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_created_by_fkey;
ALTER TABLE projects ADD CONSTRAINT projects_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_created_by_fkey;
ALTER TABLE events ADD CONSTRAINT events_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE gallery_items DROP CONSTRAINT IF EXISTS gallery_items_created_by_fkey;
ALTER TABLE gallery_items ADD CONSTRAINT gallery_items_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE project_requests DROP CONSTRAINT IF EXISTS project_requests_reviewed_by_fkey;
ALTER TABLE project_requests ADD CONSTRAINT project_requests_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE applicants DROP CONSTRAINT IF EXISTS applicants_reviewed_by_fkey;
ALTER TABLE applicants ADD CONSTRAINT applicants_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE equipment_requests DROP CONSTRAINT IF EXISTS equipment_requests_approved_by_fkey;
ALTER TABLE equipment_requests ADD CONSTRAINT equipment_requests_approved_by_fkey
    FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE equipment_carts DROP CONSTRAINT IF EXISTS equipment_carts_reviewed_by_fkey;
ALTER TABLE equipment_carts ADD CONSTRAINT equipment_carts_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE equipment_request_return_units DROP CONSTRAINT IF EXISTS equipment_request_return_units_returned_by_fkey;
ALTER TABLE equipment_request_return_units ADD CONSTRAINT equipment_request_return_units_returned_by_fkey
    FOREIGN KEY (returned_by) REFERENCES profiles(id) ON DELETE SET NULL;
