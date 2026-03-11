import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStatusMentorado } from '@/hooks/useSupabaseData';
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

function SortableItem({ item, editingId, editingNome, editingCor, setEditingNome, setEditingCor, setEditingId, onUpdate, onDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1 rounded-md px-1 py-1.5 hover:bg-secondary/50 group">
      <button type="button" className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      {editingId === item.id ? (
        <>
          <input
            type="color"
            value={editingCor}
            onChange={e => setEditingCor(e.target.value)}
            className="h-7 w-7 rounded border-0 cursor-pointer p-0"
          />
          <Input
            value={editingNome}
            onChange={e => setEditingNome(e.target.value)}
            className="h-7 text-sm flex-1"
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onUpdate({ id: item.id, nome: editingNome, cor: editingCor })}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        <>
          <div className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: item.cor }} />
          <span className="text-sm flex-1">{item.nome}</span>
          <Button
            size="icon" variant="ghost"
            className="h-7 w-7 opacity-0 group-hover:opacity-100"
            onClick={() => { setEditingId(item.id); setEditingNome(item.nome); setEditingCor(item.cor); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon" variant="ghost"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}

export default function StatusManagerModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: statusList = [] } = useStatusMentorado();
  const [novoNome, setNovoNome] = useState('');
  const [novaCor, setNovaCor] = useState('#6b7280');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState('');
  const [editingCor, setEditingCor] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['status_mentorado'] });

  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrdem = statusList.length > 0 ? Math.max(...statusList.map((s: any) => s.ordem || 0)) : 0;
      const { error } = await supabase.from('status_mentorado' as any).insert({ nome: novoNome.trim(), cor: novaCor, ordem: maxOrdem + 1 } as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setNovoNome(''); setNovaCor('#6b7280'); toast.success('Status adicionado!'); },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, nome, cor }: { id: string; nome: string; cor: string }) => {
      const { error } = await supabase.from('status_mentorado' as any).update({ nome: nome.trim(), cor } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setEditingId(null); toast.success('Status atualizado!'); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('status_mentorado' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Status removido!'); },
    onError: (err: any) => toast.error(err.message),
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = statusList.findIndex((s: any) => s.id === active.id);
    const newIndex = statusList.findIndex((s: any) => s.id === over.id);
    const reordered = arrayMove([...statusList], oldIndex, newIndex);

    queryClient.setQueryData(['status_mentorado'], reordered);

    const updates = reordered.map((s: any, i: number) =>
      supabase.from('status_mentorado' as any).update({ ordem: i + 1 } as any).eq('id', s.id)
    );
    await Promise.all(updates);
    invalidate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Gerenciar Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <form
            onSubmit={e => { e.preventDefault(); if (novoNome.trim()) addMutation.mutate(); }}
            className="flex gap-2"
          >
            <input
              type="color"
              value={novaCor}
              onChange={e => setNovaCor(e.target.value)}
              className="h-9 w-9 rounded border cursor-pointer p-0.5"
            />
            <Input
              placeholder="Novo status..."
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!novoNome.trim() || addMutation.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </form>
          <div className="space-y-0.5 max-h-60 overflow-y-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={statusList.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                {statusList.map((s: any) => (
                  <SortableItem
                    key={s.id}
                    item={s}
                    editingId={editingId}
                    editingNome={editingNome}
                    editingCor={editingCor}
                    setEditingNome={setEditingNome}
                    setEditingCor={setEditingCor}
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
