
CREATE TABLE public.locais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access locais"
  ON public.locais
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed default values
INSERT INTO public.locais (nome, ordem) VALUES
  ('Online', 1),
  ('Presencial', 2),
  ('Google Meet', 3),
  ('Zoom', 4);
