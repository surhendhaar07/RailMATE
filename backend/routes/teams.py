from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
import models
import schemas

router = APIRouter(prefix="/teams", tags=["Teams"])

@router.get("/", response_model=List[schemas.MaintenanceTeamResponse])
def get_teams(db: Session = Depends(get_db)):
    teams = db.query(models.MaintenanceTeam).all()
    plans = db.query(models.GeneratedPlan).filter(models.GeneratedPlan.status == "APPROVED").all()
    
    # Calculate scheduled hours and utilization for teams dynamically
    result = []
    for team in teams:
        team_plans = [p for p in plans if p.team_id == team.team_id]
        assigned_hours = sum(p.task.duration_hours for p in team_plans if p.task)
        utilization = (assigned_hours / team.available_hours) * 100 if team.available_hours > 0 else 0.0
        
        # Serialize with Pydantic properties
        team_res = schemas.MaintenanceTeamResponse.model_validate(team)
        team_res.assigned_hours = round(assigned_hours, 2)
        team_res.utilization = round(min(100.0, utilization), 2)
        result.append(team_res)
        
    return result
