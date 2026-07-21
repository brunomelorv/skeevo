from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models import AuditLogModel
from app.schemas import AuditLogRead

router = APIRouter(prefix="/audit", tags=["Audit Logs"])


@router.get("/logs", response_model=List[AuditLogRead])
async def get_audit_logs(
    category: Optional[str] = Query(None, description="Filtrar por categoria: kanban, lead_movement, followup, agent"),
    search: Optional[str] = Query(None, description="Busca textual no título ou detalhes"),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    query = select(AuditLogModel).order_by(AuditLogModel.id.desc())

    if category and category.strip() and category != "all":
        query = query.where(AuditLogModel.category == category.strip())

    result = await db.execute(query.limit(limit))
    logs = result.scalars().all()

    if search and search.strip():
        term = search.strip().lower()
        filtered = []
        for log in logs:
            if term in log.title.lower() or (log.details and term in str(log.details).lower()):
                filtered.append(log)
        return filtered

    return logs
