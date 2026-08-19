ALTER TABLE public.atividades_log
  ADD COLUMN IF NOT EXISTS enc_realizados  integer,
  ADD COLUMN IF NOT EXISTS enc_contratados integer;

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
       acao, descricao, snapshot, changed_by, changed_by_nome,
       enc_realizados, enc_contratados)
    VALUES
      ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
       'INSERT',
       format('Mentorado "%s" cadastrado (%s/%s encontros contratados).',
              NEW.nome, NEW.encontros_realizados, NEW.total_encontros),
       to_jsonb(NEW), v_user, v_user_nome, NEW.encontros_realizados, NEW.total_encontros);

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    SELECT nome INTO v_mentor_nome FROM public.mentores WHERE id = NEW.mentor_id;

    IF NEW.encontros_realizados IS DISTINCT FROM OLD.encontros_realizados THEN
      INSERT INTO public.atividades_log
        (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
         acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome,
         enc_realizados, enc_contratados)
      VALUES
        ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
         'UPDATE', 'encontros_realizados',
         OLD.encontros_realizados::text, NEW.encontros_realizados::text,
         format('%s encontro realizado — %s: %s → %s (de %s contratados).',
                CASE WHEN NEW.encontros_realizados > OLD.encontros_realizados THEN '+1' ELSE '-1' END,
                NEW.nome, OLD.encontros_realizados, NEW.encontros_realizados, NEW.total_encontros),
         v_user, v_user_nome, NEW.encontros_realizados, NEW.total_encontros);
    END IF;

    IF NEW.total_encontros IS DISTINCT FROM OLD.total_encontros THEN
      INSERT INTO public.atividades_log
        (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
         acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome,
         enc_realizados, enc_contratados)
      VALUES
        ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
         'UPDATE', 'total_encontros',
         OLD.total_encontros::text, NEW.total_encontros::text,
         format('Total de encontros contratados de %s alterado: %s → %s.',
                NEW.nome, OLD.total_encontros, NEW.total_encontros),
         v_user, v_user_nome, NEW.encontros_realizados, NEW.total_encontros);
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.atividades_log
        (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
         acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome,
         enc_realizados, enc_contratados)
      VALUES
        ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
         'UPDATE', 'status', OLD.status, NEW.status,
         format('Status de %s alterado: %s → %s.', NEW.nome, OLD.status, NEW.status),
         v_user, v_user_nome, NEW.encontros_realizados, NEW.total_encontros);
    END IF;

    IF NEW.nome IS DISTINCT FROM OLD.nome THEN
      INSERT INTO public.atividades_log
        (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
         acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome,
         enc_realizados, enc_contratados)
      VALUES
        ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
         'UPDATE', 'nome', OLD.nome, NEW.nome,
         format('Nome alterado: %s → %s.', OLD.nome, NEW.nome),
         v_user, v_user_nome, NEW.encontros_realizados, NEW.total_encontros);
    END IF;

    IF NEW.mentor_id IS DISTINCT FROM OLD.mentor_id THEN
      INSERT INTO public.atividades_log
        (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
         acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome,
         enc_realizados, enc_contratados)
      VALUES
        ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
         'UPDATE', 'mentor_id', OLD.mentor_id::text, NEW.mentor_id::text,
         format('Mentor responsável por %s alterado: %s → %s.',
                NEW.nome,
                COALESCE((SELECT nome FROM public.mentores WHERE id = OLD.mentor_id), 'nenhum'),
                COALESCE(v_mentor_nome, 'nenhum')),
         v_user, v_user_nome, NEW.encontros_realizados, NEW.total_encontros);
    END IF;

    IF NEW.email IS DISTINCT FROM OLD.email THEN
      INSERT INTO public.atividades_log
        (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
         acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome,
         enc_realizados, enc_contratados)
      VALUES ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
              'UPDATE', 'email', OLD.email, NEW.email,
              format('E-mail de %s atualizado.', NEW.nome), v_user, v_user_nome, NEW.encontros_realizados, NEW.total_encontros);
    END IF;

    IF NEW.telefone_whatsapp IS DISTINCT FROM OLD.telefone_whatsapp THEN
      INSERT INTO public.atividades_log
        (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
         acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome,
         enc_realizados, enc_contratados)
      VALUES ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
              'UPDATE', 'telefone_whatsapp', OLD.telefone_whatsapp, NEW.telefone_whatsapp,
              format('WhatsApp de %s atualizado.', NEW.nome), v_user, v_user_nome, NEW.encontros_realizados, NEW.total_encontros);
    END IF;

    IF NEW.cidade IS DISTINCT FROM OLD.cidade THEN
      INSERT INTO public.atividades_log
        (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
         acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome,
         enc_realizados, enc_contratados)
      VALUES ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
              'UPDATE', 'cidade', OLD.cidade, NEW.cidade,
              format('Cidade de %s: %s → %s.', NEW.nome, OLD.cidade, NEW.cidade), v_user, v_user_nome, NEW.encontros_realizados, NEW.total_encontros);
    END IF;

    IF NEW.origem IS DISTINCT FROM OLD.origem THEN
      INSERT INTO public.atividades_log
        (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
         acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome,
         enc_realizados, enc_contratados)
      VALUES ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
              'UPDATE', 'origem', OLD.origem, NEW.origem,
              format('Origem de %s: %s → %s.', NEW.nome, OLD.origem, NEW.origem), v_user, v_user_nome, NEW.encontros_realizados, NEW.total_encontros);
    END IF;

    IF NEW.observacoes_gerais IS DISTINCT FROM OLD.observacoes_gerais THEN
      INSERT INTO public.atividades_log
        (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
         acao, campo, valor_antigo, valor_novo, descricao, changed_by, changed_by_nome,
         enc_realizados, enc_contratados)
      VALUES ('mentorado', NEW.id, NEW.id, NEW.nome, NEW.mentor_id, v_mentor_nome,
              'UPDATE', 'observacoes_gerais', OLD.observacoes_gerais, NEW.observacoes_gerais,
              format('Observações gerais de %s atualizadas.', NEW.nome), v_user, v_user_nome, NEW.encontros_realizados, NEW.total_encontros);
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    SELECT count(*) INTO v_qtd_enc  FROM public.encontros   WHERE mentorado_id = OLD.id;
    SELECT count(*) INTO v_qtd_hist FROM public.historicos  WHERE mentorado_id = OLD.id;
    SELECT nome INTO v_mentor_nome  FROM public.mentores    WHERE id = OLD.mentor_id;

    v_motivo := NULLIF(trim(COALESCE(current_setting('app.motivo_exclusao', true), '')), '');

    INSERT INTO public.atividades_log
      (entidade, entidade_id, mentorado_id, mentorado_nome, mentor_id, mentor_nome,
       acao, campo, valor_antigo, valor_novo, descricao, snapshot, changed_by, changed_by_nome,
       enc_realizados, enc_contratados)
    VALUES
      ('mentorado', OLD.id, OLD.id, OLD.nome, OLD.mentor_id, v_mentor_nome,
       'DELETE', 'motivo_exclusao', OLD.status, NULL,
       format('Mentorado "%s" EXCLUÍDO com %s de %s encontros realizados. Motivo: %s. Removidos junto: %s encontro(s) e %s registro(s) de histórico.',
              OLD.nome, OLD.encontros_realizados, OLD.total_encontros,
              COALESCE(v_motivo, 'não informado'), v_qtd_enc, v_qtd_hist),
       to_jsonb(OLD), v_user, v_user_nome, OLD.encontros_realizados, OLD.total_encontros);

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

UPDATE public.atividades_log l
   SET enc_realizados = NULLIF(l.valor_novo,'')::int
 WHERE l.entidade='mentorado' AND l.campo='encontros_realizados'
   AND l.enc_realizados IS NULL AND l.valor_novo ~ '^[0-9]+$';

UPDATE public.atividades_log l
   SET enc_contratados = m.total_encontros
  FROM public.mentorados m
 WHERE m.id = l.mentorado_id
   AND l.enc_contratados IS NULL
   AND l.entidade = 'mentorado';