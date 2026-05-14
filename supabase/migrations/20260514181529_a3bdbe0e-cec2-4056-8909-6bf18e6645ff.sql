
DROP POLICY IF EXISTS "Collectors read own customers" ON public.customers;
CREATE POLICY "Collectors read assigned or unassigned" ON public.customers
  FOR SELECT USING (
    public.has_role(auth.uid(), 'collector')
    AND (agent_employee_id IS NULL OR agent_employee_id = public.current_employee_id())
  );

DROP POLICY IF EXISTS "Collectors read own states" ON public.customer_states;
CREATE POLICY "Collectors read states" ON public.customer_states
  FOR SELECT USING (
    public.has_role(auth.uid(), 'collector')
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.customer_key = customer_states.customer_key
        AND (c.agent_employee_id IS NULL OR c.agent_employee_id = public.current_employee_id())
    )
  );

DROP POLICY IF EXISTS "Collectors write own states" ON public.customer_states;
CREATE POLICY "Collectors insert states" ON public.customer_states
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'collector')
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.customer_key = customer_states.customer_key
        AND (c.agent_employee_id IS NULL OR c.agent_employee_id = public.current_employee_id())
    )
  );

DROP POLICY IF EXISTS "Collectors update own states" ON public.customer_states;
CREATE POLICY "Collectors update states" ON public.customer_states
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'collector')
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.customer_key = customer_states.customer_key
        AND (c.agent_employee_id IS NULL OR c.agent_employee_id = public.current_employee_id())
    )
  );

DROP POLICY IF EXISTS "Collectors read own logs" ON public.contact_logs;
CREATE POLICY "Collectors read logs" ON public.contact_logs
  FOR SELECT USING (
    public.has_role(auth.uid(), 'collector')
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.customer_key = contact_logs.customer_key
        AND (c.agent_employee_id IS NULL OR c.agent_employee_id = public.current_employee_id())
    )
  );

DROP POLICY IF EXISTS "Authenticated insert own logs" ON public.contact_logs;
CREATE POLICY "Authenticated insert logs" ON public.contact_logs
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.customers c
        WHERE c.customer_key = contact_logs.customer_key
          AND (c.agent_employee_id IS NULL OR c.agent_employee_id = public.current_employee_id())
      )
    )
  );

DROP POLICY IF EXISTS "Collectors read own notes" ON public.customer_notes;
CREATE POLICY "Collectors read notes" ON public.customer_notes
  FOR SELECT USING (
    public.has_role(auth.uid(), 'collector')
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.customer_key = customer_notes.customer_key
        AND (c.agent_employee_id IS NULL OR c.agent_employee_id = public.current_employee_id())
    )
  );

DROP POLICY IF EXISTS "Authenticated insert own notes" ON public.customer_notes;
CREATE POLICY "Authenticated insert notes" ON public.customer_notes
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.customers c
        WHERE c.customer_key = customer_notes.customer_key
          AND (c.agent_employee_id IS NULL OR c.agent_employee_id = public.current_employee_id())
      )
    )
  );
