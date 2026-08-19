# Passo 1 — Banco: colunas de encontros no log + reconstrução do histórico antigo

Só o banco nesta etapa (Passos 2 e 3 do seu documento ficam para depois, um por vez).

Verifiquei o estado atual: `atividades_log` tem 455 registros e **não** possui as colunas `enc_realizados` / `enc_contratados`; os triggers de `mentorados` já existem (o de DELETE roda como BEFORE DELETE, como o SQL pressupõe); `historicos` tem 292 registros, todos com `tipo = 'Sessão Realizada'` e conteúdo no formato `Sessão #N` — ou seja, há dado antigo recuperável; existem 40 mentorados.

## Migration 1 — colunas estruturadas
- `ALTER TABLE public.atividades_log ADD COLUMN IF NOT EXISTS enc_realizados integer, enc_contratados integer`.
- `CREATE OR REPLACE FUNCTION public.log_mentorados_changes()` exatamente com o SQL enviado: INSERT, UPDATE (encontros_realizados, total_encontros, status, nome, mentor_id, email, telefone_whatsapp, cidade, origem, observacoes_gerais) e DELETE (contagem de encontros/históricos que caem por cascade + motivo via `app.motivo_exclusao`), todos gravando `enc_realizados` / `enc_contratados`.
- Preenchimento retroativo das duas colunas nos registros já existentes (`valor_novo` numérico e `total_encontros` atual do mentorado).

## Migration 2 — reconstrução (idempotente)
- (A) Um registro `INSERT` "cadastrado (registro reconstruído)" por mentorado sem INSERT no log, datado pelo `created_at`.
- (B) Parsing dos 292 registros de `historicos` em eventos `+1 / -1` de `encontros_realizados`, com data original.
- Ambos marcados com `changed_by_nome = 'Reconstruído'` e sufixo "(registro reconstruído)". Guardas `NOT EXISTS` impedem duplicação em nova execução.
- Nada sintético para status/nome/e-mail/telefone/cidade/exclusões anteriores a 19/08 — esse dado nunca existiu.

## Depois das migrations
- Regenerar `src/integrations/supabase/types.ts` com as duas colunas novas. Único arquivo de frontend tocado.
- `encontros_audit_log` permanece intacta.

## Observações técnicas
- A função de trigger é `SECURITY DEFINER` com `search_path = public`; `auth.uid()` fica nulo quando rodado fora de sessão autenticada, e nesse caso o autor aparece como "Sistema".
- Conferência após aplicar: contagem por `changed_by_nome` e listagem dos eventos de `encontros_realizados` com a coluna `realizados/contratados` preenchida, incluindo datas antes de 19/08.

## Checklist
1. `enc_realizados` / `enc_contratados` existem e vêm preenchidos nos novos eventos de contador.
2. Aparecem ~40 registros de cadastro e centenas de eventos `+1/-1` marcados como "Reconstruído".
3. Rodar a Migration 2 duas vezes não duplica nada.
