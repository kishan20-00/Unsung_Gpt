from models import UserCreate, UserInDB, User
from bson import ObjectId
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
from fastapi import HTTPException
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional
import bcrypt
import redis  # Add redis import
from llm_log import LLMLogCreate, LLMLog

# Security Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Database Connections
DATABASE_URL = "mongodb+srv://admin:jaye2001@cluster0.hzjvgry.mongodb.net/"
client = AsyncIOMotorClient(DATABASE_URL)
db = client["test"]
users_collection = db["unsunggptusers"]

# Redis Connection for Plans
redis_client = redis.Redis(
        host='redis-14245.c321.us-east-1-2.ec2.redns.redis-cloud.com',
    port=14245,
    decode_responses=True,
    username="default",
    password="UL5tpo8dma2OCBbi88QxICIfyeoxDQcd",
)

# Password Utilities (unchanged)
def hash_password(password: str) -> str:
    """Hash a password using bcrypt with auto-generated salt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hashed version"""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except ValueError:
        return False

# Updated Plan Functions
async def get_default_plan():
    """Retrieve the default Free plan from Redis"""
    plan_id = "plan:free"
    plan_data = redis_client.hgetall(plan_id)
    if not plan_data:
        raise HTTPException(
            status_code=500,
            detail="Default Free plan not found in Redis"
        )
    return plan_id  # Return the plan ID/key instead of ObjectId

async def get_plan_details(plan_id: str) -> dict:
    """Get plan details from Redis"""
    return redis_client.hgetall(plan_id)

# Updated User Functions
async def get_user(email: str) -> Optional[UserInDB]:
    """Retrieve a user by email"""
    user_data = await users_collection.find_one({"email": email})
    if user_data:
        # No need to convert subscription anymore
        return UserInDB(**user_data)
    return None

async def create_user(user: UserCreate) -> UserInDB:
    """Create a new user with hashed password and default subscription"""
    if await get_user(user.email):
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Get default plan ID from Redis
    subscription_id = await get_default_plan()
    
    user_dict = user.model_dump()
    user_dict.update({
        "password": hash_password(user.password),
        "created_at": datetime.utcnow(),
        "input_tokens": 0,
        "output_tokens": 0,
        "subscription": subscription_id  # Now storing Redis plan key
    })
    
    result = await users_collection.insert_one(user_dict)
    new_user = await users_collection.find_one({"_id": result.inserted_id})
    return UserInDB(**new_user)

# Updated to work with Redis plans
async def get_user_with_plan(user_id: str) -> dict:
    """Get user with populated plan information from Redis"""
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        return None
    
    # Convert to dict and remove password
    user_data = dict(user)
    user_data.pop("password", None)
    
    # Get plan details from Redis
    if user_data.get("subscription"):
        plan_data = await get_plan_details(user_data["subscription"])
        user_data["plan"] = plan_data
    
    return user_data

# Rest of the functions remain unchanged
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a JWT token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def authenticate_user(email: str, password: str) -> Optional[UserInDB]:
    """Authenticate a user with email and password"""
    user = await get_user(email)
    if not user or not verify_password(password, user.password):
        return None
    return user


# LLM Logs Collection
llm_logs_collection = db["llm_logs"]

async def create_llm_log(log: LLMLogCreate) -> LLMLog:
    log_dict = log.dict()
    log_dict["timestamp"] = log_dict.get("timestamp") or datetime.utcnow()
    result = await llm_logs_collection.insert_one(log_dict)
    created_log = await llm_logs_collection.find_one({"_id": result.inserted_id})
    return LLMLog(**{**created_log, "id": str(created_log["_id"])})

async def get_user_logs(email: str, limit: int = 100) -> list[LLMLog]:
    logs = await llm_logs_collection.find({"email": email})\
        .sort("timestamp", -1)\
        .limit(limit)\
        .to_list(limit)
    return [LLMLog(**{**log, "id": str(log["_id"])}) for log in logs]

async def get_filtered_logs(
    email: str,
    model: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
) -> list[LLMLog]:
    """
    Get logs with optional model filtering
    """
    query = {"email": email}
    if model:
        query["model"] = model
        
    logs = await llm_logs_collection.find(query)\
        .sort("timestamp", -1)\
        .skip(skip)\
        .limit(limit)\
        .to_list(limit)
        
    return [LLMLog(**{**log, "id": str(log["_id"])}) for log in logs]

async def get_token_usage_by_model(email: str, start_date: datetime, end_date: datetime, model: Optional[str] = None):
    match_filter = {
        "email": email,
        "timestamp": {"$gte": start_date, "$lte": end_date}
    }
    if model:
        match_filter["model"] = model

    pipeline = [
        {"$match": match_filter},
        {
            "$group": {
                "_id": {
                    "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                    "model": "$model"
                },
                "total_tokens": {"$sum": {"$add": ["$input_tokens", "$output_tokens"]}}
            }
        },
        {
            "$group": {
                "_id": "$_id.date",
                "models": {
                    "$push": {
                        "name": "$_id.model",
                        "total_tokens": "$total_tokens"
                    }
                }
            }
        },
        {"$sort": {"_id": 1}},
        {"$project": {"date": "$_id", "models": 1, "_id": 0}}
    ]
    
    return await llm_logs_collection.aggregate(pipeline).to_list(None)

async def get_api_call_counts(email: str, start_date: datetime, end_date: datetime, model: Optional[str] = None):
    match_filter = {
        "email": email,
        "timestamp": {"$gte": start_date, "$lte": end_date}
    }
    if model:
        match_filter["model"] = model

    pipeline = [
        {"$match": match_filter},
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}},
        {"$project": {"date": "$_id", "count": 1, "_id": 0}}
    ]
    
    return await llm_logs_collection.aggregate(pipeline).to_list(None)

async def get_model_usage_stats(email: str):
    # Get total tokens and calls
    total_tokens = await llm_logs_collection.aggregate([
        {"$match": {"email": email}},
        {"$group": {
            "_id": None,
            "total": {"$sum": {"$add": ["$input_tokens", "$output_tokens"]}},
            "count": {"$sum": 1}
        }}
    ]).to_list(None)
    
    # Get breakdown by model
    models = await llm_logs_collection.aggregate([
        {"$match": {"email": email}},
        {"$group": {
            "_id": "$model",
            "usage": {"$sum": {"$add": ["$input_tokens", "$output_tokens"]}}
        }},
        {"$sort": {"usage": -1}}
    ]).to_list(None)
    
    # Calculate percentages
    total = total_tokens[0]["total"] if total_tokens else 1
    models_with_pct = [
        {**m, "percentage": round((m["usage"] / total) * 100, 1)}
        for m in models
    ]
    
    return {
        "total_tokens": total_tokens[0]["total"] if total_tokens else 0,
        "total_calls": total_tokens[0]["count"] if total_tokens else 0,
        "models": models_with_pct
    }