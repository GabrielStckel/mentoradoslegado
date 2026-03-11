import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

const EMAIL_DOMAINS = ['@gmail.com', '@hotmail.com', '@outlook.com', '@yahoo.com', '@icloud.com'];

interface EmailInputProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value'> {
  value: string;
  onValueChange: (value: string) => void;
}

export default function EmailInput({ value, onValueChange, ...props }: EmailInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const localPart = value.split('@')[0];
  const hasAt = value.includes('@');
  const suggestions = !hasAt && localPart.length > 0
    ? EMAIL_DOMAINS.map(d => localPart + d)
    : hasAt
      ? EMAIL_DOMAINS.filter(d => d.startsWith('@' + value.split('@')[1])).map(d => localPart + d)
      : [];

  return (
    <div className="relative" ref={ref}>
      <Input
        type="email"
        value={value}
        onChange={e => { onValueChange(e.target.value); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)}
        placeholder="email@exemplo.com"
        {...props}
      />
      {showSuggestions && suggestions.length > 0 && value.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md z-50 max-h-40 overflow-y-auto">
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              onClick={() => { onValueChange(s); setShowSuggestions(false); }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
