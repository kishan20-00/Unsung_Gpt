from fastapi import APIRouter, Depends, HTTPException, Query
from database import create_llm_log, get_user_logs, get_filtered_logs, get_token_usage_by_model,get_api_call_counts, get_model_usage_stats, llm_logs_collection
from llm_log import LLMLog, LLMLogCreate
from typing import List, Optional
from datetime import datetime
from bson import ObjectId


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
    
# Helper function to validate email
async def validate_email(email: str):
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email is required")
    return email

@router.get("/", response_model=List[LLMLog])
async def get_filtered_logs_endpoint(
    email: str,
    model: Optional[str] = Query(None, description="Filter by model name"),
    limit: int = Query(100, le=1000),
    skip: int = Query(0, ge=0)
):
    """
    Get logs with filtering capabilities
    """
    try:
        logs = await get_filtered_logs(
            email=email,
            model=model,
            limit=limit,
            skip=skip
        )
        if not logs:
            raise HTTPException(status_code=404, detail="No logs found")
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models", response_model=List[str])
async def get_available_models(email: str):
    """
    Get distinct models available for a specific user
    """
    try:
        models = await llm_logs_collection.distinct("model", {"email": email})
        return models
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/token-usage", response_model=List[dict])
async def get_token_usage(
    email: str = Query(..., description="User email address"),
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    model: Optional[str] = Query(None, description="Filter by specific model")
):
    """
    Get token usage grouped by date and model
    Response format:
    [
        {
            "date": "YYYY-MM-DD",
            "models": [
                {"name": "model1", "total_tokens": 1000},
                {"name": "model2", "total_tokens": 1500}
            ]
        },
        ...
    ]
    """
    try:
        await validate_email(email)
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
        
        if start > end:
            raise HTTPException(status_code=400, detail="Start date must be before end date")
            
        return await get_token_usage_by_model(email, start, end, model)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    
@router.get("/api-calls", response_model=List[dict])
async def get_api_calls(
    email: str = Query(..., description="User email address"),
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    model: Optional[str] = Query(None, description="Filter by specific model")
):
    """
    Get API call counts grouped by date
    Response format:
    [
        {"date": "YYYY-MM-DD", "count": 15},
        {"date": "YYYY-MM-DD", "count": 20},
        ...
    ]
    """
    try:
        await validate_email(email)
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
        
        if start > end:
            raise HTTPException(status_code=400, detail="Start date must be before end date")
            
        return await get_api_call_counts(email, start, end, model)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/usage-stats", response_model=dict)
async def get_usage_statistics(
    email: str = Query(..., description="User email address")
):
    """
    Get summary usage statistics
    Response format:
    {
        "total_tokens": 10000,
        "total_calls": 50,
        "models": [
            {"name": "model1", "usage": 5000, "percentage": 50},
            {"name": "model2", "usage": 5000, "percentage": 50}
        ]
    }
    """
    try:
        await validate_email(email)
        return await get_model_usage_stats(email)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))