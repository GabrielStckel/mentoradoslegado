import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useOrigens() {
  return useQuery({
    queryKey: ['origens'],
    queryFn: async () => {
      const { data, error } = await supabase.from('origens').select('*').order('nome');
      if (error) throw error;
      return data;
    },
  });
}

export function useEspecialidades() {
  return useQuery({
    queryKey: ['especialidades'],
    queryFn: async () => {
      const { data, error } = await supabase.from('especialidades').select('*').order('nome');
      if (error) throw error;
      return data;
    },
  });
}

export function useMentores() {
  return useQuery({
    queryKey: ['mentores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mentores').select('*').order('nome');
      if (error) throw error;
      return data;
    },
  });
}

export function useMentorados() {
  return useQuery({
    queryKey: ['mentorados'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mentorados').select('*').order('nome');
      if (error) throw error;
      return data;
    },
  });
}

export function useEncontros() {
  return useQuery({
    queryKey: ['encontros'],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      const PAGE_SIZE = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('encontros')
          .select('*')
          .gte('inicio', '2026-01-01T00:00:00Z')
          .order('inicio', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      return allData;
    },
  });
}

export function useHistoricos(mentoradoId?: string) {
  return useQuery({
    queryKey: ['historicos', mentoradoId],
    queryFn: async () => {
      let query = supabase.from('historicos').select('*').order('created_at', { ascending: false });
      if (mentoradoId) query = query.eq('mentorado_id', mentoradoId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateEncontroStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase.from('encontros').update({ status }).eq('id', id).select().single();
      if (error) throw error;

      // Auto-sync status change to Google Calendar
      if (data) {
        try {
          await supabase.functions.invoke('google-calendar-sync', {
            body: { action: 'update', encontro: data },
          });
        } catch (syncErr) {
          console.error('Google Calendar sync on status change failed:', syncErr);
        }
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['encontros'] });
    },
  });
}
