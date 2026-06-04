
-- Tighten collector access on contact_logs, customer_notes, and customer_states.

DROP POLICY IF EXISTS "Collectors read logs" ON public.contact_logs;
CREATE POLICY "Collectors read logs" ON public.contact_logs
  FOR SELECT
  USING (
    has_role(auth.uid(), 'collector'::app_role)
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.customers c
        WHERE c.customer_key = contact_logs.customer_key
          AND c.agent_employee_id = current_employee_id()
      )
    )
  );

DROP POLICY IF EXISTS "Collectors read notes" ON public.customer_notes;
CREATE POLICY "Collectors read notes" ON public.customer_notes
  FOR SELECT
  USING (
    has_role(auth.uid(), 'collector'::app_role)
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.customers c
        WHERE c.customer_key = customer_notes.customer_key
          AND c.agent_employee_id = current_employee_id()
      )
    )
  );

DROP POLICY IF EXISTS "Collectors read states" ON public.customer_states;
CREATE POLICY "Collectors read states" ON public.customer_states
  FOR SELECT
  USING (
    has_role(auth.uid(), 'collector'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.customer_key = customer_states.customer_key
        AND c.agent_employee_id = current_employee_id()
    )
  );

DROP POLICY IF EXISTS "Collectors update states" ON public.customer_states;
CREATE POLICY "Collectors update states" ON public.customer_states
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'collector'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.customer_key = customer_states.customer_key
        AND c.agent_employee_id = current_employee_id()
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'collector'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.customer_key = customer_states.customer_key
        AND c.agent_employee_id = current_employee_id()
    )
  );

DROP POLICY IF EXISTS "Collectors insert states" ON public.customer_states;
CREATE POLICY "Collectors insert states" ON public.customer_states
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'collector'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.customer_key = customer_states.customer_key
        AND c.agent_employee_id = current_employee_id()
    )
  );
