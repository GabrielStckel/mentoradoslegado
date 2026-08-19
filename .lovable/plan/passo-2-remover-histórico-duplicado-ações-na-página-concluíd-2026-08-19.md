# Passo 2 — Remover histórico duplicado + ações na página Concluídos

Duas mudanças mecânicas, sem redesenho visual. A página `HistoricoGeralPage.tsx` não será tocada.

## 2.1 Uma única página de histórico

Hoje existem dois itens de menu: "Histórico Geral" (`/historico`, lê a tabela nova de atividades) e "Histórico de Encontros" (`/historico-encontros`, ainda lê a tabela antiga de auditoria de encontros). Fica só uma.

- Excluir `src/pages/HistoricoEncontrosPage.tsx`.
- Em `src/App.tsx`: remover o import e transformar `/historico-encontros` em redirecionamento para `/historico` (links antigos e abas abertas continuam funcionando).
- Em `src/components/AppLayout.tsx`: remover o item de menu "Histórico de Encontros", remover o ícone `History` se ficar sem uso, e renomear o label de `/historico` para apenas "Histórico".
- A tabela antiga no banco (`encontros_audit_log`) **não** será apagada — permanece como cópia de segurança, já que o conteúdo foi copiado para o log unificado.

## 2.2 Editar e excluir em Concluídos

Hoje `src/pages/ConcluidosPage.tsx` só oferece "Ver detalhes" e "Reativar". Reaproveitando os componentes que a página de Mentorados já usa (sem criar modais novos):

- Clicar na linha (desktop) ou no card (mobile) abre o modal de informações do mentorado; os botões de ação param a propagação do clique.
- Novo botão "Editar" (lápis), antes de Reativar, abre o modal de edição já existente — que também contém o fluxo de exclusão com motivo obrigatório.
- Novo botão "Excluir" (lixeira, vermelho) abre um diálogo com campo de motivo obrigatório (mínimo 5 caracteres; confirmar desabilitado abaixo disso) e chama a rotina de exclusão no banco. O texto deixa claro que a exclusão remove também todos os encontros e observações do mentorado e que a ação fica registrada no histórico.
- Reativar e excluir passam a atualizar também a lista do histórico de atividades.
- Tudo aplicado nas duas renderizações: cards (mobile) e tabela (desktop).

## 2.3 Corrigir o status "Concluído" (necessário por causa do 2.2)

A lista de status cadastrada no banco tem só Novo, Ativo, Pausado e Finalizado — "Concluído" nunca foi cadastrado, embora 8 mentorados estejam hoje com esse status (confirmado por consulta; é o único status órfão). Como o Passo 2 passa a abrir o modal de edição a partir de Concluídos, o campo Status apareceria em branco e qualquer escolha tiraria o mentorado da lista sem aviso.

- Migration curta e idempotente: cadastrar "Concluído" (cor verde, ordem 5) na lista de status, só se ainda não existir.
- No modal de edição: se o status atual do mentorado não estiver na lista vinda do banco, incluí-lo como opção extra no seletor — protege contra qualquer outro status legado.
- No selo de status: adicionar a cor verde de sucesso para "Concluído" (hoje cai no cinza genérico).

## Detalhes técnicos

- `App.tsx`: `<Route path="/historico-encontros" element={<Navigate to="/historico" replace />} />` (`Navigate` já importado).
- `ConcluidosPage.tsx`: states `editMentorado` e `selectedMentorado`; imports de `EditMentoradoModal`, `MentoradoInfoModal`, `Textarea`, ícones `Pencil`/`Trash2`; `e.stopPropagation()` nos botões dentro de linha/card.
- Exclusão via `supabase.rpc('excluir_mentorado', { p_mentorado_id, p_motivo })`; `onSuccess` invalida `['mentorados']` e `['atividades_log']`.
- `reactivateMutation.onSuccess` passa a invalidar `['atividades_log']` também.
- Migration: `INSERT INTO public.status_mentorado (nome, cor, ordem) SELECT 'Concluído', '#10b981', 5 WHERE NOT EXISTS (SELECT 1 FROM public.status_mentorado WHERE nome = 'Concluído');`
- `EditMentoradoModal.tsx`: no `Select` de status, concatenar o status atual à lista quando ausente.
- `StatusBadge.tsx`: `Concluído: 'bg-success/10 text-success border-success/20'` no mapa `statusColors`.

