
CREATE TABLE public.pin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  pin text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access pin_settings"
ON public.pin_settings FOR ALL TO authenticated
USING (true) WITH CHECK (true);
