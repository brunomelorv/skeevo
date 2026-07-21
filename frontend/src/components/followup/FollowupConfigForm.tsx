"use client";

import React, { useState } from "react";
import {
  CalendarClock,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquare,
  Sparkles,
  Sliders,
  Layers,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export interface FollowupStepData {
  id?: number;
  step_number: number;
  delay_hours: number;
  mode: "text" | "ai";
  content: string;
}

export interface FollowupConfigData {
  id?: number;
  is_enabled: boolean;
  target_statuses: string[];
  window_start: string;
  window_end: string;
  min_interval_minutes: number;
  steps: FollowupStepData[];
  updated_at?: string;
}

interface FollowupConfigFormProps {
  config: FollowupConfigData;
  onSave: (updated: FollowupConfigData) => Promise<void>;
  isSaving: boolean;
  saveStatus: { type: "success" | "error" | null; message: string };
}

import { useKanbanColumns } from "@/hooks/useKanbanColumns";

export default function FollowupConfigForm({
  config,
  onSave,
  isSaving,
  saveStatus,
}: FollowupConfigFormProps) {
  const { columns } = useKanbanColumns();
  const [formData, setFormData] = useState<FollowupConfigData>(config);

  // Sync state if props change initially
  React.useEffect(() => {
    setFormData(config);
  }, [config]);

  const handleToggleEnabled = () => {
    setFormData((prev) => ({ ...prev, is_enabled: !prev.is_enabled }));
  };

  const handleStatusToggle = (statusId: string) => {
    setFormData((prev) => {
      const current = prev.target_statuses || [];
      const updated = current.includes(statusId)
        ? current.filter((s) => s !== statusId)
        : [...current, statusId];
      return { ...prev, target_statuses: updated };
    });
  };

  const handleFieldChange = <K extends keyof FollowupConfigData>(
    field: K,
    value: FollowupConfigData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddStep = () => {
    setFormData((prev) => {
      const nextStepNumber = prev.steps.length + 1;
      const defaultDelay = nextStepNumber === 1 ? 24 : nextStepNumber === 2 ? 168 : 672;
      const newSteps: FollowupStepData[] = [
        ...prev.steps,
        {
          step_number: nextStepNumber,
          delay_hours: defaultDelay,
          mode: "text",
          content: "",
        },
      ];
      return { ...prev, steps: newSteps };
    });
  };

  const handleRemoveStep = (index: number) => {
    setFormData((prev) => {
      const filtered = prev.steps.filter((_, i) => i !== index);
      const reindexed = filtered.map((step, idx) => ({
        ...step,
        step_number: idx + 1,
      }));
      return { ...prev, steps: reindexed };
    });
  };

  const handleStepChange = <K extends keyof FollowupStepData>(
    index: number,
    field: K,
    value: FollowupStepData[K]
  ) => {
    setFormData((prev) => {
      const updatedSteps = prev.steps.map((step, i) => {
        if (i === index) {
          return { ...step, [field]: value };
        }
        return step;
      });
      return { ...prev, steps: updatedSteps };
    });
  };

  const formatDelayBadge = (hours: number): string => {
    if (hours <= 0) return "Imediato";
    if (hours % 24 === 0) {
      const days = hours / 24;
      return days === 1 ? "1 dia" : `${days} dias`;
    }
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    if (days > 0) {
      return `${days}d ${remHours}h`;
    }
    return `${hours}h`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Save Status Banner */}
      {saveStatus.type && (
        <div
          className={`flex items-center gap-2 p-3.5 rounded-lg border text-sm transition-all ${
            saveStatus.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300"
          }`}
        >
          {saveStatus.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span>{saveStatus.message}</span>
        </div>
      )}

      {/* General Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="size-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Configurações Gerais da Régua</CardTitle>
                <CardDescription>
                  Defina o status dos leads, horário de envio e intervalo de proteção.
                </CardDescription>
              </div>
            </div>

            {/* Toggle switch for is_enabled */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {formData.is_enabled ? (
                  <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="secondary">Inativo</Badge>
                )}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={formData.is_enabled}
                onClick={handleToggleEnabled}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  formData.is_enabled ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    formData.is_enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Target Statuses */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Status do Kanban para Disparo
            </label>
            <p className="text-xs text-muted-foreground">
              Selecione as colunas do Kanban que devem ativar o agendamento desta régua.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              {columns.map((status) => {
                const checked = formData.target_statuses?.includes(status.id) ?? false;
                return (
                  <label
                    key={status.id}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md border text-sm cursor-pointer transition-colors ${
                      checked
                        ? "bg-primary/10 border-primary text-primary font-medium"
                        : "bg-background border-input hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => handleStatusToggle(status.id)}
                    />
                    <span className={`inline-block size-2 rounded-full ${status.color}`} />
                    <span>{status.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Sending Window & Interval */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none flex items-center gap-1.5">
                <Clock className="size-4 text-muted-foreground" />
                Início da Janela
              </label>
              <Input
                type="time"
                value={formData.window_start}
                onChange={(e) => handleFieldChange("window_start", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Ex: 08:00</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none flex items-center gap-1.5">
                <Clock className="size-4 text-muted-foreground" />
                Fim da Janela
              </label>
              <Input
                type="time"
                value={formData.window_end}
                onChange={(e) => handleFieldChange("window_end", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Ex: 20:00</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none flex items-center gap-1.5">
                <CalendarClock className="size-4 text-muted-foreground" />
                Intervalo Mínimo (min)
              </label>
              <Input
                type="number"
                min={1}
                max={60}
                value={formData.min_interval_minutes}
                onChange={(e) =>
                  handleFieldChange("min_interval_minutes", parseInt(e.target.value) || 4)
                }
              />
              <p className="text-xs text-muted-foreground">Espaçamento entre mensagens.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps Builder Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="size-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Passos da Régua de Envio</CardTitle>
              <CardDescription>
                Adicione mensagens sequenciais para reengajar seus leads.
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddStep}
            className="gap-1.5"
          >
            <Plus className="size-4" />
            Adicionar Passo
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.steps.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground space-y-2">
              <MessageSquare className="size-8 mx-auto opacity-50" />
              <p className="text-sm font-medium">Nenhum passo configurado</p>
              <p className="text-xs">Clique no botão acima para adicionar a primeira mensagem da régua.</p>
            </div>
          ) : (
            formData.steps.map((step, index) => (
              <Card key={index} className="border bg-card/50 shadow-sm relative">
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-semibold text-xs bg-background">
                      Etapa {index + 1}
                    </Badge>
                    <Badge variant="secondary" className="font-normal text-xs gap-1">
                      <Clock className="size-3" />
                      {formatDelayBadge(step.delay_hours)}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleRemoveStep(index)}
                    title="Remover passo"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Delay Hours */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Atraso após entrada no status (horas)
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={step.delay_hours}
                        onChange={(e) =>
                          handleStepChange(index, "delay_hours", parseInt(e.target.value) || 0)
                        }
                        placeholder="Ex: 24 (1 dia), 168 (7 dias)"
                      />
                    </div>

                    {/* Mode Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Modo de Envio
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={step.mode === "text" ? "default" : "outline"}
                          size="sm"
                          className="w-full text-xs justify-center gap-1.5"
                          onClick={() => handleStepChange(index, "mode", "text")}
                        >
                          <MessageSquare className="size-3.5" />
                          Texto Fixo
                        </Button>
                        <Button
                          type="button"
                          variant={step.mode === "ai" ? "default" : "outline"}
                          size="sm"
                          className="w-full text-xs justify-center gap-1.5"
                          onClick={() => handleStepChange(index, "mode", "ai")}
                        >
                          <Sparkles className="size-3.5" />
                          Gerado por IA
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">
                        {step.mode === "ai"
                          ? "Instrução para a IA gerar o texto"
                          : "Conteúdo da Mensagem"}
                      </label>
                      <span className="text-[11px] text-muted-foreground">
                        Use <code className="bg-muted px-1 rounded text-foreground font-mono">{`{nome}`}</code> para incluir o nome do lead
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={step.content}
                      onChange={(e) => handleStepChange(index, "content", e.target.value)}
                      placeholder={
                        step.mode === "ai"
                          ? "Ex: Crie uma mensagem amigável perguntando se o lead conseguiu avaliar a proposta enviada."
                          : "Olá {nome}, tudo bem? Notei que nos falamos há alguns dias e gostaria de saber se ficou com alguma dúvida."
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-sans"
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>

        <CardFooter className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={isSaving} className="gap-2">
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
