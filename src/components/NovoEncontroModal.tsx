import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ScrollTimePicker from '@/components/ScrollTimePicker';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { useMentorados, useMentores, useLocais, useEncontros } from '@/hooks/useSupabaseData';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, CalendarIcon, Settings2, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LocaisManagerModal from '@/components/LocaisManagerModal';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NovoEncontroModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: mentorados = [] } = useMentorados();
  const { data: mentores = [] } = useMentores();
  const { data: locais = [] } = useLocais();
  const { data: encontros = [] } = useEncontros();
  const { connected, syncEvent } = useGoogleCalendar();

  const [titulo, setTitulo] = useState('');
  const [mentoradoId, setMentoradoId] = useState('');
  const [mentoradoOpen, setMentoradoOpen] = useState(false);
  const [local, setLocal] = useState('Online');
  const [showLocaisManager, setShowLocaisManager] = useState(false);
  const [dataSelecionada, setDataSelecionada] = useState<Date | undefined>();
  const [dataPopoverOpen, setDataPopoverOpen] = useState(false);
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [replacingVagoId, setReplacingVagoId] = useState<string | null>(null);

  // Auto-calculate end time (1h30min after start)
  const handleHoraInicioChange = (value: string) => {
    setHoraInicio(value);
    if (value) {
      const [h, m] = value.split(':').map(Number);
      const totalMin = h * 60 + m + 90;
      const endH = Math.floor(totalMin / 60) % 24;
      const endM = totalMin % 60;
      setHoraFim(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);
    }
  };
  const [observacao, setObservacao] = useState('');

  const selectedMentorado = useMemo(() => mentorados.find(m => m.id === mentoradoId), [mentorados, mentoradoId]);

  const reset = () => {
    setTitulo(''); setMentoradoId('');
    setLocal('Online'); setDataSelecionada(undefined); setDataPopoverOpen(false);
    setHoraInicio(''); setHoraFim('');
    setObservacao(''); setReplacingVagoId(null);
  };

  const handleSelectVago = (encontro: any) => {
    const inicio = new Date(encontro.inicio);
    const fim = new Date(encontro.fim);
    setHoraInicio(format(inicio, 'HH:mm'));
    setHoraFim(format(fim, 'HH:mm'));
    setReplacingVagoId(encontro.id);
    toast.info('Horário VAGO selecionado — preencha os dados e salve para substituir.');
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!dataSelecionada) throw new Error('Data não selecionada');
      const dateStr = format(dataSelecionada, 'yyyy-MM-dd');
      const inicio = new Date(`${dateStr}T${horaInicio}`).toISOString();
      const fim = new Date(`${dateStr}T${horaFim}`).toISOString();
      
      const mentorId = selectedMentorado?.mentor_id || mentores[0]?.id;
      if (!mentorId) throw new Error('Nenhum mentor disponível');

      const { data: inserted, error } = await supabase.from('encontros').insert({
        titulo,
        mentorado_id: mentoradoId,
        mentor_id: mentorId,
        tipo: 'Sessão',
        local,
        inicio,
        fim,
        notas_operacionais: observacao,
      }).select().single();
      if (error) throw error;

      if (connected && inserted) {
        try {
          await syncEvent('create', inserted);
        } catch (syncErr) {
          console.error('Google Calendar sync failed:', syncErr);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encontros'] });
      toast.success('Encontro criado com sucesso!');
      reset();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error('Erro ao criar encontro: ' + err.message);
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Encontro</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ne-titulo">Título *</Label>
              <Input id="ne-titulo" value={titulo} onChange={e => setTitulo(e.target.value)} required placeholder="Ex: Sessão de mentoria" />
            </div>

            <div className="space-y-2">
              <Label>Mentorado *</Label>
              <Popover open={mentoradoOpen} onOpenChange={setMentoradoOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={mentoradoOpen} className="w-full h-12 text-base justify-between font-normal">
                    {selectedMentorado ? selectedMentorado.nome : 'Buscar mentorado...'}
                    <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar mentorado..." className="h-12 text-base" />
                    <CommandList className="max-h-[200px]">
                      <CommandEmpty>Nenhum mentorado encontrado.</CommandEmpty>
                      <CommandGroup>
                        {mentorados.map(m => (
                          <CommandItem
                            key={m.id}
                            value={m.nome}
                            onSelect={() => {
                              setMentoradoId(m.id);
                              setMentoradoOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", mentoradoId === m.id ? "opacity-100" : "opacity-0")} />
                            {m.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Local</Label>
                <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => setShowLocaisManager(true)}>
                  <Settings2 className="h-3 w-3" /> Gerenciar
                </Button>
              </div>
              <Select value={local} onValueChange={setLocal}>
                <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {locais.map((l: any) => (
                    <SelectItem key={l.id} value={l.nome}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">📅 Data do encontro *</Label>
              <Popover open={dataPopoverOpen} onOpenChange={setDataPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-14 text-lg px-4 justify-start text-left font-normal",
                      !dataSelecionada && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    {dataSelecionada ? format(dataSelecionada, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Selecione a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataSelecionada}
                    onSelect={(date) => { setDataSelecionada(date); setDataPopoverOpen(false); }}
                    initialFocus
                    locale={ptBR}
                    className={cn("p-4 pointer-events-auto text-base")}
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-base font-semibold",
                      nav_button: cn("h-9 w-9 bg-transparent p-0 opacity-50 hover:opacity-100"),
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: "text-muted-foreground rounded-md w-12 font-normal text-sm",
                      row: "flex w-full mt-2",
                      cell: "h-12 w-12 text-center text-base p-0 relative focus-within:relative focus-within:z-20",
                      day: "h-12 w-12 p-0 font-normal text-base hover:bg-accent hover:text-accent-foreground rounded-md transition-colors",
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground font-bold",
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-50",
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {dataSelecionada && (() => {
              const encontrosDoDia = encontros
                .filter(e => isSameDay(new Date(e.inicio), dataSelecionada) && e.status !== 'Cancelado' && e.titulo !== 'VAGO')
                .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());

              // Check for time conflict
              const hasConflict = horaInicio && horaFim && dataSelecionada && encontrosDoDia.some(e => {
                const dateStr = format(dataSelecionada, 'yyyy-MM-dd');
                const newStart = new Date(`${dateStr}T${horaInicio}`).getTime();
                const newEnd = new Date(`${dateStr}T${horaFim}`).getTime();
                const eStart = new Date(e.inicio).getTime();
                const eFim = new Date(e.fim).getTime();
                return newStart < eFim && newEnd > eStart;
              });

              return (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Agenda do dia — {format(dataSelecionada, "dd/MM (EEEE)", { locale: ptBR })}
                  </Label>
                  {encontrosDoDia.length === 0 ? (
                    <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2">
                      ✅ Dia livre — nenhum compromisso agendado.
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {encontrosDoDia.map(e => (
                        <div key={e.id} className="flex items-center gap-2 text-xs bg-secondary/30 rounded-md px-3 py-1.5">
                          <span className="font-semibold text-foreground flex-shrink-0">
                            {format(new Date(e.inicio), 'HH:mm')} - {format(new Date(e.fim), 'HH:mm')}
                          </span>
                          <span className="text-muted-foreground truncate">{e.titulo}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {hasConflict && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 rounded-md px-3 py-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Conflito de horário com um compromisso existente!</span>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">🕐 Início *</Label>
                <ScrollTimePicker value={horaInicio} onChange={handleHoraInicioChange} label="Início" />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">🕑 Fim *</Label>
                <ScrollTimePicker value={horaFim} onChange={setHoraFim} label="Fim" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ne-obs">Observação</Label>
              <Textarea id="ne-obs" value={observacao} onChange={e => setObservacao(e.target.value)} rows={2} placeholder="Observações (opcional)..." />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={!titulo || !mentoradoId || !dataSelecionada || !horaInicio || !horaFim || mutation.isPending}>
                {mutation.isPending ? 'Salvando...' : 'Criar Encontro'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <LocaisManagerModal open={showLocaisManager} onOpenChange={setShowLocaisManager} />
    </>
  );
}
