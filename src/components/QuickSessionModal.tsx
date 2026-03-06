import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { format, addDays, addWeeks, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarPlus, Lock, Clock, Zap, Check } from 'lucide-react';
import { useMentores, useEncontros } from '@/hooks/useSupabaseData';

const ADMIN_PIN = '1234';

const QUICK_TIMES = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

interface Props {
  mentorado: {
    id: string;
    nome: string;
    mentor_id?: string | null;
    data_inicio: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickSessionModal({ mentorado, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: mentores = [] } = useMentores();
  const { data: encontros = [] } = useEncontros();
  const { connected, syncEvent } = useGoogleCalendar();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [observacao, setObservacao] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Find the last completed meeting to suggest pattern
  const lastMeeting = useMemo(() => {
    if (!mentorado) return null;
    return encontros
      .filter(e => e.mentorado_id === mentorado.id)
      .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime())[0] || null;
  }, [mentorado, encontros]);

  // Suggest next date based on pattern (same weekday next week, same time)
  const suggestedDate = useMemo(() => {
    if (!lastMeeting) return addDays(new Date(), 7);
    const last = new Date(lastMeeting.inicio);
    return addWeeks(last, 1);
  }, [lastMeeting]);

  const suggestedTime = useMemo(() => {
    if (!lastMeeting) return '09:00';
    const last = new Date(lastMeeting.inicio);
    return format(last, 'HH:mm');
  }, [lastMeeting]);

  // Auto-select suggested date/time on open
  useEffect(() => {
    if (open && mentorado) {
      // Only if the suggested date is in the future
      const suggested = suggestedDate;
      if (suggested > new Date()) {
        setSelectedDate(suggested);
        setSelectedTime(suggestedTime);
      } else {
        // Find next occurrence of the same weekday
        const today = new Date();
        const dayOfWeek = suggestedDate.getDay();
        let next = addDays(today, 1);
        while (next.getDay() !== dayOfWeek) {
          next = addDays(next, 1);
        }
        setSelectedDate(next);
        setSelectedTime(suggestedTime);
      }
    }
  }, [open, mentorado, suggestedDate, suggestedTime]);

  // Quick date options
  const quickDates = useMemo(() => {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    const days: { label: string; date: Date }[] = [];

    // Next 7 weekdays
    let d = addDays(today, 1);
    for (let i = 0; i < 7; i++) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        const isNextWeekSameDay = selectedDate && d.toDateString() === suggestedDate.toDateString();
        days.push({
          label: format(d, "EEE dd/MM", { locale: ptBR }),
          date: d,
        });
      }
      d = addDays(d, 1);
    }
    return days;
  }, [suggestedDate, selectedDate]);

  const proximoEncontro = mentorado
    ? encontros
        .filter(e => e.mentorado_id === mentorado.id && e.status === 'Agendado' && new Date(e.inicio) > new Date())
        .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())[0]
    : null;

  const reset = () => {
    setSelectedDate(null);
    setSelectedTime('');
    setObservacao('');
    setPin('');
    setPinError(false);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (pin !== ADMIN_PIN) {
        setPinError(true);
        throw new Error('PIN incorreto');
      }

      const mentorId = mentorado?.mentor_id || mentores[0]?.id;
      if (!mentorId) throw new Error('Nenhum mentor disponível');

      if (!selectedDate && !observacao.trim()) {
        throw new Error('Preencha ao menos um campo');
      }

      if (selectedDate && selectedTime) {
        const [h, m] = selectedTime.split(':').map(Number);
        const inicio = new Date(selectedDate);
        inicio.setHours(h, m, 0, 0);
        const fim = new Date(inicio);
        fim.setHours(fim.getHours() + 1);

        const { data: inserted, error } = await supabase.from('encontros').insert({
          titulo: `Sessão - ${mentorado!.nome}`,
          mentorado_id: mentorado!.id,
          mentor_id: mentorId,
          tipo: 'Sessão',
          local: 'Online',
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
        }).select().single();
        if (error) throw error;

        // Auto-sync to Google Calendar
        if (connected && inserted) {
          try {
            await syncEvent('create', inserted);
          } catch (syncErr) {
            console.error('Google Calendar sync failed:', syncErr);
          }
        }
      }

      if (observacao.trim()) {
        const { error } = await supabase.from('historicos').insert({
          mentorado_id: mentorado!.id,
          mentor_id: mentorId,
          tipo: 'Observação',
          conteudo: observacao,
          visibilidade: 'Admin',
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encontros'] });
      queryClient.invalidateQueries({ queryKey: ['historicos'] });
      toast.success('Salvo com sucesso!');
      reset();
      onOpenChange(false);
    },
    onError: (err: any) => {
      if (err.message !== 'PIN incorreto') {
        toast.error('Erro: ' + err.message);
      }
    },
  });

  if (!mentorado) return null;

  const isSuggested = (date: Date) => date.toDateString() === suggestedDate.toDateString();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            {mentorado.nome}
          </DialogTitle>
          {lastMeeting && (
            <p className="text-xs text-muted-foreground">
              Último encontro: {format(new Date(lastMeeting.inicio), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Next scheduled meeting info */}
          {proximoEncontro && (
            <div className="p-3 rounded-lg border bg-secondary/30">
              <p className="text-xs text-muted-foreground mb-1">Próximo encontro já agendado</p>
              <p className="text-sm font-medium">
                {format(new Date(proximoEncontro.inicio), "EEEE, dd/MM 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          )}

          {/* Quick date selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CalendarPlus className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">Próxima sessão</Label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickDates.map((qd) => (
                <Button
                  key={qd.date.toISOString()}
                  type="button"
                  size="sm"
                  variant={selectedDate?.toDateString() === qd.date.toDateString() ? 'default' : 'outline'}
                  className={`text-xs h-8 px-2.5 ${isSuggested(qd.date) && selectedDate?.toDateString() !== qd.date.toDateString() ? 'border-primary/50 text-primary' : ''}`}
                  onClick={() => setSelectedDate(qd.date)}
                >
                  {isSuggested(qd.date) && <Zap className="h-3 w-3 mr-0.5" />}
                  {qd.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Quick time selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">Horário</Label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TIMES.map((t) => (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  variant={selectedTime === t ? 'default' : 'outline'}
                  className={`text-xs h-8 px-2.5 ${t === suggestedTime && selectedTime !== t ? 'border-primary/50 text-primary' : ''}`}
                  onClick={() => setSelectedTime(t)}
                >
                  {t === suggestedTime && selectedTime !== t && <Zap className="h-3 w-3 mr-0.5" />}
                  {t}
                </Button>
              ))}
            </div>
          </div>

          {/* Summary of selection */}
          {selectedDate && selectedTime && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/10 border border-primary/20">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              <p className="text-sm font-medium text-primary">
                {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })} às {selectedTime}
              </p>
            </div>
          )}

          {/* Observation */}
          <div className="space-y-1.5">
            <Label htmlFor="qs-obs" className="text-sm font-semibold">Observação (opcional)</Label>
            <Textarea
              id="qs-obs"
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              rows={2}
              placeholder="Como foi a sessão de hoje..."
            />
          </div>

          {/* PIN */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-semibold">PIN</Label>
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={4} value={pin} onChange={(v) => { setPin(v); setPinError(false); }}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {pinError && <p className="text-xs text-destructive text-center">PIN incorreto.</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={pin.length < 4 || mutation.isPending}
            >
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
