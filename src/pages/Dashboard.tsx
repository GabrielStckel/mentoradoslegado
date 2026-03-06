import { useState, useMemo } from 'react';
import { format, isToday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users, CalendarDays, CalendarCheck, XCircle, AlertTriangle, Clock, Plus } from 'lucide-react';
import { useMentorados, useEncontros } from '@/hooks/useSupabaseData';
import { StatusBadge, TipoBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import NovoEncontroModal from '@/components/NovoEncontroModal';
import PinModal, { usePinGate } from '@/components/PinModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: mentorados = [], isLoading: loadingM } = useMentorados();
  const { data: encontros = [], isLoading: loadingE } = useEncontros();
  

  const loading = loadingM || loadingE;

  const stats = useMemo(() => {
    const ativos = mentorados.filter(m => m.status === 'Ativo').length;
    const hoje = encontros.filter(e => isToday(new Date(e.inicio))).length;
    const semana = encontros.filter(e => isThisWeek(new Date(e.inicio), { weekStartsOn: 0 })).length;
    const cancelados = encontros.filter(e => e.status === 'Cancelado').length;
    const faltas = encontros.filter(e => e.status === 'Faltou').length;
    return { ativos, hoje, semana, cancelados, faltas };
  }, [mentorados, encontros]);

  const proximos = useMemo(() =>
    encontros
      .filter(e => new Date(e.inicio) >= new Date() && e.status === 'Agendado')
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
      .slice(0, 6),
  [encontros]);


  const mentoradoMap = useMemo(() => {
    const m: Record<string, string> = {};
    mentorados.forEach(mt => { m[mt.id] = mt.nome; });
    return m;
  }, [mentorados]);

  const statCards = [
    { label: 'Mentorados Ativos', value: stats.ativos, icon: Users, color: 'text-primary' },
    { label: 'Encontros Hoje', value: stats.hoje, icon: CalendarDays, color: 'text-info' },
    { label: 'Encontros Semana', value: stats.semana, icon: CalendarCheck, color: 'text-success' },
    { label: 'Cancelados', value: stats.cancelados, icon: XCircle, color: 'text-destructive' },
    { label: 'Faltas', value: stats.faltas, icon: AlertTriangle, color: 'text-warning' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="page-title">Dashboard</h1><p className="page-subtitle">Visão geral das mentorias</p></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Visão geral das mentorias</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card p-3 md:p-5">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <s.icon className={`h-4 w-4 md:h-5 md:w-5 ${s.color}`} />
            </div>
            <p className="text-xl md:text-2xl font-bold">{s.value}</p>
            <p className="text-[11px] md:text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

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
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <div className="text-center flex-shrink-0 w-10 md:w-12">
                    <p className="text-[10px] md:text-xs text-muted-foreground">{format(new Date(e.inicio), 'dd/MM')}</p>
                    <p className="text-xs md:text-sm font-semibold">{format(new Date(e.inicio), 'HH:mm')}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-medium truncate">{e.titulo}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                      {mentoradoMap[e.mentorado_id]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                  <StatusBadge status={e.status as any} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
