import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHistoricos, useEncontros, useAtividadesLog } from '@/hooks/useSupabaseData';
import TimelineAtividade, { AtividadeLog } from '@/components/TimelineAtividade';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, TagBadge } from '@/components/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Mail, Phone, MapPin, User, Plus, Pencil, Trash2, X, Check, Clock, CalendarDays, ScrollText } from 'lucide-react';
import { whatsappLink } from '@/lib/phone';
import { useAuth } from '@/hooks/useAuth';

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
  const { data: atividades = [] } = useAtividadesLog(mentorado?.id ? { mentoradoId: mentorado.id } : undefined);
  const { user } = useAuth();
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

  // Sessões marcadas via histórico (tipo 'Sessão Realizada')
  const sessoesRealizadas = useMemo(() => {
    return historicos
      .filter(h => h.tipo === 'Sessão Realizada')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [historicos]);

  // All observations (manual + session-linked)
  const observacoes = useMemo(() => {
    return historicos
      .filter(h => h.tipo !== 'Sessão Realizada')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [historicos]);

  const addObsMutation = useMutation({
    mutationFn: async () => {
      if (!mentorado || !novaObs.trim()) return;

      let resolvedMentorId = mentorado.mentor_id?.trim() || null;

      if (!resolvedMentorId && user?.id) {
        const { data, error } = await supabase
          .from('mentores')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        resolvedMentorId = data?.id ?? null;
      }

      if (!resolvedMentorId) {
        throw new Error('Não foi possível identificar o mentor para salvar a observação.');
      }

      const { error } = await supabase.from('historicos').insert({
        mentorado_id: mentorado.id,
        mentor_id: resolvedMentorId,
        tipo: 'Observação',
        conteudo: novaObs.trim(),
        visibilidade: 'Admin',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historicos'] });
      queryClient.invalidateQueries({ queryKey: ['atividades_log'] });
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
      queryClient.invalidateQueries({ queryKey: ['atividades_log'] });
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
      queryClient.invalidateQueries({ queryKey: ['atividades_log'] });
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
              <p className="text-xs text-muted-foreground">Sessões contratadas</p>
              <p className="font-medium">{mentorado.total_encontros}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Realizadas</p>
              <p className="font-medium">{mentorado.encontros_realizados || 0}</p>
            </div>
          </div>

          <Separator />

          {/* Tabs for Observações and Encontros */}
          <Tabs defaultValue="observacoes" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="observacoes" className="flex-1 text-xs">
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Observações ({observacoes.length})
              </TabsTrigger>
              <TabsTrigger value="encontros" className="flex-1 text-xs">
                <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                Sessões Realizadas ({sessoesRealizadas.length + encontrosRealizados.length})
              </TabsTrigger>
              <TabsTrigger value="historico" className="flex-1 text-xs">
                <ScrollText className="h-3.5 w-3.5 mr-1.5" />
                Histórico ({atividades.length})
              </TabsTrigger>
            </TabsList>

            {/* Observações Tab */}
            <TabsContent value="observacoes" className="space-y-3">
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
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {observacoes.map(h => (
                  <div key={h.id} className="p-3 rounded-lg border bg-secondary/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">{h.tipo}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(h.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingId(h.id); setEditText(h.conteudo); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => deleteObsMutation.mutate(h.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {editingId === h.id ? (
                      <div className="flex gap-2">
                        <Textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2} className="text-sm flex-1" autoFocus />
                        <div className="flex flex-col gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateObsMutation.mutate({ id: h.id, conteudo: editText })}><Check className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{h.conteudo}</p>
                    )}
                  </div>
                ))}
                {observacoes.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Nenhuma observação registrada.</p>
                )}
              </div>
            </TabsContent>

            {/* Sessões Realizadas Tab */}
            <TabsContent value="encontros" className="space-y-2">
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {/* Sessões marcadas manualmente (via +) */}
                {sessoesRealizadas.map(h => (
                  <div key={h.id} className="flex items-center gap-3 text-sm p-2.5 rounded-lg bg-secondary/20 border">
                    <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span className="text-xs font-semibold text-foreground flex-shrink-0">{h.conteudo}</span>
                    <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                      {format(new Date(h.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                ))}

                {/* Sessões da agenda com status Realizado */}
                {encontrosRealizados.map(e => (
                  <div key={e.id} className="flex items-center gap-3 text-sm p-2.5 rounded-lg bg-secondary/30 border">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs font-semibold text-foreground flex-shrink-0">{e.titulo}</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary flex-shrink-0">Agenda</span>
                    <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                      {format(new Date(e.inicio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                ))}

                {sessoesRealizadas.length === 0 && encontrosRealizados.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Nenhuma sessão realizada registrada.</p>
                )}
              </div>
            </TabsContent>

            {/* Histórico Tab */}
            <TabsContent value="historico" className="space-y-2">
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {(atividades as AtividadeLog[]).map(l => (
                  <TimelineAtividade key={l.id} log={l} />
                ))}
                {atividades.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Nenhuma atividade registrada.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
