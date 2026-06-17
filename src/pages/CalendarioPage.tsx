import { useState } from 'react';
import { useEncontros, useMentorados, useMentores, useUpdateEncontroStatus, useDeleteEncontro, useRevertToVago } from '@/hooks/useSupabaseData';
import CalendarView from '@/components/CalendarView';
import MeetingModal from '@/components/MeetingModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CalendarioPage() {
  const [selectedEncontro, setSelectedEncontro] = useState<any>(null);
  const [mentorFilter, setMentorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: encontros = [], isLoading } = useEncontros();
  const { data: mentorados = [] } = useMentorados();
  const { data: mentores = [] } = useMentores();
  const updateStatus = useUpdateEncontroStatus();
  const deleteEncontro = useDeleteEncontro();
  const revertToVago = useRevertToVago();

  const filtered = encontros.filter(e => {
    const matchMentor = mentorFilter === 'all' || e.mentor_id === mentorFilter;
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchMentor && matchStatus;
  });

  if (isLoading) return null;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="space-y-3">
        <div>
          <h1 className="page-title">Calendário</h1>
          <p className="page-subtitle">Visualização dos encontros</p>
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

      <CalendarView encontros={filtered as any} mentores={mentores as any} onEventClick={setSelectedEncontro} />

      <MeetingModal
        encontro={selectedEncontro}
        mentorado={selectedEncontro ? mentorados.find(m => m.id === selectedEncontro.mentorado_id) as any : undefined}
        mentor={selectedEncontro ? mentores.find(m => m.id === selectedEncontro.mentor_id) as any : undefined}
        open={!!selectedEncontro}
        onOpenChange={(o) => !o && setSelectedEncontro(null)}
        onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
        onDelete={(e) => { deleteEncontro.mutate({ id: e.id }); setSelectedEncontro(null); }}
        onRevertToVago={(e) => { revertToVago.mutate({ id: e.id, mentor_id: e.mentor_id }); setSelectedEncontro(null); }}
      />
    </div>
  );
}
