import { EncontroStatus, MentoradoStatus, MentorStatus, EncontroTipo, MentoradoTag } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  Agendado: 'bg-info/10 text-info border-info/20',
  Realizado: 'bg-success/10 text-success border-success/20',
  Cancelado: 'bg-destructive/10 text-destructive border-destructive/20',
  Reagendado: 'bg-warning/10 text-warning border-warning/20',
  Faltou: 'bg-destructive/10 text-destructive border-destructive/20',
  Ativo: 'bg-success/10 text-success border-success/20',
  Inativo: 'bg-muted text-muted-foreground border-border',
  Novo: 'bg-info/10 text-info border-info/20',
  Pausado: 'bg-warning/10 text-warning border-warning/20',
  Finalizado: 'bg-muted text-muted-foreground border-border',
};

const tagColors: Record<string, string> = {
  'Alta prioridade': 'bg-destructive/10 text-destructive border-destructive/20',
  'VIP': 'bg-warning/10 text-warning border-warning/20',
  'Grupo': 'bg-accent text-accent-foreground border-primary/20',
  'Individual': 'bg-secondary text-secondary-foreground border-border',
};

const tipoColors: Record<string, string> = {
  'Sessão': 'bg-primary/10 text-primary border-primary/20',
  'Follow-up': 'bg-info/10 text-info border-info/20',
  'Avaliação': 'bg-warning/10 text-warning border-warning/20',
  'Outro': 'bg-muted text-muted-foreground border-border',
};

export function StatusBadge({ status }: { status: EncontroStatus | MentoradoStatus | MentorStatus }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', statusColors[status] || 'bg-muted text-muted-foreground')}>
      {status}
    </Badge>
  );
}

export function TagBadge({ tag }: { tag: MentoradoTag }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', tagColors[tag] || 'bg-muted text-muted-foreground')}>
      {tag}
    </Badge>
  );
}

export function TipoBadge({ tipo }: { tipo: EncontroTipo }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', tipoColors[tipo] || 'bg-muted text-muted-foreground')}>
      {tipo}
    </Badge>
  );
}
