import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

type ImportProgress = {
  active: boolean;
  processed: number;
  imported: number;
  updated: number;
  deleted: number;
  percent: number;
  message: string;
  done: boolean;
  error: string | null;
};

const initialProgress: ImportProgress = {
  active: false,
  processed: 0,
  imported: 0,
  updated: 0,
  deleted: 0,
  percent: 0,
  message: '',
  done: false,
  error: null,
};

let sharedImportPromise: Promise<any> | null = null;
let sharedProgress: ImportProgress = initialProgress;
let autoImportedUserId: string | null = null;
const progressSubscribers = new Set<(progress: ImportProgress) => void>();

function emitProgress() {
  progressSubscribers.forEach((listener) => listener(sharedProgress));
}

function updateProgress(patch: Partial<ImportProgress>) {
  sharedProgress = { ...sharedProgress, ...patch };
  emitProgress();
}

export function useGoogleCalendar() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importProgress, setImportProgress] = useState<ImportProgress>(sharedProgress);
  const queryClient = useQueryClient();

  useEffect(() => {
    progressSubscribers.add(setImportProgress);
    setImportProgress(sharedProgress);
    return () => {
      progressSubscribers.delete(setImportProgress);
    };
  }, []);

  const importEvents = useCallback(async () => {
    if (sharedImportPromise) return sharedImportPromise;

    sharedImportPromise = (async () => {
      updateProgress({
        ...initialProgress,
        active: true,
        percent: 5,
        message: 'Iniciando importação...',
      });

      let processed = 0;
      let imported = 0;
      let updated = 0;
      let nextPageToken: string | null = null;
      let batchCount = 0;
      const seenEventIds: string[] = [];

      while (true) {
        const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
          body: { action: 'import-batch', cursor: nextPageToken, batchSize: 150 },
        });

        if (error) throw error;

        const batchProcessed = Number(data?.batchProcessed || 0);
        const batchImported = Number(data?.batchImported || 0);
        const batchUpdated = Number(data?.batchUpdated || 0);

        processed += batchProcessed;
        imported += batchImported;
        updated += batchUpdated;
        batchCount += 1;

        if (Array.isArray(data?.batchEventIds) && data.batchEventIds.length > 0) {
          seenEventIds.push(...data.batchEventIds);
        }

        nextPageToken = data?.nextPageToken || null;
        const done = !nextPageToken;
        const percent = done ? 96 : Math.min(92, 12 + batchCount * 8);

        updateProgress({
          active: true,
          processed,
          imported,
          updated,
          percent,
          message: done ? 'Finalizando sincronização...' : `Processando ${processed} eventos...`,
          done: false,
          error: null,
        });

        if (done) break;
      }

      const { data: finalizeData, error: finalizeError } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'finalize-import', seenEventIds },
      });

      if (finalizeError) throw finalizeError;

      const deleted = Number(finalizeData?.deleted || 0);

      updateProgress({
        active: false,
        processed,
        imported,
        updated,
        deleted,
        percent: 100,
        message: 'Importação concluída',
        done: true,
        error: null,
      });

      queryClient.invalidateQueries({ queryKey: ['encontros'] });

      return { imported, updated, deleted, total: processed };
    })()
      .catch((err) => {
        updateProgress({
          active: false,
          done: false,
          percent: 0,
          message: 'Falha na importação',
          error: err instanceof Error ? err.message : 'Erro desconhecido',
        });
        throw err;
      })
      .finally(() => {
        sharedImportPromise = null;
      });

    return sharedImportPromise;
  }, [queryClient]);

  const checkAndAutoImport = useCallback(async () => {
    if (!user) {
      setConnected(false);
      setLoading(false);
      autoImportedUserId = null;
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'check' },
      });

      const isConnected = !error && data?.connected === true;
      setConnected(isConnected);

      if (isConnected && autoImportedUserId !== user.id) {
        autoImportedUserId = user.id;
        try {
          await importEvents();
        } catch (e) {
          autoImportedUserId = null;
          console.error('Auto-import failed:', e);
        }
      }
    } catch {
      setConnected(false);
    }

    setLoading(false);
  }, [user, importEvents]);

  useEffect(() => {
    checkAndAutoImport();

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_CALENDAR_CONNECTED') {
        setConnected(true);
        if (user) autoImportedUserId = null;
        checkAndAutoImport();
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [checkAndAutoImport, user]);

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

  return {
    connected,
    loading,
    connect,
    syncEvent,
    importEvents,
    checkConnection: checkAndAutoImport,
    importProgress,
    importing: importProgress.active,
  };
}

