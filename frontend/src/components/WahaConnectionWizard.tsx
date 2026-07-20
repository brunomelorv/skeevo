"use client";

import { useEffect, useState } from "react";
import {
  QrCode,
  Radio,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  RefreshCw,
  Smartphone,
  ShieldCheck,
  Zap,
  HelpCircle,
} from "lucide-react";

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
  const [qrKey, setQrKey] = useState(Date.now());

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
    // Poll every 3 seconds if scanning QR or starting session
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
    <div className="glass-card rounded-2xl p-6 md:p-8 border border-slate-800 relative overflow-hidden transition-all">
      {/* Background Ambient Light */}
      {isConnected ? (
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      ) : needsQR ? (
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      ) : (
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-4">
          <div
            className={`h-12 w-12 rounded-2xl flex items-center justify-center border shadow-lg ${
              isConnected
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : needsQR
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
          >
            {isConnected ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : needsQR ? (
              <QrCode className="h-6 w-6 animate-pulse" />
            ) : (
              <Smartphone className="h-6 w-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Conexão WhatsApp</h2>
              {isConnected ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full badge-glow-green flex items-center gap-1">
                  <Radio className="h-3 w-3 animate-ping text-emerald-400" /> Operacional
                </span>
              ) : needsQR ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <QrCode className="h-3 w-3" /> Escanear QR Code
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  Desconectado
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isConnected
                ? `Conectado como ${sessionInfo.me?.pushName || "WhatsApp Bot"} (${sessionInfo.me?.id || "Sessão Ativa"})`
                : needsQR
                ? "Escaneie o código abaixo no seu aplicativo do WhatsApp"
                : "Inicie a sessão para conectar seu WhatsApp e capturar leads automaticamente"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {isConnected && (
            <button
              onClick={handleStopSession}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-all"
            >
              <Square className="h-3.5 w-3.5" /> Desconectar
            </button>
          )}

          {(needsStart || needsQR) && (
            <button
              onClick={handleStartSession}
              disabled={startingSession}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              <Play className={`h-4 w-4 ${startingSession ? "animate-spin" : ""}`} />
              {startingSession ? "Iniciando..." : needsQR ? "Reiniciar Sessão" : "Iniciar Conexão WhatsApp"}
            </button>
          )}

          <button
            onClick={checkStatus}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
            title="Atualizar Status"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Wizard Area */}
      {isConnected ? (
        <div className="mt-6 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            <span className="text-xs text-slate-300">
              Sessão ativa e webhook registrado em <code className="text-emerald-400 bg-slate-950 px-2 py-0.5 rounded font-mono">http://backend:8000/webhook/waha</code>. Todas as mensagens recebidas serão capturadas automaticamente!
            </span>
          </div>
        </div>
      ) : needsQR ? (
        <div className="mt-6 flex flex-col md:flex-row items-center gap-8 bg-slate-900/60 p-6 rounded-xl border border-slate-800">
          {/* QR Container */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
            <div className="relative bg-white p-4 rounded-2xl shadow-xl flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`http://localhost:8000/waha/qr?t=${qrKey}`}
                alt="WhatsApp QR Code"
                className="w-52 h-52 object-contain"
                onError={(e) => {
                  // If image fails, retry after short delay
                  setTimeout(() => setQrKey(Date.now()), 2000);
                }}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="flex-1 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" /> Passo a Passo para Conectar:
            </h3>
            <ol className="space-y-3 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
              <li className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                Abra o aplicativo do <strong>WhatsApp</strong> no seu celular.
              </li>
              <li className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                Toque em <strong>Menu (⋮)</strong> ou <strong>Configurações</strong> &gt; <strong>Aparelhos conectados</strong>.
              </li>
              <li className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                Toque em <strong>Conectar um aparelho</strong> e aponte a câmera para o QR Code ao lado.
              </li>
            </ol>
            <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
              <HelpCircle className="h-3.5 w-3.5 text-slate-400" /> O código QR é atualizado automaticamente a cada poucos segundos.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center">
          <p className="text-sm text-slate-300 mb-4">
            Nenhuma sessão ativa detectada. Clique no botão abaixo para inicializar o engine do WAHA e conectar seu número.
          </p>
          <button
            onClick={handleStartSession}
            disabled={startingSession}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
          >
            {startingSession ? "Iniciando Sessão..." : "Iniciar Sessão WhatsApp"}
          </button>
        </div>
      )}
    </div>
  );
}
