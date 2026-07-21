import re
import unicodedata
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models import KanbanColumnModel, AuditLogModel
from app.schemas import KanbanColumnRead, KanbanColumnCreate, KanbanColumnUpdate

router = APIRouter(prefix="/kanban", tags=["Kanban Columns"])

DEFAULT_COLUMNS = [
    {"slug": "novo", "label": "Novo", "color": "bg-chart-1", "badge_class": "bg-chart-1/10 text-chart-1 border-chart-1/20", "position": 0},
    {"slug": "em_atendimento", "label": "Em Atendimento", "color": "bg-chart-2", "badge_class": "bg-chart-2/10 text-chart-2 border-chart-2/20", "position": 1},
    {"slug": "qualificado", "label": "Qualificado", "color": "bg-chart-3", "badge_class": "bg-chart-3/10 text-chart-3 border-chart-3/20", "position": 2},
    {"slug": "ganho", "label": "Ganho", "color": "bg-chart-4", "badge_class": "bg-chart-4/10 text-chart-4 border-chart-4/20", "position": 3},
    {"slug": "perdido", "label": "Perdido", "color": "bg-chart-5", "badge_class": "bg-chart-5/10 text-chart-5 border-chart-5/20", "position": 4},
]

CHART_COLORS = [
    {"color": "bg-chart-1", "badge_class": "bg-chart-1/10 text-chart-1 border-chart-1/20"},
    {"color": "bg-chart-2", "badge_class": "bg-chart-2/10 text-chart-2 border-chart-2/20"},
    {"color": "bg-chart-3", "badge_class": "bg-chart-3/10 text-chart-3 border-chart-3/20"},
    {"color": "bg-chart-4", "badge_class": "bg-chart-4/10 text-chart-4 border-chart-4/20"},
    {"color": "bg-chart-5", "badge_class": "bg-chart-5/10 text-chart-5 border-chart-5/20"},
]


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFD", text).encode("ascii", "ignore").decode("utf-8")
    text = re.sub(r"[^a-zA-Z0-9]+", "_", text.lower()).strip("_")
    return text[:40] or "coluna"


async def ensure_default_columns(db: AsyncSession):
    result = await db.execute(select(KanbanColumnModel))
    cols = result.scalars().all()
    if not cols:
        for c in DEFAULT_COLUMNS:
            db.add(KanbanColumnModel(**c))
        await db.commit()


@router.get("/columns", response_model=List[KanbanColumnRead])
async def get_kanban_columns(db: AsyncSession = Depends(get_db)):
    await ensure_default_columns(db)
    result = await db.execute(select(KanbanColumnModel).order_by(KanbanColumnModel.position, KanbanColumnModel.id))
    return result.scalars().all()


@router.post("/columns", response_model=KanbanColumnRead, status_code=status.HTTP_201_CREATED)
async def create_kanban_column(data: KanbanColumnCreate, db: AsyncSession = Depends(get_db)):
    await ensure_default_columns(db)
    
    result = await db.execute(select(KanbanColumnModel).order_by(KanbanColumnModel.position.desc()))
    all_cols = result.scalars().all()
    if len(all_cols) >= 10:
        raise HTTPException(status_code=400, detail="Limite de 10 colunas atingido.")

    label = data.label.strip()
    if not label:
        raise HTTPException(status_code=400, detail="O nome da coluna não pode ser vazio.")

    base_slug = slugify(label)
    slug = base_slug
    existing_slugs = {c.slug for c in all_cols}
    idx = 1
    while slug in existing_slugs:
        slug = f"{base_slug}_{idx}"
        idx += 1

    color_idx = len(all_cols) % len(CHART_COLORS)
    color_info = CHART_COLORS[color_idx]
    next_pos = (all_cols[0].position + 1) if all_cols else 0

    new_col = KanbanColumnModel(
        slug=slug,
        label=label,
        color=color_info["color"],
        badge_class=color_info["badge_class"],
        position=next_pos,
    )
    db.add(new_col)
    await db.flush()

    # Log de Auditoria
    audit_entry = AuditLogModel(
        category="kanban",
        action="column_created",
        entity_type="column",
        entity_id=str(new_col.id),
        title=f"Coluna criada: '{label}'",
        details={
            "id": new_col.id,
            "slug": new_col.slug,
            "label": new_col.label,
            "color": new_col.color,
            "position": new_col.position,
        },
    )
    db.add(audit_entry)
    await db.commit()
    await db.refresh(new_col)
    return new_col


@router.delete("/columns/{column_id}")
async def delete_kanban_column(column_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KanbanColumnModel).where(KanbanColumnModel.id == column_id))
    col = result.scalar_one_or_none()
    if not col:
        raise HTTPException(status_code=404, detail="Coluna não encontrada.")

    # Regra: não remover se restar apenas 1
    total_result = await db.execute(select(KanbanColumnModel))
    total_cols = total_result.scalars().all()
    if len(total_cols) <= 1:
        raise HTTPException(status_code=400, detail="Não é possível remover a única coluna existente.")

    # Log de Auditoria
    audit_entry = AuditLogModel(
        category="kanban",
        action="column_deleted",
        entity_type="column",
        entity_id=str(col.id),
        title=f"Coluna removida: '{col.label}'",
        details={
            "id": col.id,
            "slug": col.slug,
            "label": col.label,
        },
    )
    db.add(audit_entry)
    await db.delete(col)
    await db.commit()
    return {"message": "Coluna removida com sucesso", "id": column_id}


@router.patch("/columns/{column_id}", response_model=KanbanColumnRead)
async def update_kanban_column(column_id: int, data: KanbanColumnUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KanbanColumnModel).where(KanbanColumnModel.id == column_id))
    col = result.scalar_one_or_none()
    if not col:
        raise HTTPException(status_code=404, detail="Coluna não encontrada.")

    old_label = col.label
    if data.label is not None and data.label.strip():
        col.label = data.label.strip()
    if data.color is not None:
        col.color = data.color
    if data.badge_class is not None:
        col.badge_class = data.badge_class
    if data.position is not None:
        col.position = data.position

    audit_entry = AuditLogModel(
        category="kanban",
        action="column_updated",
        entity_type="column",
        entity_id=str(col.id),
        title=f"Coluna atualizada: '{old_label}' → '{col.label}'",
        details={
            "id": col.id,
            "slug": col.slug,
            "previous_label": old_label,
            "new_label": col.label,
        },
    )
    db.add(audit_entry)
    await db.commit()
    await db.refresh(col)
    return col
