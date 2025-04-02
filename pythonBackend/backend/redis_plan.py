import redis
import json
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List
import os

# Redis connection
redis_client = redis.Redis(
    host='redis-14245.c321.us-east-1-2.ec2.redns.redis-cloud.com',
    port=14245,
    decode_responses=True,
    username="default",
    password="UL5tpo8dma2OCBbi88QxICIfyeoxDQcd",
)

class PlanBase(BaseModel):
    name: str
    input_token_limit: int
    output_token_limit: int
    price: float
    description: Optional[str] = None

class PlanCreate(PlanBase):
    pass

class Plan(PlanBase):
    id: str
    created_at: datetime

def create_plan(plan: PlanCreate) -> Plan:
    """Create a new plan in Redis"""
    plan_id = f"plan:{plan.name.lower().replace(' ', '_')}"
    
    if redis_client.exists(plan_id):
        raise ValueError(f"Plan '{plan.name}' already exists")
    
    plan_data = plan.dict()
    plan_data["created_at"] = datetime.utcnow().isoformat()
    
    redis_client.hset(plan_id, mapping=plan_data)
    return Plan(id=plan_id, **plan_data)

def get_plan(plan_id: str) -> Optional[Plan]:
    """Get a plan by ID"""
    plan_data = redis_client.hgetall(plan_id)
    if not plan_data:
        return None
    
    plan_data["created_at"] = datetime.fromisoformat(plan_data["created_at"])
    return Plan(id=plan_id, **plan_data)

def get_all_plans() -> List[Plan]:
    """Get all plans"""
    plan_keys = redis_client.keys("plan:*")
    return [get_plan(key) for key in plan_keys if get_plan(key)]

def update_plan(plan_id: str, plan: PlanCreate) -> Optional[Plan]:
    """Update an existing plan"""
    if not redis_client.exists(plan_id):
        return None
    
    plan_data = plan.dict()
    plan_data["created_at"] = datetime.utcnow().isoformat()
    
    redis_client.hset(plan_id, mapping=plan_data)
    return get_plan(plan_id)

def delete_plan(plan_id: str) -> bool:
    """Delete a plan"""
    return bool(redis_client.delete(plan_id))

def initialize_default_plans():
    """Create default plans if they don't exist"""
    default_plans = [
        {
            "name": "Free",
            "input_token_limit": 1000,
            "output_token_limit": 1000,
            "price": 0,
            "description": "Free plan with basic limits"
        },
        {
            "name": "Pro",
            "input_token_limit": 10000,
            "output_token_limit": 10000,
            "price": 9.99,
            "description": "Pro plan with higher limits"
        }
    ]
    
    for plan_data in default_plans:
        plan = PlanCreate(**plan_data)
        if not get_plan(f"plan:{plan.name.lower().replace(' ', '_')}"):
            create_plan(plan)