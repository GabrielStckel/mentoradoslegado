import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin, Link2, ExternalLink, Send, Trash2 } from 'lucide-react';
import { whatsappLink } from '@/lib/phone';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatusBadge, TipoBadge } from '@/components/StatusBadge';
import { Encontro, EncontroStatus, Mentorado, Mentor } from '@/types';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { toast } from 'sonner';

interface Props {
  encontro: Encontro | null;
  mentorado?: Mentorado;
  mentor?: Mentor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (id: string, status: EncontroStatus) => void;
  onDelete?: (encontro: Encontro) => void;
}

export default function MeetingModal({ encontro, mentorado, mentor, open, onOpenChange, onStatusChange, onDelete }: Props) {
  const { connected, syncEvent } = useGoogleCalendar();
  const [syncing, setSyncing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!encontro) return null;

  const inicio = new Date(encontro.inicio);
  const fim = new Date(encontro.fim);

  const handleSyncToGoogle = async () => {
    setSyncing(true);
    try {
      const action = encontro.google_event_id ? 'update' : 'create';
      await syncEvent(action, encontro);
      toast.success(action === 'create' ? 'Sincronizado com Google Agenda!' : 'Atualizado no Google Agenda!');
    } catch (err) {
      toast.error('Erro ao sincronizar com Google Agenda');
      console.error(err);
    }
    setSyncing(false);
  };

  const handleRemoveFromGoogle = async () => {
    if (!encontro.google_event_id) return;
    setSyncing(true);
    try {
      await syncEvent('delete', encontro);
      toast.success('Removido do Google Agenda!');
    } catch (err) {
      toast.error('Erro ao remover do Google Agenda');
      console.error(err);
    }
    setSyncing(false);
  };

  const buildWhatsAppLink = (template: string) => {
    if (!mentorado) return '#';
    const msg = encodeURIComponent(
      template
        .replace('{nome}', mentorado.nome)
        .replace('{data}', format(inicio, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }))
        .replace('{link}', encontro.link_reuniao || 'a definir')
    );
    return whatsappLink(mentorado.telefone_whatsapp, decodeURIComponent(msg));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto w-[calc(100%-2rem)] sm:w-full rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <DialogTitle className="text-lg">{encontro.titulo}</DialogTitle>
            <TipoBadge tipo={encontro.tipo} />
            <StatusBadge status={encontro.status} />
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{format(inicio, "dd/MM 'às' HH:mm")} — {format(fim, "HH:mm")}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{encontro.local}</span>
            </div>
            {mentorado && (
              <div className="text-muted-foreground col-span-1 sm:col-span-2">
                <span className="font-medium text-foreground">Mentorado:</span> {mentorado.nome}
              </div>
            )}
          </div>

          {encontro.link_reuniao && (
            <a
              href={encontro.link_reuniao}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Link2 className="h-4 w-4" /> {encontro.link_reuniao}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          <Separator />

          <div className="flex items-center gap-3 flex-wrap">
            <Label className="text-sm font-medium">Status:</Label>
            {(['Agendado', 'Realizado', 'Cancelado', 'Faltou', 'Reagendado'] as EncontroStatus[]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={encontro.status === s ? 'default' : 'outline'}
                className="text-xs h-7"
                onClick={() => onStatusChange?.(encontro.id, s)}
              >
                {s}
              </Button>
            ))}
          </div>

          <Separator />

          <Tabs defaultValue="notas">
            <TabsList className="w-full">
              <TabsTrigger value="notas" className="flex-1">Notas</TabsTrigger>
              <TabsTrigger value="lembretes" className="flex-1">Lembretes</TabsTrigger>
              <TabsTrigger value="google" className="flex-1">Google</TabsTrigger>
            </TabsList>

            <TabsContent value="notas" className="space-y-3 pt-2">
              <div>
                <Label className="text-xs text-muted-foreground">Notas do Mentor (privado)</Label>
                <Textarea defaultValue={encontro.notas_do_mentor} rows={3} className="mt-1 text-sm" placeholder="Observações do mentor..." />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Notas Operacionais</Label>
                <Textarea defaultValue={encontro.notas_operacionais} rows={2} className="mt-1 text-sm" placeholder="Notas operacionais..." />
              </div>
              {encontro.proxima_acao && (
                <div>
                  <Label className="text-xs text-muted-foreground">Próxima ação</Label>
                  <p className="text-sm mt-1">{encontro.proxima_acao}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="lembretes" className="space-y-3 pt-2">
              {[
                { label: 'Lembrete 24h', sent: encontro.lembrete_24h_enviado, msg: 'Olá {nome}! 😊 Lembrando que amanhã temos nosso encontro agendado para {data}. Link: {link}' },
                { label: 'Lembrete 3h', sent: encontro.lembrete_3h_enviado, msg: 'Oi {nome}! Nosso encontro começa em 3 horas ({data}). Link: {link}. Até já! 🙌' },
                { label: 'Lembrete 10min', sent: encontro.lembrete_10min_enviado, msg: 'Oi {nome}! Começamos em 10 minutos! 🚀 Link: {link}' },
              ].map((l) => (
                <div key={l.label} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30">
                  <div>
                    <p className="text-sm font-medium">{l.label}</p>
                    <p className="text-xs text-muted-foreground">{l.sent ? '✅ Enviado' : '⏳ Não enviado'}</p>
                  </div>
                  <Button size="sm" variant="outline" asChild disabled={l.sent}>
                    <a href={buildWhatsAppLink(l.msg)} target="_blank" rel="noopener noreferrer">
                      <Send className="h-3.5 w-3.5 mr-1.5" /> WhatsApp
                    </a>
                  </Button>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="google" className="space-y-3 pt-2">
              <div className="p-4 rounded-lg border bg-secondary/30 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  {encontro.sincronizado_google
                    ? '✅ Sincronizado com Google Agenda'
                    : '⏳ Não sincronizado com Google Agenda'}
                </p>
                {connected && (
                  <div className="flex gap-2 justify-center flex-wrap">
                    <Button size="sm" variant={encontro.sincronizado_google ? 'outline' : 'default'} onClick={handleSyncToGoogle} disabled={syncing}>
                      {syncing ? 'Sincronizando...' : encontro.sincronizado_google ? 'Atualizar no Google' : 'Sincronizar agora'}
                    </Button>
                    {encontro.sincronizado_google && (
                      <Button size="sm" variant="outline" className="text-destructive" onClick={handleRemoveFromGoogle} disabled={syncing}>
                        Remover do Google
                      </Button>
                    )}
                  </div>
                )}
                {!connected && (
                  <p className="text-xs text-muted-foreground">Conecte o Google Calendar para sincronizar.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Delete section */}
          <div className="flex justify-end">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Tem certeza?</span>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="text-xs h-7"
                  onClick={() => {
                    onDelete?.(encontro);
                    setConfirmDelete(false);
                    onOpenChange(false);
                  }}
                >
                  Confirmar exclusão
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="text-xs h-7 text-destructive border-destructive/30" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir encontro
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
