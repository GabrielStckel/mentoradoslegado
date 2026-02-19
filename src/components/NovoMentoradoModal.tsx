import { useState } from 'react';
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
import { Settings } from 'lucide-react';
import OrigensManagerModal from '@/components/OrigensManagerModal';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NovoMentoradoModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: origens = [] } = useOrigens();
  const [showOrigens, setShowOrigens] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [origem, setOrigem] = useState('Outro');
  const [observacoes, setObservacoes] = useState('');

  const reset = () => {
    setNome(''); setEmail(''); setTelefone(''); setCidade('');
    setOrigem('Outro'); setObservacoes('');
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('mentorados').insert({
        nome,
        email,
        telefone_whatsapp: telefone,
        cidade,
        origem,
        observacoes_gerais: observacoes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorados'] });
      toast.success('Mentorado cadastrado com sucesso!');
      reset();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error('Erro ao cadastrar: ' + err.message);
    },
  });

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Mentorado</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">WhatsApp</Label>
              <Input id="telefone" value={telefone} onChange={e => setTelefone(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" value={cidade} onChange={e => setCidade(e.target.value)} />
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
            <Label htmlFor="obs">Observações</Label>
            <Textarea id="obs" value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={!nome || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    <OrigensManagerModal open={showOrigens} onOpenChange={setShowOrigens} />
    </>
  );
}
