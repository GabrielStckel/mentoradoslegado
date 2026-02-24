import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarPlus, Lock } from 'lucide-react';
import { useMentores, useEncontros } from '@/hooks/useSupabaseData';

const ADMIN_PIN = '1234';

interface Props {
  mentorado: {
    id: string;
    nome: string;
    mentor_id?: string | null;
    data_inicio: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickSessionModal({ mentorado, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: mentores = [] } = useMentores();
  const { data: encontros = [] } = useEncontros();

  const [proximaData, setProximaData] = useState('');
  const [proximaHora, setProximaHora] = useState('');
  const [observacao, setObservacao] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const proximoEncontro = mentorado
    ? encontros
        .filter(e => e.mentorado_id === mentorado.id && e.status === 'Agendado' && new Date(e.inicio) > new Date())
        .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())[0]
    : null;

  const reset = () => {
    setProximaData('');
    setProximaHora('');
    setObservacao('');
    setPin('');
    setPinError(false);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (pin !== ADMIN_PIN) {
        setPinError(true);
        throw new Error('PIN incorreto');
      }

      const mentorId = mentorado?.mentor_id || mentores[0]?.id;
      if (!mentorId) throw new Error('Nenhum mentor disponível');

      if (!proximaData && !proximaHora && !observacao.trim()) {
        throw new Error('Preencha ao menos um campo');
      }

      // Create next meeting if date provided
      if (proximaData && proximaHora) {
        const inicio = new Date(`${proximaData}T${proximaHora}`).toISOString();
        const fimDate = new Date(`${proximaData}T${proximaHora}`);
        fimDate.setHours(fimDate.getHours() + 1);
        const fim = fimDate.toISOString();

        const { error } = await supabase.from('encontros').insert({
          titulo: `Sessão - ${mentorado!.nome}`,
          mentorado_id: mentorado!.id,
          mentor_id: mentorId,
          tipo: 'Sessão',
          local: 'Online',
          inicio,
          fim,
        });
        if (error) throw error;
      }

      // Save observation as historico
      if (observacao.trim()) {
        const { error } = await supabase.from('historicos').insert({
          mentorado_id: mentorado!.id,
          mentor_id: mentorId,
          tipo: 'Observação',
          conteudo: observacao,
          visibilidade: 'Admin',
        });
        if (error) throw error;
      }

      // All operations completed above
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encontros'] });
      queryClient.invalidateQueries({ queryKey: ['historicos'] });
      toast.success('Salvo com sucesso!');
      reset();
      onOpenChange(false);
    },
    onError: (err: any) => {
      if (err.message !== 'PIN incorreto') {
        toast.error('Erro: ' + err.message);
      }
    },
  });

  if (!mentorado) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{mentorado.nome}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Mentorado desde {format(new Date(mentorado.data_inicio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </DialogHeader>

        <div className="space-y-5">
          {/* Next scheduled meeting info */}
          {proximoEncontro && (
            <div className="p-3 rounded-lg border bg-secondary/30">
              <p className="text-xs text-muted-foreground mb-1">Próximo encontro agendado</p>
              <p className="text-sm font-medium">
                {format(new Date(proximoEncontro.inicio), "dd/MM/yyyy 'às' HH:mm")}
              </p>
              <p className="text-xs text-muted-foreground">{proximoEncontro.titulo}</p>
            </div>
          )}

          {/* Schedule next meeting */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarPlus className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">Agendar próxima sessão</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="qs-data" className="text-xs text-muted-foreground">Data</Label>
                <Input id="qs-data" type="date" value={proximaData} onChange={e => setProximaData(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qs-hora" className="text-xs text-muted-foreground">Horário</Label>
                <Input id="qs-hora" type="time" value={proximaHora} onChange={e => setProximaHora(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Today's observation */}
          <div className="space-y-2">
            <Label htmlFor="qs-obs" className="text-sm font-semibold">Observação da mentoria de hoje</Label>
            <Textarea
              id="qs-obs"
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              rows={3}
              placeholder="Como foi a sessão de hoje..."
            />
          </div>

          {/* PIN */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-semibold">PIN para salvar</Label>
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={4} value={pin} onChange={(v) => { setPin(v); setPinError(false); }}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {pinError && <p className="text-xs text-destructive text-center">PIN incorreto. Tente novamente.</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={pin.length < 4 || mutation.isPending}
            >
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
