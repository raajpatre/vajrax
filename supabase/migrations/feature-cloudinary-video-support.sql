-- Make cover_image_url nullable (articles may have no image)
ALTER TABLE public.gallery_items
ALTER COLUMN cover_image_url DROP NOT NULL;

-- media_url stores: YouTube URL for videos, article URL for articles
ALTER TABLE public.gallery_items
ADD COLUMN IF NOT EXISTS media_url TEXT;

-- video_urls for project update log entries
ALTER TABLE public.project_updates
ADD COLUMN IF NOT EXISTS video_urls TEXT[] DEFAULT '{}'::TEXT[];

-- Tag color for gallery items (optional hex color, e.g. '#f59e0b')
ALTER TABLE public.gallery_items
ADD COLUMN IF NOT EXISTS tag_color TEXT;
