import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMentores } from '@/hooks/useSupabaseData';
import NovoMentorModal from '@/components/NovoMentorModal';
import EditMentorModal from '@/components/EditMentorModal';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function MentoresPage() {
  const { data: mentores = [], isLoading } = useMentores();
  const [showNovo, setShowNovo] = useState(false);
  const [editMentor, setEditMentor] = useState<any | null>(null);
  const [deleteMentor, setDeleteMentor] = useState<any | null>(null);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mentores').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentores'] });
      toast.success('Mentor removido com sucesso!');
      setDeleteMentor(null);
    },
    onError: (err: any) => {
      toast.error('Erro ao remover: ' + err.message);
    },
  });

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Mentores</h1>
          <p className="page-subtitle">{mentores.length} mentores cadastrados</p>
        </div>
        <Button onClick={() => setShowNovo(true)}><Plus className="h-4 w-4 mr-2" /> Novo Mentor</Button>
      </div>
      <NovoMentorModal open={showNovo} onOpenChange={setShowNovo} />
      <EditMentorModal open={!!editMentor} onOpenChange={o => { if (!o) setEditMentor(null); }} mentor={editMentor} />

      <AlertDialog open={!!deleteMentor} onOpenChange={o => { if (!o) setDeleteMentor(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover mentor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteMentor?.nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMentor && deleteMutation.mutate(deleteMentor.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30 hover:bg-secondary/30">
              <TableHead className="table-header">Nome</TableHead>
              <TableHead className="table-header">Especialidade</TableHead>
              <TableHead className="table-header">Carga/dia</TableHead>
              <TableHead className="table-header">Status</TableHead>
              <TableHead className="table-header">Cor</TableHead>
              <TableHead className="table-header text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mentores.map(m => (
              <TableRow key={m.id} className="hover:bg-secondary/20">
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{m.nome}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{m.especialidade}</TableCell>
                <TableCell className="text-sm">{m.carga_max_por_dia} sessões</TableCell>
                <TableCell><StatusBadge status={m.status as any} /></TableCell>
                <TableCell>
                  <div className="w-6 h-6 rounded-full border-2 border-border" style={{ backgroundColor: m.cor_calendario }} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditMentor(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteMentor(m)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {mentores.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum mentor cadastrado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
