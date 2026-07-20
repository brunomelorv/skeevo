from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Lead, Message
from app.schemas import LeadResponse, MessageResponse

router = APIRouter()


@router.get("/leads", response_model=list[LeadResponse])
async def list_leads(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Lead).order_by(Lead.created_at.desc()).offset(skip).limit(limit)
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


@router.get("/leads/{lead_id}/messages", response_model=list[MessageResponse])
async def list_lead_messages(lead_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Message).where(Message.lead_id == lead_id).order_by(Message.created_at.asc())
    )
    return result.scalars().all()
