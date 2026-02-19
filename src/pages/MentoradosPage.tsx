import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Phone } from 'lucide-react';
import { mentorados, mentores, encontros } from '@/data/mock';
import { StatusBadge, TagBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function MentoradosPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mentorFilter, setMentorFilter] = useState('all');

  const mentorMap = useMemo(() => {
    const m: Record<string, string> = {};
    mentores.forEach(mt => { m[mt.id] = mt.nome; });
    return m;
  }, []);

  const filtered = useMemo(() => {
    return mentorados.filter(m => {
      const matchSearch = !search || m.nome.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase()) ||
        m.telefone_whatsapp.includes(search);
      const matchStatus = statusFilter === 'all' || m.status === statusFilter;
      const matchMentor = mentorFilter === 'all' || m.mentor_id === mentorFilter;
      return matchSearch && matchStatus && matchMentor;
    });
  }, [search, statusFilter, mentorFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Mentorados</h1>
          <p className="page-subtitle">{mentorados.length} mentorados cadastrados</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Novo Mentorado
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, email ou telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Novo">Novo</SelectItem>
            <SelectItem value="Ativo">Ativo</SelectItem>
            <SelectItem value="Pausado">Pausado</SelectItem>
            <SelectItem value="Finalizado">Finalizado</SelectItem>
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

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30 hover:bg-secondary/30">
              <TableHead className="table-header">Nome</TableHead>
              <TableHead className="table-header">Mentor</TableHead>
              <TableHead className="table-header">Cidade</TableHead>
              <TableHead className="table-header">Origem</TableHead>
              <TableHead className="table-header">Tags</TableHead>
              <TableHead className="table-header">Status</TableHead>
              <TableHead className="table-header">Contato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(m => (
              <TableRow key={m.id} className="cursor-pointer hover:bg-secondary/20" onClick={() => navigate(`/mentorados/${m.id}`)}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{m.nome}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{mentorMap[m.mentor_id]}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{m.cidade}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{m.origem}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">{m.tags.map(t => <TagBadge key={t} tag={t} />)}</div>
                </TableCell>
                <TableCell><StatusBadge status={m.status} /></TableCell>
                <TableCell>
                  <a
                    href={`https://wa.me/${m.telefone_whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum mentorado encontrado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
