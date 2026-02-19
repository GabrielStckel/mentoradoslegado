import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Encontro, Mentor } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  encontros: Encontro[];
  mentores: Mentor[];
  onEventClick: (encontro: Encontro) => void;
}

export default function CalendarView({ encontros, mentores, onEventClick }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');

  const mentorMap = useMemo(() => {
    const m: Record<string, Mentor> = {};
    mentores.forEach(mt => { m[mt.id] = mt; });
    return m;
  }, [mentores]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const today = new Date();

  const getEventsForDay = (d: Date) => encontros.filter(e => isSameDay(new Date(e.inicio), d));

  const statusDot: Record<string, string> = {
    Agendado: 'bg-info', Realizado: 'bg-success', Cancelado: 'bg-destructive',
    Reagendado: 'bg-warning', Faltou: 'bg-destructive',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold capitalize min-w-[180px] text-center">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border rounded-xl overflow-hidden bg-card">
        {/* Day names */}
        <div className="grid grid-cols-7 border-b bg-secondary/30">
          {dayNames.map(d => (
            <div key={d} className="py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b last:border-b-0">
            {week.map((d, di) => {
              const events = getEventsForDay(d);
              const isToday = isSameDay(d, today);
              const isCurrentMonth = isSameMonth(d, monthStart);

              return (
                <div
                  key={di}
                  className={cn(
                    'min-h-[100px] p-1.5 border-r last:border-r-0 transition-colors',
                    !isCurrentMonth && 'bg-muted/30',
                    isToday && 'bg-accent/40'
                  )}
                >
                  <div className={cn(
                    'text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                    isToday && 'bg-primary text-primary-foreground',
                    !isCurrentMonth && 'text-muted-foreground/50'
                  )}>
                    {format(d, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {events.slice(0, 3).map(evt => {
                      const mentor = mentorMap[evt.mentor_id];
                      return (
                        <button
                          key={evt.id}
                          onClick={() => onEventClick(evt)}
                          className="w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate transition-colors hover:opacity-80"
                          style={{ backgroundColor: `${mentor?.cor_calendario || '#0d9488'}20`, color: mentor?.cor_calendario || '#0d9488' }}
                        >
                          <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1', statusDot[evt.status])} />
                          {format(new Date(evt.inicio), 'HH:mm')} {evt.titulo}
                        </button>
                      );
                    })}
                    {events.length > 3 && (
                      <p className="text-[10px] text-muted-foreground pl-1.5">+{events.length - 3} mais</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
