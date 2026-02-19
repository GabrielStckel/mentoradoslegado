import { useMemo } from 'react';
import { format, isToday, isThisWeek, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users, CalendarDays, CalendarCheck, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { encontros, mentorados, mentores } from '@/data/mock';
import { StatusBadge, TipoBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const ativos = mentorados.filter(m => m.status === 'Ativo').length;
    const hoje = encontros.filter(e => isToday(new Date(e.inicio))).length;
    const semana = encontros.filter(e => isThisWeek(new Date(e.inicio), { weekStartsOn: 0 })).length;
    const cancelados = encontros.filter(e => e.status === 'Cancelado').length;
    const faltas = encontros.filter(e => e.status === 'Faltou').length;
    return { ativos, hoje, semana, cancelados, faltas };
  }, []);

  const proximos = useMemo(() =>
    encontros
      .filter(e => new Date(e.inicio) >= new Date() && e.status === 'Agendado')
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
      .slice(0, 6),
  []);

  const mentorMap = useMemo(() => {
    const m: Record<string, string> = {};
    mentores.forEach(mt => { m[mt.id] = mt.nome; });
    return m;
  }, []);

  const mentoradoMap = useMemo(() => {
    const m: Record<string, string> = {};
    mentorados.forEach(mt => { m[mt.id] = mt.nome; });
    return m;
  }, []);

  const statCards = [
    { label: 'Mentorados Ativos', value: stats.ativos, icon: Users, color: 'text-primary' },
    { label: 'Encontros Hoje', value: stats.hoje, icon: CalendarDays, color: 'text-info' },
    { label: 'Encontros Semana', value: stats.semana, icon: CalendarCheck, color: 'text-success' },
    { label: 'Cancelados', value: stats.cancelados, icon: XCircle, color: 'text-destructive' },
    { label: 'Faltas', value: stats.faltas, icon: AlertTriangle, color: 'text-warning' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Visão geral das mentorias</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Próximos encontros */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Próximos Encontros
            </CardTitle>
            <button onClick={() => navigate('/encontros')} className="text-xs text-primary hover:underline font-medium">
              Ver todos →
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {proximos.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhum encontro agendado.</p>}
            {proximos.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer"
                onClick={() => navigate('/encontros')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-center flex-shrink-0 w-12">
                    <p className="text-xs text-muted-foreground">{format(new Date(e.inicio), 'dd/MM')}</p>
                    <p className="text-sm font-semibold">{format(new Date(e.inicio), 'HH:mm')}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{e.titulo}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {mentoradoMap[e.mentorado_id]} • {mentorMap[e.mentor_id]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <TipoBadge tipo={e.tipo} />
                  <StatusBadge status={e.status} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
