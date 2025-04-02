from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from models import User, UserCreate, Token
from database import (
    get_user,
    create_user,
    verify_password,
    create_access_token,
    authenticate_user,
    users_collection,
    get_user_with_plan
)
from datetime import timedelta
from auth import get_current_active_user
from bson import ObjectId
from typing import Annotated, Optional
from pydantic import BaseModel
import os
from plan_router import router as plan_router

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

@app.post("/login")
async def login(request: Request):
    try:
        data = await request.json()
        email = data.get("email")
        password = data.get("password")
        
        if not email or not password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email and password are required"
            )

        user = await authenticate_user(email, password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=60)
        access_token = create_access_token(
            data={"sub": str(user.id)},  # Using standard 'sub' claim
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

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

class TokenUpdateRequest(BaseModel):
    input_tokens: Optional[int] = 0
    output_tokens: Optional[int] = 0
    subscription: Optional[str] = None

@app.put("/updateTokens", response_model=User)
async def update_user_tokens(
    update_data: TokenUpdateRequest,
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    update_payload = {}
    
    if update_data.input_tokens is not None:
        update_payload["$inc"] = {"input_tokens": update_data.input_tokens}
    if update_data.output_tokens is not None:
        if "$inc" in update_payload:
            update_payload["$inc"]["output_tokens"] = update_data.output_tokens
        else:
            update_payload["$inc"] = {"output_tokens": update_data.output_tokens}
    if update_data.subscription:
        # No ObjectId conversion needed now
        update_payload["$set"] = {"subscription": update_data.subscription}
    
    await users_collection.update_one(
        {"_id": ObjectId(current_user.id)},
        update_payload
    )
    
    updated_user = await users_collection.find_one({"_id": ObjectId(current_user.id)})
    return User(**updated_user)

@app.get("/user-with-plan")
async def get_user_with_plan_endpoint(
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    user_data = await get_user_with_plan(current_user.id)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    return user_data

app.include_router(plan_router)

