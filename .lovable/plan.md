# Remover integração com Google Calendar

Remoção completa da sincronização com agenda externa. **Mantém** o "Entrar com Google" (login OAuth), pois é apenas autenticação, não sincronização de agenda.

## Frontend

- **Excluir** `src/hooks/useGoogleCalendar.ts`.
- **`src/pages/CalendarioPage.tsx`**: remover botão "Conectar Google", indicador de status conectado, import de eventos e barra de progresso de importação.
- **`src/components/MeetingModal.tsx`**: remover a aba "Google" do modal e toda a lógica `handleSyncToGoogle` / `handleRemoveFromGoogle`.
- **`src/components/NovoEncontroModal.tsx`** e **`src/components/QuickSessionModal.tsx`**: remover chamadas `syncEvent` e o uso do hook.
- **`src/pages/MentoresPage.tsx`**: remover coluna "Google Agenda" da tabela de mentores.
- **`src/pages/EncontrosPage.tsx`** e **`src/pages/Dashboard.tsx`**: remover condicionais e parâmetros baseados em `google_event_id` (passar para sempre exibir status/tipo, e remover esse argumento das chamadas `deleteEncontro`/`revertToVago`).
- **`src/hooks/useSupabaseData.ts`**: remover blocos que invocam `supabase.functions.invoke('google-calendar-sync', ...)` em status change, delete e revertToVago.
- **`src/types/index.ts`**, **`src/data/mock.ts`**, **`src/integrations/lovable/index.ts`**, **`src/index.css`**: limpar referências/tipos relacionadas a Google Calendar (campos `google_event_id`, `sincronizado_google`, `google_calendar_*`).

## Backend

- **Excluir edge functions** `google-calendar-auth`, `google-calendar-callback`, `google-calendar-sync` (remover pastas em `supabase/functions/` e desfazer deploy via supabase--delete_edge_functions).
- **Migration** para:
  - Dropar a tabela `google_calendar_tokens`.
  - Remover colunas de `encontros`: `google_event_id`, `sincronizado_google`.
  - Remover colunas de `mentores`: `google_calendar_connected`, `google_calendar_id`.

## Não alterado

- Página de Histórico de Encontros (já filtra apenas alterações feitas no sistema).
- Login "Entrar com Google" em `AuthPage.tsx` (é apenas autenticação, não sincronização de agenda).
- Secrets `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` permanecem (usados pelo login OAuth).
