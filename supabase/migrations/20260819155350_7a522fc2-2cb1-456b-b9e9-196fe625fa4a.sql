REVOKE ALL ON FUNCTION public.arquivar_mentorado(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restaurar_mentorado(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.arquivar_mentorado(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restaurar_mentorado(uuid) TO authenticated;