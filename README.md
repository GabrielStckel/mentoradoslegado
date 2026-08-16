# Mentor Connect

Crie um CRM de Mentorias (web app) completo para eu controlar mentorados, mentores e encontros (atendimentos), com calendário interno E opção de sincronização com Google Agenda.

OBJETIVO

- Cadastrar novos mentorados (clientes)

- Cadastrar mentores

- Registrar e gerenciar encontros (sessões)

- Ter calendário próprio dentro do sistema

- Permitir sincronizar encontros com Google Agenda (Google Calendar)

- Ter histórico/observações por mentorado e por encontro

- Ter dashboard com métricas

PERFIS E PERMISSÕES

1) Admin:

- acesso total (CRUD em tudo)

- pode conectar/desconectar Google Agenda

- pode ver e editar todos os mentores e mentorados

2) Mentor:

- vê apenas seus mentorados e seus encontros

- pode criar/editar encontros dos seus mentorados

- pode registrar notas e evolução

- pode sincronizar seus encontros com o Google Agenda (se o Admin permitir)

3) (Opcional) Atendente/Operação:

- pode cadastrar mentorados e agendar encontros

- não pode ver notas privadas (campo “Notas do Mentor” deve ser oculto para este perfil)

BANCO DE DADOS (TABELAS)

A) Mentores

- id

- nome

- email

- telefone_whatsapp

- especialidade (texto)

- status (Ativo / Inativo)

- carga_max_por_dia (número)

- cor_calendario (texto ou select)

- google_calendar_connected (boolean)

- google_calendar_id (texto)

- created_at, updated_at

B) Mentorados

- id

- nome

- telefone_whatsapp

- email

- cidade

- origem (Instagram / Indicação / Anúncio / Outro)

- mentor_id (relacionamento com Mentores)

- status (Novo / Ativo / Pausado / Finalizado)

- data_inicio (data)

- observacoes_gerais (texto longo)

- tags (multi-select: ex: “Alta prioridade”, “VIP”, “Grupo”, “Individual”)

- created_at, updated_at

C) Encontros (Atendimentos / Sessões)

- id

- mentorado_id (relacionamento com Mentorados)

- mentor_id (relacionamento com Mentores)

- titulo (ex: “Sessão 1”, “Follow-up”, “Avaliação”)

- tipo (Sessão / Follow-up / Avaliação / Outro)

- inicio (datetime)

- fim (datetime)

- status (Agendado / Realizado / Cancelado / Reagendado / Faltou)

- local (Online / Presencial / Google Meet / Zoom / Outro + link)

- link_reuniao (url)

- notas_do_mentor (texto longo, privado)

- notas_operacionais (texto longo, visível para operação)

- proxima_acao (texto curto)

- sincronizado_google (boolean)

- google_event_id (texto)

- lembrete_24h_enviado (boolean)

- lembrete_3h_enviado (boolean)

- lembrete_10min_enviado (boolean)

- created_at, updated_at

D) Histórico / Interações (Opcional mas recomendado)

- id

- mentorado_id

- mentor_id

- tipo (Mensagem / Observação / Tarefa / Check-in)

- conteudo (texto longo)

- visibilidade (Privado Mentor / Admin / Operação)

- created_at

TELAS (PÁGINAS)

1) Login / controle por perfil (Admin / Mentor / Operação)

2) Dashboard (Admin)

- Cards: mentorados ativos, encontros hoje, encontros da semana, cancelados, faltas

- Lista “Próximos Encontros”

- Filtro por mentor

3) Mentorados

- Lista com busca, filtros (mentor, status, tags, origem)

- Botão “Novo Mentorado”

- Página de detalhe do mentorado com:

  - dados + editar

  - histórico

  - lista de encontros desse mentorado

  - botão “Agendar Encontro”

4) Mentores

- Lista e cadastro de mentores

- Página de detalhes do mentor (carga, especialidade, status)

- Botão “Conectar Google Agenda” (quando possível)

5) Encontros

- Lista com filtros (status, mentor, data, tipo)

- Edição rápida do status (realizado/cancelado/faltou)

6) Calendário (calendário interno do sistema)

- Visualização mensal/semanal/diária

- Eventos puxados da tabela Encontros

- Clique no evento abre modal com detalhes e ações:

  - editar

  - reagendar (alterar inicio/fim)

  - marcar como realizado/cancelado/faltou

  - botão “Sincronizar com Google Agenda” / “Atualizar no Google” / “Remover do Google”

- Filtros no calendário: mentor, status, tipo

SINCRONIZAÇÃO COM GOOGLE AGENDA (Google Calendar)

- Implementar integração via OAuth com Google

- Guardar google_calendar_id e estado de conexão no mentor

- Ações de sincronização:

  1) Ao criar encontro, opção “Sincronizar”:

     - cria evento no Google Calendar do mentor

     - salva google_event_id e sincronizado_google = true

  2) Ao editar encontro (data/hora/título/link):

     - se sincronizado_google = true, atualizar evento no Google

  3) Ao cancelar encontro:

     - atualizar evento no Google (ou remover) e refletir no CRM

  4) Botão manual “Sincronizar agora” no encontro

LEMBRETES (estrutura pronta)

- Criar botões no encontro:

  - “Enviar lembrete 24h no WhatsApp”

  - “Enviar lembrete 3h no WhatsApp”

  - “Enviar lembrete 10min no WhatsApp”

- Por enquanto pode ser envio via link wa.me (WhatsApp click-to-chat) com mensagem montada automaticamente usando nome do mentorado + data/hora + link.

- Campos booleanos para marcar se já foi enviado.

DETALHES IMPORTANTES DE UX

- Telefone do mentorado deve ser clicável para abrir WhatsApp

- Busca global rápida por nome/telefone/email

- Formulários com validação (inicio < fim, obrigatórios)

- Sempre mostrar timezone (America/Sao_Paulo)

- Layout simples e profissional (estilo SaaS): sidebar com ícones, cards e tabelas limpas.

ENTREGA

- Implementar o app completo com essas telas, tabelas e relacionamentos

- Criar componentes para: tabela, filtros, modal de encontro, calendário interno

- Preparar estrutura para integrar com APIs (Google Calendar e futuramente WhatsApp API)

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mentoradoslegado.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c26535ab-ca9b-47d2-93aa-41d522183787).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
