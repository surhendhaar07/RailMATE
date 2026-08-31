# Implementation Plan - Block Duration & Manual Route Selection

Modify the system's corridor block generation to use exactly 24 blocks of 1 hour each, and provide a manual route (corridor) selector for simulated emergency tasks.

## Proposed Changes

### 1. Synthetic Block Generation (Backend)

#### [MODIFY] [synthetic_generator.py](file:///c:/Users/surhe/OneDrive/Documents/SIH%20Project/backend/data/synthetic_generator.py)
- Change block generation loop from 30 blocks to exactly 24 blocks.
- Set `duration_hours` of all blocks to exactly `1.0` hour.
- Cycle through corridors and schedule them systematically (e.g. sequentially from hour 0 to 23) to cover a full 24-hour cycle cleanly across the different corridors.

### 2. Emergency Task Schemas & Backend Route

#### [MODIFY] [schemas.py](file:///c:/Users/surhe/OneDrive/Documents/SIH%20Project/backend/schemas.py)
- Add `corridor` (Optional[str]) to the `MaintenanceTaskBase` schema.

#### [MODIFY] [simulator.py](file:///c:/Users/surhe/OneDrive/Documents/SIH%20Project/backend/routes/simulator.py)
- Modify `run_simulation` logic: when processing `config.emergency_tasks`, if a task specifies a custom `corridor`, search the database for a matching asset in that corridor and department. Update the task's `asset_id` to link to that asset, so that the optimization model schedules the emergency task on the correct route/corridor.

### 3. Frontend Simulator Interface

#### [MODIFY] [Simulator.jsx](file:///c:/Users/surhe/OneDrive/Documents/SIH%20Project/frontend/src/pages/Simulator.jsx)
- In the "Add Emergency Maintenance Task" form, add a dropdown select menu for **Route / Corridor** containing the three routes:
  1. `Delhi-Mumbai Corridor`
  2. `Howrah-Delhi Corridor`
  3. `Mumbai-Chennai Corridor`
- Update task creation payload to pass the selected `corridor` value to the backend.
- Update the temporary task registry UI list to display the selected route next to the department name.

---

## Verification Plan

### Automated Tests
- Reset demo data in the UI (which invokes the `/api/reset-data` endpoint, running the new block generator).
- Verify that 24 blocks are loaded in the registry.

### Manual Verification
- Open the What-If Simulator page.
- Add an emergency task, selecting `Delhi-Mumbai Corridor` as the route.
- Run the simulation, and verify that the emergency task gets scheduled on a block belonging to the `Delhi-Mumbai Corridor`.
