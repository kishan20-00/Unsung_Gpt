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

# Security Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Database Connection
DATABASE_URL = "mongodb+srv://admin:jaye2001@cluster0.hzjvgry.mongodb.net/"
client = AsyncIOMotorClient(DATABASE_URL)
db = client["test"]
users_collection = db["unsunggptusers"]
plans_collection = db["plangpts"]  # Added plans collection

# Password Utilities
def hash_password(password: str) -> str:
    """Hash a password using bcrypt with auto-generated salt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hashed version"""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except ValueError:
        return False

async def get_default_plan():
    """Retrieve the default Free plan from gptplans collection"""
    default_plan = await plans_collection.find_one({"name": "Free"})
    if not default_plan:
        raise HTTPException(
            status_code=500,
            detail="Default Free plan not found in gptplans collection"
        )
    return default_plan["_id"]

# Authentication Core Functions
async def get_user(email: str) -> Optional[UserInDB]:
    """Retrieve a user by email"""
    user_data = await users_collection.find_one({"email": email})
    return UserInDB(**user_data) if user_data else None

async def create_user(user: UserCreate) -> UserInDB:
    """Create a new user with hashed password and default subscription"""
    # Check if user already exists
    if await get_user(user.email):
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Get default plan ID
    subscription_id = await get_default_plan()
    
    # Create user document
    user_dict = user.model_dump()
    user_dict.update({
        "password": hash_password(user.password),
        "created_at": datetime.utcnow(),
        "input_tokens": 0,
        "output_tokens": 0,
        "subscription": subscription_id  # Add subscription reference
    })
    
    # Insert into database
    result = await users_collection.insert_one(user_dict)
    new_user = await users_collection.find_one({"_id": result.inserted_id})
    return UserInDB(**new_user)

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

async def get_user_with_plan(user_id: str) -> dict:
    """Get user with populated plan information"""
    user = await users_collection.aggregate([
        {"$match": {"_id": ObjectId(user_id)}},
        {"$lookup": {
            "from": "gptplans",
            "localField": "subscription",
            "foreignField": "_id",
            "as": "plan"
        }},
        {"$unwind": "$plan"},
        {"$project": {
            "password": 0,
            "plan._id": 0
        }}
    ]).to_list(length=1)
    return user[0] if user else None