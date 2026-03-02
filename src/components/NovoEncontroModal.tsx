import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { useMentorados, useMentores } from '@/hooks/useSupabaseData';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NovoEncontroModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: mentorados = [] } = useMentorados();
  const { data: mentores = [] } = useMentores();

  const [titulo, setTitulo] = useState('');
  const [mentoradoId, setMentoradoId] = useState('');
  const [mentoradoOpen, setMentoradoOpen] = useState(false);
  const [local, setLocal] = useState('Online');
  const [dataSelecionada, setDataSelecionada] = useState<Date | undefined>();
  const [dataPopoverOpen, setDataPopoverOpen] = useState(false);
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');

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
  const [notasOperacionais, setNotasOperacionais] = useState('');

  const selectedMentorado = useMemo(() => mentorados.find(m => m.id === mentoradoId), [mentorados, mentoradoId]);

  const reset = () => {
    setTitulo(''); setMentoradoId('');
    setLocal('Online'); setDataSelecionada(undefined); setDataPopoverOpen(false);
    setHoraInicio(''); setHoraFim('');
    setNotasOperacionais('');
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!dataSelecionada) throw new Error('Data não selecionada');
      const dateStr = format(dataSelecionada, 'yyyy-MM-dd');
      const inicio = new Date(`${dateStr}T${horaInicio}`).toISOString();
      const fim = new Date(`${dateStr}T${horaFim}`).toISOString();
      
      // Auto-assign mentor: use mentorado's mentor_id or first available mentor
      const mentorId = selectedMentorado?.mentor_id || mentores[0]?.id;
      if (!mentorId) throw new Error('Nenhum mentor disponível');

      const { error } = await supabase.from('encontros').insert({
        titulo,
        mentorado_id: mentoradoId,
        mentor_id: mentorId,
        tipo: 'Sessão',
        local,
        inicio,
        fim,
        notas_operacionais: notasOperacionais,
      });
      if (error) throw error;
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
                <Button variant="outline" role="combobox" aria-expanded={mentoradoOpen} className="w-full justify-between font-normal">
                  {selectedMentorado ? selectedMentorado.nome : 'Buscar mentorado...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar mentorado..." />
                  <CommandList>
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
            <Label>Local</Label>
            <Select value={local} onValueChange={setLocal}>
              <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="Presencial">Presencial</SelectItem>
                <SelectItem value="Google Meet">Google Meet</SelectItem>
                <SelectItem value="Zoom">Zoom</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ne-hora-ini" className="text-base font-semibold">🕐 Início *</Label>
              <Input id="ne-hora-ini" type="time" value={horaInicio} onChange={e => handleHoraInicioChange(e.target.value)} required className="h-14 text-lg px-4" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ne-hora-fim" className="text-base font-semibold">🕑 Fim *</Label>
              <Input id="ne-hora-fim" type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} required className="h-14 text-lg px-4" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ne-notas">Notas operacionais</Label>
            <Textarea id="ne-notas" value={notasOperacionais} onChange={e => setNotasOperacionais(e.target.value)} rows={2} placeholder="Observações..." />
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
  );
}
