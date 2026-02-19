import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEspecialidades } from '@/hooks/useSupabaseData';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';
import EspecialidadesManagerModal from '@/components/EspecialidadesManagerModal';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NovoMentorModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: especialidades = [] } = useEspecialidades();
  const [showEspecialidades, setShowEspecialidades] = useState(false);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [carga, setCarga] = useState('5');
  const [cor, setCor] = useState('#0d9488');

  const reset = () => {
    setNome(''); setEmail(''); setTelefone('');
    setEspecialidade(''); setCarga('5'); setCor('#0d9488');
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('mentores').insert({
        nome,
        email,
        telefone_whatsapp: telefone,
        especialidade,
        carga_max_por_dia: parseInt(carga) || 5,
        cor_calendario: cor,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentores'] });
      toast.success('Mentor cadastrado com sucesso!');
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
          <DialogTitle>Novo Mentor</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="m-nome">Nome *</Label>
            <Input id="m-nome" value={nome} onChange={e => setNome(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-email">Email *</Label>
            <Input id="m-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="m-tel">WhatsApp</Label>
              <Input id="m-tel" value={telefone} onChange={e => setTelefone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Especialidade</Label>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowEspecialidades(true)}>
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Select value={especialidade} onValueChange={setEspecialidade}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {especialidades.map(e => <SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="m-carga">Carga máx/dia</Label>
              <Input id="m-carga" type="number" min="1" value={carga} onChange={e => setCarga(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-cor">Cor do calendário</Label>
              <Input id="m-cor" type="color" value={cor} onChange={e => setCor(e.target.value)} className="h-10 p-1" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={!nome || !email || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    <EspecialidadesManagerModal open={showEspecialidades} onOpenChange={setShowEspecialidades} />
    </>
  );
}
