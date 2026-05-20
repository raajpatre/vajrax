-- Allow Faculty, President and Vice President to update gallery items
DROP POLICY IF EXISTS "Admin Update Gallery Items" ON public.gallery_items;
CREATE POLICY "Admin Update Gallery Items" 
  ON public.gallery_items FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('faculty', 'president', 'vice_president')
    )
  );

-- Update delete and insert policies to also include vice_president
DROP POLICY IF EXISTS "Admin Delete Gallery Items" ON public.gallery_items;
CREATE POLICY "Admin Delete Gallery Items" 
  ON public.gallery_items FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('faculty', 'president', 'vice_president')
    )
  );

DROP POLICY IF EXISTS "Admin Insert Gallery Items" ON public.gallery_items;
CREATE POLICY "Admin Insert Gallery Items" 
  ON public.gallery_items FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('faculty', 'president', 'vice_president')
    )
  );
