import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search, ArrowUpDown, X } from 'lucide-react';
import { useAtividadesLog } from '@/hooks/useSupabaseData';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AtividadeLog, FIELD_LABELS } from '@/components/TimelineAtividade';
import { normalizar, toTitleCase } from '@/lib/utils';
import { cn } from '@/lib/utils';

const TZ = 'America/Sao_Paulo';

function fmtData(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      timeZone: TZ,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

type Rotulo = { texto: string; variante: 'verde' | 'amber' | 'vermelho' | 'azul' | 'cinza' };

function rotuloAlteracao(log: AtividadeLog): Rotulo {
  const antigo = Number(log.valor_antigo);
  const novo = Number(log.valor_novo);

  if (log.campo === 'encontros_realizados' && !Number.isNaN(antigo) && !Number.isNaN(novo)) {
    if (novo > antigo) return { texto: '+1 encontro', variante: 'verde' };
    if (novo < antigo) return { texto: '−1 encontro', variante: 'amber' };
  }
  if (log.acao === 'DELETE' && log.entidade === 'mentorado') return { texto: 'Mentorado excluído', variante: 'vermelho' };
  if (log.acao === 'DELETE' && log.entidade === 'encontro') return { texto: 'Encontro excluído', variante: 'vermelho' };
  if (log.acao === 'INSERT' && log.entidade === 'mentorado') return { texto: 'Cadastrado', variante: 'azul' };
  if (log.acao === 'INSERT' && log.entidade === 'encontro') return { texto: 'Encontro criado', variante: 'azul' };
  if (log.campo === 'status') return { texto: `Status: ${log.valor_novo ?? '—'}`, variante: 'cinza' };
  if (log.campo === 'total_encontros') return { texto: `Contratados: ${log.valor_antigo ?? '?'} → ${log.valor_novo ?? '?'}`, variante: 'cinza' };

  return { texto: FIELD_LABELS[log.campo || ''] || log.campo || 'Alteração', variante: 'cinza' };
}

const VARIANT_CLASS: Record<Rotulo['variante'], string> = {
  verde: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  vermelho: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  azul: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  cinza: 'bg-muted text-muted-foreground border-border',
};

type TipoFiltro = 'encontros' | 'mentorados' | 'exclusoes' | 'tudo';

function dentroTipo(tipo: TipoFiltro, l: AtividadeLog): boolean {
  if (tipo === 'encontros') return l.campo === 'encontros_realizados';
  if (tipo === 'mentorados') return l.entidade === 'mentorado';
  if (tipo === 'exclusoes') return l.acao === 'DELETE';
  return true;
}

export default function HistoricoGeralPage() {
  const isMobile = useIsMobile();
  const { data: logs = [], isLoading } = useAtividadesLog();

  const [searchInput, setSearchInput] = useState('');
  const [searchTermo, setSearchTermo] = useState('');
  const [tipo, setTipo] = useState<TipoFiltro>('encontros');
  const [periodo, setPeriodo] = useState('30');
  const [sortKey, setSortKey] = useState<'data' | 'mentorado'>('data');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});

  // debounce da busca
  useEffect(() => {
    const t = setTimeout(() => setSearchTermo(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const limiteMs = useMemo(() => {
    if (periodo === 'tudo') return null;
    return Date.now() - Number(periodo) * 24 * 60 * 60 * 1000;
  }, [periodo]);

  const termos = useMemo(
    () => (searchTermo ? normalizar(searchTermo).split(/\s+/).filter(Boolean) : []),
    [searchTermo],
  );

  // filtragem por período + busca apenas (sem filtro de tipo) — usado para contadores
  const baseFiltrados = useMemo(() => {
    return (logs as AtividadeLog[]).filter(l => {
      if (limiteMs !== null && new Date(l.changed_at).getTime() < limiteMs) return false;
      if (termos.length) {
        const hay = normalizar(
          `${l.mentorado_nome || ''} ${l.descricao || ''} ${l.changed_by_nome || ''} ${l.mentor_nome || ''}`,
        );
        if (!termos.every(t => hay.includes(t))) return false;
      }
      return true;
    });
  }, [logs, limiteMs, termos]);

  // contagens por tipo (sem aplicar o próprio filtro de tipo)
  const contagens = useMemo(() => {
    const c = { encontros: 0, mentorados: 0, exclusoes: 0, tudo: 0 };
    baseFiltrados.forEach(l => {
      c.tudo++;
      if (l.campo === 'encontros_realizados') c.encontros++;
      if (l.entidade === 'mentorado') c.mentorados++;
      if (l.acao === 'DELETE') c.exclusoes++;
    });
    return c;
  }, [baseFiltrados]);

  // aplicação final: base + filtro de tipo
  const filtrados = useMemo(
    () => baseFiltrados.filter(l => dentroTipo(tipo, l)),
    [baseFiltrados, tipo],
  );

  const ordenados = useMemo(() => {
    const arr = [...filtrados];
    arr.sort((a, b) => {
      let cmp: number;
      if (sortKey === 'data') {
        cmp = new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime();
      } else {
        cmp = (a.mentorado_nome || '').localeCompare(b.mentorado_nome || '', 'pt-BR');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtrados, sortKey, sortDir]);

  const foraDoPeriodo = useMemo(() => {
    if (limiteMs === null) return 0;
    if (termos.length) return 0; // não afirmamos com certeza se há busca ativa
    return (logs as AtividadeLog[]).filter(l => new Date(l.changed_at).getTime() < limiteMs!).length;
  }, [logs, limiteMs, termos]);

  const temFiltroAtivo = tipo !== 'encontros' || periodo !== '30' || searchTermo !== '';

  function toggleSort(key: 'data' | 'mentorado') {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'data' ? 'desc' : 'asc');
    }
  }

  function limparFiltros() {
    setTipo('encontros');
    setPeriodo('30');
    setSearchInput('');
    setSearchTermo('');
  }

  function toggleExpand(id: string) {
    setExpandido(prev => ({ ...prev, [id]: !prev[id] }));
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full max-w-2xl" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const renderPor = (l: AtividadeLog) => {
    if (l.changed_by_nome === 'Reconstruído') {
      return <Badge variant="outline" className="text-[10px]">Reconstruído</Badge>;
    }
    return <span className="text-xs text-muted-foreground">{l.changed_by_nome || 'Sistema'}</span>;
  };

  const renderEncontros = (l: AtividadeLog) => {
    if (l.enc_realizados != null && l.enc_contratados != null) {
      return `${l.enc_realizados}/${l.enc_contratados}`;
    }
    return '—';
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="page-title">Histórico</h1>
        <p className="page-subtitle">{filtrados.length} registro{filtrados.length === 1 ? '' : 's'} de atividade</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-2 md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por mentorado, descrição, autor..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={tipo} onValueChange={v => setTipo(v as TipoFiltro)}>
          <SelectTrigger className="w-full md:w-auto md:min-w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="encontros">Encontros (+/−) · {contagens.encontros}</SelectItem>
            <SelectItem value="mentorados">Mentorados · {contagens.mentorados}</SelectItem>
            <SelectItem value="exclusoes">Exclusões · {contagens.exclusoes}</SelectItem>
            <SelectItem value="tudo">Tudo · {contagens.tudo}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-full md:w-auto md:min-w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="tudo">Todo o período</SelectItem>
          </SelectContent>
        </Select>

        {temFiltroAtivo && (
          <button
            onClick={limparFiltros}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md border"
          >
            <X className="h-3.5 w-3.5" /> Limpar filtros
          </button>
        )}
      </div>

      {/* Estado vazio */}
      {ordenados.length === 0 ? (
        <div className="rounded-xl border bg-card py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {foraDoPeriodo > 0 ? (
              <>
                Nenhum resultado nesse período — existem {foraDoPeriodo} registros em outros períodos.{' '}
                <button
                  onClick={() => setPeriodo('tudo')}
                  className="text-primary underline ml-1"
                >
                  Ver tudo
                </button>
              </>
            ) : (
              'Nenhuma atividade registrada com os filtros atuais.'
            )}
          </p>
        </div>
      ) : isMobile ? (
        /* Mobile: cards compactos */
        <div className="space-y-2">
          {ordenados.map(l => {
            const rot = rotuloAlteracao(l);
            const isOpen = !!expandido[l.id];
            const isDelete = l.acao === 'DELETE';
            return (
              <div
                key={l.id}
                className={cn('rounded-lg border p-3 space-y-2', isDelete ? 'border-red-500/30 bg-red-500/5' : 'bg-card')}
              >
                <div className="flex items-center justify-between gap-2">
                  <button onClick={() => toggleExpand(l.id)} className="flex items-center gap-1.5 text-left">
                    {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <span className="text-xs text-muted-foreground">{fmtData(l.changed_at)}</span>
                  </button>
                  <Badge className={cn('text-[10px] border', VARIANT_CLASS[rot.variante])}>{rot.texto}</Badge>
                </div>
                <p className="text-sm font-medium">{toTitleCase(l.mentorado_nome || '—')}</p>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">Encontros: {renderEncontros(l)}</span>
                  {renderPor(l)}
                </div>
                {isOpen && (
                  <div className="space-y-1 pt-1 border-t">
                    <p className="text-xs text-foreground">{l.descricao}</p>
                    {l.valor_antigo !== null && l.valor_novo !== null && (
                      <p className="text-xs text-muted-foreground">
                        {FIELD_LABELS[l.campo || ''] || l.campo}: {l.valor_antigo || 'vazio'} → {l.valor_novo || 'vazio'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Desktop: tabela */
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="w-8"></th>
                <th className="px-3 py-2.5 font-medium">
                  <button onClick={() => toggleSort('data')} className="inline-flex items-center gap-1 hover:text-foreground">
                    Data <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-3 py-2.5 font-medium">
                  <button onClick={() => toggleSort('mentorado')} className="inline-flex items-center gap-1 hover:text-foreground">
                    Mentorado <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-3 py-2.5 font-medium">Alteração</th>
                <th className="px-3 py-2.5 font-medium">Encontros</th>
                <th className="px-3 py-2.5 font-medium">Por</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map(l => {
                const rot = rotuloAlteracao(l);
                const isOpen = !!expandido[l.id];
                const isDelete = l.acao === 'DELETE';
                const temDiff = l.valor_antigo !== null && l.valor_novo !== null;
                return (
                  <Fragment key={l.id}>
                    <tr
                      onClick={() => toggleExpand(l.id)}
                      className={cn(
                        'cursor-pointer border-t hover:bg-muted/30',
                        isDelete && 'bg-red-500/5',
                      )}
                    >
                      <td className="px-2 text-center text-muted-foreground">
                        {isOpen ? <ChevronDown className="h-4 w-4 inline" /> : <ChevronRight className="h-4 w-4 inline" />}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{fmtData(l.changed_at)}</td>
                      <td className="px-3 py-2.5">{toTitleCase(l.mentorado_nome || '—')}</td>
                      <td className="px-3 py-2.5">
                        <Badge className={cn('text-[10px] border', VARIANT_CLASS[rot.variante])}>{rot.texto}</Badge>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{renderEncontros(l)}</td>
                      <td className="px-3 py-2.5">{renderPor(l)}</td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-muted/20 border-t">
                        <td></td>
                        <td colSpan={5} className="px-3 py-3 space-y-1">
                          <p className="text-sm text-foreground">{l.descricao}</p>
                          {temDiff && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">{FIELD_LABELS[l.campo || ''] || l.campo}:</span>{' '}
                              <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-700 dark:text-red-300">{l.valor_antigo || 'vazio'}</span>
                              {' → '}
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">{l.valor_novo || 'vazio'}</span>
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
