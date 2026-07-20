from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routes import webhook, leads, waha, agent


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


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


@app.get("/")
async def root():
    return {"message": "Skeevo API"}


@app.get("/health")
async def health():
    return {"status": "ok"}
