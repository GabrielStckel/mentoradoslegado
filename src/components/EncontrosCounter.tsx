import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePinSettings } from '@/hooks/usePinSettings';
import { PinVerifyModal } from '@/components/PinModal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Minus, Save } from 'lucide-react';
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [showObservacao, setShowObservacao] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [pendingAction, setPendingAction] = useState<'add' | 'remove' | null>(null);

  const pinEnabled = !!(pinSettings?.pin && pinSettings.enabled);

  const mutation = useMutation({
    mutationFn: async ({ action, obs }: { action: 'add' | 'remove'; obs?: string }) => {
      const newRealizados = action === 'add' ? realizados + 1 : Math.max(0, realizados - 1);

      const { error: updateError } = await supabase
        .from('mentorados')
        .update({ encontros_realizados: newRealizados } as any)
        .eq('id', mentoradoId);
      if (updateError) throw updateError;

      const logMentorId = mentorId || user?.id || mentoradoId;

      // Log the counter change
      const { error: logError } = await supabase.from('historicos').insert({
        mentorado_id: mentoradoId,
        mentor_id: logMentorId,
        tipo: 'Sessão Realizada',
        conteudo: action === 'add'
          ? `Encontro realizado #${newRealizados}${obs ? ` — ${obs}` : ''}`
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
    setPendingAction(action);
    if (pinEnabled) {
      setShowPin(true);
    } else {
      setShowConfirm(true);
    }
  };

  const handleConfirmed = () => {
    if (pendingAction === 'add') {
      // Show observation dialog for add
      setShowObservacao(true);
    } else if (pendingAction) {
      mutation.mutate({ action: pendingAction });
      setPendingAction(null);
    }
  };

  const handleSaveObservacao = () => {
    mutation.mutate({ action: 'add', obs: observacao.trim() || undefined });
    setShowObservacao(false);
    setObservacao('');
    setPendingAction(null);
  };

  const handleSkipObservacao = () => {
    mutation.mutate({ action: 'add' });
    setShowObservacao(false);
    setObservacao('');
    setPendingAction(null);
  };

  const handlePinVerified = () => {
    handleConfirmed();
  };

  const confirmMessage = pendingAction === 'add'
    ? `Marcar mais 1 encontro realizado para ${mentoradoNome}? (${realizados} → ${realizados + 1})`
    : `Remover 1 encontro realizado de ${mentoradoNome}? (${realizados} → ${Math.max(0, realizados - 1)})`;

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

      {/* Observation dialog after confirming + */}
      <Dialog open={showObservacao} onOpenChange={(o) => { if (!o) handleSkipObservacao(); }}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="text-base">Observação da sessão</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sessão #{realizados + 1} de {mentoradoNome} registrada. Deseja adicionar uma observação?
            </p>
            <Textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              rows={3}
              placeholder="Como foi a sessão..."
              className="text-sm"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleSkipObservacao}>
              Pular
            </Button>
            <Button onClick={handleSaveObservacao} disabled={mutation.isPending}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
