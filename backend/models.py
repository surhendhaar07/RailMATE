from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base

class Asset(Base):
    __tablename__ = "assets"

    asset_id = Column(String, primary_key=True, index=True)
    asset_name = Column(String, nullable=False)
    asset_type = Column(String, nullable=False)  # Track, Signal, OHE
    department = Column(String, nullable=False)  # Engineering, S&T, Traction
    location = Column(String, nullable=False)    # e.g., Corridor name
    criticality = Column(Integer, default=5)     # 1-10
    installation_year = Column(Integer)
    status = Column(String, default="Active")    # Active, Under Maintenance, Degraded

    defects = relationship("Defect", back_populates="asset")
    tasks = relationship("MaintenanceTask", back_populates="asset")


class Defect(Base):
    __tablename__ = "defects"

    defect_id = Column(String, primary_key=True, index=True)
    asset_id = Column(String, ForeignKey("assets.asset_id"), nullable=False)
    description = Column(String)
    severity = Column(Integer, default=1)        # 1-10
    detected_date = Column(String, nullable=False)
    status = Column(String, default="Pending")    # Pending, Addressed

    asset = relationship("Asset", back_populates="defects")


class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"

    task_id = Column(String, primary_key=True, index=True)
    asset_id = Column(String, ForeignKey("assets.asset_id"), nullable=False)
    department = Column(String, nullable=False)
    task_description = Column(String)
    priority = Column(Float, default=0.0)        # Computed Priority Score
    duration_hours = Column(Float, nullable=False)
    overdue_days = Column(Integer, default=0)
    required_skill = Column(String)
    status = Column(String, default="Pending")    # Pending, Scheduled, Completed
    is_custom = Column(Integer, default=0)         # 0 = system/pre-seeded, 1 = user/department submitted

    asset = relationship("Asset", back_populates="tasks")


class MaintenanceTeam(Base):
    __tablename__ = "maintenance_teams"

    team_id = Column(String, primary_key=True, index=True)
    team_name = Column(String, nullable=False)
    department = Column(String, nullable=False)
    skill = Column(String, nullable=False)
    location = Column(String, nullable=False)
    available_hours = Column(Float, default=8.0)


class Block(Base):
    __tablename__ = "blocks"

    block_id = Column(String, primary_key=True, index=True)
    corridor = Column(String, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    duration_hours = Column(Float, nullable=False)
    status = Column(String, default="Available")  # Available, Cancelled, Scheduled


class Train(Base):
    __tablename__ = "trains"

    train_id = Column(String, primary_key=True, index=True) # Train No.
    train_name = Column(String, nullable=False)
    source_station_code = Column(String, nullable=False)
    source_station = Column(String, nullable=False)
    destination_station_code = Column(String, nullable=False)
    destination_station = Column(String, nullable=False)
    departure_time = Column(String, nullable=False)
    arrival_time = Column(String, nullable=False)
    route_distance = Column(Float, nullable=False)
    train_type = Column(String, nullable=False)  # Express, Passenger, Goods
    priority = Column(Integer, default=3)        # 1 = Express, 2 = Passenger, 3 = Goods
    corridor = Column(String, nullable=False)    # Derived as "Source Station → Destination Station"


class GeneratedPlan(Base):
    __tablename__ = "generated_plans"

    plan_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    block_id = Column(String, ForeignKey("blocks.block_id"), nullable=False)
    task_id = Column(String, ForeignKey("maintenance_tasks.task_id"), nullable=False)
    team_id = Column(String, ForeignKey("maintenance_teams.team_id"), nullable=False)
    scheduled_date = Column(String, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    optimization_score = Column(Float, default=0.0)
    status = Column(String, default="DRAFT")      # DRAFT, APPROVED, REJECTED

    block = relationship("Block")
    task = relationship("MaintenanceTask")
    team = relationship("MaintenanceTeam")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    message = Column(String, nullable=False)
    timestamp = Column(String, nullable=False)
    is_read = Column(Integer, default=0) # 0 = unread, 1 = read
    task_id = Column(String, nullable=True)
    action_type = Column(String, nullable=True)
    action_value = Column(String, nullable=True)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    department = Column(String, nullable=False)
    otp_code = Column(String, nullable=True)
    otp_expiry = Column(String, nullable=True)



