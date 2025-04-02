from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from models import TokenData, User
from database import SECRET_KEY, ALGORITHM, users_collection
from typing import Annotated
from bson import ObjectId
import os

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")  # Changed from "id" to "sub"
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(id=user_id)
    except JWTError as e:
        print(f"JWT Error: {str(e)}")
        raise credentials_exception
    
    user = await users_collection.find_one({"_id": ObjectId(token_data.id)})
    if user is None:
        raise credentials_exception
    
    return User(**user)

async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)]
):
    return current_user