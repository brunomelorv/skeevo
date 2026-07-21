import datetime
import zoneinfo
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_

from app.models import ScheduleModel, AppointmentModel, GoogleOAuthTokenModel

async def get_free_slots_for_date(db: AsyncSession, target_date_str: str) -> list[dict]:
    # Pega ou cria agenda principal
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
                str(i): ["09:00-12:00", "14:00-18:00"] for i in range(5) # 0=Monday, 4=Friday
            }
        )
        db.add(schedule)
        await db.commit()
        await db.refresh(schedule)

    target_date = datetime.date.fromisoformat(target_date_str)
    tz = zoneinfo.ZoneInfo(schedule.timezone)
    now = datetime.datetime.now(tz)
    
    weekday_str = str(target_date.weekday())
    availability_ranges = schedule.weekly_availability.get(weekday_str, [])
    
    if not availability_ranges:
        return []

    # Get appointments for this date
    start_of_day = datetime.datetime.combine(target_date, datetime.time.min, tzinfo=tz)
    end_of_day = datetime.datetime.combine(target_date, datetime.time.max, tzinfo=tz)

    appt_stmt = select(AppointmentModel).where(
        AppointmentModel.start_time >= start_of_day,
        AppointmentModel.start_time <= end_of_day,
        AppointmentModel.status != "cancelled"
    )
    appt_result = await db.execute(appt_stmt)
    appointments = appt_result.scalars().all()

    # Generate all possible slots
    slots = []
    slot_delta = datetime.timedelta(minutes=schedule.slot_duration_minutes)
    min_notice_delta = datetime.timedelta(hours=schedule.min_notice_hours)

    for time_range in availability_ranges:
        # e.g., "09:00-12:00"
        start_str, end_str = time_range.split("-")
        start_time = datetime.time.fromisoformat(start_str)
        end_time = datetime.time.fromisoformat(end_str)
        
        current_slot_start = datetime.datetime.combine(target_date, start_time, tzinfo=tz)
        range_end = datetime.datetime.combine(target_date, end_time, tzinfo=tz)
        
        while current_slot_start + slot_delta <= range_end:
            current_slot_end = current_slot_start + slot_delta
            
            # Check min notice
            if current_slot_start < now + min_notice_delta:
                current_slot_start += slot_delta
                continue
                
            # Check conflict with existing appointments
            conflict = False
            for appt in appointments:
                # Appt tz awareness normalization if needed, but they are stored as UTC or aware
                # Ensure they overlap
                appt_start = appt.start_time.astimezone(tz) if appt.start_time.tzinfo else appt.start_time.replace(tzinfo=tz)
                appt_end = appt.end_time.astimezone(tz) if appt.end_time.tzinfo else appt.end_time.replace(tzinfo=tz)
                
                if (current_slot_start < appt_end and current_slot_end > appt_start):
                    conflict = True
                    break
                    
            if not conflict:
                slots.append({
                    "time": current_slot_start.strftime("%H:%M"),
                    "available": True
                })
                
            current_slot_start += slot_delta

    return slots
