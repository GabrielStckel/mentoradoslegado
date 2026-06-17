## Objetivo
No Histórico de Encontros, esconder qualquer item ligado a slots "VAGO" da agenda e mostrar apenas encontros com mentorado real salvo no sistema, com a alteração feita e a data.

## Mudança
Em `src/pages/HistoricoEncontrosPage.tsx`, na query `encontros-realizados-historico`:

- Adicionar filtros para excluir registros VAGO:
  - `.not('mentorado_id', 'is', null)` — só encontros com mentorado atribuído
  - `.neq('status', 'vago')` — exclui placeholders da agenda

- No `useMemo` `grouped`, garantir que entradas sem `mentoradoNome` (fallback "—") sejam descartadas como salvaguarda extra.

- Nos logs exibidos por encontro, filtrar alterações em que `old_value` ou `new_value` seja "VAGO" no campo `titulo` ou `status`, para não aparecer texto "alterado de VAGO para ...".

## Resultado
A lista mostra apenas encontros com mentorado real. Cada item exibe:
- Nome do mentorado (salvo no sistema)
- Alteração feita (campo + valor antigo → novo)
- Data/hora da alteração

Nenhum slot VAGO da agenda aparece mais.