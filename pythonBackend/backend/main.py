from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from models import User, UserCreate, Token
from database import (
    get_user,
    create_user,
    verify_password,
    create_access_token,
    authenticate_user,
    hash_password
)
from datetime import timedelta
from auth import get_current_active_user
from bson import ObjectId
from typing import Annotated

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/register", response_model=User)
async def register(user: UserCreate):
    try:
        created_user = await create_user(user)
        return created_user
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/login", response_model=Token)
async def login(email: str, password: str):
    user = await authenticate_user(email, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"id": str(user.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/profile", response_model=User)
async def read_profile(current_user: Annotated[User, Depends(get_current_active_user)]):
    return current_user

@app.put("/update", response_model=User)
async def update_user(
    name: str,
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    
    await users_collection.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": {"name": name}}
    )
    
    updated_user = await users_collection.find_one({"_id": ObjectId(current_user.id)})
    return User(**updated_user)

@app.put("/updateTokens", response_model=User)
async def update_user_tokens(
    current_user: Annotated[User, Depends(get_current_active_user)],
    input_tokens: int = 0,
    output_tokens: int = 0,
    subscription: str = None
):
    update_data = {}
    
    if input_tokens is not None:
        update_data["$inc"] = {"input_tokens": input_tokens}
    if output_tokens is not None:
        if "$inc" in update_data:
            update_data["$inc"]["output_tokens"] = output_tokens
        else:
            update_data["$inc"] = {"output_tokens": output_tokens}
    if subscription:
        update_data["$set"] = {"subscription": ObjectId(subscription)}
    
    await users_collection.update_one(
        {"_id": ObjectId(current_user.id)},
        update_data
    )
    
    updated_user = await users_collection.find_one({"_id": ObjectId(current_user.id)})
    return User(**updated_user)