# Etapa 1 — Banco de dados: auditoria unificada + RPCs atômicas

> Esta é a **Etapa 1 de 3**. Executamos uma etapa por vez e só passamos para a próxima depois de testar. O SQL completo está no arquivo enviado (`prompts-lovable-historico.md`) e será aplicado exatamente como está, sem alterações de lógica.

## Contexto atual (verificado)

- `historicos` tem um CHECK constraint (`historicos_tipo_check`) que só permite os tipos `Mensagem, Observação, Tarefa, Check-in, Sessão Realizada` — isso já bloqueou inserts legítimos (ex.: "Observação do Mentorado") e precisa ser removido.
- Existe auditoria **apenas** para `encontros` (trigger `encontros_audit_trigger` + função `log_encontros_changes` escrevendo em `encontros_audit_log`). Nada é registrado para `mentorados`.
- A tabela `atividades_log` (unificada) **não existe** ainda.
- Não existem as funções `log_mentorados_changes`, `log_encontros_changes_v2`, `audit_actor_nome`, `registrar_encontro_realizado` nem `excluir_mentorado`.
- `mentorados`/`historicos`/`encontros` usam `ON DELETE CASCADE`, então excluir um mentorado apaga todo o histórico junto — a nova tabela `atividades_log` é propositalmente **sem FKs** para preservar o registro da exclusão.

## O que será feito

Uma única migration no banco (Lovable Cloud) com o SQL exato do arquivo enviado, que:

1. **Remove o CHECK constraint** `historicos_tipo_check` (mantém o de `visibilidade`).
2. **Cria a tabela `public.atividades_log`** (audit unificada, sem FKs, imutável: SELECT para `authenticated`, ALL para `service_role`, RLS habilitado, sem policy de UPDATE/DELETE).
3. **Cria a função helper `audit_actor_nome()`** que devolve o nome legível de quem fez a alteração (profile → mentor → "Sistema").
4. **Cria a trigger `log_mentorados_changes()`** + triggers `mentorados_audit_upsert` (AFTER INSERT OR UPDATE) e `mentorados_audit_delete` (BEFORE DELETE) — registra INSERT, e cada campo alterado no UPDATE (encontros_realizados, total_encontros, status, nome, mentor_id, email, telefone, cidade, origem, observacoes_gerais) e DELETE (com motivo, snapshot e contagem de encontros/históricos removidos).
5. **Cria a função `log_encontros_changes_v2()`** + triggers `encontros_audit_upsert` (AFTER INSERT OR UPDATE) e `encontros_audit_delete` (BEFORE DELETE), substituindo a trigger antiga `encontros_audit_trigger`. Registra INSERT, cada campo alterado (título, status, início, fim, tipo, local, mentorado_id, notas, próxima ação, link) e DELETE.
6. **Backfill** dos registros antigos de `encontros_audit_log` → `atividades_log` (evita duplicar registros já migrados).
7. **Cria a RPC `registrar_encontro_realizado(mentorado_id, delta, obs)`** — operação atômica que atualiza o contador, dispara a auditoria via trigger e insere o `historicos` com tipo válido (`Sessão Realizada`).
8. **Cria a RPC `excluir_mentorado(mentorado_id, motivo)`** — define o motivo via GUC (`app.motivo_exclusao`) antes do DELETE, para o trigger gravar.

Nenhum arquivo do frontend será alterado nesta etapa.

## Como testar (após aplicar)

```sql
-- Deve retornar o novo valor do contador
SELECT public.registrar_encontro_realizado('<UUID_DE_UM_MENTORADO>', 1);

-- Deve mostrar linhas "+1 encontro realizado — ..." e "Mentorado ... cadastrado"
SELECT changed_at, acao, campo, descricao, changed_by_nome
FROM public.atividades_log ORDER BY changed_at DESC LIMIT 10;
```

Validar:
- INSERT de mentorado gera log de INSERT.
- +1 / -1 no contador (RPC) gera log de UPDATE em `encontros_realizados`.
- Excluir mentorado via RPC (com motivo) gera log de DELETE com snapshot.

## Próximas etapas (não agora)

- **Etapa 2** — Frontend passa a usar as RPCs (`registrar_encontro_realizado`, `excluir_mentorado`), troca `tipo: 'Observação do Mentorado'` por `'Observação'`, e adiciona o hook `useAtividadesLog`.
- **Etapa 3** — Nova página `HistoricoGeralPage.tsx`, rota `/historico`, item na sidebar e aba "Histórico" dentro do modal do mentorado.
