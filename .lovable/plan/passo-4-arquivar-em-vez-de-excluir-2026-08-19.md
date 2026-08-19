# Passo 4 — Arquivar em vez de excluir

Mentorados que pararam no meio passam a ser **arquivados** (reversível) em vez de excluídos. Exclusão definitiva só existe para quem já está arquivado.

Três estados: Ativo (`/mentorados`), Concluído (`/concluidos`), Arquivado (`/arquivados`, nova página).

## Parte A — Banco (migration)

SQL exatamente como especificado:

1. Colunas `arquivado_at`, `arquivado_motivo`, `arquivado_por` em `mentorados` + índice parcial `idx_mentorados_ativos`.
2. Função/trigger `log_arquivamento` (AFTER UPDATE OF `arquivado_at`) gravando uma linha legível em `atividades_log` para arquivar e restaurar.
3. RPC `arquivar_mentorado(uuid, text)` — cancela encontros futuros `Agendado`, marca arquivamento, retorna quantos foram cancelados.
4. RPC `restaurar_mentorado(uuid)` — limpa os campos de arquivamento; não reagenda nada.
5. `excluir_mentorado` passa a exigir `arquivado_at IS NOT NULL`, senão levanta "Arquive o mentorado antes de excluir definitivamente."
6. REVOKE em `log_arquivamento`; GRANT EXECUTE das duas novas RPCs para `authenticated`.

Depois: `src/integrations/supabase/types.ts` é regenerado com as novas colunas e funções.

## Parte B — Frontend

**B1 — `useSupabaseData.ts`**: `useMentorados()` ganha `.is('arquivado_at', null)`; novo `useMentoradosArquivados()` (`not arquivado_at is null`, ordenado por `arquivado_at` desc, queryKey `['mentorados_arquivados']`).

Efeito colateral tratado nos três pontos que resolvem nome pelo mapa — `EncontrosPage.tsx`, `CalendarioPage.tsx` e `Dashboard.tsx`: fallback `mentoradoMap[e.mentorado_id] || 'Mentorado arquivado'`, sem query extra.

**B2 — nova `src/pages/ArquivadosPage.tsx`**: mesma estrutura da `ConcluidosPage` (tabela no desktop, cards no mobile via `useIsMobile`), busca por nome/email, colunas Nome · Progresso · Arquivado em (dd/MM/yyyy) · Motivo (`line-clamp-2` + `title`) · Ações:
- Restaurar (`ArchiveRestore`, destaque) — AlertDialog explicando progresso preservado e encontros futuros que precisam ser reagendados → `restaurar_mentorado`.
- Ver detalhes (`Eye`) — abre `MentoradoInfoModal`.
- Excluir definitivamente (`Trash2`, vermelho) — AlertDialog com motivo obrigatório (mín. 5 caracteres), aviso de irreversibilidade → `excluir_mentorado`.
- Todas as mutations invalidam `['mentorados']`, `['mentorados_arquivados']`, `['atividades_log']`.
- Vazio: "Nenhum mentorado arquivado."

**B3 — rota e menu**: `/arquivados` em `App.tsx`; item "Arquivados" (ícone `Archive`) em `AppLayout.tsx`, depois de Concluídos e antes de Histórico.

**B4 — arquivar nas telas existentes**:
- `ConcluidosPage.tsx` e `EditMentoradoModal.tsx`: a ação de exclusão existente é **substituída** por arquivamento. A chamada a `excluir_mentorado` sai desses dois arquivos.
- `MentoradosPage.tsx`: hoje não há botão de exclusão — será **criado** um botão novo de Arquivar, posicionado depois de "Agendar encontro", nas duas renderizações (cards e tabela), com `e.stopPropagation()`. É o caminho principal de quem para no meio.
- Em todos: ícone `Archive`, âmbar, `title="Arquivar"`, AlertDialog com motivo obrigatório (mín. 5 caracteres) e texto explicando preservação de progresso/histórico, cancelamento dos encontros futuros e possibilidade de restauração. Toast usa o retorno da RPC: "Mentorado arquivado. N encontro(s) futuro(s) cancelado(s)." Invalidam `['mentorados']`, `['mentorados_arquivados']`, `['encontros']`, `['atividades_log']`.
- Verificação final: `grep -rn "excluir_mentorado" src/` deve retornar apenas `ArquivadosPage.tsx`.

Pendências deixadas de fora por decisão sua: incluir arquivados na busca global do `AppLayout` (com sufixo "(arquivado)") e a fronteira entre o status "Pausado" e o estado Arquivado.

**B5 — histórico**: em `HistoricoGeralPage.tsx`, `rotuloAlteracao` reconhece `campo === 'arquivado_at'` → "Arquivado" (âmbar) quando `valor_novo` não é nulo e "Restaurado" (verde) quando é nulo; o Select de Tipo ganha a opção "Arquivamentos".

## Ordem de execução

Migration primeiro (aprovação separada), tipos regenerados, depois todas as mudanças de frontend em um bloco, encerrando com verificação de TypeScript.
