import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMentorados } from '@/hooks/useSupabaseData';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { toTitleCase } from '@/lib/utils';

type AuditRow = {
  id: string;
  encontro_id: string;
  mentorado_id: string | null;
  mentor_id: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
};

const FIELD_LABELS: Record<string, string> = {
  titulo: 'Título',
  tipo: 'Tipo',
  inicio: 'Início',
  fim: 'Fim',
  status: 'Status',
  local: 'Local',
  link_reuniao: 'Link da reunião',
  notas_do_mentor: 'Notas do mentor',
  notas_operacionais: 'Notas operacionais',
  proxima_acao: 'Próxima ação',
};

const TZ = 'America/Sao_Paulo';

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function fmtValue(field: string | null, value: string | null) {
  if (value === null || value === '') return <span className="italic text-muted-foreground">vazio</span>;
  if (field === 'inicio' || field === 'fim') return fmtDateTime(value);
  return value;
}

function ActionIcon({ action }: { action: AuditRow['action'] }) {
  if (action === 'INSERT') return <Plus className="h-3.5 w-3.5 text-emerald-600" />;
  if (action === 'DELETE') return <Trash2 className="h-3.5 w-3.5 text-red-600" />;
  return <Pencil className="h-3.5 w-3.5 text-blue-600" />;
}

export default function HistoricoEncontrosPage() {
  const [search, setSearch] = useState('');
  const { data: mentorados = [] } = useMentorados();

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['encontros_audit_log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('encontros_audit_log')
        .select('*')
        .not('changed_by', 'is', null)
        .order('changed_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data || []) as AuditRow[];
    },
  });

  const { data: encontros = [], isLoading: loadingEnc } = useQuery({
    queryKey: ['encontros-realizados-historico'],
    queryFn: async () => {
      const doisMesesAtras = new Date();
      doisMesesAtras.setMonth(doisMesesAtras.getMonth() - 2);
      doisMesesAtras.setHours(0, 0, 0, 0);
      const agora = new Date().toISOString();
      const { data, error } = await supabase
        .from('encontros')
        .select('id, titulo, mentorado_id, inicio, status')
        .gte('fim', doisMesesAtras.toISOString())
        .lt('fim', agora)
        .not('mentorado_id', 'is', null)
        .neq('status', 'vago')
        .order('inicio', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const mentoradoMap = useMemo(() => {
    const m = new Map<string, string>();
    mentorados.forEach(x => m.set(x.id, x.nome));
    return m;
  }, [mentorados]);

  const grouped = useMemo(() => {
    const byEnc = new Map<string, AuditRow[]>();
    logs.forEach(l => {
      if (!byEnc.has(l.encontro_id)) byEnc.set(l.encontro_id, []);
      byEnc.get(l.encontro_id)!.push(l);
    });

    const isVagoVal = (v: string | null) => (v || '').trim().toLowerCase() === 'vago';

    const items = encontros
      .filter(e => e.mentorado_id && mentoradoMap.has(e.mentorado_id))
      .map(e => {
        const rawLogs = byEnc.get(e.id) || [];
        const filteredLogs = rawLogs.filter(l => {
          if (l.field_name === 'titulo' || l.field_name === 'status') {
            if (isVagoVal(l.old_value) || isVagoVal(l.new_value)) return false;
          }
          return true;
        });
        return {
          encontro: e,
          mentoradoNome: mentoradoMap.get(e.mentorado_id!) || '—',
          logs: filteredLogs,
        };
      });

    const q = search.trim().toLowerCase();
    return q
      ? items.filter(i =>
          i.mentoradoNome.toLowerCase().includes(q) ||
          (i.encontro.titulo || '').toLowerCase().includes(q)
        )
      : items;
  }, [encontros, logs, mentoradoMap, search]);

  if (loadingLogs || loadingEnc) {
    return <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="page-title">Histórico de Encontros</h1>
        <p className="page-subtitle">{grouped.length} encontros concluídos · todas as alterações registradas</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por mentorado ou título..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-xl border bg-card">
        {grouped.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground text-sm">Nenhum encontro concluído ainda.</p>
        ) : (
          <Accordion type="multiple" className="divide-y">
            {grouped.map(({ encontro, mentoradoNome, logs }) => (
              <AccordionItem key={encontro.id} value={encontro.id} className="border-0 px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex flex-1 items-center justify-between gap-3 pr-3 min-w-0">
                    <div className="min-w-0 text-left">
                      <p className="font-semibold text-sm text-primary truncate">{toTitleCase(mentoradoNome)}</p>
                      <p className="text-xs text-muted-foreground truncate">{encontro.titulo} · {fmtDateTime(encontro.inicio)}</p>
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0">{logs.length} alteraç{logs.length === 1 ? 'ão' : 'ões'}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  {logs.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Sem registros de alteração.</p>
                  ) : (
                    <ol className="relative border-l border-border ml-2 space-y-3">
                      {logs.map(log => (
                        <li key={log.id} className="ml-4">
                          <div className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-background border-2 border-primary/50" />
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <ActionIcon action={log.action} />
                            <span>{fmtDateTime(log.changed_at)}</span>
                          </div>
                          <div className="mt-1 text-sm">
                            {log.action === 'INSERT' && <span>Encontro <strong>criado</strong>.</span>}
                            {log.action === 'DELETE' && <span>Encontro <strong>excluído</strong>.</span>}
                            {log.action === 'UPDATE' && log.field_name && (
                              <span>
                                <strong>{FIELD_LABELS[log.field_name] || log.field_name}</strong> alterado de{' '}
                                <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-700 dark:text-red-300 text-xs">
                                  {fmtValue(log.field_name, log.old_value)}
                                </span>{' '}
                                para{' '}
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs">
                                  {fmtValue(log.field_name, log.new_value)}
                                </span>
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
