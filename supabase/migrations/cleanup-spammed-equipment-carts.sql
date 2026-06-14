-- One-off cleanup for replay-spammed equipment carts.
-- A user replayed an identical cart submission many times, flooding the admin
-- review queue. This rejects the duplicates (keeping the EARLIEST copy of each
-- burst) and removes the notification spam they generated.
--
-- Safe + targeted: only touches groups of >3 identical PENDING carts from the
-- same requester with the same reason. Run in the Supabase SQL Editor.
--
-- TIP: preview first with the SELECT at the bottom before running the UPDATE.

-- 1) Reject the duplicate pending carts (keep the first of each burst).
WITH ranked AS (
    SELECT
        id,
        row_number() OVER (PARTITION BY requester_id, reason ORDER BY created_at)  AS rn,
        count(*)     OVER (PARTITION BY requester_id, reason)                      AS grp
    FROM equipment_carts
    WHERE status = 'pending'
)
UPDATE equipment_carts c
SET status      = 'rejected',
    status_note = 'Auto-rejected: duplicate spam submission',
    reviewed_at = now()
FROM ranked r
WHERE c.id = r.id
  AND r.rn > 1      -- keep the earliest of each (requester, reason) group
  AND r.grp > 3;    -- only act on bursts (4+ identical pending carts)

-- 2) Delete the notification spam tied to those auto-rejected carts.
DELETE FROM notifications n
USING equipment_carts c
WHERE n.related_entity_id = c.id
  AND c.status = 'rejected'
  AND c.status_note = 'Auto-rejected: duplicate spam submission';

-- ── Preview (optional): how many pending carts each requester/reason has ──
-- SELECT requester_id, reason, count(*) AS copies, min(created_at) AS first_seen
-- FROM equipment_carts
-- WHERE status = 'pending'
-- GROUP BY requester_id, reason
-- HAVING count(*) > 3
-- ORDER BY copies DESC;
