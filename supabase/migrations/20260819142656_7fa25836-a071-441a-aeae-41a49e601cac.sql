-- Funções de trigger e helpers internos: não devem ser chamáveis pela API.
-- Elas rodam como SECURITY DEFINER acionadas pelo próprio banco.
REVOKE ALL ON FUNCTION public.log_mentorados_changes()    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_encontros_changes_v2()  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_encontros_changes()     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user()           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_actor_nome()          FROM PUBLIC, anon, authenticated;

-- RPCs de escrita: somente usuários autenticados.
REVOKE ALL ON FUNCTION public.registrar_encontro_realizado(uuid, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.excluir_mentorado(uuid, text)                     FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_encontro_realizado(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.excluir_mentorado(uuid, text)                     TO authenticated;

-- Helper de leitura: exige login.
REVOKE ALL ON FUNCTION public.get_user_mentor_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_mentor_id(uuid) TO authenticated;

-- has_role é usada dentro das policies de RLS (role "public"), por isso
-- precisa continuar executável para anon e authenticated. Ela só faz uma
-- leitura booleana em user_roles e não expõe dados.