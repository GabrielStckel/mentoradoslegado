import { useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Edit, Phone, Mail, MapPin, CalendarPlus, Clock, CheckCircle, XCircle, Target, BarChart3 } from 'lucide-react';
import { useMentorados, useEncontros, useHistoricos, useMentores } from '@/hooks/useSupabaseData';
import { StatusBadge, TagBadge, TipoBadge } from '@/components/StatusBadge';
import EditMentoradoModal from '@/components/EditMentoradoModal';
import NovoEncontroModal from '@/components/NovoEncontroModal';
import MeetingModal from '@/components/MeetingModal';
import EncontrosCounter from '@/components/EncontrosCounter';
import { whatsappLink } from '@/lib/phone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MentoradoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromDashboard = searchParams.get('from') === 'dashboard';
  const [selectedEncontro, setSelectedEncontro] = useState<any>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showNovoEncontro, setShowNovoEncontro] = useState(false);

  const { data: mentorados = [], isLoading: lm } = useMentorados();
  const { data: encontros = [], isLoading: le } = useEncontros();
  const { data: historicos = [] } = useHistoricos(id);
  const { data: mentores = [] } = useMentores();

  const mentorado = mentorados.find(m => m.id === id);
  const mentoradoEncontros = useMemo(
    () => encontros.filter(e => e.mentorado_id === id).sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime()),
    [id, encontros]
  );

  const mentorId = useMemo(() => {
    if (mentorado?.mentor_id) return mentorado.mentor_id;
    if (mentores.length > 0) return mentores[0].id;
    return '';
  }, [mentorado, mentores]);

  const metrics = useMemo(() => {
    const total = mentoradoEncontros.length;
    const realizados = mentoradoEncontros.filter(e => e.status === 'Realizado').length;
    const cancelados = mentoradoEncontros.filter(e => e.status === 'Cancelado').length;
    const faltas = mentoradoEncontros.filter(e => e.status === 'Faltou').length;
    const agendados = mentoradoEncontros.filter(e => e.status === 'Agendado').length;
    const taxaPresenca = total > 0 ? Math.round((realizados / (realizados + faltas || 1)) * 100) : 0;
    const diasMentoria = mentorado ? differenceInDays(new Date(), new Date(mentorado.data_inicio)) : 0;
    const proximoEncontro = mentoradoEncontros
      .filter(e => e.status === 'Agendado' && new Date(e.inicio) > new Date())
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())[0] || null;
    return { total, realizados, cancelados, faltas, agendados, taxaPresenca, diasMentoria, proximoEncontro };
  }, [mentoradoEncontros, mentorado]);

  if (lm || le) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!mentorado) return <div className="p-8 text-center text-muted-foreground">Mentorado não encontrado.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(fromDashboard ? '/' : '/mentorados')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="page-title truncate">{mentorado.nome}</h1>
          <p className="page-subtitle">
            Mentorado há {metrics.diasMentoria} dias • desde {format(new Date(mentorado.data_inicio), "dd/MM/yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
            <Edit className="h-4 w-4 mr-1.5" /> Editar
          </Button>
          <Button size="sm" onClick={() => setShowNovoEncontro(true)}>
            <CalendarPlus className="h-4 w-4 mr-1.5" /> Agendar
          </Button>
        </div>
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.total}</p>
              <p className="text-xs text-muted-foreground">Total encontros</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.realizados}</p>
              <p className="text-xs text-muted-foreground">Realizados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.faltas}</p>
              <p className="text-xs text-muted-foreground">Faltas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/50 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Contratados: <span className="font-semibold text-foreground">{mentorado.total_encontros}</span></p>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">Realizados</p>
                <EncontrosCounter
                  mentoradoId={mentorado.id}
                  mentoradoNome={mentorado.nome}
                  mentorId={mentorId}
                  totalContratados={mentorado.total_encontros}
                  realizados={(mentorado as any).encontros_realizados || 0}
                />
              </div>
              {mentorado.total_encontros > 0 && (
                <div className="mt-1">
                  <Progress value={(((mentorado as any).encontros_realizados || 0) / mentorado.total_encontros) * 100} className="h-1.5" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Próximo encontro banner */}
      {metrics.proximoEncontro && (
        <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Próximo encontro agendado</p>
            <p className="text-sm font-semibold text-primary">
              {format(new Date(metrics.proximoEncontro.inicio), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setSelectedEncontro(metrics.proximoEncontro)}>
            Ver detalhes
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sidebar - Info */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Informações</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={mentorado.status as any} />
              {(mentorado.tags || []).map(t => <TagBadge key={t} tag={t as any} />)}
            </div>
            <Separator />
            <div className="space-y-3">
              {mentorado.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{mentorado.email}</span>
                </div>
              )}
              {mentorado.telefone_whatsapp && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a href={whatsappLink(mentorado.telefone_whatsapp)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {mentorado.telefone_whatsapp}
                  </a>
                </div>
              )}
              {mentorado.cidade && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span>{mentorado.cidade}</span>
                </div>
              )}
            </div>
            <Separator />
            <div><p className="text-xs text-muted-foreground mb-1">Origem</p><p>{mentorado.origem}</p></div>
            {mentorado.observacoes_gerais && (
              <div><p className="text-xs text-muted-foreground mb-1">Observações</p><p className="text-muted-foreground">{mentorado.observacoes_gerais}</p></div>
            )}
          </CardContent>
        </Card>

        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Encontros */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Encontros ({mentoradoEncontros.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {mentoradoEncontros.map(e => (
                  <div
                    key={e.id}
                    onClick={() => setSelectedEncontro(e)}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/20 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center w-14 flex-shrink-0">
                        <p className="text-xs text-muted-foreground">{format(new Date(e.inicio), 'dd/MM')}</p>
                        <p className="text-sm font-semibold">{format(new Date(e.inicio), 'HH:mm')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{e.titulo}</p>
                        <p className="text-xs text-muted-foreground">{e.local}{e.link_reuniao ? ` • ${e.link_reuniao}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <TipoBadge tipo={e.tipo as any} />
                      <StatusBadge status={e.status as any} />
                    </div>
                  </div>
                ))}
                {mentoradoEncontros.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum encontro registrado.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Histórico */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Histórico</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {historicos.map(h => (
                  <div key={h.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-xs text-primary">{h.tipo}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(h.created_at), 'dd/MM/yyyy')}</span>
                      </div>
                      <p className="text-muted-foreground">{h.conteudo}</p>
                    </div>
                  </div>
                ))}
                {historicos.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <MeetingModal
        encontro={selectedEncontro}
        mentorado={mentorado as any}
        open={!!selectedEncontro}
        onOpenChange={(o) => !o && setSelectedEncontro(null)}
      />
      <EditMentoradoModal
        mentorado={showEdit ? mentorado : null}
        open={showEdit}
        onOpenChange={setShowEdit}
      />
      {showNovoEncontro && (
        <NovoEncontroModal
          open={showNovoEncontro}
          onOpenChange={setShowNovoEncontro}
        />
      )}
    </div>
  );
}
