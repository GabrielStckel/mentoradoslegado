import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search } from 'lucide-react';
import { useAtividadesLog } from '@/hooks/useSupabaseData';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TimelineAtividade, { AtividadeLog } from '@/components/TimelineAtividade';

const TZ = 'America/Sao_Paulo';

function diaKey(iso: string) {
  // agrupa por dia no fuso de São Paulo
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
}

export default function HistoricoGeralPage() {
  const [search, setSearch] = useState('');
  const [entidade, setEntidade] = useState('todas');
  const [acao, setAcao] = useState('todas');
  const [periodo, setPeriodo] = useState('30');

  const { data: logs = [], isLoading } = useAtividadesLog();

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    let limite: number | null = null;
    if (periodo !== 'tudo') {
      limite = Date.now() - Number(periodo) * 24 * 60 * 60 * 1000;
    }

    return (logs as AtividadeLog[]).filter(l => {
      if (entidade !== 'todas' && l.entidade !== entidade) return false;
      if (acao !== 'todas' && l.acao !== acao) return false;
      if (limite !== null && new Date(l.changed_at).getTime() < limite) return false;
      if (q) {
        const hay = `${l.mentorado_nome || ''} ${l.descricao || ''} ${l.changed_by_nome || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, entidade, acao, periodo]);

  const grupos = useMemo(() => {
    const map = new Map<string, AtividadeLog[]>();
    filtrados.forEach(l => {
      const k = diaKey(l.changed_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(l);
    });
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtrados]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full max-w-2xl" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="page-title">Histórico Geral</h1>
        <p className="page-subtitle">{filtrados.length} registro{filtrados.length === 1 ? '' : 's'} de atividade</p>
      </div>

      <div className="flex flex-col md:flex-row gap-2 md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por mentorado, descrição ou autor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={entidade} onValueChange={setEntidade}>
          <SelectTrigger className="w-full md:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as entidades</SelectItem>
            <SelectItem value="mentorado">Mentorados</SelectItem>
            <SelectItem value="encontro">Encontros</SelectItem>
          </SelectContent>
        </Select>

        <Select value={acao} onValueChange={setAcao}>
          <SelectTrigger className="w-full md:w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as ações</SelectItem>
            <SelectItem value="INSERT">Criação</SelectItem>
            <SelectItem value="UPDATE">Alteração</SelectItem>
            <SelectItem value="DELETE">Exclusão</SelectItem>
          </SelectContent>
        </Select>

        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-full md:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="tudo">Todo o período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {grupos.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <p className="text-center py-12 text-muted-foreground text-sm">Nenhuma atividade registrada nesse período.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map(([dia, items]) => (
            <div key={dia} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground sticky top-0 bg-background/95 py-1">
                {format(parseISO(dia), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </h2>
              <div className="space-y-2">
                {items.map(l => <TimelineAtividade key={l.id} log={l} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
