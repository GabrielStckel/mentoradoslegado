import { useState } from 'react';
import { useEncontros, useMentorados, useMentores } from '@/hooks/useSupabaseData';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import CalendarView from '@/components/CalendarView';
import MeetingModal from '@/components/MeetingModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Link2, Download } from 'lucide-react';

export default function CalendarioPage() {
  const [selectedEncontro, setSelectedEncontro] = useState<any>(null);
  const [mentorFilter, setMentorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [connecting, setConnecting] = useState(false);
  const queryClient = useQueryClient();

  const { data: encontros = [], isLoading } = useEncontros();
  const { data: mentorados = [] } = useMentorados();
  const { data: mentores = [] } = useMentores();
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
    setImporting(true);
    try {
      const result = await importEvents();
      queryClient.invalidateQueries({ queryKey: ['encontros'] });
      toast({ title: 'Importação concluída', description: `${result?.imported || 0} novos eventos importados de ${result?.total || 0} encontrados.` });
    } catch (err: any) {
      toast({ title: 'Erro na importação', description: err?.message || 'Falha ao importar eventos.', variant: 'destructive' });
    }
    setImporting(false);
  };

  if (isLoading) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Calendário</h1>
          <p className="page-subtitle">Visualização dos encontros</p>
        </div>
        <div className="flex gap-2 items-center">
          {!gcLoading && (
            connected ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-sm text-success px-3 py-1.5 rounded-md bg-success/10">
                  <CheckCircle className="h-4 w-4" />
                  Google Calendar conectado
                </div>
                <Button variant="outline" size="sm" onClick={handleImport} disabled={importing}>
                  <Download className="h-4 w-4 mr-1.5" />
                  {importing ? 'Importando...' : 'Importar eventos'}
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={handleConnect} disabled={connecting}>
                <Link2 className="h-4 w-4 mr-1.5" />
                {connecting ? 'Conectando...' : 'Conectar Google Calendar'}
              </Button>
            )
          )}
          <Select value={mentorFilter} onValueChange={setMentorFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Mentor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os mentores</SelectItem>
              {mentores.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Agendado">Agendado</SelectItem>
              <SelectItem value="Realizado">Realizado</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <CalendarView encontros={filtered as any} mentores={mentores as any} onEventClick={setSelectedEncontro} />

      <MeetingModal
        encontro={selectedEncontro}
        mentorado={selectedEncontro ? mentorados.find(m => m.id === selectedEncontro.mentorado_id) as any : undefined}
        mentor={selectedEncontro ? mentores.find(m => m.id === selectedEncontro.mentor_id) as any : undefined}
        open={!!selectedEncontro}
        onOpenChange={(o) => !o && setSelectedEncontro(null)}
      />
    </div>
  );
}
