import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const PIN_STORAGE_KEY = 'app_security_pin';

function getStoredPin(): string | null {
  return localStorage.getItem(PIN_STORAGE_KEY);
}

function setStoredPin(pin: string) {
  localStorage.setItem(PIN_STORAGE_KEY, pin);
}

interface PinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function PinModal({ open, onOpenChange, onSuccess }: PinModalProps) {
  const isSetup = !getStoredPin();
  const [digits, setDigits] = useState(['', '', '', '']);
  const [confirmDigits, setConfirmDigits] = useState(['', '', '', '']);
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      setDigits(['', '', '', '']);
      setConfirmDigits(['', '', '', '']);
      setStep('enter');
      setError('');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open]);

  const handleDigitChange = (index: number, value: string, isConfirm = false) => {
    if (!/^\d?$/.test(value)) return;
    const setter = isConfirm ? setConfirmDigits : setDigits;
    const refs = isConfirm ? confirmRefs : inputRefs;

    setter(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setError('');

    if (value && index < 3) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent, isConfirm = false) => {
    const current = isConfirm ? confirmDigits : digits;
    const refs = isConfirm ? confirmRefs : inputRefs;

    if (e.key === 'Backspace' && !current[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const pin = digits.join('');
  const confirmPin = confirmDigits.join('');

  const handleSubmit = () => {
    if (pin.length < 4) {
      setError('Digite os 4 dígitos');
      return;
    }

    if (isSetup) {
      if (step === 'enter') {
        setStep('confirm');
        setTimeout(() => confirmRefs.current[0]?.focus(), 100);
        return;
      }
      if (confirmPin.length < 4) {
        setError('Confirme os 4 dígitos');
        return;
      }
      if (pin !== confirmPin) {
        setError('Os PINs não coincidem');
        setConfirmDigits(['', '', '', '']);
        setTimeout(() => confirmRefs.current[0]?.focus(), 100);
        return;
      }
      setStoredPin(pin);
      toast.success('PIN de segurança definido!');
      onOpenChange(false);
      onSuccess();
    } else {
      if (pin === getStoredPin()) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError('PIN incorreto');
        setDigits(['', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    }
  };

  const renderInputs = (values: string[], refs: React.MutableRefObject<(HTMLInputElement | null)[]>, isConfirm = false) => (
    <div className="flex justify-center gap-3">
      {values.map((d, i) => (
        <Input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleDigitChange(i, e.target.value, isConfirm)}
          onKeyDown={e => handleKeyDown(i, e, isConfirm)}
          className="w-14 h-14 text-center text-2xl font-bold tracking-widest"
          autoComplete="off"
        />
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            {isSetup ? <ShieldCheck className="h-6 w-6 text-primary" /> : <Lock className="h-6 w-6 text-primary" />}
          </div>
          <DialogTitle>{isSetup ? 'Definir PIN de Segurança' : 'PIN de Segurança'}</DialogTitle>
          <DialogDescription>
            {isSetup
              ? step === 'enter'
                ? 'Crie um PIN de 4 dígitos para proteger ações sensíveis.'
                : 'Confirme seu PIN digitando novamente.'
              : 'Digite seu PIN de 4 dígitos para continuar.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {step === 'enter' && renderInputs(digits, inputRefs)}
          {step === 'confirm' && isSetup && renderInputs(confirmDigits, confirmRefs, true)}

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <Button onClick={handleSubmit} className="w-full" size="lg">
            {isSetup ? (step === 'enter' ? 'Próximo' : 'Definir PIN') : 'Confirmar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ChangePinModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const hasPin = !!getStoredPin();
  const [currentPin, setCurrentPin] = useState(['', '', '', '']);
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('current');
  const [error, setError] = useState('');
  const currentRefs = useRef<(HTMLInputElement | null)[]>([]);
  const newRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      setCurrentPin(['', '', '', '']);
      setNewPin(['', '', '', '']);
      setConfirmPin(['', '', '', '']);
      setStep(hasPin ? 'current' : 'new');
      setError('');
      const refs = hasPin ? currentRefs : newRefs;
      setTimeout(() => refs.current[0]?.focus(), 100);
    }
  }, [open, hasPin]);

  const handleChange = (index: number, value: string, which: 'current' | 'new' | 'confirm') => {
    if (!/^\d?$/.test(value)) return;
    const setters = { current: setCurrentPin, new: setNewPin, confirm: setConfirmPin };
    const allRefs = { current: currentRefs, new: newRefs, confirm: confirmRefs };
    setters[which](prev => { const n = [...prev]; n[index] = value; return n; });
    setError('');
    if (value && index < 3) allRefs[which].current[index + 1]?.focus();
  };

  const handleKey = (index: number, e: React.KeyboardEvent, which: 'current' | 'new' | 'confirm') => {
    const values = { current: currentPin, new: newPin, confirm: confirmPin };
    const allRefs = { current: currentRefs, new: newRefs, confirm: confirmRefs };
    if (e.key === 'Backspace' && !values[which][index] && index > 0) {
      allRefs[which].current[index - 1]?.focus();
    }
  };

  const renderGroup = (values: string[], refs: React.MutableRefObject<(HTMLInputElement | null)[]>, which: 'current' | 'new' | 'confirm') => (
    <div className="flex justify-center gap-3">
      {values.map((d, i) => (
        <Input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value, which)}
          onKeyDown={e => handleKey(i, e, which)}
          className="w-14 h-14 text-center text-2xl font-bold"
          autoComplete="off"
        />
      ))}
    </div>
  );

  const handleSubmit = () => {
    if (step === 'current') {
      if (currentPin.join('').length < 4) { setError('Digite os 4 dígitos'); return; }
      if (currentPin.join('') !== getStoredPin()) {
        setError('PIN atual incorreto');
        setCurrentPin(['', '', '', '']);
        setTimeout(() => currentRefs.current[0]?.focus(), 100);
        return;
      }
      setStep('new');
      setTimeout(() => newRefs.current[0]?.focus(), 100);
    } else if (step === 'new') {
      if (newPin.join('').length < 4) { setError('Digite os 4 dígitos'); return; }
      setStep('confirm');
      setTimeout(() => confirmRefs.current[0]?.focus(), 100);
    } else {
      if (confirmPin.join('').length < 4) { setError('Confirme os 4 dígitos'); return; }
      if (newPin.join('') !== confirmPin.join('')) {
        setError('Os PINs não coincidem');
        setConfirmPin(['', '', '', '']);
        setTimeout(() => confirmRefs.current[0]?.focus(), 100);
        return;
      }
      setStoredPin(newPin.join(''));
      toast.success('PIN alterado com sucesso!');
      onOpenChange(false);
    }
  };

  const labels: Record<string, string> = {
    current: 'Digite seu PIN atual',
    new: 'Digite o novo PIN de 4 dígitos',
    confirm: 'Confirme o novo PIN',
  };

  const buttonLabels: Record<string, string> = {
    current: 'Próximo',
    new: 'Próximo',
    confirm: 'Alterar PIN',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>Alterar PIN</DialogTitle>
          <DialogDescription>{labels[step]}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {step === 'current' && renderGroup(currentPin, currentRefs, 'current')}
          {step === 'new' && renderGroup(newPin, newRefs, 'new')}
          {step === 'confirm' && renderGroup(confirmPin, confirmRefs, 'confirm')}
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button onClick={handleSubmit} className="w-full" size="lg">{buttonLabels[step]}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function usePinGate() {
  const [pinOpen, setPinOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  const requirePin = (action: () => void) => {
    pendingAction.current = action;
    setPinOpen(true);
  };

  const onPinSuccess = () => {
    pendingAction.current?.();
    pendingAction.current = null;
  };

  return { pinOpen, setPinOpen, requirePin, onPinSuccess };
}
