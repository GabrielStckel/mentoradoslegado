
CREATE TABLE public.origens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.origens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view origens"
ON public.origens FOR SELECT
USING (true);

CREATE POLICY "Admins can manage origens"
ON public.origens FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Operacao can manage origens"
ON public.origens FOR ALL
USING (has_role(auth.uid(), 'operacao'::app_role));

-- Seed default values
INSERT INTO public.origens (nome) VALUES ('Indicação'), ('Site'), ('Instagram'), ('Outro');
