import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, Search } from 'lucide-react';
import { useMentorados, useMentores, useEncontros, useUpdateEncontroStatus } from '@/hooks/useSupabaseData';
import { StatusBadge, TipoBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import MeetingModal from '@/components/MeetingModal';

export default function EncontrosPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mentorFilter, setMentorFilter] = useState('all');
  const [selectedEncontro, setSelectedEncontro] = useState<any>(null);

  const { data: encontros = [], isLoading } = useEncontros();
  const { data: mentorados = [] } = useMentorados();
  const { data: mentores = [] } = useMentores();
  const updateStatus = useUpdateEncontroStatus();

  const mentorMap = useMemo(() => { const m: Record<string, string> = {}; mentores.forEach(mt => { m[mt.id] = mt.nome; }); return m; }, [mentores]);
  const mentoradoMap = useMemo(() => { const m: Record<string, string> = {}; mentorados.forEach(mt => { m[mt.id] = mt.nome; }); return m; }, [mentorados]);

  const filtered = useMemo(() => {
    return encontros.filter(e => {
      const matchSearch = !search || e.titulo.toLowerCase().includes(search.toLowerCase()) ||
        mentoradoMap[e.mentorado_id]?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      const matchMentor = mentorFilter === 'all' || e.mentor_id === mentorFilter;
      return matchSearch && matchStatus && matchMentor;
    }).sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());
  }, [search, statusFilter, mentorFilter, encontros, mentoradoMap]);

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Encontros</h1>
          <p className="page-subtitle">{encontros.length} encontros registrados</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Novo Encontro</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por título ou mentorado..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Agendado">Agendado</SelectItem>
            <SelectItem value="Realizado">Realizado</SelectItem>
            <SelectItem value="Cancelado">Cancelado</SelectItem>
            <SelectItem value="Faltou">Faltou</SelectItem>
            <SelectItem value="Reagendado">Reagendado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={mentorFilter} onValueChange={setMentorFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Mentor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os mentores</SelectItem>
            {mentores.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30 hover:bg-secondary/30">
              <TableHead className="table-header">Data/Hora</TableHead>
              <TableHead className="table-header">Título</TableHead>
              <TableHead className="table-header">Mentorado</TableHead>
              <TableHead className="table-header">Mentor</TableHead>
              <TableHead className="table-header">Tipo</TableHead>
              <TableHead className="table-header">Local</TableHead>
              <TableHead className="table-header">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(e => (
              <TableRow key={e.id} className="cursor-pointer hover:bg-secondary/20" onClick={() => setSelectedEncontro(e)}>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">{format(new Date(e.inicio), 'dd/MM/yyyy')}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(e.inicio), 'HH:mm')} — {format(new Date(e.fim), 'HH:mm')}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm font-medium">{e.titulo}</TableCell>
                <TableCell className="text-sm">{mentoradoMap[e.mentorado_id]}</TableCell>
                <TableCell className="text-sm">{mentorMap[e.mentor_id]}</TableCell>
                <TableCell><TipoBadge tipo={e.tipo as any} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.local}</TableCell>
                <TableCell><StatusBadge status={e.status as any} /></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum encontro encontrado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <MeetingModal
        encontro={selectedEncontro}
        mentorado={selectedEncontro ? mentorados.find(m => m.id === selectedEncontro.mentorado_id) as any : undefined}
        mentor={selectedEncontro ? mentores.find(m => m.id === selectedEncontro.mentor_id) as any : undefined}
        open={!!selectedEncontro}
        onOpenChange={(o) => !o && setSelectedEncontro(null)}
        onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
      />
    </div>
  );
}
