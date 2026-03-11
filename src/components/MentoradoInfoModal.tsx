import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, TagBadge } from '@/components/StatusBadge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Mail, Phone, MapPin, Save, User } from 'lucide-react';
import { whatsappLink } from '@/lib/phone';

interface Props {
  mentorado: {
    id: string;
    nome: string;
    email: string;
    telefone_whatsapp: string;
    cidade: string;
    origem: string;
    status: string;
    tags: string[];
    data_inicio: string;
    total_encontros: number;
    encontros_realizados?: number;
    observacoes_gerais: string;
    mentor_id?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MentoradoInfoModal({ mentorado, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (open && mentorado) {
      setObservacoes(mentorado.observacoes_gerais || '');
    }
  }, [open, mentorado]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!mentorado) return;
      const { error } = await supabase
        .from('mentorados')
        .update({ observacoes_gerais: observacoes })
        .eq('id', mentorado.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorados'] });
      toast.success('Observações salvas!');
    },
    onError: (err: any) => {
      toast.error('Erro ao salvar: ' + err.message);
    },
  });

  if (!mentorado) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            {mentorado.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status & Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={mentorado.status as any} />
            {(mentorado.tags || []).map(t => <TagBadge key={t} tag={t as any} />)}
          </div>

          <Separator />

          {/* Contact info */}
          <div className="space-y-3 text-sm">
            {mentorado.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{mentorado.email}</span>
              </div>
            )}
            {mentorado.telefone_whatsapp && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <a href={whatsappLink(mentorado.telefone_whatsapp)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {mentorado.telefone_whatsapp}
                </a>
              </div>
            )}
            {mentorado.cidade && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>{mentorado.cidade}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Origem</p>
              <p className="font-medium">{mentorado.origem || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Desde</p>
              <p className="font-medium">{format(new Date(mentorado.data_inicio), 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Encontros contratados</p>
              <p className="font-medium">{mentorado.total_encontros}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Realizados</p>
              <p className="font-medium">{mentorado.encontros_realizados || 0}</p>
            </div>
          </div>

          <Separator />

          {/* Observações - editable and auto-saved */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Observações</Label>
            <Textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              rows={4}
              placeholder="Anotações sobre o mentorado..."
              className="text-sm"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || observacoes === (mentorado.observacoes_gerais || '')}
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {saveMutation.isPending ? 'Salvando...' : 'Salvar observações'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
