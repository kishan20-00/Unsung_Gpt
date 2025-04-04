from fastapi import APIRouter, Depends, HTTPException
from database import create_llm_log, get_user_logs
from llm_log import LLMLog, LLMLogCreate
from typing import List

router = APIRouter(
    prefix="/api/logs",
    tags=["LLM Logs"]
)

@router.post("/", response_model=LLMLog)
async def log_llm_interaction(log: LLMLogCreate):
    try:
        return await create_llm_log(log)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{email}", response_model=List[LLMLog])
async def get_logs_by_user(email: str, limit: int = 100):
    logs = await get_user_logs(email, limit)
    if not logs:
        raise HTTPException(status_code=404, detail="No logs found")
    return logs