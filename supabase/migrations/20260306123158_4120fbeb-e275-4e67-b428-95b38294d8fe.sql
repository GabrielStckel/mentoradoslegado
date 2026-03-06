-- Remove duplicate google_event_id rows, keeping only the newest one
DELETE FROM public.encontros
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY google_event_id ORDER BY created_at DESC) AS rn
    FROM public.encontros
    WHERE google_event_id IS NOT NULL
  ) sub
  WHERE rn > 1
);

-- Now create the unique partial index
CREATE UNIQUE INDEX encontros_google_event_id_unique ON public.encontros (google_event_id) WHERE google_event_id IS NOT NULL;