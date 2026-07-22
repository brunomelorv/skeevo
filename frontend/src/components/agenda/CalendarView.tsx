"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, User } from "lucide-react";

interface Appointment {
  id: number | string;
  lead_id?: number;
  leadName?: string;
  summary?: string;
  start_time?: string;
  end_time?: string;
  time?: string;
  date?: string;
  status: string;
}

export default function CalendarView() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAppointments() {
      try {
        const response = await fetch("http://localhost:8000/api/calendar/appointments");
        if (response.ok) {
          const data = await response.json();
          setAppointments(data);
        }
      } catch (error) {
        console.error("Failed to fetch appointments", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAppointments();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Calendário de Reuniões</h2>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground p-8">Carregando compromissos...</div>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <CalendarIcon className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum compromisso agendado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {appointments.map((apt) => {
            const dateObj = apt.start_time ? new Date(apt.start_time) : null;
            const displayDate = dateObj
              ? dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
              : apt.date || "-";
            const displayTime = dateObj
              ? dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
              : apt.time || "-";
            const displayName = apt.summary || apt.leadName || (apt.lead_id ? `Lead #${apt.lead_id}` : "Cliente");

            return (
              <Card key={apt.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{displayDate}</CardTitle>
                  <div
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      apt.status === "scheduled" || apt.status === "confirmed"
                        ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300"
                    }`}
                  >
                    {apt.status}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-2 mt-4">
                    <div className="flex items-center text-sm font-medium">
                      <User className="mr-2 h-4 w-4 text-muted-foreground" />
                      {displayName}
                    </div>
                    <div className="flex items-center text-sm font-mono text-muted-foreground">
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      {displayTime}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
