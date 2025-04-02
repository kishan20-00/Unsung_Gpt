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