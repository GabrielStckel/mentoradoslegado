import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users, CalendarDays, CalendarCheck, XCircle, AlertTriangle, Clock, Plus, Eye, Target, TrendingUp, Search } from 'lucide-react';
import { useMentorados, useEncontros, useUpdateEncontroStatus, useDeleteEncontro } from '@/hooks/useSupabaseData';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useNavigate, useLocation } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import NovoEncontroModal from '@/components/NovoEncontroModal';
import MeetingModal from '@/components/MeetingModal';

type TimeRange = 'dia' | 'semana' | 'mes';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: mentorados = [], isLoading: loadingM } = useMentorados();
  const { data: encontros = [], isLoading: loadingE } = useEncontros();
  const [showNovo, setShowNovo] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('semana');
  const [selectedEncontro, setSelectedEncontro] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const updateStatus = useUpdateEncontroStatus();
  const deleteEncontro = useDeleteEncontro();

  const loading = loadingM || loadingE;

  const now = new Date();
  const rangeFilter = useMemo(() => {
    if (timeRange === 'dia') return { start: startOfDay(now), end: endOfDay(now) };
    if (timeRange === 'semana') return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }, [timeRange]);

  const encontrosNoRange = useMemo(() =>
    encontros.filter(e => {
      const d = new Date(e.inicio);
      return d >= rangeFilter.start && d <= rangeFilter.end;
    }),
  [encontros, rangeFilter]);

  const stats = useMemo(() => {
    const ativos = mentorados.filter(m => m.status === 'Ativo').length;
    const total = encontrosNoRange.length;
    const agendados = encontrosNoRange.filter(e => e.status === 'Agendado').length;
    const cancelados = encontrosNoRange.filter(e => e.status === 'Cancelado').length;
    const faltas = encontrosNoRange.filter(e => e.status === 'Faltou').length;
    return { ativos, total, agendados, cancelados, faltas };
  }, [mentorados, encontrosNoRange]);

  const proximos = useMemo(() =>
    encontrosNoRange
      .filter(e => new Date(e.inicio) >= new Date() && e.status === 'Agendado')
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()),
  [encontrosNoRange]);

  const mentoradoMap = useMemo(() => {
    const m: Record<string, string> = {};
    mentorados.forEach(mt => { m[mt.id] = mt.nome; });
    return m;
  }, [mentorados]);

  const encontrosCount = useMemo(() => {
    const map: Record<string, number> = {};
    encontros.forEach(e => {
      if (e.status === 'Realizado') {
        map[e.mentorado_id] = (map[e.mentorado_id] || 0) + 1;
      }
    });
    return map;
  }, [encontros]);

  const mentoradosAtivos = useMemo(() =>
    mentorados
      .filter(m => m.status === 'Ativo' || m.status === 'Novo')
      .sort((a, b) => {
        const progA = a.total_encontros > 0 ? (encontrosCount[a.id] || 0) / a.total_encontros : 0;
        const progB = b.total_encontros > 0 ? (encontrosCount[b.id] || 0) / b.total_encontros : 0;
        return progB - progA;
      }),
  [mentorados, encontrosCount]);

  const mentoradosComEncontros = useMemo(() => {
    const ids = new Set(encontrosNoRange.map(e => e.mentorado_id));
    return ids.size;
  }, [encontrosNoRange]);

  const rangeLabel = timeRange === 'dia' ? 'Hoje' : timeRange === 'semana' ? 'Esta Semana' : 'Este Mês';

  const statCards = [
    { label: 'Mentorados Ativos', value: stats.ativos, icon: Users, color: 'text-primary' },
    { label: `Encontros (${rangeLabel})`, value: stats.total, icon: CalendarDays, color: 'text-info' },
    { label: 'Agendados', value: stats.agendados, icon: CalendarCheck, color: 'text-success' },
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral das mentorias</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-secondary/30 p-0.5">
            {(['dia', 'semana', 'mes'] as TimeRange[]).map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  timeRange === r ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r === 'dia' ? 'Dia' : r === 'semana' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
          <Button onClick={() => setShowNovo(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Encontro
          </Button>
        </div>
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

      {/* Two columns: Mentorados (left) + Próximos Encontros (right) */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Próximos Encontros de Mentorados - LEFT */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Próximos Encontros de Mentorados
              </CardTitle>
              <button onClick={() => navigate('/mentorados')} className="text-xs text-primary hover:underline font-medium">
                Ver mentorados →
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {(() => {
                const mentoradoIds = new Set(mentorados.map(m => m.id));
                const proximosMentorados = encontrosNoRange
                  .filter(e => e.status === 'Agendado' && mentoradoIds.has(e.mentorado_id) && mentoradoMap[e.mentorado_id])
                  .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
                  .reduce((acc, e) => {
                    if (!acc.find(x => x.mentorado_id === e.mentorado_id)) acc.push(e);
                    return acc;
                  }, [] as typeof encontros);

                if (proximosMentorados.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">Nenhum encontro agendado para mentorados.</p>;

                return proximosMentorados.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer"
                    onClick={() => setSelectedEncontro(e)}
                  >
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                        {(mentoradoMap[e.mentorado_id] || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs md:text-sm font-medium truncate">{mentoradoMap[e.mentorado_id]}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] md:text-xs text-muted-foreground">
                            📅 {format(new Date(e.inicio), "dd/MM 'às' HH:mm")}
                          </span>
                          <span className="text-[10px] md:text-xs text-muted-foreground truncate">· {e.titulo}</span>
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={e.status as any} />
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Próximos Encontros - RIGHT */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Próximos Encontros (Geral)
              </CardTitle>
              <button onClick={() => navigate('/encontros')} className="text-xs text-primary hover:underline font-medium">
                Ver todos →
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {proximos.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhum encontro agendado.</p>}
              {proximos.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedEncontro(e)}
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

      <NovoEncontroModal open={showNovo} onOpenChange={setShowNovo} />
      {selectedEncontro && (
        <MeetingModal
          open={!!selectedEncontro}
          onOpenChange={(open) => { if (!open) setSelectedEncontro(null); }}
          encontro={selectedEncontro}
        />
      )}
    </div>
  );
}
