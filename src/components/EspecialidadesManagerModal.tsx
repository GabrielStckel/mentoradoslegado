import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEspecialidades } from '@/hooks/useSupabaseData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EspecialidadesManagerModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: especialidades = [] } = useEspecialidades();
  const [nova, setNova] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['especialidades'] });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('especialidades').insert({ nome: nova.trim() });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setNova(''); toast.success('Especialidade adicionada!'); },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase.from('especialidades').update({ nome: nome.trim() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setEditingId(null); toast.success('Especialidade atualizada!'); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('especialidades').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Especialidade removida!'); },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Gerenciar Especialidades</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <form
            onSubmit={e => { e.preventDefault(); if (nova.trim()) addMutation.mutate(); }}
            className="flex gap-2"
          >
            <Input
              placeholder="Nova especialidade..."
              value={nova}
              onChange={e => setNova(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!nova.trim() || addMutation.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </form>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {especialidades.map(e => (
              <div key={e.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-secondary/50 group">
                {editingId === e.id ? (
                  <>
                    <Input
                      value={editingNome}
                      onChange={ev => setEditingNome(ev.target.value)}
                      className="h-7 text-sm flex-1"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateMutation.mutate({ id: e.id, nome: editingNome })}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm flex-1">{e.nome}</span>
                    <Button
                      size="icon" variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      onClick={() => { setEditingId(e.id); setEditingNome(e.nome); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => deleteMutation.mutate(e.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
