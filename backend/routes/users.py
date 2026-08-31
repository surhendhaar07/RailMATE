from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import os
import sys
import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import logging

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
import models
import schemas

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])

def send_otp_email(to_email: str, otp: str):
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    
    # Always print to console for easy testing/debugging
    print(f"\n========================================\n[OTP TEST CONSOLE LOG] OTP for {to_email} is: {otp}\n========================================\n")
    
    if not all([smtp_host, smtp_port, smtp_user, smtp_pass]):
        logger.info(f"SMTP is not fully configured. OTP printed to console: {otp}")
        return
        
    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = to_email
        msg['Subject'] = "RailMATE OTP for Password Reset"
        
        body = f"""Hello,

You have requested to reset your password on RailMATE.
Your 6-digit OTP is: {otp}

This OTP is valid for 10 minutes.
If you did not request this, please ignore this email.

Regards,
RailMATE Team"""
        msg.attach(MIMEText(body, 'plain'))
        
        port = int(smtp_port)
        if port == 465:
            server = smtplib.SMTP_SSL(smtp_host, port)
        else:
            server = smtplib.SMTP(smtp_host, port)
            server.starttls()
            
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, to_email, msg.as_string())
        server.close()
        logger.info(f"OTP successfully sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send OTP email: {e}")

@router.get("", response_model=List[schemas.UserResponse])
def get_users(db: Session = Depends(get_db)):
    """Retrieve all user accounts."""
    return db.query(models.User).all()

@router.post("", response_model=schemas.UserResponse)
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    """Create a new user account."""
    existing_username = db.query(models.User).filter(models.User.username == payload.username.strip()).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already exists")
        
    existing_email = db.query(models.User).filter(models.User.email == payload.email.strip()).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    new_user = models.User(
        username=payload.username.strip(),
        email=payload.email.strip(),
        password=payload.password,
        department=payload.department
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.patch("/{user_id}", response_model=schemas.UserResponse)
def update_user(user_id: int, payload: schemas.UserUpdate, db: Session = Depends(get_db)):
    """Update an existing user account's ID, email, password, or department."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if payload.username is not None:
        new_username = payload.username.strip()
        if new_username != user.username:
            existing = db.query(models.User).filter(models.User.username == new_username).first()
            if existing:
                raise HTTPException(status_code=400, detail="Username already exists")
            user.username = new_username
            
    if payload.email is not None:
        new_email = payload.email.strip()
        if new_email != user.email:
            existing = db.query(models.User).filter(models.User.email == new_email).first()
            if existing:
                raise HTTPException(status_code=400, detail="Email already exists")
            user.email = new_email
            
    if payload.password is not None:
        user.password = payload.password
        
    if payload.department is not None:
        user.department = payload.department
        
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete a user account."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"status": "SUCCESS", "message": "User deleted successfully"}

@router.post("/forgot-password")
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Generate and send an OTP for password reset."""
    user = db.query(models.User).filter(models.User.email == payload.email.strip()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User with this email not found")
        
    otp = "".join(random.choices(string.digits, k=6))
    expiry = (datetime.now() + timedelta(minutes=10)).isoformat()
    
    user.otp_code = otp
    user.otp_expiry = expiry
    db.commit()
    
    send_otp_email(user.email, otp)
    
    return {"status": "SUCCESS", "message": "OTP has been sent to your email address."}

@router.post("/verify-otp")
def verify_otp(payload: schemas.VerifyOtpRequest, db: Session = Depends(get_db)):
    """Verify OTP and update user password."""
    user = db.query(models.User).filter(models.User.email == payload.email.strip()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not user.otp_code or user.otp_code != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
        
    try:
        expiry_dt = datetime.fromisoformat(user.otp_expiry)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid OTP expiration metadata")
        
    if datetime.now() > expiry_dt:
        raise HTTPException(status_code=400, detail="OTP has expired")
        
    # Valid OTP - update password
    user.password = payload.new_password
    user.otp_code = None
    user.otp_expiry = None
    db.commit()
    
    return {"status": "SUCCESS", "message": "Password reset successfully. You can now login with your new password."}
