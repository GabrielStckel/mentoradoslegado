import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHistoricos, useEncontros } from '@/hooks/useSupabaseData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, TagBadge } from '@/components/StatusBadge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Mail, Phone, MapPin, User, Plus, Pencil, Trash2, X, Check, Clock, CalendarDays } from 'lucide-react';
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
  const { data: historicos = [] } = useHistoricos(mentorado?.id);
  const { data: encontros = [] } = useEncontros();
  const [novaObs, setNovaObs] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Encontros realizados deste mentorado
  const encontrosRealizados = useMemo(() => {
    if (!mentorado) return [];
    return encontros
      .filter(e => e.mentorado_id === mentorado.id && e.status === 'Realizado')
      .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());
  }, [mentorado, encontros]);

  // Historicos sorted by date desc
  const sortedHistoricos = useMemo(() => {
    return [...historicos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [historicos]);

  const addObsMutation = useMutation({
    mutationFn: async () => {
      if (!mentorado || !novaObs.trim()) return;
      const mentorId = mentorado.mentor_id || mentorado.id;
      const { error } = await supabase.from('historicos').insert({
        mentorado_id: mentorado.id,
        mentor_id: mentorId,
        tipo: 'Observação',
        conteudo: novaObs.trim(),
        visibilidade: 'Admin',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historicos'] });
      setNovaObs('');
      toast.success('Observação adicionada!');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  const updateObsMutation = useMutation({
    mutationFn: async ({ id, conteudo }: { id: string; conteudo: string }) => {
      const { error } = await supabase.from('historicos').update({ conteudo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historicos'] });
      setEditingId(null);
      toast.success('Observação atualizada!');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  const deleteObsMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('historicos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historicos'] });
      toast.success('Observação removida!');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
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

          {/* Encontros Realizados History */}
          {encontrosRealizados.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Encontros Realizados</Label>
              </div>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                {encontrosRealizados.map(e => (
                  <div key={e.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-secondary/30">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground w-20 flex-shrink-0">
                      {format(new Date(e.inicio), 'dd/MM/yyyy')}
                    </span>
                    <span className="text-xs font-medium truncate">{e.titulo}</span>
                  </div>
                ))}
              </div>
              <Separator />
            </div>
          )}

          {/* Observações / Histórico */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">Observações</Label>
            </div>

            {/* Add new observation */}
            <div className="flex gap-2">
              <Textarea
                value={novaObs}
                onChange={e => setNovaObs(e.target.value)}
                rows={2}
                placeholder="Nova observação..."
                className="text-sm flex-1"
              />
              <Button
                size="sm"
                onClick={() => addObsMutation.mutate()}
                disabled={!novaObs.trim() || addObsMutation.isPending}
                className="self-end"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Observations list */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {sortedHistoricos.map(h => (
                <div key={h.id} className="p-3 rounded-lg border bg-secondary/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">{h.tipo}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(h.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => { setEditingId(h.id); setEditText(h.conteudo); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => deleteObsMutation.mutate(h.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {editingId === h.id ? (
                    <div className="flex gap-2">
                      <Textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        rows={2}
                        className="text-sm flex-1"
                        autoFocus
                      />
                      <div className="flex flex-col gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateObsMutation.mutate({ id: h.id, conteudo: editText })}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingId(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{h.conteudo}</p>
                  )}
                </div>
              ))}
              {sortedHistoricos.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Nenhuma observação registrada.</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
