import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routes import webhook, leads, waha, agent, followup, kanban, audit
from app.services.followup_scheduler import run_followup_worker_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        from sqlalchemy import text
        await conn.execute(text("ALTER TABLE agent_settings ADD COLUMN IF NOT EXISTS simulate_typing BOOLEAN DEFAULT TRUE;"))
        await conn.execute(text("ALTER TABLE agent_settings ADD COLUMN IF NOT EXISTS split_long_messages BOOLEAN DEFAULT TRUE;"))
        await conn.execute(text("ALTER TABLE agent_settings ADD COLUMN IF NOT EXISTS min_typing_delay INTEGER DEFAULT 3;"))
        await conn.execute(text("ALTER TABLE agent_settings ADD COLUMN IF NOT EXISTS max_typing_delay INTEGER DEFAULT 8;"))
        await conn.execute(text("ALTER TABLE leads ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;"))
    worker_task = asyncio.create_task(run_followup_worker_loop())
    try:
        yield
    finally:
        worker_task.cancel()
        try:
            await worker_task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="Skeevo API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhook.router, tags=["Webhook"])
app.include_router(leads.router, tags=["Leads"])
app.include_router(waha.router, tags=["WAHA Session"])
app.include_router(agent.router)
app.include_router(followup.router)
app.include_router(kanban.router)
app.include_router(audit.router)


@app.get("/")
async def root():
    return {"message": "Skeevo API"}


@app.get("/health")
async def health():
    return {"status": "ok"}
