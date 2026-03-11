import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePinSettings } from '@/hooks/usePinSettings';
import { PinVerifyModal } from '@/components/PinModal';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Minus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  mentoradoId: string;
  mentoradoNome: string;
  mentorId: string;
  totalContratados: number;
  realizados: number;
}

export default function EncontrosCounter({ mentoradoId, mentoradoNome, mentorId, totalContratados, realizados }: Props) {
  const queryClient = useQueryClient();
  const { data: pinSettings } = usePinSettings();
  const { user } = useAuth();
  const [showPin, setShowPin] = useState(false);
  const [pendingAction, setPendingAction] = useState<'add' | 'remove' | null>(null);

  const mutation = useMutation({
    mutationFn: async (action: 'add' | 'remove') => {
      const newRealizados = action === 'add' ? realizados + 1 : Math.max(0, realizados - 1);

      const { error: updateError } = await supabase
        .from('mentorados')
        .update({ encontros_realizados: newRealizados } as any)
        .eq('id', mentoradoId);
      if (updateError) throw updateError;

      // Log to historicos
      const logMentorId = mentorId || user?.id || mentoradoId;
      const { error: logError } = await supabase.from('historicos').insert({
        mentorado_id: mentoradoId,
        mentor_id: logMentorId,
        tipo: 'Observação',
        conteudo: action === 'add'
          ? `Encontros realizados alterados: ${realizados} → ${newRealizados} (+1)`
          : `Encontros realizados alterados: ${realizados} → ${newRealizados} (-1)`,
        visibilidade: 'Admin',
      });
      if (logError) console.error('Log error:', logError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorados'] });
      queryClient.invalidateQueries({ queryKey: ['historicos'] });
      toast.success('Encontros realizados atualizados!');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  const handleAction = (action: 'add' | 'remove') => {
    if (pinSettings?.pin && pinSettings.enabled) {
      setPendingAction(action);
      setShowPin(true);
    } else {
      mutation.mutate(action);
    }
  };

  const handlePinVerified = () => {
    if (pendingAction) {
      mutation.mutate(pendingAction);
      setPendingAction(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold min-w-[5ch] text-center">
          {realizados}/{totalContratados}
        </span>
        <Button
          size="icon"
          variant="outline"
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); handleAction('remove'); }}
          disabled={realizados <= 0 || mutation.isPending}
          title="Remover 1 encontro realizado"
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); handleAction('add'); }}
          disabled={mutation.isPending}
          title="Adicionar 1 encontro realizado"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <PinVerifyModal open={showPin} onOpenChange={setShowPin} onVerified={handlePinVerified} />
    </>
  );
}
