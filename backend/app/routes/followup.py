import inspect
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import FollowupConfig, FollowupStep, LeadFollowup, Lead
from app.schemas import (
    FollowupConfigRead,
    FollowupConfigUpdate,
    FollowupStepSchema,
    LeadFollowupRead,
)
from app.services.followup_calculator import (
    adjust_for_sending_window,
    stagger_schedule_time,
)

router = APIRouter(prefix="/api/followup", tags=["Follow Up"])


async def get_or_create_config(db: AsyncSession) -> FollowupConfig:
    result = await db.execute(select(FollowupConfig).where(FollowupConfig.id == 1))
    scalars = result.scalars()
    if inspect.iscoroutine(scalars):
        scalars = await scalars
    config = scalars.first()
    if inspect.iscoroutine(config):
        config = await config

    if not config or not isinstance(config, FollowupConfig):
        config = FollowupConfig(id=1)
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config


async def cancel_lead_followups(db: AsyncSession, lead_id: int, reason: str):
    result = await db.execute(
        select(LeadFollowup).where(
            LeadFollowup.lead_id == lead_id,
            LeadFollowup.status == "scheduled"
        )
    )
    scalars = result.scalars()
    if inspect.iscoroutine(scalars):
        scalars = await scalars
    scheduled_items = scalars.all()
    if inspect.iscoroutine(scheduled_items):
        scheduled_items = await scheduled_items

    if isinstance(scheduled_items, (list, tuple)):
        for item in scheduled_items:
            if hasattr(item, "status"):
                item.status = "cancelled"
                item.cancel_reason = reason
        if scheduled_items:
            await db.commit()


async def schedule_lead_followups(db: AsyncSession, lead):
    config = await get_or_create_config(db)
    if not config or not getattr(config, "is_enabled", False):
        return

    target_statuses = getattr(config, "target_statuses", None) or []
    lead_status = getattr(lead, "status", None)
    if lead_status not in target_statuses:
        return

    steps_res = await db.execute(
        select(FollowupStep).order_by(FollowupStep.step_number.asc())
    )
    scalars = steps_res.scalars()
    if inspect.iscoroutine(scalars):
        scalars = await scalars
    steps = scalars.all()
    if inspect.iscoroutine(steps):
        steps = await steps

    if not steps or not isinstance(steps, (list, tuple)):
        return

    existing_res = await db.execute(
        select(LeadFollowup.scheduled_at).where(LeadFollowup.status == "scheduled")
    )
    ex_scalars = existing_res.scalars()
    if inspect.iscoroutine(ex_scalars):
        ex_scalars = await ex_scalars
    ex_dts = ex_scalars.all()
    if inspect.iscoroutine(ex_dts):
        ex_dts = await ex_dts

    existing_scheduled_dts = [
        dt.replace(tzinfo=None) if hasattr(dt, "tzinfo") and dt.tzinfo else dt
        for dt in (ex_dts if isinstance(ex_dts, (list, tuple)) else [])
        if dt is not None
    ]

    base_time = datetime.now()
    window_start = getattr(config, "window_start", "08:00") or "08:00"
    window_end = getattr(config, "window_end", "20:00") or "20:00"
    min_interval = getattr(config, "min_interval_minutes", 4)
    if min_interval is None:
        min_interval = 4

    lead_id = getattr(lead, "id", None)
    if lead_id is None:
        return

    for step in steps:
        delay_hours = getattr(step, "delay_hours", 0)
        target_dt = base_time + timedelta(hours=delay_hours)
        target_dt = adjust_for_sending_window(
            target_dt,
            window_start=window_start,
            window_end=window_end,
        )
        target_dt = stagger_schedule_time(
            target_dt,
            existing_scheduled_dts=existing_scheduled_dts,
            min_interval_minutes=min_interval,
        )
        existing_scheduled_dts.append(target_dt)

        item = LeadFollowup(
            lead_id=lead_id,
            step_id=getattr(step, "id", None),
            step_number=getattr(step, "step_number", 1),
            scheduled_at=target_dt,
            status="scheduled"
        )
        db.add(item)

    await db.commit()


@router.get("/config", response_model=FollowupConfigRead)
async def get_followup_config(db: AsyncSession = Depends(get_db)):
    config = await get_or_create_config(db)
    steps_res = await db.execute(
        select(FollowupStep).order_by(FollowupStep.step_number.asc())
    )
    scalars = steps_res.scalars()
    if inspect.iscoroutine(scalars):
        scalars = await scalars
    steps = scalars.all()
    if inspect.iscoroutine(steps):
        steps = await steps

    return FollowupConfigRead(
        id=config.id,
        is_enabled=config.is_enabled,
        target_statuses=config.target_statuses or ["novo", "em_atendimento"],
        window_start=config.window_start or "08:00",
        window_end=config.window_end or "20:00",
        min_interval_minutes=config.min_interval_minutes if config.min_interval_minutes is not None else 4,
        steps=[FollowupStepSchema.model_validate(s) for s in (steps if isinstance(steps, (list, tuple)) else [])],
        updated_at=config.updated_at,
    )


@router.post("/config", response_model=FollowupConfigRead)
async def update_followup_config(
    data: FollowupConfigUpdate, db: AsyncSession = Depends(get_db)
):
    config = await get_or_create_config(db)

    config.is_enabled = data.is_enabled
    config.target_statuses = data.target_statuses
    config.window_start = data.window_start
    config.window_end = data.window_end
    config.min_interval_minutes = data.min_interval_minutes

    await db.execute(delete(FollowupStep))

    for step_data in data.steps:
        step = FollowupStep(
            step_number=step_data.step_number,
            delay_hours=step_data.delay_hours,
            mode=step_data.mode,
            content=step_data.content,
        )
        db.add(step)

    await db.commit()
    await db.refresh(config)
    return await get_followup_config(db)


@router.get("/queue", response_model=list[LeadFollowupRead])
async def list_followup_queue(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(LeadFollowup, Lead).outerjoin(Lead, LeadFollowup.lead_id == Lead.id)
    if status:
        query = query.where(LeadFollowup.status == status)
    query = query.order_by(LeadFollowup.scheduled_at.asc())

    result = await db.execute(query)
    rows = result.all()
    if inspect.iscoroutine(rows):
        rows = await rows

    items = []
    if isinstance(rows, (list, tuple)):
        for row in rows:
            try:
                followup = row[0] if hasattr(row, "__getitem__") else row
                lead = row[1] if (hasattr(row, "__getitem__") and len(row) > 1) else None
            except Exception:
                followup, lead = row, None

            item = LeadFollowupRead.model_validate(followup)
            if lead:
                item.lead_name = getattr(lead, "name", None) or getattr(lead, "push_name", None) or ""
                item.lead_phone = getattr(lead, "phone", None)
                item.lead_status = getattr(lead, "status", None)
            items.append(item)
    return items


@router.post("/queue/{followup_id}/cancel", response_model=LeadFollowupRead)
async def cancel_followup_item(
    followup_id: int, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(LeadFollowup).where(LeadFollowup.id == followup_id)
    )
    scalars = result.scalars()
    if inspect.iscoroutine(scalars):
        scalars = await scalars
    item = scalars.one_or_none()
    if inspect.iscoroutine(item):
        item = await item

    if not item:
        raise HTTPException(status_code=404, detail="Followup item not found")

    item.status = "cancelled"
    item.cancel_reason = "manual"
    await db.commit()
    await db.refresh(item)
    return item
