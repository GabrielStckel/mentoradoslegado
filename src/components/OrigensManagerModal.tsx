import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrigens } from '@/hooks/useSupabaseData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OrigensManagerModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: origens = [] } = useOrigens();
  const [novaOrigem, setNovaOrigem] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['origens'] });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('origens').insert({ nome: novaOrigem.trim() });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setNovaOrigem(''); toast.success('Origem adicionada!'); },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase.from('origens').update({ nome: nome.trim() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setEditingId(null); toast.success('Origem atualizada!'); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('origens').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Origem removida!'); },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Gerenciar Origens</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <form
            onSubmit={e => { e.preventDefault(); if (novaOrigem.trim()) addMutation.mutate(); }}
            className="flex gap-2"
          >
            <Input
              placeholder="Nova origem..."
              value={novaOrigem}
              onChange={e => setNovaOrigem(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!novaOrigem.trim() || addMutation.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </form>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {origens.map(o => (
              <div key={o.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-secondary/50 group">
                {editingId === o.id ? (
                  <>
                    <Input
                      value={editingNome}
                      onChange={e => setEditingNome(e.target.value)}
                      className="h-7 text-sm flex-1"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateMutation.mutate({ id: o.id, nome: editingNome })}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm flex-1">{o.nome}</span>
                    <Button
                      size="icon" variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      onClick={() => { setEditingId(o.id); setEditingNome(o.nome); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => deleteMutation.mutate(o.id)}
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
