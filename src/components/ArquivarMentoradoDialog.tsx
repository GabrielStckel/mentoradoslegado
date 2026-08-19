import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Archive } from 'lucide-react';
import { toast } from 'sonner';
import { toTitleCase } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Props {
  mentorado: any;
  /** tamanho do botão de ícone */
  size?: 'sm' | 'md';
  /** exibe botão com texto "Arquivar" em vez de apenas ícone */
  withLabel?: boolean;
  onArchived?: () => void;
}

export default function ArquivarMentoradoDialog({ mentorado, size = 'sm', withLabel = false, onArchived }: Props) {
  const queryClient = useQueryClient();
  const [motivo, setMotivo] = useState('');
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const arquivarMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('arquivar_mentorado', {
        p_mentorado_id: mentorado.id,
        p_motivo: motivo.trim(),
      });
      if (error) throw error;
      return (data as number) ?? 0;
    },
    onSuccess: (cancelados) => {
      queryClient.invalidateQueries({ queryKey: ['mentorados'] });
      queryClient.invalidateQueries({ queryKey: ['mentorados_arquivados'] });
      queryClient.invalidateQueries({ queryKey: ['encontros'] });
      queryClient.invalidateQueries({ queryKey: ['atividades_log'] });
      setMotivo('');
      toast.success(`Mentorado arquivado. ${cancelados} encontro(s) futuro(s) cancelado(s).`);
      onArchived?.();
    },
    onError: (err: any) => toast.error('Erro ao arquivar: ' + err.message),
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {withLabel ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-amber-600 border-amber-500/40 hover:text-amber-700 hover:bg-amber-500/10"
            onClick={stop}
          >
            <Archive className="h-4 w-4" /> Arquivar
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={`${size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'} text-amber-600 hover:text-amber-700`}
            title="Arquivar"
            onClick={stop}
          >
            <Archive className="h-4 w-4" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent onClick={stop}>
        <AlertDialogHeader>
          <AlertDialogTitle>Arquivar mentorado?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{toTitleCase(mentorado?.nome || '')}</strong> sai da lista de mentorados, mas o
            progresso, encontros passados e observações são <strong>preservados</strong>.
            Os encontros futuros agendados serão <strong>cancelados</strong> para liberar a agenda.
            Você pode restaurá-lo a qualquer momento em <strong>Arquivados</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`motivo-arq-${mentorado?.id}`}>Motivo do arquivamento *</Label>
          <Textarea
            id={`motivo-arq-${mentorado?.id}`}
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            rows={3}
            placeholder="Ex: parou na 3ª sessão, sem previsão de retorno..."
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setMotivo('')}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => arquivarMutation.mutate()}
            disabled={motivo.trim().length < 5 || arquivarMutation.isPending}
            className="bg-amber-600 text-white hover:bg-amber-600/90"
          >
            Arquivar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
