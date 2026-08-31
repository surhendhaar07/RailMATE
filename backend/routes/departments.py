from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
import models
import schemas

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.post("/login", response_model=schemas.DepartmentLoginResponse)
def login_department(payload: schemas.DepartmentLoginRequest, db: Session = Depends(get_db)):
    """Validate department credentials."""
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or user.password != payload.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return schemas.DepartmentLoginResponse(
        username=user.username,
        department=user.department,
        message="Login successful"
    )

@router.get("/tasks", response_model=List[schemas.MaintenanceTaskResponse])
def get_tasks_by_department(department: str, db: Session = Depends(get_db)):
    """Return tasks assigned to a specific department."""
    tasks = db.query(models.MaintenanceTask).filter(models.MaintenanceTask.department == department).all()
    return tasks

@router.patch("/tasks/{task_id}", response_model=schemas.MaintenanceTaskResponse)
def update_task_status(task_id: str, payload: schemas.TaskStatusUpdate, db: Session = Depends(get_db)):
    """Update status or request extension for a department task."""
    task = db.query(models.MaintenanceTask).filter(models.MaintenanceTask.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    from datetime import datetime
    
    if payload.duration_hours is not None and payload.duration_hours != task.duration_hours:
        msg = f"[{task.department}] Requested task extension (+Time) on {task.task_id} to {payload.duration_hours} hours."
        notif = models.Notification(
            message=msg, 
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"), 
            is_read=0,
            task_id=task_id,
            action_type="extension",
            action_value=str(payload.duration_hours)
        )
        db.add(notif)
    elif payload.status and payload.status != task.status:
        msg = f"[{task.department}] Marked task {task.task_id} as {payload.status}."
        notif = models.Notification(message=msg, timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"), is_read=0)
        db.add(notif)
        task.status = payload.status
        
    db.commit()
    db.refresh(task)
    return task


@router.post("/report-defect", response_model=schemas.DefectResponse)
def report_defect(payload: schemas.DefectReportCreate, db: Session = Depends(get_db)):
    """Report a defect which creates a pending Defect in the database."""
    asset = db.query(models.Asset).filter(models.Asset.asset_id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Generate unique defect ID
    defect_count = db.query(models.Defect).count()
    defect_id = f"DEF-{defect_count + 1:03d}"
    
    from datetime import datetime
    new_defect = models.Defect(
        defect_id=defect_id,
        asset_id=payload.asset_id,
        description=payload.description,
        severity=payload.severity,
        detected_date=datetime.now().strftime("%Y-%m-%d"),
        status="Pending"
    )
    db.add(new_defect)
    
    # Auto-generate a MaintenanceTask based on the reported defect
    task_count = db.query(models.MaintenanceTask).count()
    task_id = f"TSK-{task_count + 1:03d}"
    
    # Simple skill fallback
    skill_map = {
        "Engineering": "Track Welding",
        "S&T": "Interlocking System",
        "Traction": "OHE Wire Tensioning"
    }
    
    new_task = models.MaintenanceTask(
        task_id=task_id,
        asset_id=payload.asset_id,
        department=asset.department,
        task_description=f"Fix defect {defect_id}: {payload.description}",
        priority=float(payload.severity * 8.0), # priority based on severity
        duration_hours=1.0, # default 1 hour
        overdue_days=0,
        required_skill=skill_map.get(asset.department, "Track Welding"),
        status="Pending",
        is_custom=1
    )
    db.add(new_task)
    
    # Create notification
    msg = f"[{asset.department}] Reported defect {defect_id} on asset {payload.asset_id}: {payload.description}."
    notif = models.Notification(
        message=msg, 
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"), 
        is_read=0,
        task_id=task_id,
        action_type="defect"
    )
    db.add(notif)
    
    db.commit()
    db.refresh(new_defect)
    
    return new_defect


@router.post("/request-maintenance", response_model=schemas.MaintenanceTaskResponse)
def request_maintenance(payload: schemas.MaintenanceRequestCreate, db: Session = Depends(get_db)):
    """Request a maintenance task."""
    asset = db.query(models.Asset).filter(models.Asset.asset_id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    task_count = db.query(models.MaintenanceTask).count()
    task_id = f"TSK-{task_count + 1:03d}"
    
    new_task = models.MaintenanceTask(
        task_id=task_id,
        asset_id=payload.asset_id,
        department=asset.department,
        task_description=payload.description,
        priority=50.0, # Medium default priority
        duration_hours=payload.duration_hours,
        overdue_days=0,
        required_skill=payload.required_skill,
        status="Pending",
        is_custom=1
    )
    db.add(new_task)
    
    # Create notification
    from datetime import datetime
    msg = f"[{asset.department}] Requested preventive maintenance on asset {payload.asset_id}."
    notif = models.Notification(
        message=msg, 
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"), 
        is_read=0,
        task_id=task_id,
        action_type="maintenance"
    )
    db.add(notif)
    
    db.commit()
    db.refresh(new_task)
    return new_task


@router.get("/requests", response_model=List[schemas.MaintenanceTaskResponse])
def get_submitted_requests(department: str, db: Session = Depends(get_db)):
    """Retrieve all submitted requests (custom tasks) for a department."""
    return db.query(models.MaintenanceTask).filter(
        models.MaintenanceTask.department == department,
        models.MaintenanceTask.is_custom == 1
    ).all()


@router.patch("/requests/{task_id}", response_model=schemas.MaintenanceTaskResponse)
def update_submitted_request(task_id: str, payload: schemas.RequestUpdate, db: Session = Depends(get_db)):
    """Update details of a previously submitted request."""
    task = db.query(models.MaintenanceTask).filter(models.MaintenanceTask.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Request task not found")
    
    if task.is_custom != 1:
        raise HTTPException(status_code=403, detail="Cannot edit system pre-seeded tasks")
        
    if task.status != "Pending":
        raise HTTPException(status_code=400, detail="Cannot edit a request that is already scheduled or completed")

    # Check if task is associated with a defect
    defect_id = None
    if task.task_description.startswith("Fix defect DEF-"):
        parts = task.task_description.split(":")
        if len(parts) > 0:
            defect_id = parts[0].replace("Fix defect ", "").strip()
            
    if payload.asset_id is not None:
        task.asset_id = payload.asset_id
        if defect_id:
            defect = db.query(models.Defect).filter(models.Defect.defect_id == defect_id).first()
            if defect:
                defect.asset_id = payload.asset_id

    if payload.description is not None:
        if defect_id:
            task.task_description = f"Fix defect {defect_id}: {payload.description.strip()}"
            defect = db.query(models.Defect).filter(models.Defect.defect_id == defect_id).first()
            if defect:
                defect.description = payload.description.strip()
        else:
            task.task_description = payload.description.strip()

    if payload.required_skill is not None:
        task.required_skill = payload.required_skill

    if payload.duration_hours is not None:
        task.duration_hours = payload.duration_hours

    if payload.severity is not None and defect_id:
        defect = db.query(models.Defect).filter(models.Defect.defect_id == defect_id).first()
        if defect:
            defect.severity = payload.severity
            task.priority = float(payload.severity * 8.0)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/requests/{task_id}")
def delete_submitted_request(task_id: str, db: Session = Depends(get_db)):
    """Delete a previously submitted request."""
    task = db.query(models.MaintenanceTask).filter(models.MaintenanceTask.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Request task not found")
        
    if task.is_custom != 1:
        raise HTTPException(status_code=403, detail="Cannot delete system pre-seeded tasks")
        
    if task.status != "Pending":
        raise HTTPException(status_code=400, detail="Cannot delete a request that is already scheduled or completed")

    # If linked to a defect, delete the defect too
    if task.task_description.startswith("Fix defect DEF-"):
        parts = task.task_description.split(":")
        if len(parts) > 0:
            defect_id = parts[0].replace("Fix defect ", "").strip()
            db.query(models.Defect).filter(models.Defect.defect_id == defect_id).delete()

    db.delete(task)
    db.commit()
    return {"status": "SUCCESS", "message": "Request deleted successfully"}


