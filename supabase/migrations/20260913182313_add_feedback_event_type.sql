ALTER TABLE events DROP CONSTRAINT events_event_type_check;
ALTER TABLE events ADD CONSTRAINT events_event_type_check 
CHECK (event_type = ANY (ARRAY['hackathon'::text, 'workshop'::text, 'meetup'::text, 'competition'::text, 'feedback'::text, 'other'::text]));
