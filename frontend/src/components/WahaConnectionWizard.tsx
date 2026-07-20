"use client";

import { useEffect, useState } from "react";
import {
  QrCode,
  CheckCircle2,
  Play,
  Square,
  RefreshCw,
  Smartphone,
  ShieldCheck,
  Zap,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SessionInfo {
  exists: boolean;
  status: "WORKING" | "CONNECTED" | "SCAN_QR_CODE" | "STARTING" | "STOPPED" | "NOT_CREATED" | "DISCONNECTED" | string;
  me?: {
    id?: string;
    pushName?: string;
  };
}

export default function WahaConnectionWizard({ onStatusChange }: { onStatusChange?: (status: string) => void }) {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({ exists: false, status: "CHECKING" });
  const [loading, setLoading] = useState(true);
  const [startingSession, setStartingSession] = useState(false);
  const [qrKey, setQrKey] = useState(0);

  const checkStatus = async () => {
    try {
      const res = await fetch("http://localhost:8000/waha/status");
      if (res.ok) {
        const data: SessionInfo = await res.json();
        setSessionInfo(data);
        if (onStatusChange) onStatusChange(data.status);
      } else {
        setSessionInfo({ exists: false, status: "DISCONNECTED" });
      }
    } catch {
      setSessionInfo({ exists: false, status: "DISCONNECTED" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(() => {
      checkStatus();
      setQrKey(Date.now());
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const handleStartSession = async () => {
    setStartingSession(true);
    try {
      const res = await fetch("http://localhost:8000/waha/start", { method: "POST" });
      if (res.ok) {
        await checkStatus();
      } else {
        const err = await res.json();
        alert(`Erro ao iniciar sessão: ${err.detail || "Falha de conexão"}`);
      }
    } catch (e) {
      alert("Erro ao conectar com a API do Skeevo.");
    } finally {
      setStartingSession(false);
    }
  };

  const handleStopSession = async () => {
    if (!confirm("Deseja realmente desconectar o WhatsApp?")) return;
    try {
      await fetch("http://localhost:8000/waha/stop", { method: "POST" });
      await checkStatus();
    } catch (e) {
      alert("Erro ao encerrar sessão.");
    }
  };

  const isConnected = sessionInfo.status === "WORKING" || sessionInfo.status === "CONNECTED";
  const needsQR = sessionInfo.status === "SCAN_QR_CODE" || sessionInfo.status === "STARTING";
  const needsStart = sessionInfo.status === "NOT_CREATED" || sessionInfo.status === "STOPPED" || !sessionInfo.exists;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`flex size-12 items-center justify-center rounded-full border ${
                isConnected
                  ? "bg-green-500/10 border-green-500/30 text-green-500"
                  : needsQR
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                  : "bg-muted border-border text-muted-foreground"
              }`}
            >
              {isConnected ? (
                <CheckCircle2 className="size-6" />
              ) : needsQR ? (
                <QrCode className="size-6 animate-pulse" />
              ) : (
                <Smartphone className="size-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight">
                  Conexão WhatsApp
                </h2>
                {isConnected ? (
                  <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10">
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    Operacional
                  </Badge>
                ) : needsQR ? (
                  <Badge variant="outline" className="border-amber-500/30 text-amber-600">
                    Escanear QR Code
                  </Badge>
                ) : (
                  <Badge variant="secondary">Desconectado</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isConnected
                  ? `Conectado como ${sessionInfo.me?.pushName || "WhatsApp Bot"} (${sessionInfo.me?.id || "Sessão Ativa"})`
                  : needsQR
                  ? "Escaneie o código abaixo no seu aplicativo do WhatsApp"
                  : "Inicie a sessão para conectar seu WhatsApp e capturar leads automaticamente"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConnected && (
              <Button variant="destructive" size="sm" onClick={handleStopSession}>
                <Square className="size-3.5" />
                Desconectar
              </Button>
            )}

            {(needsStart || needsQR) && (
              <Button size="sm" onClick={handleStartSession} disabled={startingSession}>
                {startingSession ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Play className="size-3.5" />
                )}
                {startingSession ? "Iniciando..." : needsQR ? "Reiniciar Sessão" : "Iniciar Conexão"}
              </Button>
            )}

            <Button variant="outline" size="icon-sm" onClick={checkStatus} title="Atualizar Status">
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        {isConnected ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 p-3">
            <ShieldCheck className="size-4 text-green-500 shrink-0" />
            <span className="text-xs text-muted-foreground">
              Sessão ativa e webhook registrado em{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-green-600">
                http://backend:8000/webhook/waha
              </code>
              . Todas as mensagens recebidas serão capturadas automaticamente!
            </span>
          </div>
        ) : needsQR ? (
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="rounded-xl border bg-muted/50 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`http://localhost:8000/waha/qr?t=${qrKey}`}
                alt="WhatsApp QR Code"
                className="w-48 h-48 object-contain rounded-lg"
                onError={(e) => {
                  setTimeout(() => setQrKey(Date.now()), 2000);
                }}
              />
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="size-4 text-amber-500" /> Passo a Passo para Conectar:
              </h3>
              <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
                <li className="p-2 rounded-lg bg-muted/50 border">
                  Abra o aplicativo do <strong className="text-foreground">WhatsApp</strong> no seu celular.
                </li>
                <li className="p-2 rounded-lg bg-muted/50 border">
                  Toque em <strong className="text-foreground">Menu (⋮)</strong> ou{" "}
                  <strong className="text-foreground">Configurações</strong> &gt;{" "}
                  <strong className="text-foreground">Aparelhos conectados</strong>.
                </li>
                <li className="p-2 rounded-lg bg-muted/50 border">
                  Toque em <strong className="text-foreground">Conectar um aparelho</strong> e aponte a câmera para o QR Code ao lado.
                </li>
              </ol>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
                <HelpCircle className="size-3.5" /> O código QR é atualizado automaticamente a cada poucos segundos.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Nenhuma sessão ativa detectada. Clique no botão abaixo para inicializar o engine do WAHA.
            </p>
            <Button onClick={handleStartSession} disabled={startingSession}>
              {startingSession ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Play className="size-3.5" />
              )}
              {startingSession ? "Iniciando Sessão..." : "Iniciar Sessão WhatsApp"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
