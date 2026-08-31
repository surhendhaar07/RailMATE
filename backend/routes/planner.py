from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
import models
import schemas
from services.optimizer import optimize_schedule

router = APIRouter(prefix="/planner", tags=["Planner"])

@router.post("/generate", response_model=schemas.OptimalBlockPlanResponse)
def generate_optimal_plan(db: Session = Depends(get_db)):
    # 1. Fetch data
    tasks = db.query(models.MaintenanceTask).all()
    blocks = db.query(models.Block).all()
    teams = db.query(models.MaintenanceTeam).all()
    trains = db.query(models.Train).all()
    assets = db.query(models.Asset).all()
    
    # Fetch previously rejected plans to prevent scheduling them on the same block
    rejected_plans = db.query(models.GeneratedPlan).filter(models.GeneratedPlan.status == "REJECTED").all()
    rejected_assignments = [(p.task_id, p.block_id) for p in rejected_plans]
    
    # 2. Run optimizer
    res = optimize_schedule(
        tasks=tasks,
        blocks=blocks,
        teams=teams,
        trains=trains,
        assets=assets,
        rejected_assignments=rejected_assignments
    )
    
    plans_data = res["plans"]
    explanations_data = res["explanations"]
    metrics_data = res["metrics"]
    
    # 3. Before clearing DRAFT plans, revert their tasks back to Pending
    #    so the optimizer can re-schedule them cleanly
    draft_plans = db.query(models.GeneratedPlan).filter(models.GeneratedPlan.status == "DRAFT").all()
    for draft in draft_plans:
        if draft.task:
            # Only revert if not already Scheduled via an APPROVED plan from another entry
            other_approved = db.query(models.GeneratedPlan).filter(
                models.GeneratedPlan.task_id == draft.task_id,
                models.GeneratedPlan.status == "APPROVED"
            ).first()
            if not other_approved:
                draft.task.status = "Pending"
    db.query(models.GeneratedPlan).filter(models.GeneratedPlan.status == "DRAFT").delete()
    db.commit()
    
    # Re-fetch tasks after reverting so optimizer sees fresh Pending status
    tasks = db.query(models.MaintenanceTask).all()
    res = optimize_schedule(
        tasks=tasks,
        blocks=blocks,
        teams=teams,
        trains=trains,
        assets=assets,
        rejected_assignments=rejected_assignments
    )
    plans_data = res["plans"]
    explanations_data = res["explanations"]
    metrics_data = res["metrics"]

    # 4. Save newly generated plans as DRAFT in the database
    db_plans = []
    for plan in plans_data:
        db_plan = models.GeneratedPlan(
            block_id=plan["block_id"],
            task_id=plan["task_id"],
            team_id=plan["team_id"],
            scheduled_date=plan["scheduled_date"],
            start_time=plan["start_time"],
            end_time=plan["end_time"],
            optimization_score=plan["optimization_score"],
            status="DRAFT"
        )
        db.add(db_plan)
        db_plans.append(db_plan)
    db.commit()
    
    # Reload plans from database with relations populated to serialize properly
    final_plans = []
    for db_plan in db_plans:
        # Re-fetch with relationships loaded
        plan_res = db.query(models.GeneratedPlan).filter(models.GeneratedPlan.plan_id == db_plan.plan_id).first()
        
        # Format block data
        block_impact = next((b for b in blocks if b.block_id == plan_res.block_id), None)
        # We manually compute the extra fields for serializing schemas.BlockResponse
        from services.optimizer import calculate_block_train_impact
        impact_details = calculate_block_train_impact(block_impact, trains) if block_impact else {"score": 0.0, "level": "LOW", "affected_trains": [], "estimated_delay_mins": 0}
        
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
            utilization=0.0 # Will calculate when serializer processes it
        )
        
        # Team formatting
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
        
        # Task formatting
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
        
        plan_resp = schemas.GeneratedPlanResponse(
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
        final_plans.append(plan_resp)
        
    return schemas.OptimalBlockPlanResponse(
        plans=final_plans,
        explanations=explanations_data,
        metrics=metrics_data
    )
