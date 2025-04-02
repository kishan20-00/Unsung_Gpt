from fastapi import APIRouter, Depends, HTTPException, status
from redis_plan import (
    PlanCreate, Plan,
    create_plan, get_plan,
    get_all_plans, update_plan,
    delete_plan, initialize_default_plans
)
from typing import List

router = APIRouter(prefix="/plans", tags=["plans"])

# Initialize default plans on startup
initialize_default_plans()

@router.post("/create", response_model=Plan, status_code=status.HTTP_201_CREATED)
async def create_new_plan(plan: PlanCreate):
    try:
        return create_plan(plan)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=List[Plan])
async def list_all_plans():
    return get_all_plans()

@router.get("/{plan_id}", response_model=Plan)
async def get_plan_details(plan_id: str):
    plan = get_plan(plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    return plan

@router.put("/{plan_id}", response_model=Plan)
async def update_plan_details(plan_id: str, plan: PlanCreate):
    updated_plan = update_plan(plan_id, plan)
    if not updated_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    return updated_plan

@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_plan(plan_id: str):
    if not delete_plan(plan_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )