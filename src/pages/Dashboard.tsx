import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users, CalendarDays, CalendarCheck, XCircle, AlertTriangle, Clock, Search, ChevronDown } from 'lucide-react';
import { useMentorados, useEncontros, useUpdateEncontroStatus, useDeleteEncontro, useRevertToVago } from '@/hooks/useSupabaseData';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useNavigate, useLocation } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import MeetingModal from '@/components/MeetingModal';

type TimeRange = 'dia' | 'semana' | 'mes' | '3meses' | '6meses' | '9meses' | '1ano';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: mentorados = [], isLoading: loadingM } = useMentorados();
  const { data: encontros = [], isLoading: loadingE } = useEncontros();
  const [timeRange, setTimeRange] = useState<TimeRange>('semana');
  const [selectedEncontro, setSelectedEncontro] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const updateStatus = useUpdateEncontroStatus();
  const deleteEncontro = useDeleteEncontro();
  const revertToVago = useRevertToVago();

  const loading = loadingM || loadingE;

  const now = new Date();
  const rangeFilter = useMemo(() => {
    const n = new Date();
    if (timeRange === 'dia') return { start: startOfDay(n), end: endOfDay(n) };
    if (timeRange === 'semana') return { start: startOfWeek(n, { weekStartsOn: 0 }), end: endOfWeek(n, { weekStartsOn: 0 }) };
    if (timeRange === 'mes') return { start: startOfMonth(n), end: endOfMonth(n) };
    if (timeRange === '3meses') return { start: startOfMonth(n), end: endOfDay(addMonths(n, 3)) };
    if (timeRange === '6meses') return { start: startOfMonth(n), end: endOfDay(addMonths(n, 6)) };
    if (timeRange === '9meses') return { start: startOfMonth(n), end: endOfDay(addMonths(n, 9)) };
    return { start: startOfMonth(n), end: endOfDay(addMonths(n, 12)) };
  }, [timeRange]);

  const encontrosNoRange = useMemo(() =>
    encontros.filter(e => {
      const d = new Date(e.inicio);
      return d >= rangeFilter.start && d <= rangeFilter.end;
    }),
  [encontros, rangeFilter]);

  const mentoradoMap = useMemo(() => {
    const m: Record<string, string> = {};
    mentorados.forEach(mt => { m[mt.id] = mt.nome; });
    return m;
  }, [mentorados]);

  const stats = useMemo(() => {
    const ativos = mentorados.filter(m => m.status === 'Ativo').length;
    const total = encontrosNoRange.length;
    const agendados = encontrosNoRange.filter(e => e.status === 'Agendado').length;
    const cancelados = encontrosNoRange.filter(e => e.status === 'Cancelado').length;
    const faltas = encontrosNoRange.filter(e => e.status === 'Faltou').length;
    return { ativos, total, agendados, cancelados, faltas };
  }, [mentorados, encontrosNoRange]);

  const proximos = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    return encontrosNoRange
      .filter(e => {
        if (e.titulo === 'VAGO') return false;
        if (e.status !== 'Agendado') return false;
        // Show all of today's events (even past ones), plus future ones
        const d = new Date(e.inicio);
        if (d < todayStart) return false;
        if (q && !e.titulo.toLowerCase().includes(q) && !(mentoradoMap[e.mentorado_id] || '').toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  }, [encontrosNoRange, searchQuery, mentoradoMap]);

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

  const rangeLabelMap: Record<TimeRange, string> = {
    dia: 'Hoje', semana: 'Esta Semana', mes: 'Este Mês',
    '3meses': '3 Meses', '6meses': '6 Meses', '9meses': '9 Meses', '1ano': '1 Ano',
  };
  const rangeLabel = rangeLabelMap[timeRange];

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
          <div className="flex items-center rounded-lg border bg-secondary/30 p-0.5">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                    ['3meses', '6meses', '9meses', '1ano'].includes(timeRange)
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {['3meses', '6meses', '9meses', '1ano'].includes(timeRange) ? rangeLabelMap[timeRange] : 'Mais'}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {([['3meses', '3 Meses'], ['6meses', '6 Meses'], ['9meses', '9 Meses'], ['1ano', '1 Ano']] as [TimeRange, string][]).map(([value, label]) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => setTimeRange(value)}
                    className={timeRange === value ? 'bg-accent font-medium' : ''}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título ou mentorado..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
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
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {(() => {
                const q = searchQuery.toLowerCase();
                const mentoradoIds = new Set(mentorados.map(m => m.id));
                const proximosMentorados = encontrosNoRange
                  .filter(e => {
                    if (e.titulo === 'VAGO') return false;
                    if (e.status !== 'Agendado') return false;
                    if (!mentoradoIds.has(e.mentorado_id) || !mentoradoMap[e.mentorado_id]) return false;
                    if (q && !e.titulo.toLowerCase().includes(q) && !(mentoradoMap[e.mentorado_id] || '').toLowerCase().includes(q)) return false;
                    return true;
                  })
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
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {proximos.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhum encontro agendado.</p>}
              {proximos.map((e) => {
                const isPast = new Date(e.fim) < new Date();
                return (
                <div
                  key={e.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${isPast ? 'bg-muted/40 opacity-50' : 'bg-secondary/20 hover:bg-secondary/40'}`}
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
                );
              })}
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
          mentorado={mentorados.find(m => m.id === selectedEncontro.mentorado_id) as any}
          onStatusChange={(id, status) => { updateStatus.mutate({ id, status }); setSelectedEncontro(null); }}
          onDelete={(e) => { deleteEncontro.mutate({ id: e.id, google_event_id: e.google_event_id }); setSelectedEncontro(null); }}
          onRevertToVago={(e) => { revertToVago.mutate({ id: e.id, mentor_id: e.mentor_id, google_event_id: e.google_event_id }); setSelectedEncontro(null); }}
        />
      )}
    </div>
  );
}
