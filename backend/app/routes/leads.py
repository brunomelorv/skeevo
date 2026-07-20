import inspect
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Lead, Message, LeadFollowup
from app.schemas import LeadResponse, MessageResponse, LeadStatusUpdate
from app.routes.followup import (
    get_or_create_config,
    cancel_lead_followups,
    schedule_lead_followups,
)

router = APIRouter()


@router.get("/leads", response_model=list[LeadResponse])
async def list_leads(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Lead).order_by(Lead.updated_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.get("/leads/count")
async def count_leads(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(func.count(Lead.id)))
    total = result.scalar() or 0
    return {"total": total}


@router.get("/leads/today")
async def leads_today(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(func.count(Lead.id)).where(
            func.date(Lead.created_at) == func.current_date()
        )
    )
    total = result.scalar() or 0
    return {"total": total}


@router.get("/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.patch("/leads/{lead_id}/status", response_model=LeadResponse)
async def update_lead_status(
    lead_id: int,
    payload: LeadStatusUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    new_status = payload.status
    lead.status = new_status
    lead.updated_at = func.now()

    config = await get_or_create_config(db)
    target_statuses = config.target_statuses or []

    if new_status not in target_statuses:
        await cancel_lead_followups(db, lead.id, reason=f"status_changed_to_{new_status}")
    else:
        active_res = await db.execute(
            select(LeadFollowup).where(
                LeadFollowup.lead_id == lead.id,
                LeadFollowup.status == "scheduled"
            )
        )
        scalars = active_res.scalars()
        if inspect.iscoroutine(scalars):
            scalars = await scalars
        active_items = scalars.all()
        if inspect.iscoroutine(active_items):
            active_items = await active_items
        has_active = len(active_items) > 0 if isinstance(active_items, (list, tuple)) else False
        if not has_active:
            await schedule_lead_followups(db, lead)

    await db.commit()
    await db.refresh(lead)
    return lead


@router.get("/leads/{lead_id}/messages", response_model=list[MessageResponse])
async def list_lead_messages(lead_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Message).where(Message.lead_id == lead_id).order_by(Message.created_at.asc())
    )
    return result.scalars().all()
