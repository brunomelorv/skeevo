"use client";

import { useState, useCallback, useEffect } from "react";

export interface KanbanColumn {
  id: string; // slug único (ex: "novo", "qualificado")
  db_id?: number;
  label: string;
  color: string;
  badgeClass: string;
}

export const DEFAULT_COLUMNS: KanbanColumn[] = [
  {
    id: "novo",
    label: "Novo",
    color: "bg-chart-1",
    badgeClass: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  },
  {
    id: "em_atendimento",
    label: "Em Atendimento",
    color: "bg-chart-2",
    badgeClass: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  },
  {
    id: "qualificado",
    label: "Qualificado",
    color: "bg-chart-3",
    badgeClass: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  },
  {
    id: "ganho",
    label: "Ganho",
    color: "bg-chart-4",
    badgeClass: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  },
  {
    id: "perdido",
    label: "Perdido",
    color: "bg-chart-5",
    badgeClass: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  },
];

export const MAX_COLUMNS = 10;
export const MIN_COLUMNS = 1;

const STORAGE_KEY = "skeevo_kanban_columns";

function loadLocalColumns(): KanbanColumn[] {
  if (typeof window === "undefined") return DEFAULT_COLUMNS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as KanbanColumn[];
      if (Array.isArray(parsed) && parsed.length >= 1) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_COLUMNS;
}

export function useKanbanColumns() {
  const [columns, setColumns] = useState<KanbanColumn[]>(loadLocalColumns);
  const [loading, setLoading] = useState(true);

  const fetchColumnsFromBackend = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:8000/kanban/columns");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped: KanbanColumn[] = data.map((c: any) => ({
            id: c.slug,
            db_id: c.id,
            label: c.label,
            color: c.color || "bg-chart-1",
            badgeClass: c.badge_class || "bg-chart-1/10 text-chart-1 border-chart-1/20",
          }));
          setColumns(mapped);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        }
      }
    } catch (e) {
      console.error("Erro ao carregar colunas do backend:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchColumnsFromBackend();
  }, [fetchColumnsFromBackend]);

  const addColumn = useCallback(
    async (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;

      try {
        const res = await fetch("http://localhost:8000/kanban/columns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: trimmed }),
        });
        if (res.ok) {
          await fetchColumnsFromBackend();
        }
      } catch (e) {
        console.error("Erro ao adicionar coluna no backend:", e);
      }
    },
    [fetchColumnsFromBackend]
  );

  const removeColumn = useCallback(
    async (id: string) => {
      if (columns.length <= MIN_COLUMNS) return;

      const targetCol = columns.find((c) => c.id === id);
      if (!targetCol) return;

      try {
        if (targetCol.db_id) {
          const res = await fetch(`http://localhost:8000/kanban/columns/${targetCol.db_id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            await fetchColumnsFromBackend();
            return;
          }
        }
        // Fallback local se não tiver db_id ainda
        const updated = columns.filter((c) => c.id !== id);
        setColumns(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Erro ao remover coluna no backend:", e);
      }
    },
    [columns, fetchColumnsFromBackend]
  );

  const renameColumn = useCallback(
    async (id: string, newLabel: string) => {
      const trimmed = newLabel.trim();
      if (!trimmed) return;

      const targetCol = columns.find((c) => c.id === id);
      if (targetCol?.db_id) {
        try {
          await fetch(`http://localhost:8000/kanban/columns/${targetCol.db_id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ label: trimmed }),
          });
          await fetchColumnsFromBackend();
          return;
        } catch (e) {
          console.error("Erro ao renomear coluna no backend:", e);
        }
      }

      const updated = columns.map((c) => (c.id === id ? { ...c, label: trimmed } : c));
      setColumns(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    [columns, fetchColumnsFromBackend]
  );

  return {
    columns,
    loading,
    addColumn,
    removeColumn,
    renameColumn,
    refreshColumns: fetchColumnsFromBackend,
    canAdd: columns.length < MAX_COLUMNS,
    canRemove: columns.length > MIN_COLUMNS,
  };
}
