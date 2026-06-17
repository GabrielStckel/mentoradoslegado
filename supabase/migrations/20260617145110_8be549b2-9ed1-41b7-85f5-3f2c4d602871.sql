DROP TABLE IF EXISTS public.google_calendar_tokens CASCADE;
ALTER TABLE public.encontros DROP COLUMN IF EXISTS google_event_id, DROP COLUMN IF EXISTS sincronizado_google;
ALTER TABLE public.mentores DROP COLUMN IF EXISTS google_calendar_connected, DROP COLUMN IF EXISTS google_calendar_id;