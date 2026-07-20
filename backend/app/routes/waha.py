import httpx
from fastapi import APIRouter, HTTPException, Response
from app.config import settings

router = APIRouter(prefix="/waha", tags=["WAHA Session Management"])

headers = {
    "X-Api-Key": settings.WAHA_API_KEY,
    "Content-Type": "application/json",
}

@router.get("/status")
async def get_waha_status():
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            res = await client.get(f"{settings.WAHA_API_URL}/api/sessions", headers=headers)
            if res.status_code != 200:
                return {"exists": False, "status": "DISCONNECTED", "detail": "WAHA API indisponível"}
            
            sessions = res.json()
            default_session = next((s for s in sessions if s.get("name") == "default"), None)
            
            if not default_session:
                return {"exists": False, "status": "NOT_CREATED"}
            
            return {
                "exists": True,
                "status": default_session.get("status", "UNKNOWN"),
                "session": default_session,
                "me": default_session.get("me")
            }
        except Exception as e:
            return {"exists": False, "status": "DISCONNECTED", "detail": str(e)}


@router.post("/start")
async def start_waha_session():
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # Check if session exists
            res = await client.get(f"{settings.WAHA_API_URL}/api/sessions", headers=headers)
            sessions = res.json() if res.status_code == 200 else []
            default_session = next((s for s in sessions if s.get("name") == "default"), None)

            webhook_url = "http://backend:8000/webhook/waha"

            if not default_session:
                payload = {
                    "name": "default",
                    "start": True,
                    "config": {
                        "webhooks": [
                            {
                                "url": webhook_url,
                                "events": ["message"],
                                "retries": {
                                    "delaySeconds": 2,
                                    "attempts": 5,
                                    "policy": "linear"
                                }
                            }
                        ]
                    }
                }
                create_res = await client.post(f"{settings.WAHA_API_URL}/api/sessions", json=payload, headers=headers)
                if create_res.status_code not in (200, 201):
                    raise HTTPException(status_code=500, detail=f"Erro ao criar sessão no WAHA: {create_res.text}")
                return {"status": "started", "detail": "Sessão criada com sucesso"}
            else:
                start_res = await client.post(f"{settings.WAHA_API_URL}/api/sessions/default/start", headers=headers)
                return {"status": "started", "detail": "Sessão iniciada com sucesso"}
        except HTTPException as he:
            raise he
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Falha ao conectar com WAHA: {str(e)}")


@router.get("/qr")
async def get_waha_qr():
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            res = await client.get(f"{settings.WAHA_API_URL}/api/default/auth/qr?format=image", headers=headers)
            if res.status_code == 200:
                return Response(content=res.content, media_type="image/png")
            else:
                qr_val_res = await client.get(f"{settings.WAHA_API_URL}/api/default/auth/qr", headers=headers)
                if qr_val_res.status_code == 200:
                    return qr_val_res.json()
                raise HTTPException(status_code=404, detail="QR Code não disponível. Verifique se a sessão foi iniciada.")
        except HTTPException as he:
            raise he
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.post("/stop")
async def stop_waha_session():
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            res = await client.post(f"{settings.WAHA_API_URL}/api/sessions/default/stop", headers=headers)
            return {"status": "stopped", "detail": "Sessão encerrada"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
