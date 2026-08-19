import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TZ = 'America/Sao_Paulo';

export type AtividadeLog = {
  id: string;
  entidade: string;
  entidade_id: string;
  mentorado_id: string | null;
  mentorado_nome: string | null;
  mentor_id: string | null;
  mentor_nome: string | null;
  acao: string;
  campo: string | null;
  valor_antigo: string | null;
  valor_novo: string | null;
  descricao: string;
  changed_by: string | null;
  changed_by_nome: string | null;
  changed_at: string;
};

const FIELD_LABELS: Record<string, string> = {
  titulo: 'Título',
  tipo: 'Tipo',
  inicio: 'Início',
  fim: 'Fim',
  status: 'Status',
  local: 'Local',
  link_reuniao: 'Link da reunião',
  notas_do_mentor: 'Notas do mentor',
  notas_operacionais: 'Notas operacionais',
  proxima_acao: 'Próxima ação',
  nome: 'Nome',
  email: 'E-mail',
  telefone_whatsapp: 'WhatsApp',
  cidade: 'Cidade',
  origem: 'Origem',
  observacoes_gerais: 'Observações gerais',
  encontros_realizados: 'Encontros realizados',
  total_encontros: 'Encontros contratados',
  mentor_id: 'Mentor responsável',
  mentorado_id: 'Mentorado',
  motivo_exclusao: 'Motivo da exclusão',
};

export function fmtHora(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function fmtValor(campo: string | null, valor: string | null) {
  if (valor === null || valor === '') return 'vazio';
  if (campo === 'inicio' || campo === 'fim') {
    try {
      return new Date(valor).toLocaleString('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return valor;
    }
  }
  return valor;
}

function AcaoIcon({ acao }: { acao: string }) {
  if (acao === 'INSERT') return <Plus className="h-3.5 w-3.5 text-emerald-600" />;
  if (acao === 'DELETE') return <Trash2 className="h-3.5 w-3.5 text-red-600" />;
  return <Pencil className="h-3.5 w-3.5 text-blue-600" />;
}

export default function TimelineAtividade({ log }: { log: AtividadeLog }) {
  const isDelete = log.acao === 'DELETE';
  const temDiff = !!log.campo && (log.valor_antigo !== null || log.valor_novo !== null);

  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-1.5',
        isDelete ? 'border-red-500/40 bg-red-500/5' : 'bg-card'
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <AcaoIcon acao={log.acao} />
        <span className="text-xs text-muted-foreground">{fmtHora(log.changed_at)}</span>
        {log.mentorado_nome && (
          <Badge variant="secondary" className="text-[10px]">{log.mentorado_nome}</Badge>
        )}
      </div>

      <p className="text-sm text-foreground">{log.descricao}</p>

      {temDiff && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-muted-foreground">{FIELD_LABELS[log.campo!] || log.campo}:</span>
          <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-700 dark:text-red-300">
            {fmtValor(log.campo, log.valor_antigo)}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            {fmtValor(log.campo, log.valor_novo)}
          </span>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">por {log.changed_by_nome || 'Sistema'}</p>
    </div>
  );
}
