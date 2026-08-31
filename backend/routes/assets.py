from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
import models
import schemas

router = APIRouter(prefix="/assets", tags=["Assets"])

@router.get("/", response_model=List[schemas.AssetResponse])
def get_assets(db: Session = Depends(get_db)):
    assets = db.query(models.Asset).all()
    return assets
