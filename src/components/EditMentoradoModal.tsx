import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useOrigens, useStatusMentorado } from '@/hooks/useSupabaseData';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';
import OrigensManagerModal from '@/components/OrigensManagerModal';
import StatusManagerModal from '@/components/StatusManagerModal';
import { PhoneInput } from '@/components/PhoneInput';
import EmailInput from '@/components/EmailInput';
import CityInput from '@/components/CityInput';
import ArquivarMentoradoDialog from '@/components/ArquivarMentoradoDialog';

interface Props {
  mentorado: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditMentoradoModal({ mentorado, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: origens = [] } = useOrigens();
  const { data: statusListData = [] } = useStatusMentorado();
  const [showOrigens, setShowOrigens] = useState(false);
  const [showStatusManager, setShowStatusManager] = useState(false);

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
      setTelefone(mentorado.telefone_whatsapp?.replace(/\D/g, '') || '');
      setCidade(mentorado.cidade || '');
      setOrigem(mentorado.origem || 'Outro');
      setStatus(mentorado.status || 'Novo');
      setObservacoes(mentorado.observacoes_gerais || '');
      setTotalEncontros(String(mentorado.total_encontros || 0));
    }
  }, [mentorado, open]);

  // Fallback: status legado que existe no banco mas não está cadastrado na lista
  const statusOptions = (() => {
    const nomes = (statusListData || []).map((s: any) => s.nome as string);
    return status && !nomes.includes(status) ? [...nomes, status] : nomes;
  })();

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
      queryClient.invalidateQueries({ queryKey: ['atividades_log'] });
      toast.success('Mentorado atualizado com sucesso!');
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error('Erro ao atualizar: ' + err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
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
                <EmailInput value={email} onValueChange={setEmail} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-telefone">WhatsApp</Label>
                <PhoneInput value={telefone} onValueChange={setTelefone} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-cidade">Cidade</Label>
                <CityInput value={cidade} onValueChange={setCidade} />
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
              <div className="flex items-center justify-between">
                <Label>Status</Label>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowStatusManager(true)}>
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((nome) => (
                    <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                  ))}
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
              {mentorado && (
                <ArquivarMentoradoDialog
                  mentorado={mentorado}
                  withLabel
                  onArchived={() => onOpenChange(false)}
                />
              )}
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
      <OrigensManagerModal open={showOrigens} onOpenChange={setShowOrigens} />
      <StatusManagerModal open={showStatusManager} onOpenChange={setShowStatusManager} />
    </>
  );
}
