from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
import models
import schemas
from services.optimizer import calculate_block_train_impact

router = APIRouter(prefix="/plans", tags=["Plans"])

def format_plan(plan_res: models.GeneratedPlan, db: Session) -> schemas.GeneratedPlanResponse:
    """Helper to populate nested relations and computed fields for schemas.GeneratedPlanResponse."""
    trains = db.query(models.Train).all()
    
    impact_details = {"score": 0.0, "level": "LOW", "affected_trains": [], "estimated_delay_mins": 0}
    if plan_res.block:
        impact_details = calculate_block_train_impact(plan_res.block, trains)
        
    block_res = schemas.BlockResponse(
        block_id=plan_res.block_id,
        corridor=plan_res.block.corridor,
        start_time=plan_res.block.start_time,
        end_time=plan_res.block.end_time,
        duration_hours=plan_res.block.duration_hours,
        status=plan_res.block.status,
        train_impact=impact_details["score"],
        affected_trains=impact_details["affected_trains"],
        estimated_delay_mins=impact_details["estimated_delay_mins"],
        utilization=0.0
    )
    
    team_res = schemas.MaintenanceTeamResponse(
        team_id=plan_res.team_id,
        team_name=plan_res.team.team_name,
        department=plan_res.team.department,
        skill=plan_res.team.skill,
        location=plan_res.team.location,
        available_hours=plan_res.team.available_hours,
        assigned_hours=0.0,
        utilization=0.0
    )
    
    task_res = schemas.MaintenanceTaskResponse(
        task_id=plan_res.task_id,
        asset_id=plan_res.task.asset_id,
        department=plan_res.task.department,
        task_description=plan_res.task.task_description,
        priority=plan_res.task.priority,
        duration_hours=plan_res.task.duration_hours,
        overdue_days=plan_res.task.overdue_days,
        required_skill=plan_res.task.required_skill,
        status=plan_res.task.status
    )
    
    return schemas.GeneratedPlanResponse(
        plan_id=plan_res.plan_id,
        block_id=plan_res.block_id,
        task_id=plan_res.task_id,
        team_id=plan_res.team_id,
        scheduled_date=plan_res.scheduled_date,
        start_time=plan_res.start_time,
        end_time=plan_res.end_time,
        optimization_score=plan_res.optimization_score,
        status=plan_res.status,
        block=block_res,
        task=task_res,
        team=team_res
    )

@router.get("/", response_model=List[schemas.GeneratedPlanResponse])
def get_plans(db: Session = Depends(get_db)):
    plans = db.query(models.GeneratedPlan).join(
        models.MaintenanceTask, models.GeneratedPlan.task_id == models.MaintenanceTask.task_id
    ).filter(
        models.MaintenanceTask.status != "Completed"
    ).all()
    return [format_plan(p, db) for p in plans]

@router.post("/{id}/approve", response_model=schemas.GeneratedPlanResponse)
def approve_plan(id: int, db: Session = Depends(get_db)):
    plan = db.query(models.GeneratedPlan).filter(models.GeneratedPlan.plan_id == id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    plan.status = "APPROVED"
    # Also mark task as Scheduled
    if plan.task:
        plan.task.status = "Scheduled"
        
    db.commit()
    db.refresh(plan)
    return format_plan(plan, db)

@router.post("/{id}/reject", response_model=schemas.GeneratedPlanResponse)
def reject_plan(id: int, db: Session = Depends(get_db)):
    plan = db.query(models.GeneratedPlan).filter(models.GeneratedPlan.plan_id == id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    plan.status = "REJECTED"
    # Set task status to Rejected so it does not reappear as Pending
    if plan.task:
        plan.task.status = "Rejected"
        
    db.commit()
    db.refresh(plan)
    return format_plan(plan, db)

@router.post("/manual-assign", response_model=schemas.GeneratedPlanResponse)
def manual_assign_task(payload: dict, db: Session = Depends(get_db)):
    """Manually assign a pending task to a specific block and team, optionally evicting conflicting plans."""
    task_id = payload.get("task_id")
    block_id = payload.get("block_id")
    team_id = payload.get("team_id")
    evict_plan_ids = payload.get("evict_plan_ids", [])
    auto_approve = payload.get("auto_approve", False)  # if True, skip DRAFT and create as APPROVED
    
    # 1. Clean up any existing plan(s) for the task we are assigning (support clean rescheduling)
    existing_self_plans = db.query(models.GeneratedPlan).filter(models.GeneratedPlan.task_id == task_id).all()
    for ep in existing_self_plans:
        db.delete(ep)
    db.commit()

    # 2. Handle requested evictions of conflicting plans
    if evict_plan_ids:
        evicted_plans = db.query(models.GeneratedPlan).filter(models.GeneratedPlan.plan_id.in_(evict_plan_ids)).all()
        for ep in evicted_plans:
            if ep.task:
                ep.task.status = "Pending"
            db.delete(ep)
        db.commit()
    
    task = db.query(models.MaintenanceTask).filter(models.MaintenanceTask.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    block = db.query(models.Block).filter(models.Block.block_id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    
    # If no team specified, find a matching team for the task's department
    if not team_id:
        team = db.query(models.MaintenanceTeam).filter(
            models.MaintenanceTeam.department == task.department
        ).first()
        if not team:
            team = db.query(models.MaintenanceTeam).first()
    else:
        team = db.query(models.MaintenanceTeam).filter(models.MaintenanceTeam.team_id == team_id).first()
    
    if not team:
        raise HTTPException(status_code=404, detail="No team found for this task")
    
    # Now check this specific team's remaining capacity in the block (parallel work model)
    team_existing = db.query(models.GeneratedPlan).filter(
        models.GeneratedPlan.block_id == block_id,
        models.GeneratedPlan.team_id == team.team_id
    ).all()
    team_used_hours = sum(p.task.duration_hours for p in team_existing if p.task)
    team_remaining = block.duration_hours - team_used_hours
    if task.duration_hours > team_remaining:
        raise HTTPException(
            status_code=400,
            detail=f"Team {team.team_name} already has {team_used_hours}h scheduled in block {block_id} ({block.duration_hours}h total). Task needs {task.duration_hours}h more."
        )
    
    from datetime import datetime
    new_plan = models.GeneratedPlan(
        block_id=block_id,
        task_id=task_id,
        team_id=team.team_id,
        scheduled_date=datetime.now().strftime("%Y-%m-%d"),
        start_time=block.start_time,
        end_time=block.end_time,
        optimization_score=task.priority,
        status="APPROVED" if auto_approve else "DRAFT"
    )
    db.add(new_plan)
    
    # Mark task as scheduled
    task.status = "Scheduled"
    
    db.commit()
    db.refresh(new_plan)
    return format_plan(new_plan, db)


@router.post("/auto-suggest")
def auto_suggest_block(payload: dict, db: Session = Depends(get_db)):
    """
    AI-assisted block suggestion: picks the best available block for a task
    based on priority score, corridor match, remaining capacity, and train impact.
    Returns a suggestion object for the dispatcher to Approve or Deny.
    Does NOT create a plan yet.
    """
    from services.optimizer import calculate_block_train_impact

    task_id = payload.get("task_id")
    task = db.query(models.MaintenanceTask).filter(models.MaintenanceTask.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    asset = db.query(models.Asset).filter(models.Asset.asset_id == task.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    trains = db.query(models.Train).all()
    blocks = db.query(models.Block).filter(models.Block.status == "Available").all()

    # Find a matching team (same dept + skill)
    team = db.query(models.MaintenanceTeam).filter(
        models.MaintenanceTeam.department == task.department,
        models.MaintenanceTeam.skill == task.required_skill
    ).first()
    if not team:
        team = db.query(models.MaintenanceTeam).filter(
            models.MaintenanceTeam.department == task.department
        ).first()
    if not team:
        raise HTTPException(status_code=404, detail="No matching team found for this task's department/skill")

    # Fetch previously rejected plans for this task to skip recommending the same block
    rejected_plans = db.query(models.GeneratedPlan).filter(
        models.GeneratedPlan.task_id == task_id,
        models.GeneratedPlan.status == "REJECTED"
    ).all()
    rejected_block_ids = {p.block_id for p in rejected_plans}

    # Score each candidate block: lower is better
    best_block = None
    best_score = float("inf")
    best_remaining = 0.0

    # Also track preemptive possibilities where we can evict lower-priority tasks
    preemptive_options = []

    for block in blocks:
        # Ignore previously rejected blocks for this task
        if block.block_id in rejected_block_ids:
            continue

        # Must match asset location/corridor
        if block.corridor != asset.location:
            continue

        # Check remaining capacity for THIS team in the block (parallel work model)
        team_plans_in_block = db.query(models.GeneratedPlan).filter(
            models.GeneratedPlan.block_id == block.block_id,
            models.GeneratedPlan.team_id == team.team_id
        ).all()
        team_used = sum(p.task.duration_hours for p in team_plans_in_block if p.task)
        remaining = block.duration_hours - team_used

        if task.duration_hours > remaining:
            # Not enough direct room. Let's see if we can preempt lower-priority tasks
            lower_priority_plans = [p for p in team_plans_in_block if p.task and p.task.priority < task.priority]
            if lower_priority_plans:
                # Sort lower priority plans by priority score ascending (evict lowest first)
                lower_priority_plans.sort(key=lambda p: p.task.priority)
                
                evict_plans = []
                capacity_gained = remaining
                for lp in lower_priority_plans:
                    capacity_gained += lp.task.duration_hours
                    evict_plans.append(lp)
                    if capacity_gained >= task.duration_hours:
                        break
                
                if capacity_gained >= task.duration_hours:
                    block_impact = calculate_block_train_impact(block, trains)
                    preemptive_options.append({
                        "suggested_block_id": block.block_id,
                        "corridor": block.corridor,
                        "block_start": block.start_time,
                        "block_end": block.end_time,
                        "remaining_hours": round(remaining, 1),
                        "train_impact_score": block_impact["score"],
                        "train_impact_level": block_impact["level"],
                        "team_id": team.team_id,
                        "team_name": team.team_name,
                        "evict_plans": [
                            {
                                "plan_id": ep.plan_id,
                                "task_id": ep.task_id,
                                "task_description": ep.task.task_description,
                                "priority": ep.task.priority,
                                "duration_hours": ep.task.duration_hours
                            } for ep in evict_plans
                        ]
                    })
            continue  # Not enough direct room

        # Compute train impact for this block (lower = better)
        impact = calculate_block_train_impact(block, trains)
        impact_score = impact["score"]  # 0-100

        # Composite score: favor low train impact, prefer blocks with more remaining space
        # Penalize overloaded blocks heavily
        composite = impact_score - (remaining * 5)  # more free space = lower (better) score
        if composite < best_score:
            best_score = composite
            best_block = block
            best_remaining = remaining

    if not best_block:
        if preemptive_options:
            return {
                "task_id": task.task_id,
                "task_description": task.task_description,
                "department": task.department,
                "required_skill": task.required_skill,
                "duration_hours": task.duration_hours,
                "priority": task.priority,
                "error": "No available block has enough capacity for this task.",
                "preemptive_options": preemptive_options
            }
        else:
            raise HTTPException(
                status_code=400,
                detail=f"No available block with sufficient capacity found for task {task_id} (needs {task.duration_hours}h on corridor {asset.location})."
            )

    # Calculate suggested start/end time within the block for this specific team
    from services.optimizer import calculate_block_train_impact
    from datetime import datetime, timedelta
    team_plans_in_best = db.query(models.GeneratedPlan).filter(
        models.GeneratedPlan.block_id == best_block.block_id,
        models.GeneratedPlan.team_id == team.team_id
    ).all()
    team_used_hours = sum(p.task.duration_hours for p in team_plans_in_best if p.task)
    
    try:
        b_start = datetime.strptime(best_block.start_time, "%H:%M")
    except ValueError:
        b_start = datetime.strptime(best_block.start_time.split(" ")[-1], "%H:%M")
    
    task_start = b_start + timedelta(hours=team_used_hours)
    task_end = task_start + timedelta(hours=task.duration_hours)
    impact = calculate_block_train_impact(best_block, trains)

    return {
        "task_id": task.task_id,
        "task_description": task.task_description,
        "department": task.department,
        "required_skill": task.required_skill,
        "duration_hours": task.duration_hours,
        "priority": task.priority,
        "suggested_block_id": best_block.block_id,
        "corridor": best_block.corridor,
        "block_start": best_block.start_time,
        "block_end": best_block.end_time,
        "suggested_start": task_start.strftime("%H:%M"),
        "suggested_end": task_end.strftime("%H:%M"),
        "remaining_hours": round(best_remaining, 1),
        "train_impact_score": impact["score"],
        "train_impact_level": impact["level"],
        "affected_trains": impact["affected_trains"],
        "team_id": team.team_id,
        "team_name": team.team_name,
        "preemptive_options": preemptive_options
    }
