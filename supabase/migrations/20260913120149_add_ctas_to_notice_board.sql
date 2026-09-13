ALTER TABLE "public"."notice_board" ADD COLUMN "ctas" jsonb DEFAULT '[]'::jsonb;

UPDATE "public"."notice_board"
SET "ctas" = jsonb_build_array(
  jsonb_build_object(
    'label', cta_label,
    'url', cta_url
  )
)
WHERE cta_label IS NOT NULL AND cta_url IS NOT NULL;
