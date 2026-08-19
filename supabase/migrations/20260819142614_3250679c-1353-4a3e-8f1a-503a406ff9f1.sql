-- =====================================================================
-- 1. Remove o CHECK constraint que bloqueia os tipos usados pelo app
-- =====================================================================
ALTER TABLE public.historicos DROP CONSTRAINT IF EXISTS historicos_tipo_check;

-- =====================================================================
-- 2. Tabela de auditoria unificada
--    IMPORTANTE: sem FOREIGN KEYS de propósito, para que os registros
--    SOBREVIVAM à exclusão de mentorados/encontros.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.atividades_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade         text NOT NULL CHECK (entidade IN ('mentorado','encontro','historico')),
  entidade_id      uuid NOT NULL,
  mentorado_id     uuid,
  mentorado_nome   text,
  mentor_id        uuid,
  mentor_nome      text,
  acao             text NOT NULL CHECK (acao IN ('INSERT','UPDATE','DELETE')),
  campo            text,
  valor_antigo     text,
  valor_novo       text,
  descricao        text NOT NULL DEFAULT '',
  snapshot         jsonb,
  changed_by       uuid,
  changed_by_nome  text,
  changed_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atividades_log_changed_at  ON public.atividades_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_atividades_log_mentorado   ON public.atividades_log(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_atividades_log_entidade    ON public.atividades_log(entidade, entidade_id);

ALTER TABLE public.atividades_log ENABLE ROW LEVEL SECURITY;

-- Log é IMUTÁVEL: apenas leitura para usuários autenticados.
-- Nenhuma policy de UPDATE/DELETE é criada de propósito.
DROP POLICY IF EXISTS "Authenticated can read atividades_log" ON public.atividades_log;
CREATE POLICY "Authenticated can read atividades_log"
  ON public.atividades_log FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.atividades_log FROM authenticated;
GRANT SELECT ON public.atividades_log TO authenticated;
GRANT ALL ON public.atividades_log TO service_role;

-- =====================================================================
-- 3. Helper: nome legível de quem fez a alteração
-- =====================================================================
CREATE OR REPLACE FUNCTION public.audit_actor_nome()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.nome FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1),
    (SELECT m.nome FROM public.mentores  m WHERE m.user_id = auth.uid() LIMIT 1),
    'Sistema'
  );
$$;

-- =====================================================================
-- 4. Trigger de auditoria da tabela MENTORADOS
-- =====================================================================
CREATE OR REPLACE FUNCTION public.log_mentorados_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user        uuid := auth.uid();
  v_user_nome   text := public.audit_actor_nome();
  v_mentor_nome text;
  v_qtd_enc     int;
  v_qtd_hist    int;
  v_motivo      text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT nome INTO v_mentor_nome FROM public.mentores WHERE id = NEW.mentor_id;

    INSERT INTO public.atividades_log
      (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
       acao, descricao, snapshot, changed_by, changed_by_nome)
    VALUES
      ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
       'INSERT',
       format('Mentorado "%s" cadastrado (%s/%s encontros contratados).',
              NEW.nome, NEW.encontros_realizados, NEW.total_encontros),
       to_jsonb(NEW), v_user, v_user_nome);

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    SELECT nome INTO v_mentor_nome FROM public.mentores WHERE id = NEW.mentor_id;

    -- ENCONTROS REALIZADOS (o +1 / -1)
    IF NEW.encontros_realizados IS DISTINCT FROM OLD.encontros_realizados THEN
      INSERT INTO public.atividades_log
        (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
         acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES
        ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
         'UPDATE', 'encontros_realizados',
         OLD.encontros_realizados::text, NEW.encontros_realizados::text,
         format('%s encontro realizado — %s: %s → %s (de %s contratados).',
                CASE WHEN NEW.encontros_realizados > OLD.encontros_realizados THEN '+1' ELSE '-1' END,
                NEW.nome, OLD.encontros_realizados, NEW.encontros_realizados, NEW.total_encontros),
         v_user, v_user_nome);
    END IF;

    -- TOTAL DE ENCONTROS CONTRATADOS
    IF NEW.total_encontros IS DISTINCT FROM OLD.total_encontros THEN
      INSERT INTO public.atividades_log
        (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
         acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES
        ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
         'UPDATE', 'total_encontros',
         OLD.total_encontros::text, NEW.total_encontros::text,
         format('Total de encontros contratados de %s alterado: %s → %s.',
                NEW.nome, OLD.total_encontros, NEW.total_encontros),
         v_user, v_user_nome);
    END IF;

    -- STATUS
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.atividades_log
        (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
         acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES
        ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
         'UPDATE', 'status', OLD.status, NEW.status,
         format('Status de %s alterado: %s → %s.', NEW.nome, OLD.status, NEW.status),
         v_user, v_user_nome);
    END IF;

    -- NOME
    IF NEW.nome IS DISTINCT FROM OLD.nome THEN
      INSERT INTO public.atividades_log
        (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
         acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES
        ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
         'UPDATE', 'nome', OLD.nome, NEW.nome,
         format('Nome alterado: %s → %s.', OLD.nome, NEW.nome),
         v_user, v_user_nome);
    END IF;

    -- MENTOR RESPONSÁVEL
    IF NEW.mentor_id IS DISTINCT FROM OLD.mentor_id THEN
      INSERT INTO public.atividades_log
        (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
         acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES
        ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
         'UPDATE', 'mentor_id', OLD.mentor_id::text, NEW.mentor_id::text,
         format('Mentor responsável por %s alterado: %s → %s.',
                NEW.nome,
                COALESCE((SELECT nome FROM public.mentores WHERE id = OLD.mentor_id), 'nenhum'),
                COALESCE(v_mentor_nome, 'nenhum')),
         v_user, v_user_nome);
    END IF;

    -- CAMPOS DE CADASTRO
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      INSERT INTO public.atividades_log
        (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
         acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
              'UPDATE', 'email', OLD.email, NEW.email,
              format('E-mail de %s atualizado.', NEW.nome), v_user, v_user_nome);
    END IF;

    IF NEW.telefone_whatsapp IS DISTINCT FROM OLD.telefone_whatsapp THEN
      INSERT INTO public.atividades_log
        (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
         acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
              'UPDATE', 'telefone_whatsapp', OLD.telefone_whatsapp, NEW.telefone_whatsapp,
              format('WhatsApp de %s atualizado.', NEW.nome), v_user, v_user_nome);
    END IF;

    IF NEW.cidade IS DISTINCT FROM OLD.cidade THEN
      INSERT INTO public.atividades_log
        (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
         acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
              'UPDATE', 'cidade', OLD.cidade, NEW.cidade,
              format('Cidade de %s: %s → %s.', NEW.nome, OLD.cidade, NEW.cidade), v_user, v_user_nome);
    END IF;

    IF NEW.origem IS DISTINCT FROM OLD.origem THEN
      INSERT INTO public.atividades_log
        (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
         acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
              'UPDATE', 'origem', OLD.origem, NEW.origem,
              format('Origem de %s: %s → %s.', NEW.nome, OLD.origem, NEW.origem), v_user, v_user_nome);
    END IF;

    IF NEW.observacoes_gerais IS DISTINCT FROM OLD.observacoes_gerais THEN
      INSERT INTO public.atividades_log
        (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
         acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
              'UPDATE', 'observacoes_gerais', OLD.observacoes_gerais, NEW.observacoes_gerais,
              format('Observações gerais de %s atualizadas.', NEW.nome), v_user, v_user_nome);
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Roda como BEFORE DELETE: os CASCADEs ainda não aconteceram,
    -- então conseguimos contar o que será destruído junto.
    SELECT count(*) INTO v_qtd_enc  FROM public.encontros   WHERE mentorado_id = OLD.id;
    SELECT count(*) INTO v_qtd_hist FROM public.historicos  WHERE mentorado_id = OLD.id;
    SELECT nome INTO v_mentor_nome  FROM public.mentores    WHERE id = OLD.mentor_id;

    v_motivo := NULLIF(trim(COALESCE(current_setting('app.motivo_exclusao', true), '')), '');

    INSERT INTO public.atividades_log
      (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
       acao, campo, valor_antigo, valor_novo, descricao, snapshot, changed_by, changed_by_nome)
    VALUES
      ('mentorado', OLD.id, OLD.id, OLD.nome, OLD.mentor_id, v_mentor_nome,
       'DELETE', 'motivo_exclusao', OLD.status, NULL,
       format('Mentorado "%s" EXCLUÍDO com %s de %s encontros realizados. Motivo: %s. Removidos junto: %s encontro(s) e %s registro(s) de histórico.',
              OLD.nome, OLD.encontros_realizados, OLD.total_encontros,
              COALESCE(v_motivo, 'não informado'), v_qtd_enc, v_qtd_hist),
       to_jsonb(OLD), v_user, v_user_nome);

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS mentorados_audit_upsert ON public.mentorados;
CREATE TRIGGER mentorados_audit_upsert
AFTER INSERT OR UPDATE ON public.mentorados
FOR EACH ROW EXECUTE FUNCTION public.log_mentorados_changes();

-- BEFORE DELETE é obrigatório aqui: precisa rodar antes dos CASCADEs.
DROP TRIGGER IF EXISTS mentorados_audit_delete ON public.mentorados;
CREATE TRIGGER mentorados_audit_delete
BEFORE DELETE ON public.mentorados
FOR EACH ROW EXECUTE FUNCTION public.log_mentorados_changes();

-- =====================================================================
-- 5. Trigger de ENCONTROS agora escreve no log unificado
-- =====================================================================
CREATE OR REPLACE FUNCTION public.log_encontros_changes_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user      uuid := auth.uid();
  v_user_nome text := public.audit_actor_nome();
  v_ment_nome text;
  v_mentor_nome text;
  v_id        uuid := COALESCE(NEW.mentorado_id, OLD.mentorado_id);
BEGIN
  SELECT nome INTO v_ment_nome   FROM public.mentorados WHERE id = v_id;

  -- Fallback: em exclusões por CASCADE o mentorado já saiu da tabela,
  -- então recuperamos o último nome conhecido do próprio log.
  IF v_ment_nome IS NULL THEN
    SELECT l.mentorado_nome INTO v_ment_nome
    FROM public.atividades_log l
    WHERE l.mentorado_id = v_id AND l.mentorado_nome IS NOT NULL
    ORDER BY l.changed_at DESC LIMIT 1;
  END IF;

  SELECT nome INTO v_mentor_nome FROM public.mentores   WHERE id = COALESCE(NEW.mentor_id, OLD.mentor_id);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.atividades_log
      (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
       acao, descricao, snapshot, changed_by, changed_by_nome)
    VALUES ('encontro', NEW.id, NEW.mentorado_id, v_ment_nome, NEW.mentor_id, v_mentor_nome,
            'INSERT',
            format('Encontro "%s" criado para %s em %s.',
                   NEW.titulo, COALESCE(v_ment_nome,'—'),
                   to_char(NEW.inicio AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')),
            to_jsonb(NEW), v_user, v_user_nome);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.titulo IS DISTINCT FROM OLD.titulo THEN
      INSERT INTO public.atividades_log (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome, acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES ('encontro', NEW.id, NEW.mentorado_id, v_ment_nome, NEW.mentor_id, v_mentor_nome, 'UPDATE', 'titulo', OLD.titulo, NEW.titulo, format('Título do encontro: %s → %s.', OLD.titulo, NEW.titulo), v_user, v_user_nome);
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.atividades_log (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome, acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES ('encontro', NEW.id, NEW.mentorado_id, v_ment_nome, NEW.mentor_id, v_mentor_nome, 'UPDATE', 'status', OLD.status, NEW.status, format('Status do encontro "%s": %s → %s.', NEW.titulo, OLD.status, NEW.status), v_user, v_user_nome);
    END IF;
    IF NEW.inicio IS DISTINCT FROM OLD.inicio THEN
      INSERT INTO public.atividades_log (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome, acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES ('encontro', NEW.id, NEW.mentorado_id, v_ment_nome, NEW.mentor_id, v_mentor_nome, 'UPDATE', 'inicio', OLD.inicio::text, NEW.inicio::text, format('Encontro "%s" remarcado: %s → %s.', NEW.titulo, to_char(OLD.inicio AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI'), to_char(NEW.inicio AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI')), v_user, v_user_nome);
    END IF;
    IF NEW.fim IS DISTINCT FROM OLD.fim THEN
      INSERT INTO public.atividades_log (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome, acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES ('encontro', NEW.id, NEW.mentorado_id, v_ment_nome, NEW.mentor_id, v_mentor_nome, 'UPDATE', 'fim', OLD.fim::text, NEW.fim::text, 'Horário de término alterado.', v_user, v_user_nome);
    END IF;
    IF NEW.tipo IS DISTINCT FROM OLD.tipo THEN
      INSERT INTO public.atividades_log (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome, acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES ('encontro', NEW.id, NEW.mentorado_id, v_ment_nome, NEW.mentor_id, v_mentor_nome, 'UPDATE', 'tipo', OLD.tipo, NEW.tipo, format('Tipo do encontro: %s → %s.', OLD.tipo, NEW.tipo), v_user, v_user_nome);
    END IF;
    IF NEW.local IS DISTINCT FROM OLD.local THEN
      INSERT INTO public.atividades_log (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome, acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES ('encontro', NEW.id, NEW.mentorado_id, v_ment_nome, NEW.mentor_id, v_mentor_nome, 'UPDATE', 'local', OLD.local, NEW.local, format('Local do encontro: %s → %s.', OLD.local, NEW.local), v_user, v_user_nome);
    END IF;
    IF NEW.mentorado_id IS DISTINCT FROM OLD.mentorado_id THEN
      INSERT INTO public.atividades_log (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome, acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES ('encontro', NEW.id, NEW.mentorado_id, v_ment_nome, NEW.mentor_id, v_mentor_nome, 'UPDATE', 'mentorado_id', OLD.mentorado_id::text, NEW.mentorado_id::text, format('Encontro transferido para %s.', COALESCE(v_ment_nome,'—')), v_user, v_user_nome);
    END IF;
    IF NEW.notas_do_mentor IS DISTINCT FROM OLD.notas_do_mentor THEN
      INSERT INTO public.atividades_log (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome, acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES ('encontro', NEW.id, NEW.mentorado_id, v_ment_nome, NEW.mentor_id, v_mentor_nome, 'UPDATE', 'notas_do_mentor', OLD.notas_do_mentor, NEW.notas_do_mentor, 'Notas do mentor atualizadas.', v_user, v_user_nome);
    END IF;
    IF NEW.notas_operacionais IS DISTINCT FROM OLD.notas_operacionais THEN
      INSERT INTO public.atividades_log (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome, acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES ('encontro', NEW.id, NEW.mentorado_id, v_ment_nome, NEW.mentor_id, v_mentor_nome, 'UPDATE', 'notas_operacionais', OLD.notas_operacionais, NEW.notas_operacionais, 'Notas operacionais atualizadas.', v_user, v_user_nome);
    END IF;
    IF NEW.proxima_acao IS DISTINCT FROM OLD.proxima_acao THEN
      INSERT INTO public.atividades_log (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome, acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES ('encontro', NEW.id, NEW.mentorado_id, v_ment_nome, NEW.mentor_id, v_mentor_nome, 'UPDATE', 'proxima_acao', OLD.proxima_acao, NEW.proxima_acao, 'Próxima ação atualizada.', v_user, v_user_nome);
    END IF;
    IF NEW.link_reuniao IS DISTINCT FROM OLD.link_reuniao THEN
      INSERT INTO public.atividades_log (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome, acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome)
      VALUES ('encontro', NEW.id, NEW.mentorado_id, v_ment_nome, NEW.mentor_id, v_mentor_nome, 'UPDATE', 'link_reuniao', OLD.link_reuniao, NEW.link_reuniao, 'Link da reunião atualizado.', v_user, v_user_nome);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.atividades_log
      (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
       acao, valor_antigo, descricao, snapshot, changed_by, changed_by_nome)
    VALUES ('encontro', OLD.id, OLD.mentorado_id, v_ment_nome, OLD.mentor_id, v_mentor_nome,
            'DELETE', OLD.status,
            format('Encontro "%s" de %s (%s) EXCLUÍDO.',
                   OLD.titulo, COALESCE(v_ment_nome,'—'),
                   to_char(OLD.inicio AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI')),
            to_jsonb(OLD), v_user, v_user_nome);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS encontros_audit_trigger ON public.encontros;
DROP TRIGGER IF EXISTS encontros_audit_upsert  ON public.encontros;
CREATE TRIGGER encontros_audit_upsert
AFTER INSERT OR UPDATE ON public.encontros
FOR EACH ROW EXECUTE FUNCTION public.log_encontros_changes_v2();

DROP TRIGGER IF EXISTS encontros_audit_delete ON public.encontros;
CREATE TRIGGER encontros_audit_delete
BEFORE DELETE ON public.encontros
FOR EACH ROW EXECUTE FUNCTION public.log_encontros_changes_v2();

-- =====================================================================
-- 6. Backfill do log antigo (encontros_audit_log -> atividades_log)
-- =====================================================================
INSERT INTO public.atividades_log
  (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, acao,
   campo, valor_antigo, valor_novo, descricao, changed_by, changed_at)
SELECT
  'encontro', a.encontro_id, a.mentorado_id,
  (SELECT nome FROM public.mentorados m WHERE m.id = a.mentorado_id),
  a.mentor_id, a.action, a.field_name, a.old_value, a.new_value,
  format('[migrado] %s%s', a.action, COALESCE(' · ' || a.field_name, '')),
  a.changed_by, a.changed_at
FROM public.encontros_audit_log a
WHERE NOT EXISTS (
  SELECT 1 FROM public.atividades_log l
  WHERE l.entidade = 'encontro'
    AND l.entidade_id = a.encontro_id
    AND l.changed_at = a.changed_at
    AND COALESCE(l.campo,'') = COALESCE(a.field_name,'')
);

-- =====================================================================
-- 7. RPC: alterar contador de encontros de forma ATÔMICA
-- =====================================================================
CREATE OR REPLACE FUNCTION public.registrar_encontro_realizado(
  p_mentorado_id uuid,
  p_delta        integer,
  p_obs          text DEFAULT ''
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_antigo int;
  v_novo   int;
  v_mentor uuid;
BEGIN
  IF p_delta NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'Delta inválido: use +1 ou -1.';
  END IF;

  SELECT encontros_realizados, mentor_id
    INTO v_antigo, v_mentor
  FROM public.mentorados
  WHERE id = p_mentorado_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mentorado não encontrado.';
  END IF;

  v_novo := GREATEST(0, v_antigo + p_delta);
  IF v_novo = v_antigo THEN
    RETURN v_antigo;
  END IF;

  UPDATE public.mentorados
     SET encontros_realizados = v_novo, updated_at = now()
   WHERE id = p_mentorado_id;

  -- fallback: se o mentorado não tem mentor, usa o mentor do usuário logado
  IF v_mentor IS NULL THEN
    SELECT id INTO v_mentor FROM public.mentores WHERE user_id = auth.uid() LIMIT 1;
  END IF;

  -- historicos.mentor_id é NOT NULL; se não houver mentor, pulamos SEM falhar.
  -- A auditoria em atividades_log já foi gravada pelo trigger acima.
  IF v_mentor IS NOT NULL THEN
    INSERT INTO public.historicos (mentorado_id, mentor_id, tipo, conteudo, visibilidade)
    VALUES (
      p_mentorado_id, v_mentor, 'Sessão Realizada',
      CASE WHEN p_delta = 1
           THEN format('Sessão #%s%s', v_novo, COALESCE(' — ' || NULLIF(trim(p_obs), ''), ''))
           ELSE format('Sessão removida: %s → %s', v_antigo, v_novo)
      END,
      'Admin'
    );
  END IF;

  RETURN v_novo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_encontro_realizado(uuid, integer, text) TO authenticated;

-- =====================================================================
-- 8. RPC: excluir mentorado registrando o MOTIVO
-- =====================================================================
CREATE OR REPLACE FUNCTION public.excluir_mentorado(
  p_mentorado_id uuid,
  p_motivo       text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.mentorados WHERE id = p_mentorado_id) THEN
    RAISE EXCEPTION 'Mentorado não encontrado.';
  END IF;

  -- o trigger BEFORE DELETE lê este GUC para gravar o motivo
  PERFORM set_config('app.motivo_exclusao', COALESCE(p_motivo, ''), true);

  DELETE FROM public.mentorados WHERE id = p_mentorado_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.excluir_mentorado(uuid, text) TO authenticated;