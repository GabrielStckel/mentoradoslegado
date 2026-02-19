import { useState, useMemo } from 'react';
import { Plus, Wifi, WifiOff } from 'lucide-react';
import { mentores } from '@/data/mock';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function MentoresPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Mentores</h1>
          <p className="page-subtitle">{mentores.length} mentores cadastrados</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Novo Mentor</Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30 hover:bg-secondary/30">
              <TableHead className="table-header">Nome</TableHead>
              <TableHead className="table-header">Especialidade</TableHead>
              <TableHead className="table-header">Carga/dia</TableHead>
              <TableHead className="table-header">Status</TableHead>
              <TableHead className="table-header">Google Agenda</TableHead>
              <TableHead className="table-header">Cor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mentores.map(m => (
              <TableRow key={m.id} className="hover:bg-secondary/20">
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{m.nome}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{m.especialidade}</TableCell>
                <TableCell className="text-sm">{m.carga_max_por_dia} sessões</TableCell>
                <TableCell><StatusBadge status={m.status} /></TableCell>
                <TableCell>
                  {m.google_calendar_connected ? (
                    <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                      <Wifi className="h-3 w-3 mr-1" /> Conectado
                    </Badge>
                  ) : (
                    <Button size="sm" variant="outline" className="text-xs h-7">
                      <WifiOff className="h-3 w-3 mr-1.5" /> Conectar
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  <div className="w-6 h-6 rounded-full border-2 border-border" style={{ backgroundColor: m.cor_calendario }} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
