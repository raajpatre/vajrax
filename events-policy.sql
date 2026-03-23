-- 1. Create the 'event-images' storage bucket for event cover photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public to read images from 'event-images'
DROP POLICY IF EXISTS "Public Read Event Images" ON storage.objects;
CREATE POLICY "Public Read Event Images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'event-images');

-- 3. Allow Faculty and President to upload images
DROP POLICY IF EXISTS "Admin Upload Event Images" ON storage.objects;
CREATE POLICY "Admin Upload Event Images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'event-images' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('faculty', 'president')
  )
);

-- 4. Allow Faculty and President to delete their images
DROP POLICY IF EXISTS "Admin Delete Event Images" ON storage.objects;
CREATE POLICY "Admin Delete Event Images" 
ON storage.objects FOR DELETE 
TO authenticated
USING (
  bucket_id = 'event-images' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('faculty', 'president')
  )
);

-- 5. Allow Faculty and President to insert new events into the table
DROP POLICY IF EXISTS "Admin Insert Events" ON public.events;
CREATE POLICY "Admin Insert Events" 
ON public.events FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('faculty', 'president')
  )
);

-- 6. Allow Faculty and President to delete events from the table
DROP POLICY IF EXISTS "Admin Delete Events" ON public.events;
CREATE POLICY "Admin Delete Events" 
ON public.events FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('faculty', 'president')
  )
);
