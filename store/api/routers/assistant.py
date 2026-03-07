import logging
from typing import List

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from store.general.configs import RASA_WEBHOOK_URL

router = APIRouter()
logger = logging.getLogger(__name__)



class UserMessage(BaseModel):
    uid: str
    message: str


class Reply(BaseModel):
    recipient_id: str
    text: str | None = None


@router.post("/chat", response_model=List[Reply])
async def chat(request: UserMessage):
    return await send_to_rasa(request.uid , request.message)


async def send_to_rasa(sender: str, message: str) -> List[Reply]:
    payload = {"sender": sender, "message": message}

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(RASA_WEBHOOK_URL, json=payload)
            response.raise_for_status()
            return [Reply(**msg) for msg in response.json()]
        except Exception as e:
            logger.error(e)
            return [Reply(
                recipient_id=sender,
                text="Something went wrong. Please try again."
            )]
