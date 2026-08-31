import uvicorn
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os

from database import engine, Base, get_db
from data.synthetic_generator import generate_db_data
import models

# Import routers
from routes import assets, defects, tasks, teams, blocks, trains, planner, plans, simulator, dashboard, departments, notifications, users

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI-Powered Railway Block Planning System",
    description="SIH 2026 Problem ID 26027 - Prototype for automated, optimized railway maintenance block scheduling.",
    version="1.0.0"
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auto-generate synthetic data on startup if database is empty or has outdated schema
db = next(get_db())
try:
    # Check if the Train table has the new schema (source_station column)
    needs_regen = False
    try:
        existing_trains = db.query(models.Train).first()
        # If trains exist, check if they have the new source_station attribute
        if existing_trains and not hasattr(existing_trains, 'source_station'):
            needs_regen = True
        # Also check if source_station column exists by attempting a filtered query
        db.query(models.Train.source_station).first()
        # Also check if User email column exists by attempting a filtered query
        db.query(models.User.email).first()
    except Exception:
        # Column doesn't exist - need to recreate tables
        needs_regen = True
        db.rollback()

    existing_blocks = db.query(models.Block).all()
    if needs_regen or db.query(models.Asset).count() == 0 or len(existing_blocks) != 24 or any(b.duration_hours != 1.0 for b in existing_blocks):
        print("Outdated or missing data/schema detected. Dropping and recreating all tables...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        db = next(get_db())
        generate_db_data(db)

    # Check and seed default users if empty
    if db.query(models.User).count() == 0:
        print("Seeding default users...")
        default_users = [
            models.User(username="admin", email="admin@railmate.in", password="admin", department="Admin"),
            models.User(username="eng_user", email="engineering@railmate.in", password="password", department="Engineering"),
            models.User(username="st_user", email="signals@railmate.in", password="password", department="S&T"),
            models.User(username="tra_user", email="traction@railmate.in", password="password", department="Traction"),
        ]
        for u in default_users:
            db.add(u)
        db.commit()
except Exception as e:
    print(f"Error checking or populating synthetic data / users: {e}")
finally:
    db.close()

# Register API routers
app.include_router(dashboard.router, prefix="/api")
app.include_router(assets.router, prefix="/api")
app.include_router(defects.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(teams.router, prefix="/api")
app.include_router(blocks.router, prefix="/api")
app.include_router(trains.router, prefix="/api")
app.include_router(planner.router, prefix="/api")
app.include_router(plans.router, prefix="/api")
app.include_router(simulator.router, prefix="/api")
app.include_router(departments.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(users.router, prefix="/api")

@app.post("/api/reset-data")
def reset_demo_data(db: Session = Depends(get_db)):
    """Wipes the database and loads fresh deterministic synthetic demo data."""
    try:
        generate_db_data(db)
        return {"status": "SUCCESS", "message": "Demo data reset successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset data: {str(e)}")

@app.get("/")
def read_root():
    return {"message": "Railway Maintenance Block Planner API is running. Explore docs at /docs."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
