from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
import models
import schemas
from services.optimizer import calculate_block_train_impact

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=schemas.DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    # 1. Fetch data
    assets = db.query(models.Asset).all()
    tasks = db.query(models.MaintenanceTask).all()
    blocks = db.query(models.Block).all()
    teams = db.query(models.MaintenanceTeam).all()
    trains = db.query(models.Train).all()
    plans = db.query(models.GeneratedPlan).all()
    
    # 2. Asset Availability
    # Availability = 100 - (critical assets under maintenance / total critical assets * 100)
    critical_assets = [a for a in assets if a.criticality >= 7]
    total_critical = len(critical_assets)
    maint_critical = sum(1 for a in assets if a.status == "Under Maintenance" and a.criticality >= 7)
    
    current_avail = 100.0 - ((maint_critical / max(1, total_critical)) * 100)
    
    # Projected availability: tasks scheduled for critical assets completed will restore asset health
    scheduled_task_ids = set(p.task_id for p in plans if p.status in ["DRAFT", "APPROVED"])
    scheduled_critical_tasks = [
        t for t in tasks 
        if t.task_id in scheduled_task_ids and any(a.asset_id == t.asset_id and a.criticality >= 7 for a in assets)
    ]
    projected_maint = max(0, maint_critical - len(scheduled_critical_tasks))
    projected_avail = 100.0 - ((projected_maint / max(1, total_critical)) * 100)

    # 3. Counts
    critical_tasks_count = sum(1 for t in tasks if t.priority >= 80 and t.status == "Pending")
    available_blocks_count = sum(1 for b in blocks if b.status == "Available")
    
    # 4. Block Utilization
    block_util_list = []
    block_impact_sum = 0.0
    scheduled_blocks_count = 0
    
    for block in blocks:
        if block.status == "Cancelled":
            continue
            
        block_plans = [p for p in plans if p.block_id == block.block_id and p.status in ["DRAFT", "APPROVED"]]
        total_task_hours = sum(p.task.duration_hours for p in block_plans if p.task)
        util = (total_task_hours / block.duration_hours) * 100 if block.duration_hours > 0 else 0.0
        util = min(100.0, util)
        
        block_util_list.append({
            "block_id": block.block_id,
            "utilization": round(util, 1)
        })
        
        # Train Impact for scheduled blocks
        if block_plans:
            impact_details = calculate_block_train_impact(block, trains)
            block_impact_sum += impact_details["score"]
            scheduled_blocks_count += 1
            
    avg_block_util = sum(item["utilization"] for item in block_util_list) / max(1, len(block_util_list))
    avg_train_impact = block_impact_sum / max(1, scheduled_blocks_count)
    
    # 5. Team Utilization
    team_util_list = []
    for team in teams:
        team_plans = [p for p in plans if p.team_id == team.team_id and p.status in ["DRAFT", "APPROVED"]]
        assigned_hours = sum(p.task.duration_hours for p in team_plans if p.task)
        util = (assigned_hours / team.available_hours) * 100 if team.available_hours > 0 else 0.0
        util = min(100.0, util)
        
        team_util_list.append({
            "team_id": team.team_id,
            "team_name": team.team_name,
            "department": team.department,
            "utilization": round(util, 1)
        })
        
    avg_team_util = sum(item["utilization"] for item in team_util_list) / max(1, len(team_util_list))
    
    # 6. Asset Health Distribution
    health_dist = {"Active": 0, "Under Maintenance": 0, "Degraded": 0}
    for a in assets:
        health_dist[a.status] = health_dist.get(a.status, 0) + 1
        
    # 7. Tasks by Department
    depts = ["Engineering", "S&T", "Traction"]
    tasks_by_dept = []
    for dept in depts:
        dept_tasks = [t for t in tasks if t.department == dept and t.status == "Pending"]
        crit_count = sum(1 for t in dept_tasks if t.priority >= 80)
        tasks_by_dept.append({
            "department": dept,
            "task_count": len(dept_tasks),
            "critical_count": crit_count
        })
        
    # 8. Weekly Schedule
    # Generate schedule for next 7 days starting from base_date "2026-08-28"
    base_date = datetime(2026, 8, 28)
    weekly_schedule = []
    for i in range(7):
        day = base_date + timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        
        # Count tasks and blocks scheduled on this day
        day_plans = [p for p in plans if p.scheduled_date == day_str and p.status in ["DRAFT", "APPROVED"]]
        day_blocks = list(set(p.block_id for p in day_plans))
        
        weekly_schedule.append({
            "date": day.strftime("%b %d"),
            "tasks_count": len(day_plans),
            "block_count": len(day_blocks)
        })

    return schemas.DashboardStatsResponse(
        asset_availability=round(current_avail, 1),
        projected_asset_availability=round(projected_avail, 1),
        critical_tasks_count=critical_tasks_count,
        available_blocks_count=available_blocks_count,
        avg_block_utilization=round(avg_block_util, 1),
        avg_team_utilization=round(avg_team_util, 1),
        avg_train_impact=round(avg_train_impact, 1),
        
        asset_health_distribution=health_dist,
        tasks_by_department=tasks_by_dept,
        block_utilization=block_util_list,
        team_utilization=team_util_list,
        weekly_schedule=weekly_schedule
    )
