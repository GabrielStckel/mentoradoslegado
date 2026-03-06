import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useGoogleCalendar() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkConnection = useCallback(async () => {
    if (!user) { setConnected(false); setLoading(false); return; }
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'check' },
      });
      setConnected(!error && data?.connected === true);
    } catch {
      setConnected(false);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    checkConnection();

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_CALENDAR_CONNECTED') {
        setConnected(true);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [checkConnection]);

  const connect = async () => {
    // Open popup synchronously from user click to avoid browser blocking
    const popup = window.open('about:blank', 'google-calendar-auth', 'width=600,height=700');
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-auth');
      if (error) throw error;
      if (data?.url && popup) {
        popup.location.href = data.url;
      } else if (data?.url) {
        // Fallback if popup was still blocked
        window.open(data.url, 'google-calendar-auth', 'width=600,height=700');
      }
    } catch (err) {
      popup?.close();
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

  return { connected, loading, connect, syncEvent, checkConnection };
}
