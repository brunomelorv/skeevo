"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Loader2, Sliders, ListFilter } from "lucide-react";
import FollowupConfigForm, {
  FollowupConfigData,
} from "@/components/followup/FollowupConfigForm";
import FollowupQueueTable, {
  LeadFollowupItem,
} from "@/components/followup/FollowupQueueTable";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function FollowupPage() {
  const [config, setConfig] = useState<FollowupConfigData>({
    is_enabled: false,
    target_statuses: ["novo", "em_atendimento"],
    window_start: "08:00",
    window_end: "20:00",
    min_interval_minutes: 4,
    steps: [],
  });

  const [queueItems, setQueueItems] = useState<LeadFollowupItem[]>([]);
  const [activeTab, setActiveTab] = useState<"config" | "queue">("config");

  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const fetchConfig = async () => {
    setIsLoadingConfig(true);
    try {
      let res = await fetch(`${API_BASE}/api/followup/config`);
      if (!res.ok) {
        res = await fetch("/api/followup/config");
      }
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.warn("Não foi possível carregar as configurações de follow up:", err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const fetchQueue = async () => {
    setIsLoadingQueue(true);
    try {
      let res = await fetch(`${API_BASE}/api/followup/queue`);
      if (!res.ok) {
        res = await fetch("/api/followup/queue");
      }
      if (res.ok) {
        const data = await res.json();
        setQueueItems(data);
      }
    } catch (err) {
      console.warn("Não foi possível carregar a fila de follow up:", err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      setIsLoadingConfig(true);
      setIsLoadingQueue(true);
      try {
        let resConfig = await fetch(`${API_BASE}/api/followup/config`);
        if (!resConfig.ok) {
          resConfig = await fetch("/api/followup/config");
        }
        if (resConfig.ok) {
          const dataConfig = await resConfig.json();
          setConfig(dataConfig);
        }

        let resQueue = await fetch(`${API_BASE}/api/followup/queue`);
        if (!resQueue.ok) {
          resQueue = await fetch("/api/followup/queue");
        }
        if (resQueue.ok) {
          const dataQueue = await resQueue.json();
          setQueueItems(dataQueue);
        }
      } catch (err) {
        console.warn("Erro ao carregar dados do módulo de Follow Up:", err);
      } finally {
        setIsLoadingConfig(false);
        setIsLoadingQueue(false);
      }
    }

    loadData();
  }, []);

  const handleSaveConfig = async (updatedConfig: FollowupConfigData) => {
    setIsSavingConfig(true);
    setSaveStatus({ type: null, message: "" });

    try {
      let res = await fetch(`${API_BASE}/api/followup/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });

      if (!res.ok) {
        res = await fetch("/api/followup/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedConfig),
        });
      }

      if (!res.ok) {
        throw new Error(`Erro ao salvar configurações (${res.status})`);
      }

      const returnedData = await res.json();
      setConfig(returnedData);
      setSaveStatus({
        type: "success",
        message: "Configuração da régua salva com sucesso!",
      });

      // Refresh queue in case config update affected items
      fetchQueue();

      setTimeout(() => {
        setSaveStatus({ type: null, message: "" });
      }, 4000);
    } catch (err: any) {
      setSaveStatus({
        type: "error",
        message: err.message || "Falha ao salvar configuração.",
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCancelQueueItem = async (id: number) => {
    try {
      let res = await fetch(`${API_BASE}/api/followup/queue/${id}/cancel`, {
        method: "POST",
      });

      if (!res.ok) {
        res = await fetch(`/api/followup/queue/${id}/cancel`, {
          method: "POST",
        });
      }

      if (!res.ok) {
        throw new Error("Erro ao cancelar o item de follow-up");
      }

      // Refresh queue
      await fetchQueue();
    } catch (err: any) {
      console.error("Falha ao cancelar item:", err);
    }
  };

  if (isLoadingConfig && isLoadingQueue) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span className="text-sm font-medium">Carregando dados de Follow Up...</span>
        </div>
      </div>
    );
  }

  const scheduledCount = queueItems.filter((i) => i.status === "scheduled").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <CalendarClock className="size-7 text-primary" /> Follow Up
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure réguas de reengajamento sequencial e monitore a fila de envios.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg self-start md:self-auto">
          <Button
            variant={activeTab === "config" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("config")}
            className="gap-2 text-xs font-medium"
          >
            <Sliders className="size-3.5" />
            Configuração
          </Button>
          <Button
            variant={activeTab === "queue" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("queue")}
            className="gap-2 text-xs font-medium relative"
          >
            <ListFilter className="size-3.5" />
            Fila de Envios
            {scheduledCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-primary text-primary-foreground font-semibold">
                {scheduledCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === "config" ? (
        <FollowupConfigForm
          config={config}
          onSave={handleSaveConfig}
          isSaving={isSavingConfig}
          saveStatus={saveStatus}
        />
      ) : (
        <FollowupQueueTable
          items={queueItems}
          isLoading={isLoadingQueue}
          onRefresh={fetchQueue}
          onCancelItem={handleCancelQueueItem}
        />
      )}
    </div>
  );
}
