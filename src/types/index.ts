export type UserRole = 'admin' | 'mentor' | 'operacao';

export type MentorStatus = 'Ativo' | 'Inativo';
export type MentoradoStatus = 'Novo' | 'Ativo' | 'Pausado' | 'Finalizado';
export type MentoradoOrigem = 'Instagram' | 'Indicação' | 'Anúncio' | 'Outro';
export type EncontroStatus = 'Agendado' | 'Realizado' | 'Cancelado' | 'Reagendado' | 'Faltou';
export type EncontroTipo = 'Sessão' | 'Follow-up' | 'Avaliação' | 'Outro';
export type EncontroLocal = 'Online' | 'Presencial' | 'Google Meet' | 'Zoom' | 'Outro';
export type MentoradoTag = 'Alta prioridade' | 'VIP' | 'Grupo' | 'Individual';
export type HistoricoTipo = 'Mensagem' | 'Observação' | 'Tarefa' | 'Check-in';
export type Visibilidade = 'Privado Mentor' | 'Admin' | 'Operação';

export interface Mentor {
  id: string;
  nome: string;
  email: string;
  telefone_whatsapp: string;
  especialidade: string;
  status: MentorStatus;
  carga_max_por_dia: number;
  cor_calendario: string;
  google_calendar_connected: boolean;
  google_calendar_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Mentorado {
  id: string;
  nome: string;
  telefone_whatsapp: string;
  email: string;
  cidade: string;
  origem: MentoradoOrigem;
  mentor_id: string;
  status: MentoradoStatus;
  data_inicio: string;
  observacoes_gerais: string;
  tags: MentoradoTag[];
  created_at: string;
  updated_at: string;
}

export interface Encontro {
  id: string;
  mentorado_id: string;
  mentor_id: string;
  titulo: string;
  tipo: EncontroTipo;
  inicio: string;
  fim: string;
  status: EncontroStatus;
  local: EncontroLocal;
  link_reuniao: string;
  notas_do_mentor: string;
  notas_operacionais: string;
  proxima_acao: string;
  sincronizado_google: boolean;
  google_event_id: string | null;
  lembrete_24h_enviado: boolean;
  lembrete_3h_enviado: boolean;
  lembrete_10min_enviado: boolean;
  created_at: string;
  updated_at: string;
}

export interface Historico {
  id: string;
  mentorado_id: string;
  mentor_id: string;
  tipo: HistoricoTipo;
  conteudo: string;
  visibilidade: Visibilidade;
  created_at: string;
}

export interface CurrentUser {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  mentor_id?: string;
}
