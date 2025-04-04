from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId

class LLMLogBase(BaseModel):
    email: str
    response_code: int
    input_tokens: int
    output_tokens: int
    model: str
    timestamp: Optional[datetime] = None
    additional_info: Optional[dict] = None

class LLMLogCreate(LLMLogBase):
    pass

class LLMLog(LLMLogBase):
    id: str

    class Config:
        json_encoders = {ObjectId: str}