"use client";

import { useEffect, useState, useRef } from "react";
import {
  MessageSquare,
  Search,
  Phone,
  Send,
  RefreshCw,
  Clock,
} from "lucide-react";
import { Lead } from "@/components/KanbanBoard";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useKanbanColumns } from "@/hooks/useKanbanColumns";
import { useMemo } from "react";

interface Message {
  id: number;
  lead_id: number;
  message_id?: string;
  body?: string;
  from_me: boolean;
  chat_id?: string;
  created_at: string;
}

export default function ChatsPage() {
  const { columns } = useKanbanColumns();

  const statusConfig = useMemo(() => {
    const config: Record<string, { label: string; badge: string }> = {};
    columns.forEach((col) => {
      config[col.id] = { label: col.label, badge: col.badgeClass };
    });
    return config;
  }, [columns]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Ref para rastrear qual leadId está atualmente selecionado,
  // evitando que fetchMessages de um lead antigo sobrescreva o novo.
  const selectedLeadIdRef = useRef<number | null>(null);

  const fetchLeads = async () => {
    try {
      const res = await fetch("http://localhost:8000/leads?limit=100");
      if (res.ok) {
        const data = await res.json();
        // Atualiza a lista de leads sem alterar selectedLead para não
        // disparar o useEffect de mensagens desnecessariamente.
        setLeads(data);
        if (!selectedLeadIdRef.current && data.length > 0) {
          setSelectedLead(data[0]);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar leads:", err);
    } finally {
      setLoadingLeads(false);
    }
  };

  const fetchMessages = async (leadId: number) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`http://localhost:8000/leads/${leadId}/messages`);
      if (res.ok) {
        const data = await res.json();
        // Só atualiza as mensagens se o lead ainda é o selecionado.
        // Evita race condition onde uma resposta atrasada de um lead anterior
        // sobrescreve as mensagens do lead atual.
        if (selectedLeadIdRef.current === leadId) {
          setMessages(data);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err);
    } finally {
      if (selectedLeadIdRef.current === leadId) {
        setLoadingMessages(false);
      }
    }
  };

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    if (selectedLead) {
      selectedLeadIdRef.current = selectedLead.id;
      setMessages([]);
      fetchMessages(selectedLead.id);
    } else {
      selectedLeadIdRef.current = null;
    }
  }, [selectedLead?.id]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleStatusChange = async (leadId: number, newStatus: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    try {
      await fetch(`http://localhost:8000/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedLead || !inputText.trim() || sending) return;

    const textToSend = inputText.trim();
    const currentLeadId = selectedLead.id;
    setInputText("");
    setSending(true);

    // Otimismo: mostra a mensagem na tela imediatamente com ID temporário
    const tempId = Date.now();
    const tempMsg: Message = {
      id: tempId,
      lead_id: currentLeadId,
      body: textToSend,
      from_me: true,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch(`http://localhost:8000/leads/${currentLeadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });

      if (res.ok) {
        // Aguarda as mensagens do banco para substituir o temp com o ID real.
        // fetchLeads é chamado sem await pois é apenas para atualizar a sidebar.
        await fetchMessages(currentLeadId);
        fetchLeads();
      } else {
        // Em caso de erro, remove a mensagem temporária da tela
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        console.error("Erro ao enviar mensagem: servidor retornou", res.status);
      }
    } catch (err) {
      // Em caso de erro de rede, remove a mensagem temporária
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      console.error("Erro ao enviar mensagem:", err);
    } finally {
      setSending(false);
    }
  };

  const filteredLeads = leads.filter(
    (l) =>
      l.phone.toLowerCase().includes(search.toLowerCase()) ||
      (l.push_name && l.push_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4">
      {/* Header da Aba */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="size-5 text-primary" /> Chats & Atendimento
          </h1>
          <p className="text-xs text-muted-foreground">
            Converse ao vivo e gerencie seus leads do WhatsApp em tempo real
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLeads} className="gap-1.5 text-xs">
          <RefreshCw className="size-3.5" /> Atualizar
        </Button>
      </div>

      {/* Grid Principal (Split View) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden border rounded-xl bg-card shadow-xs min-h-0 h-full">
        {/* Painel Esquerdo: Lista de Conversas (4 colunas) */}
        <div className="md:col-span-4 lg:col-span-4 border-r flex flex-col h-full min-h-0 bg-muted/10">
          <div className="p-3 border-b space-y-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs bg-background"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y min-h-0">
            {loadingLeads ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Carregando conversas...
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Nenhuma conversa encontrada.
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = selectedLead?.id === lead.id;
                const statusInfo = statusConfig[lead.status] || {
                  label: lead.status,
                  badge: "bg-muted text-muted-foreground",
                };

                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={`p-3 flex items-start gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-accent border-l-4 border-l-primary"
                        : "hover:bg-accent/40"
                    }`}
                  >
                    <Avatar className="size-10 rounded-full shrink-0">
                      {lead.profile_picture_url ? (
                        <AvatarImage
                          src={lead.profile_picture_url}
                          alt={lead.push_name || lead.phone}
                          referrerPolicy="no-referrer"
                          className="object-cover size-full"
                        />
                      ) : null}
                      <AvatarFallback className="rounded-full bg-primary/10 text-primary text-xs font-bold size-full flex items-center justify-center">
                        {(lead.push_name || lead.phone)[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="text-xs font-semibold truncate">
                          {lead.push_name || "Lead WhatsApp"}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(lead.updated_at || lead.created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <p className="text-[11px] font-mono text-muted-foreground truncate mb-1">
                        {lead.phone}
                      </p>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {lead.first_message || "Sem mensagem"}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${statusInfo.badge}`}
                        >
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Painel Direito: Chat Ativo (8 colunas) */}
        <div className="md:col-span-8 lg:col-span-8 flex flex-col h-full min-h-0 bg-background">
          {selectedLead ? (
            <>
              {/* Header do Chat */}
              <div className="p-3 border-b flex items-center justify-between bg-card shrink-0">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 rounded-full">
                    {selectedLead.profile_picture_url ? (
                      <AvatarImage
                        src={selectedLead.profile_picture_url}
                        alt={selectedLead.push_name || selectedLead.phone}
                        referrerPolicy="no-referrer"
                        className="object-cover size-full"
                      />
                    ) : null}
                    <AvatarFallback className="rounded-full bg-primary text-primary-foreground font-bold text-sm size-full flex items-center justify-center">
                      {(selectedLead.push_name || selectedLead.phone)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-sm font-bold">
                      {selectedLead.push_name || "Lead WhatsApp"}
                    </h2>
                    <p className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                      <Phone className="size-3 text-muted-foreground" /> {selectedLead.phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:inline">Kanban:</span>
                  <Select
                    value={selectedLead.status}
                    onValueChange={(val) => {
                      if (val) handleStatusChange(selectedLead.id, val);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs w-[130px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Área de Mensagens (Scrollable Independente) */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20 min-h-0">
                {loadingMessages ? (
                  <div className="text-center py-12 text-xs text-muted-foreground">
                    Carregando mensagens da conversa...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <p className="text-xs text-muted-foreground">{selectedLead.first_message}</p>
                    <span className="text-[10px] text-muted-foreground block">
                      Primeira mensagem recebida
                    </span>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.from_me ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                          msg.from_me
                            ? "bg-primary text-primary-foreground rounded-br-none font-medium"
                            : "bg-card border rounded-bl-none text-card-foreground"
                        }`}
                      >
                        {msg.body}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 px-1 flex items-center gap-1">
                        <Clock className="size-2.5" />
                        {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Input de Envio de Mensagem */}
              <form onSubmit={handleSendMessage} className="p-3 border-t bg-card flex items-center gap-2">
                <Input
                  placeholder="Digite sua mensagem para o WhatsApp..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 text-xs"
                  disabled={sending}
                />
                <Button type="submit" size="sm" disabled={!inputText.trim() || sending} className="gap-1.5">
                  <Send className="size-3.5" />
                  <span className="hidden sm:inline">Enviar</span>
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 text-muted-foreground">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <MessageSquare className="size-8" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Nenhuma conversa selecionada</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Selecione um lead da lista ao lado para iniciar o atendimento ao vivo
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
