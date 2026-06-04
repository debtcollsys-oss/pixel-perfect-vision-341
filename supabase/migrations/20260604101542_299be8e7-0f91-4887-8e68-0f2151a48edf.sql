DROP POLICY IF EXISTS "Anyone can manage column_mappings" ON public.column_mappings;
DROP POLICY IF EXISTS "Anyone can read column_mappings" ON public.column_mappings;

REVOKE ALL ON public.column_mappings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.column_mappings TO authenticated;

CREATE POLICY "Authenticated can read column_mappings"
ON public.column_mappings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert column_mappings"
ON public.column_mappings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update column_mappings"
ON public.column_mappings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete column_mappings"
ON public.column_mappings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));