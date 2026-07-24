"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Lock, AlertTriangle, Tag, Users } from "lucide-react";
import { KanbanColumn, MAX_COLUMNS, MIN_COLUMNS } from "@/hooks/useKanbanColumns";
import type { Lead } from "@/components/KanbanBoard";

interface MigrationState {
  columnId: string;
  selectedLeadIds: Set<number>;
  targetColumnId: string;
}

interface KanbanColumnsEditorProps {
  open: boolean;
  onClose: () => void;
  columns: KanbanColumn[];
  leads: Lead[];
  onAddColumn: (label: string) => void;
  onRemoveColumn: (id: string) => void;
  onMoveLeads: (leadIds: number[], targetStatus: string) => Promise<void>;
  onUpdateOutcomeSignal?: (id: string, signal: "positivo" | "negativo" | null) => void;
  onUpdateGoalDescription?: (id: string, goal: string) => void;
}

export default function KanbanColumnsEditor({
  open,
  onClose,
  columns,
  leads,
  onAddColumn,
  onRemoveColumn,
  onMoveLeads,
  onUpdateOutcomeSignal,
  onUpdateGoalDescription,
}: KanbanColumnsEditorProps) {
  const [newLabel, setNewLabel] = useState("");
  const [migration, setMigration] = useState<MigrationState | null>(null);
  const [moving, setMoving] = useState(false);

  const leadsPerColumn = useMemo(
    () =>
      leads.reduce<Record<string, Lead[]>>((acc, lead) => {
        const key = lead.status;
        if (!acc[key]) acc[key] = [];
        acc[key].push(lead);
        return acc;
      }, {}),
    [leads]
  );

  const handleAddColumn = () => {
    if (!newLabel.trim()) return;
    onAddColumn(newLabel.trim());
    setNewLabel("");
  };

  const handleRemoveClick = (col: KanbanColumn) => {
    const colLeads = leadsPerColumn[col.id] ?? [];
    if (colLeads.length > 0) {
      // Abre painel de migração com todos os leads pré-selecionados
      setMigration({
        columnId: col.id,
        selectedLeadIds: new Set(colLeads.map((l) => l.id)),
        targetColumnId: "",
      });
    } else {
      onRemoveColumn(col.id);
    }
  };

  const handleToggleLeadSelection = (leadId: number) => {
    if (!migration) return;
    const next = new Set(migration.selectedLeadIds);
    if (next.has(leadId)) {
      next.delete(leadId);
    } else {
      next.add(leadId);
    }
    setMigration({ ...migration, selectedLeadIds: next });
  };

  const handleSelectAll = () => {
    if (!migration) return;
    const colLeads = leadsPerColumn[migration.columnId] ?? [];
    setMigration({
      ...migration,
      selectedLeadIds: new Set(colLeads.map((l) => l.id)),
    });
  };

  const handleDeselectAll = () => {
    if (!migration) return;
    setMigration({ ...migration, selectedLeadIds: new Set() });
  };

  const handleMoveLeads = async () => {
    if (!migration || !migration.targetColumnId || migration.selectedLeadIds.size === 0) return;
    setMoving(true);
    try {
      await onMoveLeads(Array.from(migration.selectedLeadIds), migration.targetColumnId);
      // Verifica se ainda há leads na coluna após mover
      const remainingLeads = (leadsPerColumn[migration.columnId] ?? []).filter(
        (l) => !migration.selectedLeadIds.has(l.id)
      );
      if (remainingLeads.length === 0) {
        // Coluna vazia: remove automaticamente
        onRemoveColumn(migration.columnId);
        setMigration(null);
      } else {
        // Ainda tem leads: atualiza seleção para os restantes
        setMigration({
          ...migration,
          selectedLeadIds: new Set(remainingLeads.map((l) => l.id)),
          targetColumnId: "",
        });
      }
    } finally {
      setMoving(false);
    }
  };

  const migrationColumn = migration
    ? columns.find((c) => c.id === migration.columnId)
    : null;
  const migrationLeads = migration ? (leadsPerColumn[migration.columnId] ?? []) : [];
  const availableTargets = migration
    ? columns.filter((c) => c.id !== migration.columnId)
    : [];

  const allSelected =
    migration !== null &&
    migrationLeads.length > 0 &&
    migrationLeads.every((l) => migration.selectedLeadIds.has(l.id));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-4 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="size-4" />
            Editar Colunas do Kanban
          </DialogTitle>
        </DialogHeader>

        {/* Warning de Efeito em Cascata (Follow-up) */}
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            <strong>Aviso de Follow-up:</strong> Ao remover uma coluna atrelada à régua de Follow-up, os disparos agendados para essa coluna serão cancelados automaticamente.
          </span>
        </div>

        {/* Painel de migração */}
        {migration && migrationColumn && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">
                  &ldquo;{migrationColumn.label}&rdquo; tem {migrationLeads.length}{" "}
                  {migrationLeads.length === 1 ? "lead" : "leads"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Mova-os para outra coluna antes de remover.
                </p>
              </div>
            </div>

            {/* Lista de leads com checkboxes */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {migrationLeads.map((lead) => (
                <label
                  key={lead.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={migration.selectedLeadIds.has(lead.id)}
                    onCheckedChange={() => handleToggleLeadSelection(lead.id)}
                  />
                  <span className="text-xs font-medium truncate">
                    {lead.push_name || lead.name || lead.phone}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono ml-auto shrink-0">
                    {lead.phone}
                  </span>
                </label>
              ))}
            </div>

            {/* Selecionar / Desmarcar todos */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 gap-1"
              onClick={allSelected ? handleDeselectAll : handleSelectAll}
            >
              <Users className="size-3" />
              {allSelected ? "Desmarcar todos" : "Selecionar todos"}
            </Button>

            {/* Destino e ação */}
            <div className="flex items-center gap-2">
              <Select
                value={migration.targetColumnId}
                onValueChange={(v) => setMigration({ ...migration, targetColumnId: v ?? "" })}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Escolher coluna destino…" />
                </SelectTrigger>
                <SelectContent>
                  {availableTargets.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`inline-block size-2 rounded-full ${col.color}`}
                        />
                        {col.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-8 text-xs shrink-0"
                disabled={
                  !migration.targetColumnId ||
                  migration.selectedLeadIds.size === 0 ||
                  moving
                }
                onClick={handleMoveLeads}
              >
                {moving ? "Movendo…" : "Mover agora"}
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => setMigration(null)}
            >
              Cancelar
            </Button>
          </div>
        )}

        {/* Lista de colunas com rolagem interna */}
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {columns.map((col) => {
            const count = (leadsPerColumn[col.id] ?? []).length;
            const isOnlyColumn = columns.length <= MIN_COLUMNS;
            const hasLeads = count > 0;
            const isMigrating = migration?.columnId === col.id;
            const isBlocked = isOnlyColumn || hasLeads;

            return (
              <div
                key={col.id}
                className={`p-3.5 rounded-lg border bg-card transition-colors space-y-3 ${
                  isMigrating ? "border-amber-500/50 bg-amber-500/5" : ""
                }`}
              >
                {/* Cabeçalho da Coluna */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block size-3 rounded-full shrink-0 ${col.color}`}
                    />
                    <span className="text-sm font-semibold tracking-tight">
                      {col.label}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0.5 font-medium shrink-0 ${col.badgeClass}`}
                    >
                      {count} {count === 1 ? "lead" : "leads"}
                    </Badge>
                  </div>

                  {/* Botão remover */}
                  {isBlocked ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled
                      title={
                        isOnlyColumn
                          ? "Precisa de ao menos 1 coluna"
                          : `Mova os ${count} leads antes de remover`
                      }
                      className="shrink-0 text-muted-foreground/40"
                      onClick={() => handleRemoveClick(col)}
                    >
                      <Lock className="size-3.5" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Remover coluna"
                      className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveClick(col)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>

                {/* Grade de Configurações */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40">
                  {/* Objetivo para a IA */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Objetivo para a IA (Movimentação Automática)
                    </label>
                    <Input
                      placeholder="Ex: Quando o lead aceitar agendar uma reunião..."
                      defaultValue={col.goalDescription ?? ""}
                      onBlur={(e) => {
                        const val = e.target.value;
                        if (val !== (col.goalDescription ?? "")) {
                          onUpdateGoalDescription?.(col.id, val);
                        }
                      }}
                      className="h-8 text-xs bg-background/80"
                    />
                  </div>

                  {/* Sinal de Resultado (Aprendizado) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Sinal (Aprendizado)
                    </label>
                    <Select
                      value={col.outcomeSignal ?? "nenhum"}
                      onValueChange={(val) => {
                        const signal = val === "positivo" ? "positivo" : val === "negativo" ? "negativo" : null;
                        onUpdateOutcomeSignal?.(col.id, signal);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background/80">
                        <SelectValue placeholder="Sinal..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhum">Nenhum</SelectItem>
                        <SelectItem value="positivo">Positivo (meta)</SelectItem>
                        <SelectItem value="negativo">Negativo (perdido)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Adicionar nova coluna */}
        {columns.length >= MAX_COLUMNS ? (
          <p className="text-xs text-muted-foreground text-center py-1">
            Limite de {MAX_COLUMNS} colunas atingido.
          </p>
        ) : (
          <div className="flex gap-2 pt-1 border-t">
            <Input
              placeholder="Nome da nova coluna…"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
              className="h-8 text-xs flex-1"
            />
            <Button
              size="sm"
              className="h-8 gap-1 text-xs shrink-0"
              disabled={!newLabel.trim()}
              onClick={handleAddColumn}
            >
              <Plus className="size-3.5" />
              Adicionar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
