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
import { useMentorados, useMentores } from '@/hooks/useSupabaseData';
import { toast } from 'sonner';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [tipo, setTipo] = useState('Sessão');
  const [local, setLocal] = useState('Online');
  const [linkReuniao, setLinkReuniao] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [notasOperacionais, setNotasOperacionais] = useState('');

  const selectedMentorado = useMemo(() => mentorados.find(m => m.id === mentoradoId), [mentorados, mentoradoId]);

  const reset = () => {
    setTitulo(''); setMentoradoId('');
    setTipo('Sessão'); setLocal('Online'); setLinkReuniao('');
    setDataInicio(''); setHoraInicio(''); setHoraFim('');
    setNotasOperacionais('');
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const inicio = new Date(`${dataInicio}T${horaInicio}`).toISOString();
      const fim = new Date(`${dataInicio}T${horaFim}`).toISOString();
      
      // Auto-assign mentor: use mentorado's mentor_id or first available mentor
      const mentorId = selectedMentorado?.mentor_id || mentores[0]?.id;
      if (!mentorId) throw new Error('Nenhum mentor disponível');

      const { error } = await supabase.from('encontros').insert({
        titulo,
        mentorado_id: mentoradoId,
        mentor_id: mentorId,
        tipo,
        local,
        link_reuniao: linkReuniao,
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sessão">Sessão</SelectItem>
                  <SelectItem value="Follow-up">Follow-up</SelectItem>
                  <SelectItem value="Avaliação">Avaliação</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Local</Label>
              <Select value={local} onValueChange={setLocal}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Presencial">Presencial</SelectItem>
                  <SelectItem value="Google Meet">Google Meet</SelectItem>
                  <SelectItem value="Zoom">Zoom</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ne-data">Data *</Label>
            <Input id="ne-data" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ne-hora-ini">Hora início *</Label>
              <Input id="ne-hora-ini" type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ne-hora-fim">Hora fim *</Label>
              <Input id="ne-hora-fim" type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ne-link">Link da reunião</Label>
            <Input id="ne-link" value={linkReuniao} onChange={e => setLinkReuniao(e.target.value)} placeholder="https://meet.google.com/..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ne-notas">Notas operacionais</Label>
            <Textarea id="ne-notas" value={notasOperacionais} onChange={e => setNotasOperacionais(e.target.value)} rows={2} placeholder="Observações..." />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={!titulo || !mentoradoId || !dataInicio || !horaInicio || !horaFim || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Criar Encontro'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
