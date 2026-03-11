import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useOrigens } from '@/hooks/useSupabaseData';
import { toast } from 'sonner';
import { Settings, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import OrigensManagerModal from '@/components/OrigensManagerModal';
import PinModal, { usePinGate } from '@/components/PinModal';

interface Props {
  mentorado: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditMentoradoModal({ mentorado, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: origens = [] } = useOrigens();
  const [showOrigens, setShowOrigens] = useState(false);
  const { pinOpen, setPinOpen, requirePin, onPinSuccess } = usePinGate();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [origem, setOrigem] = useState('');
  const [status, setStatus] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [totalEncontros, setTotalEncontros] = useState('0');
  useEffect(() => {
    if (mentorado && open) {
      setNome(mentorado.nome || '');
      setEmail(mentorado.email || '');
      setTelefone(mentorado.telefone_whatsapp || '');
      setCidade(mentorado.cidade || '');
      setOrigem(mentorado.origem || 'Outro');
      setStatus(mentorado.status || 'Novo');
      setObservacoes(mentorado.observacoes_gerais || '');
      setTotalEncontros(String(mentorado.total_encontros || 0));
    }
  }, [mentorado, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!mentorado) throw new Error('Mentorado não encontrado');
      const { error } = await supabase.from('mentorados').update({
        nome,
        email,
        telefone_whatsapp: telefone,
        cidade,
        origem,
        status,
        observacoes_gerais: observacoes,
        total_encontros: parseInt(totalEncontros) || 0,
      }).eq('id', mentorado.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorados'] });
      toast.success('Mentorado atualizado com sucesso!');
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error('Erro ao atualizar: ' + err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!mentorado) throw new Error('Mentorado não encontrado');
      const { error } = await supabase.from('mentorados').delete().eq('id', mentorado.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorados'] });
      toast.success('Mentorado excluído com sucesso!');
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error('Erro ao excluir: ' + err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requirePin(() => mutation.mutate());
  };

  const handleDelete = () => {
    requirePin(() => deleteMutation.mutate());
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Mentorado</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome *</Label>
              <Input id="edit-nome" value={nome} onChange={e => setNome(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-telefone">WhatsApp</Label>
                <Input id="edit-telefone" value={telefone} onChange={e => setTelefone(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-cidade">Cidade</Label>
                <Input id="edit-cidade" value={cidade} onChange={e => setCidade(e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Origem</Label>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowOrigens(true)}>
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Select value={origem} onValueChange={setOrigem}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {origens.map(o => <SelectItem key={o.id} value={o.nome}>{o.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Novo">Novo</SelectItem>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Pausado">Pausado</SelectItem>
                  <SelectItem value="Finalizado">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-total">Nº encontros contratados</Label>
              <Input id="edit-total" type="number" min="0" value={totalEncontros} onChange={e => setTotalEncontros(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-obs">Observações</Label>
              <Textarea id="edit-obs" value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-between pt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir mentorado?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Essa ação não pode ser desfeita. O mentorado <strong>{nome}</strong> será removido permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" disabled={!nome || mutation.isPending}>
                  {mutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <PinModal open={pinOpen} onOpenChange={setPinOpen} onSuccess={onPinSuccess} />
      <OrigensManagerModal open={showOrigens} onOpenChange={setShowOrigens} />
    </>
  );
}
