from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
import datetime

from app.database import get_db
from app.models import ScheduleModel, AppointmentModel, AuditLogModel, GoogleOAuthTokenModel
from app.schemas import ScheduleRead, AppointmentCreate, AppointmentRead
from app.services.availability_service import get_free_slots_for_date

router = APIRouter(prefix="/api/calendar", tags=["Calendar"])

@router.get("/schedule", response_model=ScheduleRead)
async def get_schedule(db: AsyncSession = Depends(get_db)):
    stmt = select(ScheduleModel).where(ScheduleModel.is_active == True)
    result = await db.execute(stmt)
    schedule = result.scalar_one_or_none()
    
    if not schedule:
        schedule = ScheduleModel(
            name="Agenda Principal",
            is_active=True,
            slot_duration_minutes=30,
            timezone="America/Sao_Paulo",
            min_notice_hours=24,
            weekly_availability={
                str(i): ["09:00-12:00", "14:00-18:00"] for i in range(5)
            }
        )
        db.add(schedule)
        await db.commit()
        await db.refresh(schedule)
        
    return schedule

@router.put("/schedule", response_model=ScheduleRead)
async def update_schedule(
    schedule_data: dict = Body(...),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ScheduleModel).where(ScheduleModel.is_active == True)
    result = await db.execute(stmt)
    schedule = result.scalar_one_or_none()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Agenda não encontrada")
        
    if "is_active" in schedule_data:
        schedule.is_active = schedule_data["is_active"]
    if "slot_duration_minutes" in schedule_data:
        schedule.slot_duration_minutes = schedule_data["slot_duration_minutes"]
    if "timezone" in schedule_data:
        schedule.timezone = schedule_data["timezone"]
    if "min_notice_hours" in schedule_data:
        schedule.min_notice_hours = schedule_data["min_notice_hours"]
    if "weekly_availability" in schedule_data:
        schedule.weekly_availability = schedule_data["weekly_availability"]
        
    await db.commit()
    await db.refresh(schedule)
    return schedule

@router.get("/slots")
async def get_slots(date: str = Query(..., description="Date in YYYY-MM-DD format"), db: AsyncSession = Depends(get_db)):
    try:
        slots = await get_free_slots_for_date(db, date)
        return slots
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de data inválido, use YYYY-MM-DD")

@router.get("/appointments", response_model=List[AppointmentRead])
async def list_appointments(db: AsyncSession = Depends(get_db)):
    stmt = select(AppointmentModel).order_by(AppointmentModel.start_time.asc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/appointments", response_model=AppointmentRead)
async def create_appointment(
    data: AppointmentCreate,
    db: AsyncSession = Depends(get_db)
):
    new_appt = AppointmentModel(
        lead_id=data.lead_id,
        start_time=data.start_time,
        end_time=data.end_time,
        summary=data.summary,
        notes=data.notes,
        status="scheduled"
    )
    db.add(new_appt)
    await db.flush() # flush to get new_appt.id
    
    audit_log = AuditLogModel(
        category="agenda",
        action="appointment_created",
        entity_type="appointment",
        entity_id=str(new_appt.id),
        title=f"Agendamento criado para o lead {data.lead_id}",
        details={"start_time": data.start_time.isoformat(), "end_time": data.end_time.isoformat()}
    )
    db.add(audit_log)
    
    await db.commit()
    await db.refresh(new_appt)
    return new_appt

@router.delete("/appointments/{appt_id}")
async def cancel_appointment(appt_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(AppointmentModel).where(AppointmentModel.id == appt_id)
    result = await db.execute(stmt)
    appt = result.scalar_one_or_none()
    
    if not appt:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
        
    appt.status = "cancelled"
    
    audit_log = AuditLogModel(
        category="agenda",
        action="appointment_cancelled",
        entity_type="appointment",
        entity_id=str(appt.id),
        title=f"Agendamento {appt.id} cancelado",
        details={"previous_status": "scheduled"}
    )
    db.add(audit_log)
    
    await db.commit()
    return {"status": "cancelled"}

@router.get("/google/auth-url")
async def get_google_auth_url():
    url = "https://accounts.google.com/o/oauth2/v2/auth?client_id=MOCK_CLIENT_ID&redirect_uri=MOCK_REDIRECT&response_type=code&scope=https://www.googleapis.com/auth/calendar.events"
    return {"url": url}

@router.get("/google/callback")
async def google_callback(code: str = Query(...), db: AsyncSession = Depends(get_db)):
    stmt = select(GoogleOAuthTokenModel).where(GoogleOAuthTokenModel.email == "mock@example.com")
    result = await db.execute(stmt)
    token = result.scalar_one_or_none()
    
    if not token:
        token = GoogleOAuthTokenModel(
            email="mock@example.com",
            access_token=f"mock_access_token_for_{code}",
            refresh_token="mock_refresh_token"
        )
        db.add(token)
    else:
        token.access_token = f"mock_access_token_for_{code}"
        
    await db.commit()
    return {"status": "success", "message": "Token do Google Calendar salvo com sucesso!"}
