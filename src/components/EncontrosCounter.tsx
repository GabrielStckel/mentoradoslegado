import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePinSettings } from '@/hooks/usePinSettings';
import { PinVerifyModal } from '@/components/PinModal';
import { Button } from '@/components/ui/button';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

import { toast } from 'sonner';
import { Plus, Minus, CheckCircle } from 'lucide-react';


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
  
  const [showPin, setShowPin] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<'add' | 'remove' | null>(null);

  const pinEnabled = !!(pinSettings?.pin && pinSettings.enabled);

  const mutation = useMutation({
    mutationFn: async ({ action, obs }: { action: 'add' | 'remove'; obs?: string }) => {
      const { data, error } = await supabase.rpc('registrar_encontro_realizado', {
        p_mentorado_id: mentoradoId,
        p_delta: action === 'add' ? 1 : -1,
        p_obs: obs ?? '',
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (novoTotal) => {
      queryClient.invalidateQueries({ queryKey: ['mentorados'] });
      queryClient.invalidateQueries({ queryKey: ['historicos'] });
      queryClient.invalidateQueries({ queryKey: ['atividades_log'] });
      toast.success(`Encontros realizados: ${novoTotal}/${totalContratados}`);
    },
    onError: (err: any) => toast.error('Erro ao registrar encontro: ' + err.message),
  });

  const handleAction = (action: 'add' | 'remove') => {
    setPendingAction(action);
    if (pinEnabled) {
      setShowPin(true);
    } else {
      setShowConfirm(true);
    }
  };

  const handleConfirmed = () => {
    if (pendingAction) {
      mutation.mutate({ action: pendingAction });
      setPendingAction(null);
    }
  };

  const handlePinVerified = () => {
    handleConfirmed();
  };

  const confirmMessage = pendingAction === 'add'
    ? `Marcar mais 1 sessão realizada para ${mentoradoNome}? (${realizados} → ${realizados + 1})`
    : `Remover 1 sessão realizada de ${mentoradoNome}? (${realizados} → ${Math.max(0, realizados - 1)})`;

  const completeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('mentorados').update({ status: 'Concluído' }).eq('id', mentoradoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorados'] });
      toast.success(`${mentoradoNome} marcado como concluído!`);
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  const isComplete = totalContratados > 0 && realizados >= totalContratados;

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
        {isComplete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs border-green-500/50 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
                onClick={(e) => e.stopPropagation()}
              >
                <CheckCircle className="h-3.5 w-3.5" /> Concluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Marcar como concluído?</AlertDialogTitle>
                <AlertDialogDescription>
                  <strong>{mentoradoNome}</strong> completou todas as {totalContratados} sessões contratadas. Deseja mover para a seção de Concluídos?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => completeMutation.mutate()} className="bg-green-600 hover:bg-green-700 text-white">
                  Marcar como Concluído
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <PinVerifyModal open={showPin} onOpenChange={setShowPin} onVerified={handlePinVerified} />

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração</AlertDialogTitle>
            <AlertDialogDescription>{confirmMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowConfirm(false); handleConfirmed(); }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}
