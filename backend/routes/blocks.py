from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
import models
import schemas
from services.optimizer import calculate_block_train_impact

router = APIRouter(prefix="/blocks", tags=["Blocks"])

@router.get("/", response_model=List[schemas.BlockResponse])
def get_blocks(db: Session = Depends(get_db)):
    blocks = db.query(models.Block).all()
    trains = db.query(models.Train).all()
    approved_plans = db.query(models.GeneratedPlan).filter(models.GeneratedPlan.status == "APPROVED").all()
    
    result = []
    for block in blocks:
        impact = calculate_block_train_impact(block, trains)
        
        # Calculate block utilization based on tasks scheduled in this block
        block_plans = [p for p in approved_plans if p.block_id == block.block_id]
        total_maint_hours = sum(p.task.duration_hours for p in block_plans if p.task)
        utilization = (total_maint_hours / block.duration_hours) * 100 if block.duration_hours > 0 else 0.0
        
        block_res = schemas.BlockResponse.model_validate(block)
        block_res.train_impact = round(impact["score"], 2)
        block_res.affected_trains = impact["affected_trains"]
        block_res.estimated_delay_mins = impact["estimated_delay_mins"]
        block_res.utilization = round(min(100.0, utilization), 2)
        
        result.append(block_res)
        
    return result

@router.patch("/{block_id}", response_model=schemas.BlockResponse)
def update_block(block_id: str, payload: schemas.BlockUpdate, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    block = db.query(models.Block).filter(models.Block.block_id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    if payload.corridor is not None:
        block.corridor = payload.corridor
    if payload.status is not None:
        block.status = payload.status
    db.commit()
    db.refresh(block)
    
    # Calculate train impact
    trains = db.query(models.Train).all()
    impact = calculate_block_train_impact(block, trains)
    
    approved_plans = db.query(models.GeneratedPlan).filter(models.GeneratedPlan.status == "APPROVED").all()
    block_plans = [p for p in approved_plans if p.block_id == block.block_id]
    total_maint_hours = sum(p.task.duration_hours for p in block_plans if p.task)
    utilization = (total_maint_hours / block.duration_hours) * 100 if block.duration_hours > 0 else 0.0
    
    block_res = schemas.BlockResponse.model_validate(block)
    block_res.train_impact = round(impact["score"], 2)
    block_res.affected_trains = impact["affected_trains"]
    block_res.estimated_delay_mins = impact["estimated_delay_mins"]
    block_res.utilization = round(min(100.0, utilization), 2)
    return block_res

