-- 1. Allow Faculty and President to delete from storage.objects
CREATE POLICY "Admin Delete Storage" 
  ON storage.objects FOR DELETE 
  TO authenticated
  USING (
    bucket_id = 'gallery-images' AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('faculty', 'president')
    )
  );

-- 2. Allow Faculty and President to delete from gallery_items
CREATE POLICY "Admin Delete Gallery Items" 
  ON public.gallery_items FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('faculty', 'president')
    )
  );
