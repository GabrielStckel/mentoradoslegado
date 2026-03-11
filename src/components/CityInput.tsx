import { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { BRAZILIAN_CITIES } from '@/data/brazilianCities';

interface CityInputProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value'> {
  value: string;
  onValueChange: (value: string) => void;
}

export default function CityInput({ value, onValueChange, ...props }: CityInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!value.trim()) return BRAZILIAN_CITIES.slice(0, 10);
    const q = value.toLowerCase();
    return BRAZILIAN_CITIES.filter(c => c.toLowerCase().includes(q)).slice(0, 10);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Input
        value={value}
        onChange={e => { onValueChange(e.target.value); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)}
        placeholder="Digite a cidade"
        {...props}
      />
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md z-50 max-h-40 overflow-y-auto">
          {filtered.map(c => (
            <button
              key={c}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              onClick={() => { onValueChange(c); setShowSuggestions(false); }}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
