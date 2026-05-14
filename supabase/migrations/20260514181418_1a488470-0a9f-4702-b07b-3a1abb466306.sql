
-- ============ ENUM ============
CREATE TYPE public.app_role AS ENUM ('admin', 'collector');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE NOT NULL,
  name TEXT,
  supervisor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ SECURITY DEFINER HELPERS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT employee_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ AUTO PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _eid TEXT;
  _name TEXT;
  _supervisor TEXT;
  _role public.app_role;
BEGIN
  _eid := COALESCE(NEW.raw_user_meta_data->>'employee_id', NEW.id::text);
  _name := NEW.raw_user_meta_data->>'name';
  _supervisor := NEW.raw_user_meta_data->>'supervisor';
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'collector'::public.app_role);

  INSERT INTO public.profiles (id, employee_id, name, supervisor)
  VALUES (NEW.id, _eid, _name, _supervisor)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ PROFILES POLICIES ============
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER_ROLES POLICIES ============
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ CUSTOMERS ============
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_key TEXT NOT NULL UNIQUE,
  account_number TEXT,
  national_id TEXT,
  customer_name TEXT,
  phone TEXT,
  amount NUMERIC,
  product TEXT,
  debt_age TEXT,
  action TEXT,
  installment TEXT,
  is_salary BOOLEAN DEFAULT false,
  is_deceased BOOLEAN DEFAULT false,
  agent_employee_id TEXT,
  supervisor TEXT,
  raw JSONB,
  file_month TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  imported_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_customers_agent ON public.customers(agent_employee_id);
CREATE INDEX idx_customers_key ON public.customers(customer_key);

CREATE POLICY "Admins read all customers" ON public.customers
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Collectors read own customers" ON public.customers
  FOR SELECT USING (
    public.has_role(auth.uid(), 'collector')
    AND agent_employee_id = public.current_employee_id()
  );
CREATE POLICY "Admins manage customers" ON public.customers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ CUSTOMER STATES ============
CREATE TABLE public.customer_states (
  customer_key TEXT PRIMARY KEY,
  contacted BOOLEAN DEFAULT false,
  last_contacted_at TIMESTAMPTZ,
  has_exemption BOOLEAN DEFAULT false,
  has_reschedule BOOLEAN DEFAULT false,
  default_date DATE,
  client_status TEXT,
  edits JSONB,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.customer_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all states" ON public.customer_states
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Collectors read own states" ON public.customer_states
  FOR SELECT USING (
    public.has_role(auth.uid(), 'collector')
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.customer_key = customer_states.customer_key
        AND c.agent_employee_id = public.current_employee_id()
    )
  );
CREATE POLICY "Admins write states" ON public.customer_states
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Collectors write own states" ON public.customer_states
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'collector')
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.customer_key = customer_states.customer_key
        AND c.agent_employee_id = public.current_employee_id()
    )
  );
CREATE POLICY "Collectors update own states" ON public.customer_states
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'collector')
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.customer_key = customer_states.customer_key
        AND c.agent_employee_id = public.current_employee_id()
    )
  );

CREATE TRIGGER states_updated BEFORE UPDATE ON public.customer_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CONTACT LOGS ============
CREATE TABLE public.contact_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_key TEXT NOT NULL,
  channel TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.contact_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_contact_logs_customer ON public.contact_logs(customer_key);

CREATE POLICY "Admins read all logs" ON public.contact_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Collectors read own logs" ON public.contact_logs
  FOR SELECT USING (
    public.has_role(auth.uid(), 'collector')
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.customer_key = contact_logs.customer_key
        AND c.agent_employee_id = public.current_employee_id()
    )
  );
CREATE POLICY "Authenticated insert own logs" ON public.contact_logs
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.customers c
        WHERE c.customer_key = contact_logs.customer_key
          AND c.agent_employee_id = public.current_employee_id()
      )
    )
  );

-- ============ CUSTOMER NOTES ============
CREATE TABLE public.customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_key TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_customer_notes_customer ON public.customer_notes(customer_key);

CREATE POLICY "Admins read all notes" ON public.customer_notes
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Collectors read own notes" ON public.customer_notes
  FOR SELECT USING (
    public.has_role(auth.uid(), 'collector')
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.customer_key = customer_notes.customer_key
        AND c.agent_employee_id = public.current_employee_id()
    )
  );
CREATE POLICY "Authenticated insert own notes" ON public.customer_notes
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.customers c
        WHERE c.customer_key = customer_notes.customer_key
          AND c.agent_employee_id = public.current_employee_id()
      )
    )
  );
