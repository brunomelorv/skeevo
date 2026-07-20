"use client";

import { useState } from "react";
import { Key, Eye, EyeOff, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ApiKeyCardProps {
  apiKey: string;
  onChangeApiKey: (value: string) => void;
  hasApiKey: boolean;
  apiKeyMasked: string;
}

export default function ApiKeyCard({
  apiKey,
  onChangeApiKey,
  hasApiKey,
  apiKeyMasked,
}: ApiKeyCardProps) {
  const [showKey, setShowKey] = useState(false);

  return (
    <Card className="shadow-xs border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Key className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Chave de API OpenAI</CardTitle>
              <CardDescription className="text-xs">
                Credencial necessária para gerar respostas inteligentes
              </CardDescription>
            </div>
          </div>
          <div>
            {hasApiKey ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 gap-1.5 px-2.5 py-1">
                <CheckCircle2 className="size-3.5" />
                Chave Configurada
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20 gap-1.5 px-2.5 py-1">
                <AlertTriangle className="size-3.5" />
                Sem Chave OpenAI
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative flex items-center">
          <Input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => onChangeApiKey(e.target.value)}
            placeholder={hasApiKey ? "Digite uma nova chave para alterar..." : "sk-..."}
            className="pr-10 font-mono text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 h-full px-3 text-muted-foreground hover:text-foreground"
            onClick={() => setShowKey(!showKey)}
            title={showKey ? "Ocultar chave" : "Mostrar chave"}
          >
            {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          {hasApiKey ? (
            <>
              {apiKeyMasked && (
                <p className="font-medium text-foreground/80">
                  Chave em uso: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">{apiKeyMasked}</code>
                </p>
              )}
              <p>A chave atual não é exibida por segurança. Digite uma nova apenas se desejar alterá-la.</p>
            </>
          ) : (
            <p>Nenhuma chave configurada. Insira sua OpenAI API Key para que o assistente possa responder mensagens automaticamente.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
