from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
import models
import schemas
from services.optimizer import optimize_schedule

router = APIRouter(prefix="/simulator", tags=["Simulator"])

@router.post("/run", response_model=schemas.SimulationResult)
def run_simulation(config: schemas.SimulatorConfig, db: Session = Depends(get_db)):
    # 1. Fetch original data
    tasks = db.query(models.MaintenanceTask).all()
    blocks = db.query(models.Block).all()
    teams = db.query(models.MaintenanceTeam).all()
    trains = db.query(models.Train).all()
    assets = db.query(models.Asset).all()
    
    # 2. Run baseline optimization
    baseline_res = optimize_schedule(
        tasks=tasks,
        blocks=blocks,
        teams=teams,
        trains=trains,
        assets=assets
    )
    
    # 3. Apply simulator modifications to local lists
    sim_tasks = list(tasks)
    sim_blocks = list(blocks)
    sim_teams = list(teams)
    
    # Apply delayed tasks
    delayed_ids = set(config.delayed_task_ids)
    for t in sim_tasks:
        if t.task_id in delayed_ids:
            # Increase overdue days significantly, which shifts priority
            t.overdue_days += 14
            # Recompute priority score for task
            # (We will use a simplified update here for simulation speed)
            t.priority = min(100.0, t.priority + 15.0)
            
    # Apply emergency tasks
    for idx, e_task in enumerate(config.emergency_tasks):
        selected_asset_id = e_task.asset_id
        if e_task.corridor:
            # Find an asset on the selected corridor matching the department
            matching_asset = db.query(models.Asset).filter(
                models.Asset.location == e_task.corridor,
                models.Asset.department == e_task.department
            ).first()
            if not matching_asset:
                # Fallback to any asset on that corridor
                matching_asset = db.query(models.Asset).filter(
                    models.Asset.location == e_task.corridor
                ).first()
            if matching_asset:
                selected_asset_id = matching_asset.asset_id

        # Ensure it has a pending status and high priority
        new_task = models.MaintenanceTask(
            task_id=e_task.task_id or f"EMG-{idx:03d}",
            asset_id=selected_asset_id,
            department=e_task.department,
            task_description=f"[EMERGENCY] {e_task.task_description}",
            priority=95.0, # Highly critical
            duration_hours=e_task.duration_hours,
            overdue_days=e_task.overdue_days or 0,
            required_skill=e_task.required_skill,
            status="Pending"
        )
        sim_tasks.append(new_task)
        
    # 4. Run simulated optimization
    sim_res = optimize_schedule(
        tasks=sim_tasks,
        blocks=sim_blocks,
        teams=sim_teams,
        trains=trains,
        assets=assets,
        cancelled_block_ids=config.cancelled_block_ids,
        reduced_team_hours=config.reduced_team_hours
    )
    
    # 5. Format simulated plans for serialization
    formatted_sim_plans = []
    asset_dict = {a.asset_id: a for a in assets}
    
    for plan in sim_res["plans"]:
        # Find block, task, team objects
        block_obj = next((b for b in blocks if b.block_id == plan["block_id"]), None)
        task_obj = next((t for t in sim_tasks if t.task_id == plan["task_id"]), None)
        team_obj = next((m for m in teams if m.team_id == plan["team_id"]), None)
        
        # Train overlaps
        from services.optimizer import calculate_block_train_impact
        impact_details = calculate_block_train_impact(block_obj, trains) if block_obj else {"score": 0.0, "level": "LOW", "affected_trains": [], "estimated_delay_mins": 0}
        
        block_res = schemas.BlockResponse(
            block_id=plan["block_id"],
            corridor=block_obj.corridor if block_obj else "Unknown",
            start_time=block_obj.start_time if block_obj else "",
            end_time=block_obj.end_time if block_obj else "",
            duration_hours=block_obj.duration_hours if block_obj else 0.0,
            status=block_obj.status if block_obj else "Available",
            train_impact=impact_details["score"],
            affected_trains=impact_details["affected_trains"],
            estimated_delay_mins=impact_details["estimated_delay_mins"],
            utilization=0.0
        )
        
        team_res = schemas.MaintenanceTeamResponse(
            team_id=plan["team_id"],
            team_name=team_obj.team_name if team_obj else "Unknown",
            department=team_obj.department if team_obj else "Unknown",
            skill=team_obj.skill if team_obj else "Unknown",
            location=team_obj.location if team_obj else "Unknown",
            available_hours=config.reduced_team_hours.get(plan["team_id"], team_obj.available_hours) if team_obj else 0.0,
            assigned_hours=0.0,
            utilization=0.0
        )
        
        task_res = schemas.MaintenanceTaskResponse(
            task_id=plan["task_id"],
            asset_id=task_obj.asset_id if task_obj else "",
            department=task_obj.department if task_obj else "",
            task_description=task_obj.task_description if task_obj else "",
            priority=task_obj.priority if task_obj else 0.0,
            duration_hours=task_obj.duration_hours if task_obj else 0.0,
            overdue_days=task_obj.overdue_days if task_obj else 0,
            required_skill=task_obj.required_skill if task_obj else "",
            status=task_obj.status if task_obj else "Pending"
        )
        
        plan_resp = schemas.GeneratedPlanResponse(
            plan_id=None,
            block_id=plan["block_id"],
            task_id=plan["task_id"],
            team_id=plan["team_id"],
            scheduled_date=plan["scheduled_date"],
            start_time=plan["start_time"],
            end_time=plan["end_time"],
            optimization_score=plan["optimization_score"],
            status=plan["status"],
            block=block_res,
            task=task_res,
            team=team_res
        )
        formatted_sim_plans.append(plan_resp)
        
    return schemas.SimulationResult(
        original_metrics=baseline_res["metrics"],
        simulated_metrics=sim_res["metrics"],
        simulated_plans=formatted_sim_plans,
        simulated_explanations=sim_res["explanations"]
    )
