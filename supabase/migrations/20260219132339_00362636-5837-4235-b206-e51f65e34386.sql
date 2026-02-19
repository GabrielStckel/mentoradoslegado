
CREATE TABLE public.especialidades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.especialidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view especialidades"
ON public.especialidades FOR SELECT
USING (true);

CREATE POLICY "Admins can manage especialidades"
ON public.especialidades FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Operacao can manage especialidades"
ON public.especialidades FOR ALL
USING (has_role(auth.uid(), 'operacao'::app_role));

-- Seed with existing values
INSERT INTO public.especialidades (nome)
SELECT DISTINCT especialidade FROM public.mentores WHERE especialidade != ''
ON CONFLICT DO NOTHING;
