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
  currentTotal: number;
}

export default function EncontrosCounter({ mentoradoId, mentoradoNome, mentorId, currentTotal }: Props) {
  const queryClient = useQueryClient();
  const { data: pinSettings } = usePinSettings();
  const { user } = useAuth();
  const [showPin, setShowPin] = useState(false);
  const [pendingAction, setPendingAction] = useState<'add' | 'remove' | null>(null);

  const mutation = useMutation({
    mutationFn: async (action: 'add' | 'remove') => {
      const newTotal = action === 'add' ? currentTotal + 1 : Math.max(0, currentTotal - 1);

      // Update mentorado
      const { error: updateError } = await supabase
        .from('mentorados')
        .update({ total_encontros: newTotal })
        .eq('id', mentoradoId);
      if (updateError) throw updateError;

      // Log to historicos
      const logMentorId = mentorId || user?.id || mentoradoId; // fallback
      const { error: logError } = await supabase.from('historicos').insert({
        mentorado_id: mentoradoId,
        mentor_id: logMentorId,
        tipo: 'Observação',
        conteudo: action === 'add'
          ? `Encontros contratados alterados: ${currentTotal} → ${newTotal} (+1)`
          : `Encontros contratados alterados: ${currentTotal} → ${newTotal} (-1)`,
        visibilidade: 'Admin',
      });
      if (logError) console.error('Log error:', logError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorados'] });
      queryClient.invalidateQueries({ queryKey: ['historicos'] });
      toast.success('Encontros atualizados!');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  const handleAction = (action: 'add' | 'remove') => {
    // Check if PIN is required
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
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={() => handleAction('remove')}
          disabled={currentTotal <= 0 || mutation.isPending}
          title="Remover 1 encontro"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-lg font-bold min-w-[3ch] text-center">{currentTotal}</span>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={() => handleAction('add')}
          disabled={mutation.isPending}
          title="Adicionar 1 encontro"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <PinVerifyModal open={showPin} onOpenChange={setShowPin} onVerified={handlePinVerified} />
    </>
  );
}
