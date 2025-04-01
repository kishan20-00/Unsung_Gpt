from typing import Optional, Annotated
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from bson import ObjectId
from pydantic.json_schema import SkipJsonSchema
from pydantic_core import core_schema

class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type, _handler):
        def validate(value):
            if not ObjectId.is_valid(value):
                raise ValueError("Invalid ObjectId")
            return str(value)
        
        return core_schema.no_info_plain_validator_function(
            function=validate,
            serialization=core_schema.to_string_ser_schema(),
        )

class UserBase(BaseModel):
    name: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    input_tokens: int = 0
    output_tokens: int = 0
    subscription: Optional[PyObjectId] = None
    
    model_config = ConfigDict(
        json_encoders={ObjectId: str},
        from_attributes=True,
        populate_by_name=True
    )

class UserInDB(User):
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: Optional[str] = None

class Plan(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    
    model_config = ConfigDict(
        json_encoders={ObjectId: str},
        from_attributes=True,
        populate_by_name=True
    )