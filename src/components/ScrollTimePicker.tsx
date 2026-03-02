import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface ScrollTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const CENTER = Math.floor(VISIBLE_ITEMS / 2);

function ScrollColumn({ items, selected, onSelect }: { items: string[]; selected: string; onSelect: (val: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const scrollToItem = useCallback((value: string, smooth = false) => {
    const idx = items.indexOf(value);
    if (idx === -1 || !containerRef.current) return;
    containerRef.current.scrollTo({
      top: idx * ITEM_HEIGHT,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, [items]);

  useEffect(() => {
    scrollToItem(selected);
  }, [selected, scrollToItem]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    isScrollingRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const idx = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIdx = Math.max(0, Math.min(items.length - 1, idx));
      containerRef.current.scrollTo({ top: clampedIdx * ITEM_HEIGHT, behavior: 'smooth' });
      onSelect(items[clampedIdx]);
      isScrollingRef.current = false;
    }, 80);
  };

  return (
    <div className="relative" style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}>
      {/* Selection highlight */}
      <div
        className="absolute left-1 right-1 rounded-lg bg-primary/10 border border-primary/20 pointer-events-none z-10"
        style={{ top: CENTER * ITEM_HEIGHT, height: ITEM_HEIGHT }}
      />
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
        style={{
          paddingTop: CENTER * ITEM_HEIGHT,
          paddingBottom: CENTER * ITEM_HEIGHT,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {items.map((item) => {
          const isSelected = item === selected;
          return (
            <div
              key={item}
              className={cn(
                "flex items-center justify-center cursor-pointer snap-center transition-all duration-150 select-none",
                isSelected ? "text-foreground font-bold text-2xl" : "text-muted-foreground text-lg opacity-50"
              )}
              style={{ height: ITEM_HEIGHT }}
              onClick={() => {
                onSelect(item);
                scrollToItem(item, true);
              }}
            >
              {item}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

export default function ScrollTimePicker({ value, onChange, label, className }: ScrollTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [h, m] = value ? value.split(':') : ['08', '00'];

  // Snap minute to nearest 5
  const snappedM = String(Math.round(parseInt(m || '0') / 5) * 5).padStart(2, '0');

  const handleHourChange = (newH: string) => {
    onChange(`${newH}:${snappedM}`);
  };

  const handleMinuteChange = (newM: string) => {
    onChange(`${h || '08'}:${newM}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          className={cn(
            "h-14 text-lg px-4 justify-start text-left font-normal w-full",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-5 w-5 shrink-0" />
          {value || 'Selecione'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 pointer-events-auto" align="start">
        <div className="p-3 pb-1">
          <p className="text-xs font-semibold text-muted-foreground text-center uppercase tracking-wider">{label || 'Horário'}</p>
        </div>
        <div className="flex items-center justify-center gap-0 px-2 pb-3">
          <div className="flex-1">
            <ScrollColumn items={hours} selected={h || '08'} onSelect={handleHourChange} />
          </div>
          <span className="text-2xl font-bold text-muted-foreground pb-1">:</span>
          <div className="flex-1">
            <ScrollColumn items={minutes} selected={snappedM} onSelect={handleMinuteChange} />
          </div>
        </div>
        <div className="border-t p-2">
          <Button size="sm" className="w-full" onClick={() => setOpen(false)}>
            Confirmar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}