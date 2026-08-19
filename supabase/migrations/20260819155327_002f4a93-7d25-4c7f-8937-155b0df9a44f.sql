-- 1. Colunas de arquivamento
ALTER TABLE public.mentorados
  ADD COLUMN IF NOT EXISTS arquivado_at     timestamptz,
  ADD COLUMN IF NOT EXISTS arquivado_motivo text,
  ADD COLUMN IF NOT EXISTS arquivado_por    uuid;

CREATE INDEX IF NOT EXISTS idx_mentorados_ativos
  ON public.mentorados(nome) WHERE arquivado_at IS NULL;

-- 2. Trigger reconhece arquivar/restaurar
CREATE OR REPLACE FUNCTION public.log_arquivamento()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_nome text := public.audit_actor_nome();
BEGIN
  IF NEW.arquivado_at IS DISTINCT FROM OLD.arquivado_at THEN
    INSERT INTO public.atividades_log
      (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id,
       acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome,
       enc_realizados, enc_contratados)
    VALUES ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id,
      'UPDATE', 'arquivado_at',
      OLD.arquivado_at::text, NEW.arquivado_at::text,
      CASE WHEN NEW.arquivado_at IS NOT NULL
        THEN format('Mentorado "%s" ARQUIVADO com %s de %s encontros. Motivo: %s.',
                    NEW.nome, NEW.encontros_realizados, NEW.total_encontros,
                    COALESCE(NULLIF(trim(NEW.arquivado_motivo),''),'não informado'))
        ELSE format('Mentorado "%s" RESTAURADO (%s de %s encontros).',
                    NEW.nome, NEW.encontros_realizados, NEW.total_encontros)
      END,
      v_user, v_nome, NEW.encontros_realizados, NEW.total_encontros);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS mentorados_arquivamento ON public.mentorados;
CREATE TRIGGER mentorados_arquivamento
AFTER UPDATE OF arquivado_at ON public.mentorados
FOR EACH ROW EXECUTE FUNCTION public.log_arquivamento();

-- 3. RPC arquivar
CREATE OR REPLACE FUNCTION public.arquivar_mentorado(p_mentorado_id uuid, p_motivo text DEFAULT '')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cancelados int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.mentorados WHERE id = p_mentorado_id AND arquivado_at IS NULL) THEN
    RAISE EXCEPTION 'Mentorado não encontrado ou já arquivado.';
  END IF;

  UPDATE public.encontros SET status = 'Cancelado'
   WHERE mentorado_id = p_mentorado_id AND inicio > now() AND status = 'Agendado';
  GET DIAGNOSTICS v_cancelados = ROW_COUNT;

  UPDATE public.mentorados
     SET arquivado_at = now(),
         arquivado_motivo = NULLIF(trim(COALESCE(p_motivo,'')),''),
         arquivado_por = auth.uid(),
         updated_at = now()
   WHERE id = p_mentorado_id;

  RETURN v_cancelados;
END; $$;

-- 4. RPC restaurar
CREATE OR REPLACE FUNCTION public.restaurar_mentorado(p_mentorado_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.mentorados WHERE id = p_mentorado_id AND arquivado_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Mentorado não encontrado ou não está arquivado.';
  END IF;
  UPDATE public.mentorados
     SET arquivado_at = NULL, arquivado_motivo = NULL, arquivado_por = NULL, updated_at = now()
   WHERE id = p_mentorado_id;
END; $$;

-- 5. excluir_mentorado só aceita quem já está arquivado
CREATE OR REPLACE FUNCTION public.excluir_mentorado(p_mentorado_id uuid, p_motivo text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_arq timestamptz;
BEGIN
  SELECT arquivado_at INTO v_arq FROM public.mentorados WHERE id = p_mentorado_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mentorado não encontrado.'; END IF;
  IF v_arq IS NULL THEN
    RAISE EXCEPTION 'Arquive o mentorado antes de excluir definitivamente.';
  END IF;
  PERFORM set_config('app.motivo_exclusao', COALESCE(p_motivo,''), true);
  DELETE FROM public.mentorados WHERE id = p_mentorado_id;
END; $$;

REVOKE ALL ON FUNCTION public.log_arquivamento() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.arquivar_mentorado(uuid, text)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.restaurar_mentorado(uuid)       TO authenticated;