import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { usePinSettings, useSetPin, useTogglePin } from '@/hooks/usePinSettings';
import { toast } from 'sonner';
import { Lock, ShieldCheck, ShieldOff, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// ---- PIN Verification Modal (used before sensitive actions) ----
interface PinVerifyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

export function PinVerifyModal({ open, onOpenChange, onVerified }: PinVerifyProps) {
  const { data: pinSettings } = usePinSettings();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleVerify = () => {
    if (!pinSettings) return;
    if (pin === pinSettings.pin) {
      setPin('');
      setError(false);
      onVerified();
      onOpenChange(false);
    } else {
      setError(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setPin(''); setError(false); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" /> Verificação PIN
          </DialogTitle>
          <DialogDescription>
            Digite o PIN de 4 dígitos para confirmar a operação.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center">
            <InputOTP maxLength={4} value={pin} onChange={(v) => { setPin(v); setError(false); }}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {error && <p className="text-xs text-destructive text-center">PIN incorreto. Tente novamente.</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleVerify} disabled={pin.length < 4}>Confirmar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- PIN Setup / Settings Modal ----
interface PinSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PinSettingsModal({ open, onOpenChange }: PinSetupProps) {
  const { data: pinSettings, isLoading } = usePinSettings();
  const setPin = useSetPin();
  const togglePin = useTogglePin();
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'view' | 'create'>('view');
  const [error, setError] = useState('');

  const hasPin = !!pinSettings?.pin;

  const handleCreate = () => {
    if (newPin.length < 4) {
      setError('O PIN deve ter 4 dígitos.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('Os PINs não coincidem.');
      return;
    }
    setPin.mutate({ pin: newPin, enabled: true }, {
      onSuccess: () => {
        toast.success('PIN configurado com sucesso!');
        setStep('view');
        setNewPin('');
        setConfirmPin('');
        setError('');
      },
      onError: (err: any) => toast.error('Erro: ' + err.message),
    });
  };

  const handleToggle = (enabled: boolean) => {
    togglePin.mutate(enabled, {
      onSuccess: () => {
        toast.success(enabled ? 'PIN ativado!' : 'PIN pausado!');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setStep('view'); setNewPin(''); setConfirmPin(''); setError(''); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Configurações do PIN
          </DialogTitle>
        </DialogHeader>

        {step === 'view' && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg border bg-secondary/30 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>O PIN de 4 dígitos</strong> é usado para proteger alterações no número de encontros contratados dos mentorados (adicionar ou remover).</p>
                  <p>Você pode <strong>pausar</strong> o PIN a qualquer momento sem excluí-lo, e <strong>reativá-lo</strong> quando quiser. Altere ou desative aqui nas configurações.</p>
                </div>
              </div>
            </div>

            {hasPin ? (
              <>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    {pinSettings.enabled ? (
                      <ShieldCheck className="h-4 w-4 text-success" />
                    ) : (
                      <ShieldOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium">PIN {pinSettings.enabled ? 'Ativo' : 'Pausado'}</p>
                      <p className="text-xs text-muted-foreground">
                        {pinSettings.enabled ? 'Será solicitado ao alterar encontros' : 'Não será solicitado até reativar'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={pinSettings.enabled}
                    onCheckedChange={handleToggle}
                  />
                </div>
                <Button variant="outline" className="w-full" onClick={() => setStep('create')}>
                  Alterar PIN
                </Button>
              </>
            ) : (
              <Button onClick={() => setStep('create')} className="w-full">
                Criar PIN
              </Button>
            )}
          </div>
        )}

        {step === 'create' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Novo PIN (4 dígitos)</Label>
              <div className="flex justify-center">
                <InputOTP maxLength={4} value={newPin} onChange={(v) => { setNewPin(v); setError(''); }}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Confirme o PIN</Label>
              <div className="flex justify-center">
                <InputOTP maxLength={4} value={confirmPin} onChange={(v) => { setConfirmPin(v); setError(''); }}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            {error && <p className="text-xs text-destructive text-center">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setStep('view'); setNewPin(''); setConfirmPin(''); setError(''); }}>Voltar</Button>
              <Button onClick={handleCreate} disabled={setPin.isPending}>
                {setPin.isPending ? 'Salvando...' : 'Salvar PIN'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
