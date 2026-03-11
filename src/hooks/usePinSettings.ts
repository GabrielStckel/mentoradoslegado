import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function usePinSettings() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['pin_settings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pin_settings')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return query;
}

export function useSetPin() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ pin, enabled }: { pin: string; enabled: boolean }) => {
      if (!user) throw new Error('Não autenticado');

      // Upsert
      const { data: existing } = await supabase
        .from('pin_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('pin_settings')
          .update({ pin, enabled, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pin_settings')
          .insert({ user_id: user.id, pin, enabled });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pin_settings'] });
    },
  });
}

export function useTogglePin() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('pin_settings')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pin_settings'] });
    },
  });
}

export function useRemovePin() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('pin_settings')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pin_settings'] });
    },
  });
}
