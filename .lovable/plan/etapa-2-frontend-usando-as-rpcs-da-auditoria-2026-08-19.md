# Etapa 2 — Frontend usando as RPCs da auditoria

Etapa 1 (banco) já está aplicada: `atividades_log`, triggers de `mentorados`/`encontros` e as RPCs `registrar_encontro_realizado` e `excluir_mentorado` existem. O frontend ainda não usa nada disso — verifiquei que os arquivos abaixo continuam fazendo UPDATE/DELETE direto.

## O que muda

### 1. Contador de encontros (`src/components/EncontrosCounter.tsx`)
Hoje o +/− faz um UPDATE em `mentorados` e depois tenta inserir em `historicos`: se o segundo passo falha, o contador muda e o histórico não é gravado.
- Trocar todo o corpo da mutation por uma única chamada à RPC `registrar_encontro_realizado` (atômica no banco).
- Toast passa a mostrar o novo total retornado pela RPC.
- Remover `resolveMentorId` e o import de `useAuth` se ficarem sem uso (a RPC resolve o mentor no banco).
- Fluxo do PIN e o diálogo de confirmação ficam **exatamente** como estão.
- Invalidar também `atividades_log` (inclusive no `onSuccess` da conclusão de mentoria).

### 2. Exclusão de mentorado (`src/components/EditMentoradoModal.tsx`)
Hoje é um DELETE direto, sem registro nenhum.
- Passa a chamar a RPC `excluir_mentorado`, enviando um **motivo obrigatório**.
- Novo campo de texto "Motivo da exclusão *" no diálogo de confirmação, com placeholder de exemplos; botão de confirmar desabilitado até ter ao menos 5 caracteres.
- Descrição do diálogo deixa claro que a exclusão também remove os encontros e observações do mentorado, e que a ação fica registrada no histórico geral.
- Invalidar `atividades_log` na exclusão e na edição.

### 3. Observações do mentorado (`src/components/MentoradoInfoModal.tsx`)
- Corrigir o tipo gravado: `'Observação do Mentorado'` → `'Observação'` (valor antigo era rejeitado).
- Invalidar `atividades_log` nas três mutations (adicionar, editar, excluir observação).
- A lógica dos `useMemo` de sessões realizadas e observações permanece intacta.

### 4. Hooks (`src/hooks/useSupabaseData.ts`)
- Novo hook `useAtividadesLog(filtros?)` lendo `atividades_log` ordenado por data desc (limite 2000), com filtro opcional por mentorado e por entidade. Será usado pela Etapa 3.
- Invalidar `atividades_log` em `useDeleteEncontro`, `useUpdateEncontroStatus` e `useRevertToVago`.

## Fora de escopo
Nada de refatoração além do listado. A página de Histórico Geral é a Etapa 3.

## Como testar
1. `+` e `−` no contador de um mentorado: valor muda e o toast mostra o novo total.
2. Adicionar observação no modal de info: salva sem erro de constraint.
3. Excluir mentorado: exige o motivo antes de liberar o botão.
4. Todas essas ações aparecem em `atividades_log`.
