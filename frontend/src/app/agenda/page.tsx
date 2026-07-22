"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import CalendarView from "@/components/agenda/CalendarView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AgendaPage() {
  const handleGoogleConnect = () => {
    window.location.href = "http://localhost:8000/api/calendar/google/auth-url";
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Agenda</h2>
      </div>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
          <TabsTrigger value="settings">Agendas e Horários</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <CalendarView />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Agenda Principal</CardTitle>
              <CardDescription>
                Gerencie seus horários de atendimento e regras de agendamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Status da Agenda</Label>
                  <p className="text-sm text-muted-foreground">
                    Ative ou desative o recebimento de novos agendamentos.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="slot-duration">Duração do Slot (minutos)</Label>
                  <Input id="slot-duration" type="number" defaultValue="30" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuso Horário</Label>
                  <Input id="timezone" defaultValue="America/Sao_Paulo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min-notice">Antecedência Mínima (horas)</Label>
                  <Input id="min-notice" type="number" defaultValue="2" />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">Janelas de Atendimento (Seg - Sex)</Label>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <div className="space-y-2">
                    <Label>Manhã - Início</Label>
                    <Input type="time" defaultValue="09:00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Manhã - Fim</Label>
                    <Input type="time" defaultValue="12:00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tarde - Início</Label>
                    <Input type="time" defaultValue="14:00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tarde - Fim</Label>
                    <Input type="time" defaultValue="18:00" />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Salvar Configurações</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Google Calendar</CardTitle>
              <CardDescription>
                Sincronize seus compromissos com o Google Calendar para evitar conflitos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Status da Conexão
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Não conectado
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleGoogleConnect} variant="outline">
                Conectar ao Google
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
