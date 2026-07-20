# Plano de Implementação - Skeevo

## Objetivo
Sistema de captura de leads via WhatsApp, utilizando WAHA (WhatsApp HTTP API) como backend de mensagens e PostgreSQL como storage.

---

## 1. Instalação do WAHA 2026.6.1 + PostgreSQL

### 1.1 Pré-requisitos
- Docker e Docker Compose instalados
- Portas disponíveis: 3000 (WAHA), 5432 (PostgreSQL), 8000 (FastAPI)

### 1.2 Docker Compose

Criar `docker-compose.yaml` na raiz do projeto:

```yaml
services:
  waha:
    image: devlikeapro/waha:2026.6.1
    restart: always
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      - WHATSAPP_SESSIONS_POSTGRESQL_URL=postgres://postgres:postgres@postgres:5432/postgres?sslmode=disable
      - WAHA_MEDIA_STORAGE=POSTGRESQL
      - WAHA_MEDIA_POSTGRESQL_URL=postgres://postgres:postgres@postgres:5432/postgres?sslmode=disable
    depends_on:
      - postgres
    dns:
      - 1.1.1.1
      - 8.8.8.8
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "10"

  postgres:
    image: postgres:17
    restart: always
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=postgres
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    command:
      - postgres
      - "-c"
      - "max_connections=3000"
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "10"

volumes:
  postgres_data:
```

### 1.3 Variaveis de Ambiente (`.env`)

```env
# WAHA Credentials (geradas pelo init-waha)
WAHA_DASHBOARD_USERNAME=admin
WAHA_DASHBOARD_PASSWORD=11111111111111111111111111111111
WAHA_API_KEY=00000000000000000000000000000000

# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres
```

### 1.4 Comandos de Instalacao

```bash
# 1. Iniciar os servicos
docker compose up -d

# 2. Verificar se estao rodando
docker compose ps

# 3. Acessar o Dashboard
# http://localhost:3000/dashboard

# 4. Acessar o Swagger (para testes)
# http://localhost:3000/swagger/
```

### 1.5 Verificacao da Instalacao

```bash
# Testar se o WAHA esta respondendo
curl http://localhost:3000/api/sessions

# Testar conexao com PostgreSQL
docker compose exec postgres psql -U postgres -c "\l"
```

---

## 2. Estrutura do Banco de Dados (Leads)

### 2.1 Tabela de Leads

```sql
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255),
    push_name VARCHAR(255),
    first_message TEXT,
    first_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'novo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
```

### 2.2 Tabela de Mensagens

```sql
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    message_id VARCHAR(255),
    body TEXT,
    from_me BOOLEAN DEFAULT FALSE,
    chat_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON messages(lead_id);
```

---

## 3. Backend - FastAPI (Python)

### 3.1 Estrutura do Projeto

```
skeevo/
├── docker-compose.yaml
├── openapi.json
├── implementacao.md
├── backend/
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/
│   │       └── 001_create_tables.py
│   └── app/
│       ├── __init__.py
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── models.py
│       ├── schemas.py
│       ├── routes/
│       │   ├── __init__.py
│       │   ├── webhook.py
│       │   └── leads.py
│       └── services/
│           ├── __init__.py
│           └── lead_service.py
└── frontend/
    └── (Shadcn UI)
```

### 3.2 Dependencias (`requirements.txt`)

```
fastapi==0.115.0
uvicorn[standard]==0.32.0
asyncpg==0.30.0
sqlalchemy[asyncio]==2.0.36
pydantic-settings==2.6.0
python-dotenv==1.0.1
```

### 3.3 Configuracao (`app/config.py`)

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"
    WAHA_WEBHOOK_SECRET: str = ""
    WAHA_API_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"

settings = Settings()
```

### 3.4 Database (`app/database.py`)

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=True)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
```

### 3.5 Models (`app/models.py`)

```python
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func

from app.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)
    push_name = Column(String(255), nullable=True)
    first_message = Column(Text, nullable=True)
    first_message_at = Column(DateTime(timezone=True), server_default=func.now())
    last_message_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    status = Column(String(50), default="novo", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    message_id = Column(String(255), nullable=True)
    body = Column(Text, nullable=True)
    from_me = Column(Boolean, default=False)
    chat_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### 3.6 Schemas (`app/schemas.py`)

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LeadResponse(BaseModel):
    id: int
    phone: str
    name: Optional[str] = None
    push_name: Optional[str] = None
    first_message: Optional[str] = None
    first_message_at: Optional[datetime] = None
    last_message_at: Optional[datetime] = None
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: int
    lead_id: int
    message_id: Optional[str] = None
    body: Optional[str] = None
    from_me: bool
    chat_id: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
```

### 3.7 Lead Service (`app/services/lead_service.py`)

```python
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from app.models import Lead, Message


async def upsert_lead(
    db: AsyncSession,
    phone: str,
    body: str,
    message_id: str,
    chat_id: str,
    timestamp: int
):
    result = await db.execute(select(Lead).where(Lead.phone == phone))
    lead = result.scalar_one_or_none()

    dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)

    if lead is None:
        lead = Lead(
            phone=phone,
            first_message=body,
            first_message_at=dt,
            last_message_at=dt
        )
        db.add(lead)
        await db.flush()
    else:
        lead.last_message_at = dt
        lead.updated_at = func.now()

    msg = Message(
        lead_id=lead.id,
        message_id=message_id,
        body=body,
        from_me=False,
        chat_id=chat_id
    )
    db.add(msg)
    await db.commit()

    return lead
```

### 3.8 Webhook Route (`app/routes/webhook.py`)

```python
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.lead_service import upsert_lead

router = APIRouter()


@router.post("/webhook/waha")
async def webhook_waha(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.json()

    event = payload.get("event")
    msg = payload.get("payload", {})

    if event != "message" or msg.get("fromMe", True):
        return {"status": "ignored"}

    phone = msg.get("from", "").replace("@c.us", "")

    if not phone:
        return {"status": "ignored"}

    await upsert_lead(
        db=db,
        phone=phone,
        body=msg.get("body", ""),
        message_id=msg.get("id", ""),
        chat_id=msg.get("from", ""),
        timestamp=msg.get("timestamp", 0)
    )

    return {"status": "ok"}
```

### 3.9 Leads Route (`app/routes/leads.py`)

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Lead
from app.schemas import LeadResponse

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
    total = result.scalar()
    return {"total": total}


@router.get("/leads/today")
async def leads_today(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(func.count(Lead.id)).where(
            func.date(Lead.created_at) == func.current_date()
        )
    )
    total = result.scalar()
    return {"total": total}


@router.get("/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead
```

### 3.10 Main (`app/main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import webhook, leads

app = FastAPI(title="Skeevo API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhook.router, tags=["Webhook"])
app.include_router(leads.router, tags=["Leads"])


@app.get("/")
async def root():
    return {"message": "Skeevo API"}


@app.get("/health")
async def health():
    return {"status": "ok"}
```

---

## 4. Payload do Webhook (WAHA → Backend)

Quando alguem manda mensagem, o WAHA envia este payload:

```json
{
  "id": "evt_01aaaaaaaaaaaaaaaaaaaaaaaa",
  "timestamp": 1634567890123,
  "session": "default",
  "engine": "WEBJS",
  "event": "message",
  "payload": {
    "id": "false_11111111111@c.us_AAAAAAAAAAAAAAAAAAAA",
    "timestamp": 1666943582,
    "from": "11111111111@c.us",
    "fromMe": false,
    "source": "app",
    "to": "11111111111@c.us",
    "body": "Ola, gostaria de saber mais!",
    "hasMedia": false
  },
  "me": {
    "id": "11111111111",
    "pushName": "Skeevo Bot"
  }
}
```

---

## 5. Frontend - Shadcn UI

### 5.1 Setup do Projeto

```bash
# Criar projeto Next.js
npx create-next-app@latest frontend --typescript --tailwind --eslint

# Dentro do diretorio frontend
npx shadcn@latest init

# Instalar componentes
npx shadcn@latest add button card table input badge dialog
```

### 5.2 Estrutura de Paginas

```
frontend/src/app/
├── page.tsx              # Dashboard principal
├── leads/
│   └── page.tsx          # Lista de leads
├── layout.tsx
└── globals.css
```

### 5.3 Tela Principal - Dashboard

```tsx
// frontend/src/app/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

async function getStats() {
  const [totalRes, todayRes] = await Promise.all([
    fetch("http://localhost:8000/leads/count", { cache: "no-store" }),
    fetch("http://localhost:8000/leads/today", { cache: "no-store" }),
  ])
  const total = await totalRes.json()
  const today = await todayRes.json()
  return { total: total.total, today: today.total }
}

export default async function Dashboard() {
  const stats = await getStats()

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Skeevo - Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Leads Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.today}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status WhatsApp</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="default">Conectado</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

### 5.4 Tela de Leads

```tsx
// frontend/src/app/leads/page.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

async function getLeads() {
  const res = await fetch("http://localhost:8000/leads", { cache: "no-store" })
  return res.json()
}

export default async function LeadsPage() {
  const leads = await getLeads()

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Leads Capturados</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Telefone</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Primeira Mensagem</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead: any) => (
            <TableRow key={lead.id}>
              <TableCell>{lead.phone}</TableCell>
              <TableCell>{lead.push_name || "—"}</TableCell>
              <TableCell>{lead.first_message}</TableCell>
              <TableCell>
                <Badge variant={lead.status === "novo" ? "default" : "secondary"}>
                  {lead.status}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(lead.created_at).toLocaleDateString("pt-BR")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

---

## 6. Configuracao do Webhook no WAHA

### 6.1 Criar Sessao com Webhook

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: 00000000000000000000000000000000" \
  -d '{
    "name": "default",
    "start": true,
    "config": {
      "webhooks": [
        {
          "url": "http://host.docker.internal:8000/webhook/waha",
          "events": ["message"],
          "retries": {
            "delaySeconds": 2,
            "attempts": 5,
            "policy": "linear"
          }
        }
      ]
    }
  }'
```

### 6.2 Parear WhatsApp

```bash
# Obter QR Code
curl http://localhost:3000/api/default/auth/qr?format=image \
  -H "X-API-KEY: 00000000000000000000000000000000" \
  --output qr.png
```

---

## 7. Fluxo Completo

```
1. Usuario manda mensagem no WhatsApp
         ↓
2. WAHA recebe e dispara webhook
         ↓
3. FastAPI recebe payload
         ↓
4. Verifica se e mensagem recebida (fromMe: false)
         ↓
5. Extrai telefone do campo "from"
         ↓
6. Cria/atualiza lead no PostgreSQL
         ↓
7. Salva mensagem na tabela messages
         ↓
8. Frontend consulta leads via API
         ↓
9. Lead aparece na tabela do dashboard
```

---

## 8. Ordem de Implementacao

| # | Tarefa | Comando/Acao |
|---|--------|--------------|
| 1 | Criar docker-compose.yaml | Arquivo na raiz |
| 2 | Iniciar WAHA + Postgres | `docker compose up -d` |
| 3 | Verificar servicos | `docker compose ps` |
| 4 | Criar estrutura backend | `mkdir -p backend/app/routes backend/app/services` |
| 5 | Criar requirements.txt | Arquivo de dependencias |
| 6 | Instalar dependencias | `pip install -r requirements.txt` |
| 7 | Criar models/schemas/routes | Codigos acima |
| 8 | Rodar migrations | `alembic upgrade head` |
| 9 | Iniciar FastAPI | `uvicorn app.main:app --port 8000` |
| 10 | Configurar webhook no WAHA | POST `/api/sessions` |
| 11 | Parear WhatsApp | QR Code via API |
| 12 | Testar envio de mensagem | Enviar msg do celular |
| 13 | Verificar lead no banco | Query no PostgreSQL |
| 14 | Criar frontend | `create-next-app` + shadcn |
| 15 | Teste completo | Enviar msg → ver no dashboard |

---

## 9. Comandos RAPIDOS

```bash
# Subir infra
docker compose up -d

# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```
