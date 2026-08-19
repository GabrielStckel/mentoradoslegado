import { useState, useMemo } from 'react';
import { toTitleCase } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Undo2, Pencil, Trash2 } from 'lucide-react';
import { useMentorados } from '@/hooks/useSupabaseData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import EditMentoradoModal from '@/components/EditMentoradoModal';
import MentoradoInfoModal from '@/components/MentoradoInfoModal';

export default function ConcluidosPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [editMentorado, setEditMentorado] = useState<any>(null);
  const [selectedMentorado, setSelectedMentorado] = useState<any>(null);
  const [motivoExclusao, setMotivoExclusao] = useState('');

  const { data: mentorados = [], isLoading } = useMentorados();

  const concluidos = useMemo(() => {
    return mentorados
      .filter(m => m.status === 'Concluído')
      .filter(m => {
        if (!search) return true;
        const q = search.toLowerCase();
        return m.nome.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
      });
  }, [mentorados, search]);

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mentorados').update({ status: 'Ativo' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorados'] });
      queryClient.invalidateQueries({ queryKey: ['atividades_log'] });
      toast.success('Mentorado reativado com sucesso!');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('excluir_mentorado', {
        p_mentorado_id: id,
        p_motivo: motivoExclusao.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorados'] });
      queryClient.invalidateQueries({ queryKey: ['atividades_log'] });
      setMotivoExclusao('');
      toast.success('Mentorado excluído. Registro salvo no histórico.');
    },
    onError: (err: any) => toast.error('Erro ao excluir: ' + err.message),
  });

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const renderDeleteDialog = (m: any, size: 'sm' | 'md') => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={size === 'sm' ? 'h-8 w-8 text-destructive hover:text-destructive' : 'h-9 w-9 text-destructive hover:text-destructive'}
          title="Excluir"
          onClick={stop}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={stop}>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir mentorado?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação não pode ser desfeita. <strong>{toTitleCase(m.nome)}</strong> será removido permanentemente,
            junto com <strong>todos os encontros e observações</strong> vinculados a ele.
            A exclusão ficará registrada no histórico com o motivo informado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`motivo-${m.id}`}>Motivo da exclusão *</Label>
          <Textarea
            id={`motivo-${m.id}`}
            value={motivoExclusao}
            onChange={e => setMotivoExclusao(e.target.value)}
            rows={3}
            placeholder="Ex: desistiu na 3ª sessão, reembolso solicitado..."
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setMotivoExclusao('')}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate(m.id)}
            disabled={motivoExclusao.trim().length < 5 || deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const renderReactivateDialog = (m: any, size: 'sm' | 'md') => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className={size === 'sm' ? 'h-8 gap-1.5' : 'h-9 gap-1.5'} onClick={stop}>
          <Undo2 className="h-3.5 w-3.5" /> Reativar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={stop}>
        <AlertDialogHeader>
          <AlertDialogTitle>Reativar mentorado?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{toTitleCase(m.nome)}</strong> voltará para a lista de mentorados ativos com status "Ativo".
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => reactivateMutation.mutate(m.id)}>Reativar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="page-title">Concluídos</h1>
        <p className="page-subtitle">{concluidos.length} mentorados que concluíram todas as sessões</p>
      </div>

      <div className="relative flex-1 min-w-0 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isMobile ? (
        <div className="space-y-2">
          {concluidos.map(m => (
            <div
              key={m.id}
              className="rounded-xl border bg-card p-4 space-y-3 cursor-pointer"
              onClick={() => setSelectedMentorado(m)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base text-primary truncate">{toTitleCase(m.nome)}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
                <StatusBadge status={m.status as any} />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Sessões: {(m as any).encontros_realizados || 0}/{m.total_encontros}</span>
              </div>
              <div className="flex items-center gap-1 justify-end">
                <Button size="icon" variant="ghost" className="h-9 w-9" title="Ver detalhes" onClick={(e) => { stop(e); navigate(`/mentorados/${m.id}`); }}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-9 w-9" title="Editar" onClick={(e) => { stop(e); setEditMentorado(m); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                {renderReactivateDialog(m, 'md')}
                {renderDeleteDialog(m, 'md')}
              </div>
            </div>
          ))}
          {concluidos.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">Nenhum mentorado concluído.</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                <TableHead className="table-header">Nome</TableHead>
                <TableHead className="table-header text-center">Sessões</TableHead>
                <TableHead className="table-header">Status</TableHead>
                <TableHead className="table-header w-[220px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {concluidos.map(m => (
                <TableRow key={m.id} className="hover:bg-secondary/20 cursor-pointer" onClick={() => setSelectedMentorado(m)}>
                  <TableCell>
                    <p className="font-semibold text-base text-primary">{toTitleCase(m.nome)}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-semibold">{(m as any).encontros_realizados || 0}/{m.total_encontros}</span>
                  </TableCell>
                  <TableCell><StatusBadge status={m.status as any} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Ver detalhes" onClick={(e) => { stop(e); navigate(`/mentorados/${m.id}`); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar" onClick={(e) => { stop(e); setEditMentorado(m); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {renderReactivateDialog(m, 'sm')}
                      {renderDeleteDialog(m, 'sm')}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {concluidos.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum mentorado concluído.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <EditMentoradoModal
        mentorado={editMentorado}
        open={!!editMentorado}
        onOpenChange={o => !o && setEditMentorado(null)}
      />
      <MentoradoInfoModal
        mentorado={selectedMentorado}
        open={!!selectedMentorado}
        onOpenChange={o => !o && setSelectedMentorado(null)}
      />
    </div>
  );
}
