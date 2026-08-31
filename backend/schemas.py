from pydantic import BaseModel, Field
from typing import List, Optional

# --- Asset Schemas ---
class AssetBase(BaseModel):
    asset_id: str
    asset_name: str
    asset_type: str
    department: str
    location: str
    criticality: int
    installation_year: int
    status: str

class AssetCreate(AssetBase):
    pass

class AssetResponse(AssetBase):
    class Config:
        from_attributes = True

# --- Defect Schemas ---
class DefectBase(BaseModel):
    defect_id: str
    asset_id: str
    description: str
    severity: int
    detected_date: str
    status: str

class DefectCreate(DefectBase):
    pass

class DefectResponse(DefectBase):
    class Config:
        from_attributes = True

# --- Maintenance Task Schemas ---
class MaintenanceTaskBase(BaseModel):
    task_id: str
    asset_id: str
    department: str
    task_description: str
    priority: float
    duration_hours: float
    overdue_days: int
    required_skill: str
    status: str
    corridor: Optional[str] = None
    is_custom: Optional[int] = 0

class MaintenanceTaskCreate(MaintenanceTaskBase):
    pass

class MaintenanceTaskResponse(MaintenanceTaskBase):
    class Config:
        from_attributes = True

class PrioritizedTaskResponse(MaintenanceTaskBase):
    asset_name: str
    asset_criticality: int
    failure_risk: float
    priority_level: str

    class Config:
        from_attributes = True

# --- Maintenance Team Schemas ---
class MaintenanceTeamBase(BaseModel):
    team_id: str
    team_name: str
    department: str
    skill: str
    location: str
    available_hours: float

class MaintenanceTeamCreate(MaintenanceTeamBase):
    pass

class MaintenanceTeamResponse(MaintenanceTeamBase):
    assigned_hours: Optional[float] = 0.0
    utilization: Optional[float] = 0.0

    class Config:
        from_attributes = True

# --- Block Schemas ---
class BlockBase(BaseModel):
    block_id: str
    corridor: str
    start_time: str
    end_time: str
    duration_hours: float
    status: str

class BlockCreate(BlockBase):
    pass

class BlockUpdate(BaseModel):
    corridor: Optional[str] = None
    status: Optional[str] = None


class BlockResponse(BlockBase):
    train_impact: Optional[float] = 0.0
    utilization: Optional[float] = 0.0
    affected_trains: Optional[List[str]] = []
    estimated_delay_mins: Optional[int] = 0

    class Config:
        from_attributes = True

class TrainBase(BaseModel):
    train_id: str
    train_name: str
    source_station_code: str
    source_station: str
    destination_station_code: str
    destination_station: str
    departure_time: str
    arrival_time: str
    route_distance: float
    train_type: str
    priority: int
    corridor: str

class TrainCreate(TrainBase):
    pass

class TrainResponse(TrainBase):
    class Config:
        from_attributes = True

# --- Generated Plan Schemas ---
class GeneratedPlanBase(BaseModel):
    plan_id: Optional[int] = None
    block_id: str
    task_id: str
    team_id: str
    scheduled_date: str
    start_time: str
    end_time: str
    optimization_score: float
    status: str

class GeneratedPlanCreate(GeneratedPlanBase):
    pass

class GeneratedPlanResponse(GeneratedPlanBase):
    block: BlockResponse
    task: MaintenanceTaskResponse
    team: MaintenanceTeamResponse

    class Config:
        from_attributes = True

class ExplanationItem(BaseModel):
    title: str
    status: str  # 'check', 'info', 'warning'
    detail: str

class PlanExplanation(BaseModel):
    task_id: str
    block_id: str
    reasons: List[ExplanationItem]

class OptimalBlockPlanResponse(BaseModel):
    plans: List[GeneratedPlanResponse]
    explanations: List[PlanExplanation]
    metrics: dict

# --- Simulator Schemas ---
class SimulatorConfig(BaseModel):
    cancelled_block_ids: List[str] = []
    delayed_task_ids: List[str] = []
    emergency_tasks: List[MaintenanceTaskBase] = []
    reduced_team_hours: dict = {}  # team_id -> new_hours

class SimulationResult(BaseModel):
    original_metrics: dict
    simulated_metrics: dict
    simulated_plans: List[GeneratedPlanResponse]
    simulated_explanations: List[PlanExplanation]

# --- Dashboard Schemas ---
class DepartmentStats(BaseModel):
    department: str
    task_count: int
    critical_count: int

class BlockUtilStats(BaseModel):
    block_id: str
    utilization: float

class TeamUtilStats(BaseModel):
    team_id: str
    team_name: str
    department: str
    utilization: float

class DashboardStatsResponse(BaseModel):
    asset_availability: float
    projected_asset_availability: float
    critical_tasks_count: int
    available_blocks_count: int
    avg_block_utilization: float
    avg_team_utilization: float
    avg_train_impact: float
    
    asset_health_distribution: dict # 'Active': count, etc.
    tasks_by_department: List[dict]
    block_utilization: List[dict]
    team_utilization: List[dict]
    weekly_schedule: List[dict]


# --- Department & Operations Schemas ---
class DepartmentLoginRequest(BaseModel):
    email: str
    password: str

class DepartmentLoginResponse(BaseModel):
    username: str
    department: str
    message: str

class TaskStatusUpdate(BaseModel):
    status: str
    duration_hours: Optional[float] = None

class DefectReportCreate(BaseModel):
    asset_id: str
    description: str
    severity: int

class MaintenanceRequestCreate(BaseModel):
    asset_id: str
    description: str
    required_skill: str
    duration_hours: float


# --- Notification Schemas ---
class NotificationBase(BaseModel):
    id: Optional[int] = None
    message: str
    timestamp: str
    is_read: int
    task_id: Optional[str] = None
    action_type: Optional[str] = None
    action_value: Optional[str] = None


class NotificationResponse(NotificationBase):
    class Config:
        from_attributes = True


# --- User Schemas ---
class UserBase(BaseModel):
    username: str
    email: str
    department: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    department: Optional[str] = None

class UserResponse(UserBase):
    id: int
    class Config:
        from_attributes = True

class ForgotPasswordRequest(BaseModel):
    email: str

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str
    new_password: str


# --- Departmental request edit schemas ---
class RequestUpdate(BaseModel):
    asset_id: Optional[str] = None
    description: Optional[str] = None
    required_skill: Optional[str] = None
    duration_hours: Optional[float] = None
    severity: Optional[int] = None




