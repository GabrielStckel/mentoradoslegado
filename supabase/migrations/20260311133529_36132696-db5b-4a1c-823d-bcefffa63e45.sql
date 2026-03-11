ALTER TABLE public.origens ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0;

-- Set initial order based on created_at
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.origens
)
UPDATE public.origens SET ordem = ordered.rn FROM ordered WHERE public.origens.id = ordered.id;