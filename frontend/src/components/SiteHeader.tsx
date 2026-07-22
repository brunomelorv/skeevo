"use client";

import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Radio } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function SiteHeader() {
  const [status, setStatus] = useState<string>("CHECKING");

  const checkStatus = async () => {
    try {
      const data = await apiFetch<{ status: string }>("/waha/status");
      setStatus(data.status || "DISCONNECTED");
    } catch {
      setStatus("DISCONNECTED");
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 6000);
    return () => clearInterval(interval);
  }, []);

  const isConnected = status === "WORKING" || status === "CONNECTED";
  const isConnecting = status === "SCAN_QR_CODE" || status === "STARTING";

  return (
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <Radio
            className={`h-3 w-3 ${
              isConnected
                ? "animate-pulse text-emerald-500"
                : isConnecting
                ? "animate-pulse text-amber-500"
                : "text-muted-foreground"
            }`}
          />
          <span>
            {isConnected
              ? "Whatsapp online"
              : isConnecting
              ? "Whatsapp aguardando QR"
              : "Whatsapp offline"}
          </span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
