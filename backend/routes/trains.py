from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
import models
import schemas

router = APIRouter(tags=["Trains"])

@router.get("/trains", response_model=List[schemas.TrainResponse])
def get_trains(source: str = None, destination: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Train)
    if source:
        query = query.filter(models.Train.source_station == source)
    if destination:
        query = query.filter(models.Train.destination_station == destination)
    return query.all()

@router.get("/routes", response_model=List[str])
def get_routes(db: Session = Depends(get_db)):
    # Returns routes derived from the database/CSV dataset
    trains = db.query(models.Train).all()
    routes = set()
    for t in trains:
        routes.add(f"{t.source_station} → {t.destination_station}")
    return sorted(list(routes))
