import * as React from 'react';
import { Input } from '@/components/ui/input';

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function rawDigits(value: string): string {
  return value.replace(/\D/g, '');
}

interface PhoneInputProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value'> {
  value: string;
  onValueChange: (raw: string) => void;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onValueChange, ...props }, ref) => {
    const display = formatPhone(value);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange(rawDigits(e.target.value));
    };

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder="(00) 00000-0000"
        {...props}
      />
    );
  }
);
PhoneInput.displayName = 'PhoneInput';

export { PhoneInput, formatPhone };
