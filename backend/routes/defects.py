from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
import models
import schemas

router = APIRouter(prefix="/defects", tags=["Defects"])

@router.get("/", response_model=List[schemas.DefectResponse])
def get_defects(db: Session = Depends(get_db)):
    defects = db.query(models.Defect).all()
    return defects
