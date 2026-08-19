import { useState, useMemo } from 'react';
import { Search, Eye, ArchiveRestore, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMentoradosArquivados } from '@/hooks/useSupabaseData';
import { toTitleCase } from '@/lib/utils';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import MentoradoInfoModal from '@/components/MentoradoInfoModal';

function formatData(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}

export default function ArquivadosPage() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedMentorado, setSelectedMentorado] = useState<any>(null);
  const [motivoExclusao, setMotivoExclusao] = useState('');

  const { data: arquivados = [], isLoading } = useMentoradosArquivados();

  const filtrados = useMemo(() => {
    if (!search) return arquivados;
    const q = search.toLowerCase();
    return arquivados.filter((m: any) =>
      (m.nome || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q));
  }, [arquivados, search]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['mentorados'] });
    queryClient.invalidateQueries({ queryKey: ['mentorados_arquivados'] });
    queryClient.invalidateQueries({ queryKey: ['atividades_log'] });
  };

  const restaurarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('restaurar_mentorado', { p_mentorado_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Mentorado restaurado. Reagende os encontros futuros.');
    },
    onError: (err: any) => toast.error('Erro ao restaurar: ' + err.message),
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
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['encontros'] });
      setMotivoExclusao('');
      toast.success('Mentorado excluído definitivamente. Registro salvo no histórico.');
    },
    onError: (err: any) => toast.error('Erro ao excluir: ' + err.message),
  });

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const renderRestaurar = (m: any, size: 'sm' | 'md') => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className={`gap-1.5 ${size === 'sm' ? 'h-8' : 'h-9'}`} onClick={stop}>
          <ArchiveRestore className="h-3.5 w-3.5" /> Restaurar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={stop}>
        <AlertDialogHeader>
          <AlertDialogTitle>Restaurar mentorado?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{toTitleCase(m.nome)}</strong> volta para a lista de mentorados com o progresso
            preservado ({m.encontros_realizados || 0}/{m.total_encontros}). Os encontros futuros foram
            cancelados no arquivamento e <strong>precisam ser reagendados manualmente</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => restaurarMutation.mutate(m.id)} disabled={restaurarMutation.isPending}>
            Restaurar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const renderExcluir = (m: any, size: 'sm' | 'md') => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={`${size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'} text-destructive hover:text-destructive`}
          title="Excluir definitivamente"
          onClick={stop}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={stop}>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir definitivamente?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação é <strong>irreversível</strong>. <strong>{toTitleCase(m.nome)}</strong> será
            apagado junto com <strong>todos os encontros e observações</strong> vinculados.
            A exclusão ficará registrada no histórico com o motivo informado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`motivo-del-${m.id}`}>Motivo da exclusão *</Label>
          <Textarea
            id={`motivo-del-${m.id}`}
            value={motivoExclusao}
            onChange={e => setMotivoExclusao(e.target.value)}
            rows={3}
            placeholder="Ex: solicitação de remoção de dados, cadastro duplicado..."
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setMotivoExclusao('')}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate(m.id)}
            disabled={motivoExclusao.trim().length < 5 || deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir definitivamente
          </AlertDialogAction>
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
        <h1 className="page-title">Arquivados</h1>
        <p className="page-subtitle">{arquivados.length} mentorado(s) arquivado(s)</p>
      </div>

      <div className="relative flex-1 min-w-0 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isMobile ? (
        <div className="space-y-2">
          {filtrados.map((m: any) => (
            <div key={m.id} className="rounded-xl border bg-card p-4 space-y-3 cursor-pointer" onClick={() => setSelectedMentorado(m)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base text-primary truncate">{toTitleCase(m.nome)}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatData(m.arquivado_at)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Progresso: {m.encontros_realizados || 0}/{m.total_encontros}
              </p>
              {m.arquivado_motivo && (
                <p className="text-xs line-clamp-2" title={m.arquivado_motivo}>{m.arquivado_motivo}</p>
              )}
              <div className="flex items-center gap-1 justify-end">
                <Button size="icon" variant="ghost" className="h-9 w-9" title="Ver detalhes" onClick={(e) => { stop(e); setSelectedMentorado(m); }}>
                  <Eye className="h-4 w-4" />
                </Button>
                {renderRestaurar(m, 'md')}
                {renderExcluir(m, 'md')}
              </div>
            </div>
          ))}
          {filtrados.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">Nenhum mentorado arquivado.</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                <TableHead className="table-header">Nome</TableHead>
                <TableHead className="table-header text-center">Progresso</TableHead>
                <TableHead className="table-header">Arquivado em</TableHead>
                <TableHead className="table-header">Motivo</TableHead>
                <TableHead className="table-header w-[200px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((m: any) => (
                <TableRow key={m.id} className="hover:bg-secondary/20 cursor-pointer" onClick={() => setSelectedMentorado(m)}>
                  <TableCell>
                    <p className="font-semibold text-base text-primary">{toTitleCase(m.nome)}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-semibold">{m.encontros_realizados || 0}/{m.total_encontros}</span>
                  </TableCell>
                  <TableCell className="text-sm">{formatData(m.arquivado_at)}</TableCell>
                  <TableCell className="max-w-[260px]">
                    <span className="text-xs text-muted-foreground line-clamp-2" title={m.arquivado_motivo || ''}>
                      {m.arquivado_motivo || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 items-center">
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Ver detalhes" onClick={(e) => { stop(e); setSelectedMentorado(m); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {renderRestaurar(m, 'sm')}
                      {renderExcluir(m, 'sm')}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtrados.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum mentorado arquivado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <MentoradoInfoModal
        mentorado={selectedMentorado}
        open={!!selectedMentorado}
        onOpenChange={o => !o && setSelectedMentorado(null)}
      />
    </div>
  );
}
