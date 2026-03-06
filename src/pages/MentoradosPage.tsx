import { useState, useMemo } from 'react';
import { Plus, Search, Phone, CalendarPlus, Pencil } from 'lucide-react';
import { useMentorados } from '@/hooks/useSupabaseData';
import NovoMentoradoModal from '@/components/NovoMentoradoModal';
import EditMentoradoModal from '@/components/EditMentoradoModal';
import NovoEncontroModal from '@/components/NovoEncontroModal';
import QuickSessionModal from '@/components/QuickSessionModal';
import { StatusBadge, TagBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

export default function MentoradosPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNovo, setShowNovo] = useState(false);
  const [editMentorado, setEditMentorado] = useState<any>(null);
  const [encontroMentoradoId, setEncontroMentoradoId] = useState<string | null>(null);
  const [selectedMentorado, setSelectedMentorado] = useState<any>(null);
  const isMobile = useIsMobile();

  const { data: mentorados = [], isLoading } = useMentorados();

  const filtered = useMemo(() => {
    return mentorados.filter(m => {
      const matchSearch = !search || m.nome.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase()) ||
        m.telefone_whatsapp.includes(search);
      const matchStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter, mentorados]);

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Mentorados</h1>
          <p className="page-subtitle">{mentorados.length} mentorados cadastrados</p>
        </div>
        <Button onClick={() => setShowNovo(true)} size={isMobile ? 'sm' : 'default'}>
          <Plus className="h-4 w-4 mr-2" /> Novo
        </Button>
      </div>
      <NovoMentoradoModal open={showNovo} onOpenChange={setShowNovo} />

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, email ou telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Novo">Novo</SelectItem>
            <SelectItem value="Ativo">Ativo</SelectItem>
            <SelectItem value="Pausado">Pausado</SelectItem>
            <SelectItem value="Finalizado">Finalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile: Card layout */}
      {isMobile ? (
        <div className="space-y-2">
          {filtered.map(m => (
            <div
              key={m.id}
              className="rounded-xl border bg-card p-4 space-y-2 active:bg-secondary/40"
              onClick={() => setSelectedMentorado(m)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-primary truncate">{m.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
                <StatusBadge status={m.status as any} />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{m.cidade}</span>
                <span>{m.origem}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">{(m.tags || []).slice(0, 3).map(t => <TagBadge key={t} tag={t as any} />)}</div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                    title="Editar"
                    onClick={(e) => { e.stopPropagation(); setEditMentorado(m); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <a
                    href={`https://wa.me/${m.telefone_whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                    title="Agendar encontro"
                    onClick={(e) => { e.stopPropagation(); setEncontroMentoradoId(m.id); }}
                  >
                    <CalendarPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">Nenhum mentorado encontrado.</p>
          )}
        </div>
      ) : (
        /* Desktop: Table layout */
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                <TableHead className="table-header">Nome</TableHead>
                <TableHead className="table-header">Cidade</TableHead>
                <TableHead className="table-header">Origem</TableHead>
                <TableHead className="table-header">Tags</TableHead>
                <TableHead className="table-header">Status</TableHead>
                <TableHead className="table-header">Contato</TableHead>
                <TableHead className="table-header w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(m => (
                <TableRow key={m.id} className="hover:bg-secondary/20">
                  <TableCell>
                    <button className="text-left hover:underline" onClick={() => setSelectedMentorado(m)}>
                      <p className="font-medium text-sm text-primary">{m.nome}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.cidade}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.origem}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">{(m.tags || []).map(t => <TagBadge key={t} tag={t as any} />)}</div>
                  </TableCell>
                  <TableCell><StatusBadge status={m.status as any} /></TableCell>
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
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="Agendar encontro"
                      onClick={(e) => { e.stopPropagation(); setEncontroMentoradoId(m.id); }}
                    >
                      <CalendarPlus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum mentorado encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <QuickSessionModal
        mentorado={selectedMentorado}
        open={!!selectedMentorado}
        onOpenChange={(o) => !o && setSelectedMentorado(null)}
      />

      {encontroMentoradoId && (
        <NovoEncontroModal
          open={!!encontroMentoradoId}
          onOpenChange={(o) => !o && setEncontroMentoradoId(null)}
        />
      )}
    </div>
  );
}
