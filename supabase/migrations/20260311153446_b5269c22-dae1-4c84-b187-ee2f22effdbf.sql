DROP INDEX IF EXISTS encontros_google_event_id_unique;
ALTER TABLE public.encontros ADD CONSTRAINT encontros_google_event_id_key UNIQUE (google_event_id);