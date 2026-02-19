import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Phone, Mail, MapPin, CalendarPlus, Clock } from 'lucide-react';
import { useMentorados, useMentores, useEncontros, useHistoricos } from '@/hooks/useSupabaseData';
import { StatusBadge, TagBadge, TipoBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MeetingModal from '@/components/MeetingModal';

export default function MentoradoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedEncontro, setSelectedEncontro] = useState<any>(null);

  const { data: mentorados = [], isLoading: lm } = useMentorados();
  const { data: mentores = [] } = useMentores();
  const { data: encontros = [], isLoading: le } = useEncontros();
  const { data: historicos = [] } = useHistoricos(id);

  const mentorado = mentorados.find(m => m.id === id);
  const mentor = mentorado?.mentor_id ? mentores.find(m => m.id === mentorado.mentor_id) : null;
  const mentoradoEncontros = useMemo(() => encontros.filter(e => e.mentorado_id === id).sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime()), [id, encontros]);

  if (lm || le) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!mentorado) return <div className="p-8 text-center text-muted-foreground">Mentorado não encontrado.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/mentorados')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="page-title">{mentorado.nome}</h1>
          <p className="page-subtitle">Mentorado desde {format(new Date(mentorado.data_inicio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>
        <Button variant="outline"><Edit className="h-4 w-4 mr-2" /> Editar</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Informações</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-2"><StatusBadge status={mentorado.status as any} /><div className="flex gap-1 flex-wrap">{(mentorado.tags || []).map(t => <TagBadge key={t} tag={t as any} />)}</div></div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /><span>{mentorado.email}</span></div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><a href={`https://wa.me/${mentorado.telefone_whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{mentorado.telefone_whatsapp}</a></div>
              <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /><span>{mentorado.cidade}</span></div>
            </div>
            <Separator />
            <div><p className="text-xs text-muted-foreground mb-1">Mentor</p><p className="font-medium">{mentor?.nome || '—'}</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">Origem</p><p>{mentorado.origem}</p></div>
            {mentorado.observacoes_gerais && (
              <div><p className="text-xs text-muted-foreground mb-1">Observações</p><p className="text-muted-foreground">{mentorado.observacoes_gerais}</p></div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Encontros ({mentoradoEncontros.length})</CardTitle>
                <Button size="sm"><CalendarPlus className="h-4 w-4 mr-1.5" /> Agendar</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mentoradoEncontros.map(e => (
                  <div key={e.id} onClick={() => setSelectedEncontro(e)} className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/20 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="text-center w-14 flex-shrink-0">
                        <p className="text-xs text-muted-foreground">{format(new Date(e.inicio), 'dd/MM')}</p>
                        <p className="text-sm font-semibold">{format(new Date(e.inicio), 'HH:mm')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{e.titulo}</p>
                        <p className="text-xs text-muted-foreground">{e.local}{e.link_reuniao && ` • ${e.link_reuniao}`}</p>
                      </div>
                    </div>
                    <div className="flex gap-2"><TipoBadge tipo={e.tipo as any} /><StatusBadge status={e.status as any} /></div>
                  </div>
                ))}
                {mentoradoEncontros.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum encontro registrado.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Histórico</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
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

      <MeetingModal
        encontro={selectedEncontro}
        mentorado={mentorado as any}
        mentor={mentor as any}
        open={!!selectedEncontro}
        onOpenChange={(o) => !o && setSelectedEncontro(null)}
      />
    </div>
  );
}
