import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

export function useGoogleCalendar() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const autoImportDone = useRef(false);
  const queryClient = useQueryClient();

  const importEvents = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
      body: { action: 'import' },
    });
    if (error) throw error;
    return data;
  }, []);

  const checkAndAutoImport = useCallback(async () => {
    if (!user) { setConnected(false); setLoading(false); return; }
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'check' },
      });
      const isConnected = !error && data?.connected === true;
      setConnected(isConnected);

      if (isConnected && !autoImportDone.current) {
        autoImportDone.current = true;
        try {
          await importEvents();
          queryClient.invalidateQueries({ queryKey: ['encontros'] });
        } catch (e) {
          console.error('Auto-import failed:', e);
        }
      }
    } catch {
      setConnected(false);
    }
    setLoading(false);
  }, [user, importEvents, queryClient]);

  useEffect(() => {
    checkAndAutoImport();

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_CALENDAR_CONNECTED') {
        setConnected(true);
        autoImportDone.current = false;
        checkAndAutoImport();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [checkAndAutoImport]);

  const connect = async () => {
    const popup = window.open('about:blank', 'google-calendar-auth', 'width=600,height=700');

    const showPopupMessage = (title: string, description: string) => {
      if (!popup || popup.closed) return;
      popup.document.write(`
        <html><body style="font-family:sans-serif;padding:40px;text-align:center">
          <h2>${title}</h2>
          <p>${description}</p>
          <p>Feche esta janela e tente novamente.</p>
        </body></html>
      `);
    };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        showPopupMessage('Sessão expirada', 'Faça login novamente e tente conectar.');
        throw new Error('No active session');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({}),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.url) {
        const errorMsg = payload?.error || `Falha na conexão (${response.status})`;
        showPopupMessage('Erro ao conectar', errorMsg);
        throw new Error(errorMsg);
      }

      if (popup && !popup.closed) {
        popup.location.assign(payload.url);
      } else {
        window.location.href = payload.url;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      showPopupMessage('Erro ao conectar', message);
      console.error('Error starting Google Calendar auth:', err);
      throw err;
    }
  };

  const syncEvent = async (action: 'create' | 'update' | 'delete', encontro: any) => {
    const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
      body: { action, encontro },
    });
    if (error) throw error;
    return data;
  };

  return { connected, loading, connect, syncEvent, importEvents, checkConnection: checkAndAutoImport };
}
