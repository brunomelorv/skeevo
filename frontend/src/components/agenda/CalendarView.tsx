"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, User } from "lucide-react";

interface Appointment {
  id: string;
  leadName: string;
  time: string; // e.g., "14:00"
  date: string; // e.g., "2024-03-15"
  status: string; // e.g., "confirmed", "pending"
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
          {appointments.map((apt) => (
            <Card key={apt.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {new Date(apt.date).toLocaleDateString()}
                </CardTitle>
                <div className={`px-2 py-1 rounded text-xs font-semibold ${
                  apt.status === "confirmed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                }`}>
                  {apt.status}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-2 mt-4">
                  <div className="flex items-center text-sm">
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    {apt.leadName}
                  </div>
                  <div className="flex items-center text-sm">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    {apt.time}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
