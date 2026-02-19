import { Mentor, Mentorado, Encontro, Historico, CurrentUser } from '@/types';

const today = new Date();
const fmt = (d: Date) => d.toISOString();
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const setTime = (d: Date, h: number, m: number) => {
  const r = new Date(d); r.setHours(h, m, 0, 0); return r;
};

export const currentUser: CurrentUser = {
  id: 'u1', nome: 'Admin Principal', email: 'admin@mentoria.com', role: 'admin',
};

export const mentores: Mentor[] = [
  {
    id: 'm1', nome: 'Ana Costa', email: 'ana@mentoria.com', telefone_whatsapp: '5511999001001',
    especialidade: 'Liderança e Gestão', status: 'Ativo', carga_max_por_dia: 5,
    cor_calendario: '#0d9488', google_calendar_connected: true, google_calendar_id: 'ana@gmail.com',
    created_at: fmt(addDays(today, -90)), updated_at: fmt(today),
  },
  {
    id: 'm2', nome: 'Bruno Silva', email: 'bruno@mentoria.com', telefone_whatsapp: '5511999002002',
    especialidade: 'Carreira e Transição', status: 'Ativo', carga_max_por_dia: 4,
    cor_calendario: '#3b82f6', google_calendar_connected: false, google_calendar_id: null,
    created_at: fmt(addDays(today, -60)), updated_at: fmt(today),
  },
  {
    id: 'm3', nome: 'Carla Mendes', email: 'carla@mentoria.com', telefone_whatsapp: '5511999003003',
    especialidade: 'Inteligência Emocional', status: 'Inativo', carga_max_por_dia: 3,
    cor_calendario: '#f59e0b', google_calendar_connected: false, google_calendar_id: null,
    created_at: fmt(addDays(today, -120)), updated_at: fmt(addDays(today, -30)),
  },
];

export const mentorados: Mentorado[] = [
  {
    id: 'mt1', nome: 'Lucas Ferreira', telefone_whatsapp: '5511988001001', email: 'lucas@email.com',
    cidade: 'São Paulo', origem: 'Instagram', mentor_id: 'm1', status: 'Ativo',
    data_inicio: fmt(addDays(today, -30)), observacoes_gerais: 'Busca desenvolvimento em liderança. Muito motivado.',
    tags: ['Individual', 'VIP'], created_at: fmt(addDays(today, -30)), updated_at: fmt(today),
  },
  {
    id: 'mt2', nome: 'Mariana Souza', telefone_whatsapp: '5521977002002', email: 'mariana@email.com',
    cidade: 'Rio de Janeiro', origem: 'Indicação', mentor_id: 'm1', status: 'Ativo',
    data_inicio: fmt(addDays(today, -45)), observacoes_gerais: 'Transição de carreira, vindo de engenharia.',
    tags: ['Individual'], created_at: fmt(addDays(today, -45)), updated_at: fmt(today),
  },
  {
    id: 'mt3', nome: 'Pedro Alves', telefone_whatsapp: '5531966003003', email: 'pedro@email.com',
    cidade: 'Belo Horizonte', origem: 'Anúncio', mentor_id: 'm2', status: 'Novo',
    data_inicio: fmt(addDays(today, -5)), observacoes_gerais: 'Primeiro contato via anúncio. Interesse em mentoria de carreira.',
    tags: ['Alta prioridade'], created_at: fmt(addDays(today, -5)), updated_at: fmt(today),
  },
  {
    id: 'mt4', nome: 'Juliana Lima', telefone_whatsapp: '5541955004004', email: 'juliana@email.com',
    cidade: 'Curitiba', origem: 'Indicação', mentor_id: 'm2', status: 'Ativo',
    data_inicio: fmt(addDays(today, -60)), observacoes_gerais: 'Mentoria em grupo. Foco em soft skills.',
    tags: ['Grupo'], created_at: fmt(addDays(today, -60)), updated_at: fmt(today),
  },
  {
    id: 'mt5', nome: 'Rafael Oliveira', telefone_whatsapp: '5511944005005', email: 'rafael@email.com',
    cidade: 'São Paulo', origem: 'Outro', mentor_id: 'm1', status: 'Pausado',
    data_inicio: fmt(addDays(today, -100)), observacoes_gerais: 'Pausou por motivos pessoais. Retorna em janeiro.',
    tags: ['Individual'], created_at: fmt(addDays(today, -100)), updated_at: fmt(addDays(today, -10)),
  },
  {
    id: 'mt6', nome: 'Camila Santos', telefone_whatsapp: '5511933006006', email: 'camila@email.com',
    cidade: 'Campinas', origem: 'Instagram', mentor_id: 'm2', status: 'Finalizado',
    data_inicio: fmt(addDays(today, -180)), observacoes_gerais: 'Programa finalizado com sucesso.',
    tags: ['Individual', 'VIP'], created_at: fmt(addDays(today, -180)), updated_at: fmt(addDays(today, -20)),
  },
];

export const encontros: Encontro[] = [
  {
    id: 'e1', mentorado_id: 'mt1', mentor_id: 'm1', titulo: 'Sessão 1 - Diagnóstico',
    tipo: 'Sessão', inicio: fmt(setTime(today, 9, 0)), fim: fmt(setTime(today, 10, 0)),
    status: 'Agendado', local: 'Google Meet', link_reuniao: 'https://meet.google.com/abc-defg-hij',
    notas_do_mentor: 'Preparar assessment de liderança.', notas_operacionais: 'Enviar link 30min antes.',
    proxima_acao: 'Enviar material de apoio', sincronizado_google: true, google_event_id: 'evt_001',
    lembrete_24h_enviado: true, lembrete_3h_enviado: false, lembrete_10min_enviado: false,
    created_at: fmt(addDays(today, -2)), updated_at: fmt(today),
  },
  {
    id: 'e2', mentorado_id: 'mt2', mentor_id: 'm1', titulo: 'Follow-up Semana 3',
    tipo: 'Follow-up', inicio: fmt(setTime(today, 14, 0)), fim: fmt(setTime(today, 14, 30)),
    status: 'Agendado', local: 'Zoom', link_reuniao: 'https://zoom.us/j/123456',
    notas_do_mentor: '', notas_operacionais: 'Mariana prefere horário da tarde.',
    proxima_acao: '', sincronizado_google: false, google_event_id: null,
    lembrete_24h_enviado: false, lembrete_3h_enviado: false, lembrete_10min_enviado: false,
    created_at: fmt(addDays(today, -1)), updated_at: fmt(today),
  },
  {
    id: 'e3', mentorado_id: 'mt3', mentor_id: 'm2', titulo: 'Sessão Inicial',
    tipo: 'Sessão', inicio: fmt(setTime(addDays(today, 1), 10, 0)), fim: fmt(setTime(addDays(today, 1), 11, 0)),
    status: 'Agendado', local: 'Google Meet', link_reuniao: 'https://meet.google.com/xyz-uvwx',
    notas_do_mentor: 'Primeiro encontro. Fazer diagnóstico completo.', notas_operacionais: '',
    proxima_acao: 'Definir plano de desenvolvimento', sincronizado_google: false, google_event_id: null,
    lembrete_24h_enviado: false, lembrete_3h_enviado: false, lembrete_10min_enviado: false,
    created_at: fmt(today), updated_at: fmt(today),
  },
  {
    id: 'e4', mentorado_id: 'mt4', mentor_id: 'm2', titulo: 'Avaliação Trimestral',
    tipo: 'Avaliação', inicio: fmt(setTime(addDays(today, 2), 15, 0)), fim: fmt(setTime(addDays(today, 2), 16, 0)),
    status: 'Agendado', local: 'Presencial', link_reuniao: '',
    notas_do_mentor: 'Avaliar progresso nos OKRs.', notas_operacionais: 'Reservar sala 3.',
    proxima_acao: 'Preparar relatório de evolução', sincronizado_google: false, google_event_id: null,
    lembrete_24h_enviado: false, lembrete_3h_enviado: false, lembrete_10min_enviado: false,
    created_at: fmt(addDays(today, -3)), updated_at: fmt(today),
  },
  {
    id: 'e5', mentorado_id: 'mt1', mentor_id: 'm1', titulo: 'Sessão 2 - Plano de Ação',
    tipo: 'Sessão', inicio: fmt(setTime(addDays(today, -7), 9, 0)), fim: fmt(setTime(addDays(today, -7), 10, 0)),
    status: 'Realizado', local: 'Google Meet', link_reuniao: 'https://meet.google.com/abc-defg-hij',
    notas_do_mentor: 'Lucas demonstrou boa compreensão. Definimos 3 metas para o mês.', notas_operacionais: '',
    proxima_acao: 'Acompanhar meta 1 na próxima sessão', sincronizado_google: true, google_event_id: 'evt_005',
    lembrete_24h_enviado: true, lembrete_3h_enviado: true, lembrete_10min_enviado: true,
    created_at: fmt(addDays(today, -10)), updated_at: fmt(addDays(today, -7)),
  },
  {
    id: 'e6', mentorado_id: 'mt5', mentor_id: 'm1', titulo: 'Sessão Cancelada',
    tipo: 'Sessão', inicio: fmt(setTime(addDays(today, -3), 11, 0)), fim: fmt(setTime(addDays(today, -3), 12, 0)),
    status: 'Cancelado', local: 'Online', link_reuniao: '',
    notas_do_mentor: '', notas_operacionais: 'Mentorado solicitou pausa.',
    proxima_acao: 'Reagendar quando retornar', sincronizado_google: false, google_event_id: null,
    lembrete_24h_enviado: false, lembrete_3h_enviado: false, lembrete_10min_enviado: false,
    created_at: fmt(addDays(today, -5)), updated_at: fmt(addDays(today, -3)),
  },
  {
    id: 'e7', mentorado_id: 'mt2', mentor_id: 'm1', titulo: 'Follow-up Semana 2',
    tipo: 'Follow-up', inicio: fmt(setTime(addDays(today, -5), 14, 0)), fim: fmt(setTime(addDays(today, -5), 14, 30)),
    status: 'Faltou', local: 'Zoom', link_reuniao: '',
    notas_do_mentor: '', notas_operacionais: 'Mariana não apareceu. Tentar remarcar.',
    proxima_acao: 'Ligar para remarcar', sincronizado_google: false, google_event_id: null,
    lembrete_24h_enviado: true, lembrete_3h_enviado: true, lembrete_10min_enviado: false,
    created_at: fmt(addDays(today, -7)), updated_at: fmt(addDays(today, -5)),
  },
  {
    id: 'e8', mentorado_id: 'mt4', mentor_id: 'm2', titulo: 'Sessão em Grupo - Soft Skills',
    tipo: 'Sessão', inicio: fmt(setTime(addDays(today, 3), 9, 0)), fim: fmt(setTime(addDays(today, 3), 10, 30)),
    status: 'Agendado', local: 'Google Meet', link_reuniao: 'https://meet.google.com/grp-meet',
    notas_do_mentor: 'Dinâmica de comunicação assertiva.', notas_operacionais: '',
    proxima_acao: '', sincronizado_google: false, google_event_id: null,
    lembrete_24h_enviado: false, lembrete_3h_enviado: false, lembrete_10min_enviado: false,
    created_at: fmt(addDays(today, -1)), updated_at: fmt(today),
  },
];

export const historicos: Historico[] = [
  { id: 'h1', mentorado_id: 'mt1', mentor_id: 'm1', tipo: 'Observação', conteudo: 'Lucas chegou bem motivado. Definimos metas claras para o programa.', visibilidade: 'Admin', created_at: fmt(addDays(today, -28)) },
  { id: 'h2', mentorado_id: 'mt1', mentor_id: 'm1', tipo: 'Check-in', conteudo: 'Lucas completou 2 das 3 metas da semana.', visibilidade: 'Privado Mentor', created_at: fmt(addDays(today, -14)) },
  { id: 'h3', mentorado_id: 'mt2', mentor_id: 'm1', tipo: 'Mensagem', conteudo: 'Mariana pediu para remarcar a sessão de quarta.', visibilidade: 'Operação', created_at: fmt(addDays(today, -6)) },
  { id: 'h4', mentorado_id: 'mt3', mentor_id: 'm2', tipo: 'Observação', conteudo: 'Primeiro contato por anúncio. Demonstra interesse genuíno.', visibilidade: 'Admin', created_at: fmt(addDays(today, -4)) },
  { id: 'h5', mentorado_id: 'mt4', mentor_id: 'm2', tipo: 'Tarefa', conteudo: 'Preparar apresentação para dinâmica em grupo.', visibilidade: 'Admin', created_at: fmt(addDays(today, -2)) },
];
