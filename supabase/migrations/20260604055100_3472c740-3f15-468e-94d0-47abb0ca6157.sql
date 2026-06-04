
-- Fix permission for current_employee_id function
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO anon, authenticated, service_role;

-- Create column_mappings table
CREATE TABLE IF NOT EXISTS public.column_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_kind TEXT NOT NULL,
  label TEXT,
  mapping JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.column_mappings TO authenticated, anon;
GRANT ALL ON public.column_mappings TO service_role;

ALTER TABLE public.column_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read column_mappings"
  ON public.column_mappings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can manage column_mappings"
  ON public.column_mappings FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_column_mappings_file_kind ON public.column_mappings(file_kind);
