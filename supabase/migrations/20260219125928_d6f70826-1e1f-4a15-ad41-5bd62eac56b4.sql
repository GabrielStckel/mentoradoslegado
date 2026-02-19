
-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'mentor', 'operacao');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create mentores table
CREATE TABLE public.mentores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone_whatsapp TEXT NOT NULL DEFAULT '',
  especialidade TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  carga_max_por_dia INTEGER NOT NULL DEFAULT 5,
  cor_calendario TEXT NOT NULL DEFAULT '#0d9488',
  google_calendar_connected BOOLEAN NOT NULL DEFAULT false,
  google_calendar_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mentorados table
CREATE TABLE public.mentorados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone_whatsapp TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  origem TEXT NOT NULL DEFAULT 'Outro' CHECK (origem IN ('Instagram', 'Indicação', 'Anúncio', 'Outro')),
  mentor_id UUID REFERENCES public.mentores(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Novo' CHECK (status IN ('Novo', 'Ativo', 'Pausado', 'Finalizado')),
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  observacoes_gerais TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create encontros table
CREATE TABLE public.encontros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorado_id UUID REFERENCES public.mentorados(id) ON DELETE CASCADE NOT NULL,
  mentor_id UUID REFERENCES public.mentores(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Sessão' CHECK (tipo IN ('Sessão', 'Follow-up', 'Avaliação', 'Outro')),
  inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  fim TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Agendado' CHECK (status IN ('Agendado', 'Realizado', 'Cancelado', 'Reagendado', 'Faltou')),
  local TEXT NOT NULL DEFAULT 'Online' CHECK (local IN ('Online', 'Presencial', 'Google Meet', 'Zoom', 'Outro')),
  link_reuniao TEXT NOT NULL DEFAULT '',
  notas_do_mentor TEXT NOT NULL DEFAULT '',
  notas_operacionais TEXT NOT NULL DEFAULT '',
  proxima_acao TEXT NOT NULL DEFAULT '',
  sincronizado_google BOOLEAN NOT NULL DEFAULT false,
  google_event_id TEXT,
  lembrete_24h_enviado BOOLEAN NOT NULL DEFAULT false,
  lembrete_3h_enviado BOOLEAN NOT NULL DEFAULT false,
  lembrete_10min_enviado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create historicos table
CREATE TABLE public.historicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorado_id UUID REFERENCES public.mentorados(id) ON DELETE CASCADE NOT NULL,
  mentor_id UUID REFERENCES public.mentores(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Observação' CHECK (tipo IN ('Mensagem', 'Observação', 'Tarefa', 'Check-in')),
  conteudo TEXT NOT NULL DEFAULT '',
  visibilidade TEXT NOT NULL DEFAULT 'Admin' CHECK (visibilidade IN ('Privado Mentor', 'Admin', 'Operação')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encontros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historicos ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get mentor_id for a user
CREATE OR REPLACE FUNCTION public.get_user_mentor_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.mentores WHERE user_id = _user_id LIMIT 1
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mentores_updated_at BEFORE UPDATE ON public.mentores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mentorados_updated_at BEFORE UPDATE ON public.mentorados FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_encontros_updated_at BEFORE UPDATE ON public.encontros FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for mentores
CREATE POLICY "Authenticated users can view mentores" ON public.mentores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage mentores" ON public.mentores FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert mentores" ON public.mentores FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for mentorados
CREATE POLICY "Admins can do all on mentorados" ON public.mentorados FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Mentors see own mentorados" ON public.mentorados FOR SELECT USING (mentor_id = public.get_user_mentor_id(auth.uid()));
CREATE POLICY "Operacao can view mentorados" ON public.mentorados FOR SELECT USING (public.has_role(auth.uid(), 'operacao'));
CREATE POLICY "Operacao can insert mentorados" ON public.mentorados FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'operacao'));

-- RLS Policies for encontros
CREATE POLICY "Admins can do all on encontros" ON public.encontros FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Mentors see own encontros" ON public.encontros FOR SELECT USING (mentor_id = public.get_user_mentor_id(auth.uid()));
CREATE POLICY "Mentors can manage own encontros" ON public.encontros FOR INSERT WITH CHECK (mentor_id = public.get_user_mentor_id(auth.uid()));
CREATE POLICY "Mentors can update own encontros" ON public.encontros FOR UPDATE USING (mentor_id = public.get_user_mentor_id(auth.uid()));
CREATE POLICY "Operacao can view encontros" ON public.encontros FOR SELECT USING (public.has_role(auth.uid(), 'operacao'));
CREATE POLICY "Operacao can insert encontros" ON public.encontros FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'operacao'));

-- RLS Policies for historicos
CREATE POLICY "Admins can do all on historicos" ON public.historicos FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Mentors see own historicos" ON public.historicos FOR SELECT USING (mentor_id = public.get_user_mentor_id(auth.uid()));
CREATE POLICY "Mentors can insert historicos" ON public.historicos FOR INSERT WITH CHECK (mentor_id = public.get_user_mentor_id(auth.uid()));
CREATE POLICY "Operacao can view non-private historicos" ON public.historicos FOR SELECT USING (
  public.has_role(auth.uid(), 'operacao') AND visibilidade != 'Privado Mentor'
);
