# Etapa 3 — Página de Histórico Geral

A Etapa 2 já entregou o hook `useAtividadesLog(filtros?)` em `src/hooks/useSupabaseData.ts`. Agora ele passa a ser usado na interface. Confirmei que `date-fns` já está no projeto, o menu tem hoje 4 itens (`/`, `/mentorados`, `/concluidos`, `/historico-encontros`) e o modal do mentorado tem 2 abas (Observações e Encontros).

## O que muda

### 1. Novo componente `src/components/TimelineAtividade.tsx`
Item reutilizável de timeline para um registro de `atividades_log`:
- Ícone por ação: criação (verde), alteração (azul), exclusão (vermelho).
- Hora no fuso `America/Sao_Paulo`.
- `descricao` como texto principal (já vem legível do banco).
- Badge com o nome do mentorado e uma linha discreta "por {autor}".
- Quando houver campo alterado, mostra valor antigo (fundo vermelho claro) e novo (fundo verde claro), no mesmo estilo já usado no Histórico de Encontros.
- Exclusões ganham destaque: borda/fundo vermelho suave.

### 2. Nova página `src/pages/HistoricoGeralPage.tsx`
- Título "Histórico Geral" + subtítulo com a contagem de registros filtrados.
- Filtros: busca (mentorado, descrição, autor), entidade (Todas/Mentorados/Encontros), ação (Todas/Criação/Alteração/Exclusão), período (7 / 30 / 90 dias / Tudo — padrão 30 dias).
- Lista em timeline **agrupada por dia**, com cabeçalho de data em português (`date-fns` + `ptBR`).
- Estado vazio: "Nenhuma atividade registrada nesse período." e loading com `Skeleton`, como nas outras páginas.
- Só componentes shadcn já existentes; nenhuma biblioteca nova.

### 3. `src/App.tsx`
Rota `/historico` logo acima de `/historico-encontros`.

### 4. `src/components/AppLayout.tsx`
- Novo item de menu "Histórico Geral" (ícone `ScrollText`), antes de "Histórico de Encontros".
- Corrigir a marcação de item ativo: hoje `startsWith(item.to)` faria os dois itens de histórico acenderem juntos. Passa a exigir igualdade exata ou prefixo com `/`.

### 5. `src/pages/HistoricoEncontrosPage.tsx`
- Remover o filtro `.not('changed_by', 'is', null)`, que descarta registros válidos.
- Trocar a janela fixa de 2 meses por um seletor de período (30 / 90 / 365 dias / Tudo, padrão 90 dias).

### 6. `src/components/MentoradoInfoModal.tsx`
Nova aba "Histórico" usando `useAtividadesLog({ mentoradoId })`, renderizando o mesmo `TimelineAtividade` — só as ações daquele mentorado. As abas atuais ficam intactas.

## Fora de escopo
Nenhuma mudança de banco nesta etapa. `encontros_audit_log` continua existindo. Soft delete (para não apagar de fato encontros/observações) seria uma Etapa 4 opcional.

## Como testar
1. `/historico` lista tudo e os quatro filtros funcionam em conjunto.
2. Excluir um mentorado de teste: ele sai da lista, mas o registro da exclusão (nome, motivo e quantos encontros/observações caíram junto) permanece em `/historico`.
3. A aba "Histórico" no modal do mentorado mostra apenas as ações dele.
4. No menu, apenas um dos dois itens de histórico fica destacado por vez.
