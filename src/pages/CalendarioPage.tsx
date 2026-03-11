import { useState } from 'react';
import { useEncontros, useMentorados, useMentores, useUpdateEncontroStatus, useDeleteEncontro, useRevertToVago } from '@/hooks/useSupabaseData';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import CalendarView from '@/components/CalendarView';
import MeetingModal from '@/components/MeetingModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Link2, Download } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function CalendarioPage() {
  const [selectedEncontro, setSelectedEncontro] = useState<any>(null);
  const [mentorFilter, setMentorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [connecting, setConnecting] = useState(false);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const { data: encontros = [], isLoading } = useEncontros();
  const { data: mentorados = [] } = useMentorados();
  const { data: mentores = [] } = useMentores();
  const updateStatus = useUpdateEncontroStatus();
  const deleteEncontro = useDeleteEncontro();
  const revertToVago = useRevertToVago();
  const { connected, loading: gcLoading, connect, importEvents, importProgress, importing } = useGoogleCalendar();

  const filtered = encontros.filter(e => {
    const matchMentor = mentorFilter === 'all' || e.mentor_id === mentorFilter;
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchMentor && matchStatus;
  });

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connect();
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível iniciar a conexão com o Google Calendar.', variant: 'destructive' });
    }
    setConnecting(false);
  };

  const handleImport = async () => {
    try {
      const result = await importEvents();
      queryClient.invalidateQueries({ queryKey: ['encontros'] });
      toast({
        title: 'Importação concluída',
        description: `${result?.imported || 0} novos, ${result?.updated || 0} atualizados e ${result?.deleted || 0} removidos.`,
      });
    } catch (err: any) {
      toast({ title: 'Erro na importação', description: err?.message || 'Falha ao importar eventos.', variant: 'destructive' });
    }
  };

  if (isLoading) return null;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Calendário</h1>
            <p className="page-subtitle">Visualização dos encontros</p>
          </div>

          {/* Google Calendar controls - right side */}
          <div className="flex items-center gap-2">
            {gcLoading ? (
              <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
            ) : connected ? (
              <>
                <div className="flex items-center gap-1.5 text-xs text-success px-2.5 py-1.5 rounded-md bg-success/10">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span className={isMobile ? 'sr-only' : ''}>Google Calendar conectado</span>
                  {isMobile && <span>Conectado</span>}
                </div>
                <Button variant="outline" size="sm" onClick={handleImport} disabled={importing} className="text-xs">
                  <Download className="h-3.5 w-3.5 mr-1" />
                  {importing ? 'Importando...' : 'Importar'}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={handleConnect} disabled={connecting} className="text-xs">
                <Link2 className="h-3.5 w-3.5 mr-1" />
                {connecting ? 'Conectando...' : 'Conectar Google'}
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={mentorFilter} onValueChange={setMentorFilter}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Mentor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os mentores</SelectItem>
              {mentores.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Agendado">Agendado</SelectItem>
              <SelectItem value="Realizado">Realizado</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {(importing || importProgress.done || importProgress.error) && (
        <div className="rounded-lg border bg-card p-3 md:p-4 space-y-2">
          <div className="flex items-center justify-between text-xs md:text-sm">
            <span className="text-muted-foreground truncate">{importProgress.message || 'Sincronização'}</span>
            <span className="font-medium ml-2">{Math.round(importProgress.percent)}%</span>
          </div>
          <Progress value={importProgress.percent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {importProgress.processed} proc. · {importProgress.imported} novos · {importProgress.updated} atualiz. · {importProgress.deleted} remov.
          </p>
          {importProgress.error && (
            <p className="text-xs text-destructive">{importProgress.error}</p>
          )}
        </div>
      )}

      <CalendarView encontros={filtered as any} mentores={mentores as any} onEventClick={setSelectedEncontro} />

      <MeetingModal
        encontro={selectedEncontro}
        mentorado={selectedEncontro ? mentorados.find(m => m.id === selectedEncontro.mentorado_id) as any : undefined}
        mentor={selectedEncontro ? mentores.find(m => m.id === selectedEncontro.mentor_id) as any : undefined}
        open={!!selectedEncontro}
        onOpenChange={(o) => !o && setSelectedEncontro(null)}
        onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
        onDelete={(e) => { deleteEncontro.mutate({ id: e.id, google_event_id: e.google_event_id }); setSelectedEncontro(null); }}
        onRevertToVago={(e) => { revertToVago.mutate({ id: e.id, mentor_id: e.mentor_id, google_event_id: e.google_event_id }); setSelectedEncontro(null); }}
      />
    </div>
  );
}
