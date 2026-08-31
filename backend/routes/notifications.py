from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
import models
import schemas

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/", response_model=List[schemas.NotificationResponse])
def get_notifications(db: Session = Depends(get_db)):
    """Fetch notifications in descending order of creation."""
    return db.query(models.Notification).order_by(models.Notification.id.desc()).all()

@router.post("/{notif_id}/read", response_model=schemas.NotificationResponse)
def mark_as_read(notif_id: int, db: Session = Depends(get_db)):
    """Mark a notification as read."""
    notif = db.query(models.Notification).filter(models.Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = 1
    db.commit()
    db.refresh(notif)
    return notif

@router.post("/read-all")
def mark_all_as_read(db: Session = Depends(get_db)):
    """Mark all notifications as read."""
    db.query(models.Notification).update({models.Notification.is_read: 1})
    db.commit()
    return {"status": "SUCCESS"}

@router.post("/{notif_id}/approve")
def approve_notification_action(notif_id: int, db: Session = Depends(get_db)):
    """Approve task extension requested by department."""
    notif = db.query(models.Notification).filter(models.Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    if notif.action_type == "extension" and notif.task_id and notif.action_value:
        task = db.query(models.MaintenanceTask).filter(models.MaintenanceTask.task_id == notif.task_id).first()
        if task:
            task.duration_hours = float(notif.action_value)
            
            # Post a secondary notification confirming the approval
            from datetime import datetime
            msg = f"[System] Task {task.task_id} extension request APPROVED to {notif.action_value} hours."
            confirm_notif = models.Notification(message=msg, timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"), is_read=0)
            db.add(confirm_notif)
            
    notif.is_read = 1
    db.commit()
    return {"status": "SUCCESS", "message": "Action approved successfully"}

@router.post("/{notif_id}/reject")
def reject_notification_action(notif_id: int, db: Session = Depends(get_db)):
    """Reject task extension requested by department."""
    notif = db.query(models.Notification).filter(models.Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    if notif.action_type == "extension" and notif.task_id:
        from datetime import datetime
        msg = f"[System] Task {notif.task_id} extension request REJECTED."
        confirm_notif = models.Notification(message=msg, timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"), is_read=0)
        db.add(confirm_notif)
        
    notif.is_read = 1
    db.commit()
    return {"status": "SUCCESS", "message": "Action rejected successfully"}

@router.delete("/clear-all")
def clear_all_notifications(db: Session = Depends(get_db)):
    """Delete all notifications."""
    db.query(models.Notification).delete()
    db.commit()
    return {"status": "SUCCESS", "message": "All notifications cleared"}

@router.delete("/{notif_id}")
def delete_notification(notif_id: int, db: Session = Depends(get_db)):
    """Delete a single notification by ID."""
    notif = db.query(models.Notification).filter(models.Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif)
    db.commit()
    return {"status": "SUCCESS", "message": "Notification deleted successfully"}


