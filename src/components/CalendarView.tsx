import { useMemo, useState, useRef } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameDay, isSameMonth, addMonths, subMonths,
  addWeeks, subWeeks, differenceInMinutes,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Encontro, Mentor } from '@/types';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { isHoliday } from '@/data/holidays';

type ViewMode = 'day' | 'week' | 'month';

interface Props {
  encontros: Encontro[];
  mentores: Mentor[];
  onEventClick: (encontro: Encontro) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_NAMES_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const DAY_NAMES_TINY = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function CalendarView({ encontros, mentores, onEventClick }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>('week');
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const HOUR_HEIGHT = isMobile ? 48 : 60;

  const mentorMap = useMemo(() => {
    const m: Record<string, Mentor> = {};
    mentores.forEach(mt => { m[mt.id] = mt; });
    return m;
  }, [mentores]);

  const navigate = (dir: -1 | 1) => {
    if (view === 'month') setCurrentDate(dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, dir));
  };

  const headerLabel = () => {
    if (view === 'month') return format(currentDate, 'MMMM yyyy', { locale: ptBR });
    if (view === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
      const we = endOfWeek(currentDate, { weekStartsOn: 0 });
      if (ws.getMonth() === we.getMonth()) return format(ws, "MMMM yyyy", { locale: ptBR });
      return `${format(ws, 'MMM', { locale: ptBR })} – ${format(we, 'MMM yyyy', { locale: ptBR })}`;
    }
    return isMobile
      ? format(currentDate, "dd/MM/yyyy", { locale: ptBR })
      : format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: ptBR });
  };

  // --- MONTH VIEW ---
  const renderMonth = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const weeks: Date[][] = [];
    let day = calStart;
    while (day <= calEnd) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) { week.push(day); day = addDays(day, 1); }
      weeks.push(week);
    }

    const getEventsForDay = (d: Date) => encontros.filter(e => isSameDay(parseISO(e.inicio), d));
    const today = new Date();
    const dayNames = isMobile ? DAY_NAMES_TINY : DAY_NAMES_SHORT;

    return (
      <div className="border rounded-xl overflow-hidden bg-card">
        <div className="grid grid-cols-7 border-b bg-secondary/30">
          {dayNames.map((d, i) => (
            <div key={i} className="py-2 text-center text-[11px] font-semibold text-muted-foreground tracking-wider">
              {isMobile ? d : `${d}.`}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b last:border-b-0">
            {week.map((d, di) => {
              const events = getEventsForDay(d);
              const isToday = isSameDay(d, today);
              const isCurrentMonth = isSameMonth(d, monthStart);
              const holiday = isHoliday(d);
              return (
                <div
                  key={di}
                  className={cn(
                    'p-0.5 md:p-1 border-r last:border-r-0 cursor-pointer hover:bg-accent/20',
                    isMobile ? 'min-h-[60px]' : 'min-h-[110px]',
                    !isCurrentMonth && 'bg-muted/20',
                    isToday && 'bg-primary/8 ring-1 ring-inset ring-primary/30',
                    holiday && 'bg-destructive/5',
                  )}
                  onClick={() => { setCurrentDate(d); setView('day'); }}
                >
                  <div className={cn(
                    'text-xs font-medium mb-0.5 flex items-center justify-center rounded-full mx-auto',
                    isMobile ? 'w-6 h-6' : 'w-6 h-6',
                    isToday && 'bg-primary text-primary-foreground',
                    !isCurrentMonth && 'text-muted-foreground/50',
                  )}>
                    {format(d, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {isMobile ? (
                      events.length > 0 && (
                        <div className="flex justify-center gap-0.5 flex-wrap">
                          {events.slice(0, 3).map(evt => {
                            const mentor = mentorMap[evt.mentor_id];
                            const color = mentor?.cor_calendario || '#0d9488';
                            return (
                              <span
                                key={evt.id}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            );
                          })}
                        </div>
                      )
                    ) : (
                      <>
                        {events.slice(0, 3).map(evt => {
                          const mentor = mentorMap[evt.mentor_id];
                          const color = mentor?.cor_calendario || '#0d9488';
                          return (
                            <button
                              key={evt.id}
                              onClick={(e) => { e.stopPropagation(); onEventClick(evt); }}
                              className="w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate hover:opacity-80 flex items-center gap-1"
                            >
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                              <span className="truncate">
                                {format(parseISO(evt.inicio), 'H:mm')} {evt.titulo}
                              </span>
                            </button>
                          );
                        })}
                        {events.length > 3 && (
                          <p className="text-[10px] text-muted-foreground pl-1.5">Mais {events.length - 3}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // --- WEEK / DAY VIEW (time grid) ---
  const renderTimeGrid = (days: Date[]) => {
    const today = new Date();
    const getEventsForDay = (d: Date) =>
      encontros.filter(e => isSameDay(parseISO(e.inicio), d));

    const timeColWidth = isMobile ? 'w-10' : 'w-16';

    return (
      <div className="border rounded-xl overflow-hidden bg-card flex flex-col">
        {/* Day headers */}
        <div className="flex border-b bg-secondary/20 sticky top-0 z-10">
          <div className={cn(timeColWidth, 'flex-shrink-0 border-r')} />
          {days.map((d, i) => {
            const isToday = isSameDay(d, today);
            return (
              <div
                key={i}
                className="flex-1 text-center py-1.5 md:py-2 border-r last:border-r-0 cursor-pointer hover:bg-accent/20"
                onClick={() => { setCurrentDate(d); setView('day'); }}
              >
                <div className="text-[10px] md:text-[11px] font-semibold text-muted-foreground tracking-wider">
                  {isMobile ? DAY_NAMES_TINY[d.getDay()] : `${DAY_NAMES_SHORT[d.getDay()]}.`}
                </div>
                <div className={cn(
                  'font-semibold mt-0.5 flex items-center justify-center rounded-full mx-auto',
                  isMobile ? 'text-sm w-7 h-7' : 'text-xl w-10 h-10',
                  isToday && 'bg-primary text-primary-foreground',
                )}>
                  {format(d, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div ref={scrollRef} className="overflow-y-auto flex-1" style={{ maxHeight: isMobile ? '60vh' : '70vh' }}>
          <div className="flex relative">
            {/* Time labels */}
            <div className={cn(timeColWidth, 'flex-shrink-0')}>
              {HOURS.map(h => (
                <div key={h} className="border-r border-b relative box-border" style={{ height: HOUR_HEIGHT }}>
                  <span className={cn(
                    'absolute -top-2 right-1 text-muted-foreground',
                    isMobile ? 'text-[9px]' : 'text-[10px] right-2',
                  )}>
                    {h === 0 ? '' : `${h}:00`}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((d, di) => {
              const events = getEventsForDay(d);
              const isToday = isSameDay(d, today);

              return (
                <div key={di} className={cn('flex-1 relative border-r last:border-r-0', isToday && 'bg-accent/10')}>
                  {HOURS.map(h => (
                    <div key={h} className="border-b box-border" style={{ height: HOUR_HEIGHT }} />
                  ))}

                  {events.map(evt => {
                    const start = parseISO(evt.inicio);
                    const end = parseISO(evt.fim);
                    const startMin = start.getHours() * 60 + start.getMinutes();
                    const duration = Math.max(differenceInMinutes(end, start), 30);
                    const top = (startMin / 60) * HOUR_HEIGHT;
                    const height = (duration / 60) * HOUR_HEIGHT;
                    const mentor = mentorMap[evt.mentor_id];
                    const color = mentor?.cor_calendario || '#0d9488';

                    return (
                      <button
                        key={evt.id}
                        onClick={() => onEventClick(evt)}
                        className="absolute left-0.5 right-0.5 md:right-1 rounded-md px-1 md:px-2 py-0.5 md:py-1 text-left overflow-hidden hover:opacity-90 shadow-sm"
                        style={{
                          top,
                          height: Math.max(height, 22),
                          backgroundColor: color,
                          color: '#fff',
                          zIndex: 5,
                        }}
                      >
                        <div className={cn('font-bold truncate', isMobile ? 'text-[9px]' : 'text-[11px]')}>{evt.titulo}</div>
                        <div className={cn('opacity-90 truncate', isMobile ? 'text-[8px]' : 'text-[10px]')}>
                          {format(start, 'H:mm')} – {format(end, 'H:mm')}
                        </div>
                      </button>
                    );
                  })}

                  {isToday && (() => {
                    const now = new Date();
                    const nowMin = now.getHours() * 60 + now.getMinutes();
                    const topPx = (nowMin / 60) * HOUR_HEIGHT;
                    return (
                      <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: topPx }}>
                        <div className="flex items-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-destructive -ml-1" />
                          <div className="flex-1 h-0.5 bg-destructive" />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWeek = () => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
    // On mobile week view, show only 3 days centered around today
    if (isMobile) {
      const days = Array.from({ length: 3 }, (_, i) => addDays(currentDate, i - 1));
      return renderTimeGrid(days);
    }
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    return renderTimeGrid(days);
  };

  const renderDay = () => {
    return renderTimeGrid([currentDate]);
  };

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="outline" size="sm" className="text-xs md:text-sm" onClick={() => setCurrentDate(new Date())}>
            Hoje
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className={cn('font-semibold capitalize', isMobile ? 'text-sm ml-1' : 'text-lg ml-2')}>
            {headerLabel()}
          </h2>
        </div>

        <div className="flex items-center border rounded-lg overflow-hidden bg-secondary/30">
          {(['day', 'week', 'month'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-2.5 md:px-3 py-1.5 text-xs md:text-sm font-medium',
                view === v
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
              )}
            >
              {v === 'day' ? 'Dia' : v === 'week' ? 'Sem' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      {view === 'month' && renderMonth()}
      {view === 'week' && renderWeek()}
      {view === 'day' && renderDay()}
    </div>
  );
}
