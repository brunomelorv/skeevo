import httpx
from openai import AsyncOpenAI


def format_audio_transcript(text: str) -> str:
    """
    Format raw audio transcription into standard message content format.
    """
    return f'[🎙️ Áudio]: "{text.strip()}"'


async def download_waha_media(media_url: str) -> bytes:
    """
    Download media binary content from WAHA using httpx.AsyncClient.
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(media_url)
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
