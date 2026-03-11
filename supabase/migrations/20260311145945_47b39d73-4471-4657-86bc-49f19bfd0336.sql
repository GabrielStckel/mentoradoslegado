CREATE TABLE public.status_mentorado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#6b7280',
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.status_mentorado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access status_mentorado" ON public.status_mentorado FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.status_mentorado (nome, cor, ordem) VALUES
  ('Novo', '#3b82f6', 1),
  ('Ativo', '#10b981', 2),
  ('Pausado', '#f59e0b', 3),
  ('Finalizado', '#6b7280', 4);