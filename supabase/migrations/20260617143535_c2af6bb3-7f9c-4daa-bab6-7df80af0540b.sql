
-- Audit log for encontros
CREATE TABLE public.encontros_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encontro_id uuid NOT NULL,
  mentorado_id uuid,
  mentor_id uuid,
  action text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  field_name text,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_encontros_audit_encontro ON public.encontros_audit_log(encontro_id);
CREATE INDEX idx_encontros_audit_changed_at ON public.encontros_audit_log(changed_at DESC);

GRANT SELECT, INSERT ON public.encontros_audit_log TO authenticated;
GRANT ALL ON public.encontros_audit_log TO service_role;

ALTER TABLE public.encontros_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read audit log"
  ON public.encontros_audit_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert audit log"
  ON public.encontros_audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger function
CREATE OR REPLACE FUNCTION public.log_encontros_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.encontros_audit_log(encontro_id, mentorado_id, mentor_id, action, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, NEW.mentorado_id, NEW.mentor_id, 'INSERT', NULL, NULL, NEW.status, v_user);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.titulo IS DISTINCT FROM OLD.titulo THEN
      INSERT INTO public.encontros_audit_log(encontro_id, mentorado_id, mentor_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.mentorado_id, NEW.mentor_id, 'UPDATE', 'titulo', OLD.titulo, NEW.titulo, v_user);
    END IF;
    IF NEW.tipo IS DISTINCT FROM OLD.tipo THEN
      INSERT INTO public.encontros_audit_log(encontro_id, mentorado_id, mentor_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.mentorado_id, NEW.mentor_id, 'UPDATE', 'tipo', OLD.tipo, NEW.tipo, v_user);
    END IF;
    IF NEW.inicio IS DISTINCT FROM OLD.inicio THEN
      INSERT INTO public.encontros_audit_log(encontro_id, mentorado_id, mentor_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.mentorado_id, NEW.mentor_id, 'UPDATE', 'inicio', OLD.inicio::text, NEW.inicio::text, v_user);
    END IF;
    IF NEW.fim IS DISTINCT FROM OLD.fim THEN
      INSERT INTO public.encontros_audit_log(encontro_id, mentorado_id, mentor_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.mentorado_id, NEW.mentor_id, 'UPDATE', 'fim', OLD.fim::text, NEW.fim::text, v_user);
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.encontros_audit_log(encontro_id, mentorado_id, mentor_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.mentorado_id, NEW.mentor_id, 'UPDATE', 'status', OLD.status, NEW.status, v_user);
    END IF;
    IF NEW.local IS DISTINCT FROM OLD.local THEN
      INSERT INTO public.encontros_audit_log(encontro_id, mentorado_id, mentor_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.mentorado_id, NEW.mentor_id, 'UPDATE', 'local', OLD.local, NEW.local, v_user);
    END IF;
    IF NEW.link_reuniao IS DISTINCT FROM OLD.link_reuniao THEN
      INSERT INTO public.encontros_audit_log(encontro_id, mentorado_id, mentor_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.mentorado_id, NEW.mentor_id, 'UPDATE', 'link_reuniao', OLD.link_reuniao, NEW.link_reuniao, v_user);
    END IF;
    IF NEW.notas_do_mentor IS DISTINCT FROM OLD.notas_do_mentor THEN
      INSERT INTO public.encontros_audit_log(encontro_id, mentorado_id, mentor_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.mentorado_id, NEW.mentor_id, 'UPDATE', 'notas_do_mentor', OLD.notas_do_mentor, NEW.notas_do_mentor, v_user);
    END IF;
    IF NEW.notas_operacionais IS DISTINCT FROM OLD.notas_operacionais THEN
      INSERT INTO public.encontros_audit_log(encontro_id, mentorado_id, mentor_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.mentorado_id, NEW.mentor_id, 'UPDATE', 'notas_operacionais', OLD.notas_operacionais, NEW.notas_operacionais, v_user);
    END IF;
    IF NEW.proxima_acao IS DISTINCT FROM OLD.proxima_acao THEN
      INSERT INTO public.encontros_audit_log(encontro_id, mentorado_id, mentor_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.mentorado_id, NEW.mentor_id, 'UPDATE', 'proxima_acao', OLD.proxima_acao, NEW.proxima_acao, v_user);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.encontros_audit_log(encontro_id, mentorado_id, mentor_id, action, field_name, old_value, new_value, changed_by)
    VALUES (OLD.id, OLD.mentorado_id, OLD.mentor_id, 'DELETE', NULL, OLD.status, NULL, v_user);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER encontros_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.encontros
FOR EACH ROW EXECUTE FUNCTION public.log_encontros_changes();
