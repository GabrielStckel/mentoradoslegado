import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, Search, UserCheck } from 'lucide-react';
import { useMentorados, useEncontros, useUpdateEncontroStatus } from '@/hooks/useSupabaseData';
import { StatusBadge, TipoBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import MeetingModal from '@/components/MeetingModal';
import NovoEncontroModal from '@/components/NovoEncontroModal';
import QuickSessionModal from '@/components/QuickSessionModal';

export default function EncontrosPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEncontro, setSelectedEncontro] = useState<any>(null);
  const [showNovo, setShowNovo] = useState(false);

  // Quick register
  const [mentoradoSearch, setMentoradoSearch] = useState('');
  const [selectedMentorado, setSelectedMentorado] = useState<any>(null);

  const { data: encontros = [], isLoading } = useEncontros();
  const { data: mentorados = [] } = useMentorados();
  const updateStatus = useUpdateEncontroStatus();
  const mentoradoMap = useMemo(() => { const m: Record<string, string> = {}; mentorados.forEach(mt => { m[mt.id] = mt.nome; }); return m; }, [mentorados]);

  const filteredMentorados = useMemo(() => {
    if (!mentoradoSearch.trim()) return mentorados;
    const q = mentoradoSearch.toLowerCase();
    return mentorados.filter(m =>
      m.nome.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [mentoradoSearch, mentorados]);

  const filtered = useMemo(() => {
    return encontros.filter(e => {
      const matchSearch = !search || e.titulo.toLowerCase().includes(search.toLowerCase()) ||
        mentoradoMap[e.mentorado_id]?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchSearch && matchStatus;
    }).sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());
  }, [search, statusFilter, encontros, mentoradoMap]);

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Encontros</h1>
          <p className="page-subtitle">{encontros.length} encontros registrados</p>
        </div>
        <Button onClick={() => setShowNovo(true)}><Plus className="h-4 w-4 mr-2" /> Novo Encontro</Button>
      </div>
      <NovoEncontroModal open={showNovo} onOpenChange={setShowNovo} />

      {/* Quick register section */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <UserCheck className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">Registro Rápido de Encontro</h2>
        </div>
        <p className="text-xs text-muted-foreground">Busque o mentorado e clique no nome para registrar a sessão com observação e PIN.</p>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar mentorado pelo nome..."
            value={mentoradoSearch}
            onChange={e => setMentoradoSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {mentoradoSearch.trim() && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {filteredMentorados.map(m => (
              <button
                key={m.id}
                onClick={() => { setSelectedMentorado(m); setMentoradoSearch(''); }}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/40 transition-colors text-left"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                  {m.nome.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email || m.cidade || 'Sem info'}</p>
                </div>
              </button>
            ))}
            {filteredMentorados.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full py-2">Nenhum mentorado encontrado.</p>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
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
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30 hover:bg-secondary/30">
              <TableHead className="table-header">Data/Hora</TableHead>
              <TableHead className="table-header">Título</TableHead>
              <TableHead className="table-header">Mentorado</TableHead>
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
                <TableCell><TipoBadge tipo={e.tipo as any} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.local}</TableCell>
                <TableCell><StatusBadge status={e.status as any} /></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum encontro encontrado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <MeetingModal
        encontro={selectedEncontro}
        mentorado={selectedEncontro ? mentorados.find(m => m.id === selectedEncontro.mentorado_id) as any : undefined}
        open={!!selectedEncontro}
        onOpenChange={(o) => !o && setSelectedEncontro(null)}
        onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
      />

      <QuickSessionModal
        mentorado={selectedMentorado}
        open={!!selectedMentorado}
        onOpenChange={(o) => !o && setSelectedMentorado(null)}
      />
    </div>
  );
}
