import httpx
from openai import AsyncOpenAI
from app.config import settings


def format_audio_transcript(text: str) -> str:
    """
    Format raw audio transcription into standard message content format.
    """
    return f'[🎙️ Áudio]: "{text.strip()}"'


async def download_waha_media(media_url: str) -> bytes:
    """
    Download media binary content from WAHA using httpx.AsyncClient.
    Normalizes localhost/127.0.0.1 or relative paths to use settings.WAHA_API_URL.
    """
    waha_base = settings.WAHA_API_URL.rstrip("/")
    if media_url.startswith("/"):
        full_url = f"{waha_base}{media_url}"
    elif "localhost:3000" in media_url:
        full_url = media_url.replace("http://localhost:3000", waha_base).replace("https://localhost:3000", waha_base)
    elif "127.0.0.1:3000" in media_url:
        full_url = media_url.replace("http://127.0.0.1:3000", waha_base).replace("https://127.0.0.1:3000", waha_base)
    else:
        full_url = media_url

    headers = {}
    if settings.WAHA_API_KEY:
        headers["X-Api-Key"] = settings.WAHA_API_KEY

    async with httpx.AsyncClient() as client:
        response = await client.get(full_url, headers=headers)
        response.raise_for_status()
        return response.content


async def transcribe_audio_bytes(
    audio_bytes: bytes, api_key: str, filename: str = "voice.ogg"
) -> str:
    """
    Transcribe audio bytes using OpenAI Whisper API.
    """
    client = AsyncOpenAI(api_key=api_key)
    transcription = await client.audio.transcriptions.create(
        model="whisper-1",
        file=(filename, audio_bytes, "audio/ogg"),
    )
    return transcription.text
