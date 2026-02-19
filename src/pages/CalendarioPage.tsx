import { useState } from 'react';
import { encontros, mentorados, mentores } from '@/data/mock';
import CalendarView from '@/components/CalendarView';
import MeetingModal from '@/components/MeetingModal';
import { Encontro } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CalendarioPage() {
  const [selectedEncontro, setSelectedEncontro] = useState<Encontro | null>(null);
  const [mentorFilter, setMentorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = encontros.filter(e => {
    const matchMentor = mentorFilter === 'all' || e.mentor_id === mentorFilter;
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchMentor && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Calendário</h1>
          <p className="page-subtitle">Visualização dos encontros</p>
        </div>
        <div className="flex gap-2">
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

      <CalendarView encontros={filtered} mentores={mentores} onEventClick={setSelectedEncontro} />

      <MeetingModal
        encontro={selectedEncontro}
        mentorado={selectedEncontro ? mentorados.find(m => m.id === selectedEncontro.mentorado_id) : undefined}
        mentor={selectedEncontro ? mentores.find(m => m.id === selectedEncontro.mentor_id) : undefined}
        open={!!selectedEncontro}
        onOpenChange={(o) => !o && setSelectedEncontro(null)}
      />
    </div>
  );
}
