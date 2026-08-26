from fastapi import APIRouter
from core.models import ChatProcessRequest, ChatProcessResponse
from services.task_extractor import process_chat_and_extract_tasks

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("/process", response_model=ChatProcessResponse)
def chat_process(request: ChatProcessRequest):
    """Processes conversational task extraction requests and returns schedule impact proposals."""
    return process_chat_and_extract_tasks(request)
