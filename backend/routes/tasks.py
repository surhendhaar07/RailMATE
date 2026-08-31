from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
import models
import schemas
from services.ml_model import predict_failure_risk
from services.priority_engine import calculate_priority_score, get_priority_level

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.get("/", response_model=List[schemas.MaintenanceTaskResponse])
def get_tasks(db: Session = Depends(get_db)):
    tasks = db.query(models.MaintenanceTask).all()
    return tasks

@router.get("/prioritized", response_model=List[schemas.PrioritizedTaskResponse])
def get_prioritized_tasks(db: Session = Depends(get_db)):
    tasks = db.query(models.MaintenanceTask).all()
    assets = db.query(models.Asset).all()
    defects = db.query(models.Defect).all()
    trains = db.query(models.Train).all()
    
    asset_map = {a.asset_id: a for a in assets}
    defect_map = {d.asset_id: d for d in defects if d.status == "Pending"}
    
    # Calculate a corridor traffic score
    corridors = list(set(a.location for a in assets))
    corridor_trains_count = {}
    for c in corridors:
        corridor_trains_count[c] = len([t for t in trains if t.corridor == c])
        
    result = []
    for task in tasks:
        asset = asset_map.get(task.asset_id)
        if not asset:
            continue
            
        defect = defect_map.get(task.asset_id)
        
        # Features for ML risk prediction
        asset_age = 2026 - asset.installation_year
        defect_severity = defect.severity if defect else 1
        previous_failures = int(asset.asset_id.split("-")[1]) % 5 if "-" in asset.asset_id else 2
        maintenance_frequency = (int(asset.asset_id.split("-")[1]) % 8) + 2 if "-" in asset.asset_id else 4
        
        failure_risk_prob = predict_failure_risk(
            asset_age=asset_age,
            criticality=asset.criticality,
            defect_severity=defect_severity,
            overdue_days=task.overdue_days,
            previous_failures=previous_failures,
            maintenance_frequency=maintenance_frequency
        )
        
        # Train operational impact
        corr_traffic = corridor_trains_count.get(asset.location, 10)
        train_impact_score = min(corr_traffic / 25.0, 1.0) * 100.0
        
        # Calculate composite priority
        score_details = calculate_priority_score(
            criticality=asset.criticality,
            failure_risk_prob=failure_risk_prob,
            overdue_days=task.overdue_days,
            defect_severity=defect_severity,
            train_impact_score=train_impact_score
        )
        
        # Update database priority score so optimizer uses the latest values
        if task.priority != score_details["score"]:
            task.priority = score_details["score"]
            db.add(task)
            
        prioritized_task = schemas.PrioritizedTaskResponse(
            task_id=task.task_id,
            asset_id=task.asset_id,
            department=task.department,
            task_description=task.task_description,
            priority=score_details["score"],
            duration_hours=task.duration_hours,
            overdue_days=task.overdue_days,
            required_skill=task.required_skill,
            status=task.status,
            asset_name=asset.asset_name,
            asset_criticality=asset.criticality,
            failure_risk=round(failure_risk_prob * 100, 2),
            priority_level=score_details["level"]
        )
        result.append(prioritized_task)
        
    db.commit()
    # Sort by priority score descending
    result.sort(key=lambda x: x.priority, reverse=True)
    return result
