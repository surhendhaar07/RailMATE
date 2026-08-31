# AI-Powered Automatic Block Planning System (Problem Statement 26027)

A working decision-support prototype for **AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways**. Built for the Smart India Hackathon (SIH) 2026.

This system evaluates maintenance and defect registers using a scikit-learn Random Forest model, calculates dynamic priority scores, checks traffic delays using deterministic train schedules, and employs Google OR-Tools (CP-SAT Solver) to schedule joint maintenance tasks on available corridor block windows.

---

## System Architecture

```text
               MAINTENANCE/DEFECT REGISTERS
                            │
                            ▼
                  ML FAILURE RISK ENGINE (Random Forest)
                            │
                            ▼
                  AI PRIORITY ENGINE (30% Crit, 25% Risk, 20% Overdue, 15% Sev, 10% Traffic)
                            │
                            ▼
                  PENDING TASKS & AVAILABLE BLOCK WINDOWS
                            │
                            ▼
             TRAIN CONFLICTS & CREW SKILL CONSTRAINTS
                            │
                            ▼
         OR-TOOLS SCHEDULING OPTIMIZATION ENGINE (CP-SAT Solver)
                            │
                            ▼
                 OPTIMAL JOINT BLOCK TIMETABLE
                            │
                            ▼
          EXPLAINABLE AI REASONS & HUMAN APPROVAL INTERFACE
```

- **Frontend**: React (Vite), Tailwind CSS, Recharts (visualizations), Lucide React (icons).
- **Backend**: FastAPI (Python), SQLite (database), SQLAlchemy (ORM).
- **AI/ML Model**: Random Forest Classifier (failure risk analysis trained on synthetic historical logs).
- **Solver**: Google OR-Tools CP-SAT (scheduling optimizer).

---

## Database Schema

We use an SQLite database containing the following tables:
1. **Assets**: `asset_id` (PK), `asset_name`, `asset_type` (Track, Signal, OHE), `department` (Engineering, S&T, Traction), `location` (corridor segment), `criticality` (1-10), `installation_year`, `status` (Active, Degraded, Under Maintenance).
2. **Defects**: `defect_id` (PK), `asset_id` (FK), `description`, `severity` (1-10), `detected_date`, `status` (Pending, Addressed).
3. **MaintenanceTasks**: `task_id` (PK), `asset_id` (FK), `department`, `task_description`, `priority` (calculated score 0-100), `duration_hours`, `overdue_days`, `required_skill`, `status` (Pending, Scheduled, Completed).
4. **MaintenanceTeams**: `team_id` (PK), `team_name`, `department`, `skill`, `location` (base corridor), `available_hours`.
5. **Blocks**: `block_id` (PK), `corridor` (Delhi-Mumbai, Howrah-Delhi, Mumbai-Chennai), `start_time` (datetime), `end_time` (datetime), `duration_hours`, `status` (Available, Cancelled).
6. **Trains**: `train_id` (PK), `train_name`, `train_type` (Express, Passenger, Goods), `corridor`, `start_time` (datetime), `end_time` (datetime), `priority` (1-3).
7. **GeneratedPlans**: `plan_id` (PK), `block_id` (FK), `task_id` (FK), `team_id` (FK), `scheduled_date`, `start_time`, `end_time`, `optimization_score`, `status` (DRAFT, APPROVED, REJECTED).

---

## AI & Optimization Methodology

### ML Failure Risk Model
Features used: `asset_age`, `criticality`, `defect_severity`, `overdue_days`, `previous_failures`, `maintenance_frequency`.
Trained using a Random Forest Classifier on synthetic historical records to predict failure probability (0.0 to 1.0).

### AI Priority Score Calculation
Calculates a composite score (0-100) using:
- **30%** × Asset Criticality (normalized)
- **25%** × ML Failure Risk (normalized)
- **20%** × Overdue Days Factor (capped at 90 days)
- **15%** × Defect Severity (normalized)
- **10%** × Train/Operational Impact (normalized traffic factor)

Priorities are classified as:
- `80 - 100`: **CRITICAL**
- `60 - 79` : **HIGH**
- `40 - 59` : **MEDIUM**
- `0 - 39`  : **LOW**

### CP-SAT Scheduler Formulation
- **Variables**: $x_{t,b,m} \in \{0, 1\}$ representing if task $t$ is scheduled in block $b$ and assigned to crew $m$.
- **Constraints**:
  1. A task can be scheduled at most once.
  2. Total crew time inside a block window cannot exceed block duration.
  3. Total scheduled time for a crew cannot exceed their daily shift limit.
  4. Crew department and skills must match task requirements.
  5. The block corridor segment must match the task asset location.
- **Objective Function**: Maximize task priority weight and block utilization hours, penalize scheduled block segments with high train impact traffic, and award coordination bonuses for joint blocking (combining multiple departments' tasks in the same corridor block).

---

## API Documentation

- `GET /api/assets`: Retrieve assets register.
- `GET /api/defects`: Retrieve defect logs.
- `GET /api/tasks`: Retrieve all maintenance tasks.
- `GET /api/tasks/prioritized`: Retrieve tasks sorted by dynamic AI Priority Score.
- `GET /api/teams`: Retrieve crew shift capacities and current utilization.
- `GET /api/blocks`: Retrieve block windows with train overlap statistics.
- `GET /api/trains`: Retrieve train schedule.
- `POST /api/planner/generate`: Execute CP-SAT optimizer and save DRAFT schedule.
- `GET /api/plans`: Retrieve generated scheduling logs.
- `POST /api/plans/{id}/approve`: Approve schedule, set task status to "Scheduled".
- `POST /api/plans/{id}/reject`: Reject schedule, revert task status to "Pending".
- `POST /api/simulator/run`: Run What-If simulation using override parameters.
- `POST /api/reset-data`: Wipe database and load deterministic demo dataset.
- `GET /api/dashboard/stats`: Retrieve KPI counts and Recharts chart metrics.

---

## Installation & How to Run

### Prerequisite
Ensure Python 3.10+ and Node.js v18+ are installed.

### 1. Start Backend Server
```bash
# Navigate to backend folder
cd backend

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
python main.py
```
*API will run at [http://127.0.0.1:8000](http://127.0.0.1:8000)*

### 2. Start Frontend App
```bash
# Navigate to frontend folder
cd frontend

# Install Node.js modules
npm install

# Start Vite React server
npm run dev
```
*Web App will run at [http://localhost:5173](http://localhost:5173)*

---

## Demo Workflow

1. **Open Dashboard**: Shows current 91% Asset Availability, 18 Critical Tasks, and available corridor blocks. Review Recharts graphs.
2. **Review Prioritized Tasks**: Check the "Maintenance Tasks" tab to view risks, priority levels, and overdue dates.
3. **Execute AI Scheduler**: In "AI Block Planner", click **Generate Optimal Block Plan**. Review the timeline. Look for "Joint Maintenance Block" badges indicating Engineering, S&T, and Traction tasks combined in the same block.
4. **Inspect Rationale**: Click **Why this plan?** on any task to view the explainable AI rules.
5. **Approve Schedule**: Click **Approve Plan** to save the APPROVED state.
6. **Simulate What-If Scenarios**: Open "What-If Simulator", cancel a block, slide crew available hours to 0, or add an emergency task, and run the simulator to evaluate outcomes side-by-side.

---

## Safety & Prototype Disclaimer
> "AI-generated schedules are recommendations only and require authorized railway personnel approval before operational use."
