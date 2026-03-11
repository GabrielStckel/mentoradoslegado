import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrigens } from '@/hooks/useSupabaseData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, Check, X, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SortableItem({ origem, editingId, editingNome, setEditingNome, setEditingId, onUpdate, onDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: origem.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1 rounded-md px-1 py-1.5 hover:bg-secondary/50 group">
      <button type="button" className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      {editingId === origem.id ? (
        <>
          <Input
            value={editingNome}
            onChange={e => setEditingNome(e.target.value)}
            className="h-7 text-sm flex-1"
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onUpdate({ id: origem.id, nome: editingNome })}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        <>
          <span className="text-sm flex-1">{origem.nome}</span>
          <Button
            size="icon" variant="ghost"
            className="h-7 w-7 opacity-0 group-hover:opacity-100"
            onClick={() => { setEditingId(origem.id); setEditingNome(origem.nome); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon" variant="ghost"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
            onClick={() => onDelete(origem.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}

export default function OrigensManagerModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: origens = [] } = useOrigens();
  const [novaOrigem, setNovaOrigem] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['origens'] });

  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrdem = origens.length > 0 ? Math.max(...origens.map((o: any) => o.ordem || 0)) : 0;
      const { error } = await supabase.from('origens').insert({ nome: novaOrigem.trim(), ordem: maxOrdem + 1 });
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = origens.findIndex((o: any) => o.id === active.id);
    const newIndex = origens.findIndex((o: any) => o.id === over.id);
    const reordered = arrayMove([...origens], oldIndex, newIndex);

    // Optimistic update
    queryClient.setQueryData(['origens'], reordered);

    // Persist new order
    const updates = reordered.map((o: any, i: number) =>
      supabase.from('origens').update({ ordem: i + 1 }).eq('id', o.id)
    );
    await Promise.all(updates);
    invalidate();
  };

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
          <div className="space-y-0.5 max-h-60 overflow-y-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={origens.map((o: any) => o.id)} strategy={verticalListSortingStrategy}>
                {origens.map((o: any) => (
                  <SortableItem
                    key={o.id}
                    origem={o}
                    editingId={editingId}
                    editingNome={editingNome}
                    setEditingNome={setEditingNome}
                    setEditingId={setEditingId}
                    onUpdate={(data: any) => updateMutation.mutate(data)}
                    onDelete={(id: string) => deleteMutation.mutate(id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
