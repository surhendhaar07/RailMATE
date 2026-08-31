import sys
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
from ortools.sat.python import cp_model

# Ensure backend root is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Asset, Defect, MaintenanceTask, MaintenanceTeam, Block, Train
from services.priority_engine import get_priority_level

def parse_time(time_str: str) -> datetime:
    """Parses standard datetimes in 'YYYY-MM-DD HH:MM' format."""
    try:
        return datetime.strptime(time_str, "%Y-%m-%d %H:%M")
    except ValueError:
        # Fallback to date only or alternate format
        try:
            return datetime.strptime(time_str, "%Y-%m-%d")
        except ValueError:
            return datetime.now()

def parse_time_of_day_to_mins(time_str: str) -> int:
    """Converts 'HH:MM:SS' or 'HH:MM' string to minutes from midnight."""
    try:
        parts = list(map(int, time_str.split(':')))
        return parts[0] * 60 + parts[1]
    except Exception:
        return 0

def calculate_block_train_impact(block: Block, trains: List[Train]) -> Dict[str, Any]:
    """
    Calculates Train Impact Score (0-100) based on train overlaps with the 24-hour block window.
    Since blocks are exactly 24 one-hour blocks (00:00-01:00, etc.), we map the block start/end times
    to minutes from midnight and check if the train's departure/arrival window intersects it.
    If arrival < departure, the train runs overnight.
    Express = 25 pts, Passenger = 15 pts, Goods = 10 pts.
    """
    # Extract start/end hours of the block
    try:
        b_dt_start = parse_time(block.start_time)
        b_dt_end = parse_time(block.end_time)
        block_start_mins = b_dt_start.hour * 60 + b_dt_start.minute
        block_end_mins = b_dt_end.hour * 60 + b_dt_end.minute
        # If end hour is 0 (23:00 to 00:00), treat as 24:00
        if block_end_mins == 0 and b_dt_end.day > b_dt_start.day:
            block_end_mins = 24 * 60
    except Exception:
        block_start_mins = 0
        block_end_mins = 60

    impact_score = 0.0
    affected_trains = []
    estimated_delay_mins = 0
    
    for train in trains:
        if train.corridor != block.corridor:
            continue
            
        t_start_mins = parse_time_of_day_to_mins(train.departure_time)
        t_end_mins = parse_time_of_day_to_mins(train.arrival_time)
        
        # Check overlap
        overlap = False
        if t_end_mins >= t_start_mins:
            # Train runs within same day
            overlap = max(0, min(block_end_mins, t_end_mins) - max(block_start_mins, t_start_mins)) > 0
        else:
            # Overnight train
            # Split train route into two segments: [t_start_mins, 24*60] and [0, t_end_mins]
            overlap1 = max(0, min(block_end_mins, 24*60) - max(block_start_mins, t_start_mins)) > 0
            overlap2 = max(0, min(block_end_mins, t_end_mins) - max(block_start_mins, 0)) > 0
            overlap = overlap1 or overlap2
            
        if overlap:
            affected_trains.append(train.train_id)
            if train.train_type == "Express":
                impact_score += 25
                estimated_delay_mins += 30
            elif train.train_type == "Passenger":
                impact_score += 15
                estimated_delay_mins += 15
            else: # Goods
                impact_score += 10
                estimated_delay_mins += 45
                
    impact_score = min(100.0, impact_score)
    
    # Train Impact Level classification
    if impact_score <= 30:
        level = "LOW"
    elif impact_score <= 60:
        level = "MEDIUM"
    else:
        level = "HIGH"
        
    return {
        "score": impact_score,
        "level": level,
        "affected_trains": affected_trains,
        "estimated_delay_mins": estimated_delay_mins
    }

def optimize_schedule(
    tasks: List[MaintenanceTask],
    blocks: List[Block],
    teams: List[MaintenanceTeam],
    trains: List[Train],
    assets: List[Asset],
    cancelled_block_ids: List[str] = [],
    reduced_team_hours: Dict[str, float] = {},
    rejected_assignments: List[Tuple[str, str]] = []
) -> Dict[str, Any]:
    """
    Schedules maintenance tasks into blocks using CP-SAT.
    Returns generated plans list, metrics, and explanations.
    """
    model = cp_model.CpModel()
    
    # Pre-calculate assets dictionary for fast lookup
    asset_dict = {a.asset_id: a for a in assets}
    
    # Filter available blocks and teams based on What-If parameters
    active_blocks = [b for b in blocks if b.status == "Available" and b.block_id not in cancelled_block_ids]
    
    # Calculate train impact details for blocks
    block_impact_map = {}
    for block in active_blocks:
        block_impact_map[block.block_id] = calculate_block_train_impact(block, trains)
        
    # Variables mapping
    # x[(task_id, block_id, team_id)] = Boolean variable
    x = {}
    
    # Build list of valid (task, block, team) combinations
    valid_combinations = []
    
    for task in tasks:
        if task.status != "Pending":
            continue
            
        task_asset = asset_dict.get(task.asset_id)
        if not task_asset:
            continue
            
        for block in active_blocks:
            # Check if this task-block assignment was previously rejected
            if (task.task_id, block.block_id) in rejected_assignments:
                continue

            # 1. Block corridor must match task asset location
            if block.corridor != task_asset.location:
                continue
                
            # 2. Task duration must fit inside block duration
            if task.duration_hours > block.duration_hours:
                continue
                
            for team in teams:
                # Get team hours limit, accounting for What-If simulator modifications
                team_hours_limit = reduced_team_hours.get(team.team_id, team.available_hours)
                if team_hours_limit <= 0:
                    continue
                    
                # 3. Team department must match task department
                if team.department != task.department:
                    continue
                    
                # 4. Team skill must match task requirement
                if team.skill != task.required_skill:
                    continue
                    
                # Combine is valid
                comb = (task, block, team)
                valid_combinations.append(comb)
                
                # Create OR-Tools boolean variable
                var_name = f"x_{task.task_id}_{block.block_id}_{team.team_id}"
                x[(task.task_id, block.block_id, team.team_id)] = model.NewBoolVar(var_name)
                
    # --- Constraints ---
    
    # 1. A task can be scheduled at most once
    for task in tasks:
        if task.status != "Pending":
            continue
        task_vars = [x[(task.task_id, b.block_id, m.team_id)] 
                     for (t, b, m) in valid_combinations 
                     if t.task_id == task.task_id]
        if task_vars:
            model.AddAtMostOne(task_vars)
            
    # 2. Team duration inside a block cannot exceed block duration
    # This also guarantees no overlapping tasks for a team in a block
    for block in active_blocks:
        for team in teams:
            team_block_vars = [
                (x[(t.task_id, block.block_id, team.team_id)], int(t.duration_hours * 100))
                for (t, b, m) in valid_combinations
                if b.block_id == block.block_id and m.team_id == team.team_id
            ]
            if team_block_vars:
                # Sum(x_t * duration_t) <= block_duration
                model.Add(
                    sum(var * dur for (var, dur) in team_block_vars) <= int(block.duration_hours * 100)
                )
                
    # 3. Total assigned hours per team cannot exceed their available hours
    for team in teams:
        team_hours_limit = reduced_team_hours.get(team.team_id, team.available_hours)
        team_vars = [
            (x[(t.task_id, b.block_id, team.team_id)], int(t.duration_hours * 100))
            for (t, b, m) in valid_combinations
            if m.team_id == team.team_id
        ]
        if team_vars:
            model.Add(
                sum(var * dur for (var, dur) in team_vars) <= int(team_hours_limit * 100)
            )

    # 4. Multi-Department Joint Blocking (Linearization variables)
    # y[(block_id, department)] = 1 if department has at least one task scheduled in block
    departments = ["Engineering", "S&T", "Traction"]
    y = {}
    for block in active_blocks:
        for dept in departments:
            y_name = f"y_{block.block_id}_{dept}"
            y[(block.block_id, dept)] = model.NewBoolVar(y_name)
            
            # y_bd >= x_tbm for all tasks in department d scheduled in block b
            dept_block_vars = [
                x[(t.task_id, block.block_id, m.team_id)]
                for (t, b, m) in valid_combinations
                if b.block_id == block.block_id and t.department == dept
            ]
            
            for var in dept_block_vars:
                model.Add(y[(block.block_id, dept)] >= var)
                
            # If no tasks are scheduled, y must be 0
            if dept_block_vars:
                model.Add(y[(block.block_id, dept)] <= sum(dept_block_vars))
            else:
                model.Add(y[(block.block_id, dept)] == 0)

    # --- Objective Function ---
    objective_terms = []
    
    # 1. Maximize High-Priority tasks scheduled
    for (t, b, m) in valid_combinations:
        var = x[(t.task_id, b.block_id, m.team_id)]
        # Priority score is between 0 and 100
        priority_weight = int(t.priority * 10) # range 0 - 1000
        # Adding a base reward of 1000 ensures that scheduling a task is always positive
        # and preferred over leaving it unscheduled, preventing starvation on high-traffic routes.
        objective_terms.append(var * (1000 + priority_weight))
        
    # 2. Maximize Block Utilization (in hours)
    for (t, b, m) in valid_combinations:
        var = x[(t.task_id, b.block_id, m.team_id)]
        util_weight = int(t.duration_hours * 50) # 1 hour = 50 pts
        objective_terms.append(var * util_weight)
        
    # 3. Minimize Train Impact (Penalize tasks scheduled in blocks with high train impact)
    for (t, b, m) in valid_combinations:
        var = x[(t.task_id, b.block_id, m.team_id)]
        impact_score = block_impact_map[b.block_id]["score"]
        penalty = int(impact_score * 5) # range 0 - 500 penalty
        objective_terms.append(var * (-penalty))
        
    # 4. Multi-Department coordination bonus
    # We add a bonus if department count is > 1 for a block
    # Rewarding each active department in a block:
    for block in active_blocks:
        for dept in departments:
            # Add 250 points for each active department in a block
            # If 1 dept active: 250 points
            # If 2 depts active: 500 points (bonus = 250)
            # If 3 depts active: 750 points (bonus = 500)
            objective_terms.append(y[(block.block_id, dept)] * 250)
            
    model.Maximize(sum(objective_terms))
    
    # --- Solve ---
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 10.0 # Time limit
    status = solver.Solve(model)
    
    generated_plans = []
    explanations = []
    
    # Process results if optimal or feasible
    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        scheduled_tasks_by_block = {} # block_id -> list of (task, team)
        
        for (t, b, m) in valid_combinations:
            if solver.BooleanValue(x[(t.task_id, b.block_id, m.team_id)]):
                if b.block_id not in scheduled_tasks_by_block:
                    scheduled_tasks_by_block[b.block_id] = []
                scheduled_tasks_by_block[b.block_id].append((t, m))
                
        # Generate plan times sequentially inside blocks
        for block_id, scheduled in scheduled_tasks_by_block.items():
            block = next(b for b in active_blocks if b.block_id == block_id)
            b_start = parse_time(block.start_time)
            
            # Sort by priority to do high-priority tasks first
            scheduled.sort(key=lambda item: item[0].priority, reverse=True)
            
            # Keep track of team busy offsets to handle scheduling sequential tasks for the same team
            team_busy_offset = {} # team_id -> current offset in minutes
            
            for task, team in scheduled:
                # Find start time. A team's next task starts after their previous task in this block ends
                start_offset = team_busy_offset.get(team.team_id, 0)
                task_start_dt = b_start + timedelta(minutes=start_offset)
                task_end_dt = task_start_dt + timedelta(hours=task.duration_hours)
                
                # Update team offset
                team_busy_offset[team.team_id] = start_offset + int(task.duration_hours * 60)
                
                plan = {
                    "block_id": block.block_id,
                    "task_id": task.task_id,
                    "team_id": team.team_id,
                    "scheduled_date": task_start_dt.strftime("%Y-%m-%d"),
                    "start_time": task_start_dt.strftime("%H:%M"),
                    "end_time": task_end_dt.strftime("%H:%M"),
                    "optimization_score": float(solver.ObjectiveValue()),
                    "status": "DRAFT"
                }
                generated_plans.append(plan)
                
                # --- Generate Explainable AI explanations ---
                task_asset = asset_dict[task.asset_id]
                risk_pct = round(task.priority * 0.9, 1) # Synthetic risk placeholder matching formula
                impact_details = block_impact_map[block.block_id]
                
                # Determine combined S&T / Traction tasks
                other_depts_in_block = set(
                    oth_task.department 
                    for (oth_task, _) in scheduled 
                    if oth_task.task_id != task.task_id
                )
                
                reasons = [
                    {"title": f"Asset Criticality: {task_asset.criticality}/10", "status": "check", "detail": f"High importance asset {task_asset.asset_name} is targeted."},
                    {"title": f"Failure Risk Score", "status": "info", "detail": f"Risk assessment dictates preventive intervention."},
                    {"title": f"Overdue: {task.overdue_days} days", "status": "warning" if task.overdue_days > 30 else "info", "detail": f"Task is overdue by {task.overdue_days} days, increasing operational risk."},
                    {"title": f"Low Train Impact Block", "status": "check" if impact_details["score"] <= 30 else "warning", "detail": f"Scheduled in block {block.block_id} (impact: {impact_details['level']} - score {impact_details['score']}) affecting {len(impact_details['affected_trains'])} trains."},
                    {"title": f"Team Available & Qualified", "status": "check", "detail": f"Assigned to {team.team_name} with required skill '{task.required_skill}'."}
                ]
                
                if other_depts_in_block:
                    depts_str = ", ".join(other_depts_in_block)
                    reasons.append({
                        "title": "Joint Maintenance Block", 
                        "status": "check", 
                        "detail": f"Combined with {depts_str} department tasks in corridor {block.corridor} to save block time."
                    })
                    
                # Calculate block utilization improvement
                total_duration = sum(t.duration_hours for (t, _) in scheduled)
                util_pct = round((total_duration / block.duration_hours) * 100, 1)
                reasons.append({
                    "title": f"Block Utilization: {util_pct}%",
                    "status": "check" if util_pct > 70 else "info",
                    "detail": f"Utilizes {total_duration} hrs of the total {block.duration_hours} hrs block."
                })
                
                explanations.append({
                    "task_id": task.task_id,
                    "block_id": block.block_id,
                    "reasons": reasons
                })
                
    # --- Calculate Dashboard & Performance Metrics ---
    
    # 1. Total critical assets count (criticality >= 7)
    critical_assets = [a for a in assets if a.criticality >= 7]
    total_critical_count = len(critical_assets)
    
    # Current availability
    # 100 - (critical assets under maintenance / total critical assets * 100)
    current_maint_assets = sum(1 for a in assets if a.status == "Under Maintenance" and a.criticality >= 7)
    current_avail = 100.0 - ((current_maint_assets / max(1, total_critical_count)) * 100)
    
    # Projected availability (scheduled tasks completed reduce degraded assets)
    scheduled_task_ids = set(p["task_id"] for p in generated_plans)
    scheduled_critical_tasks = [t for t in tasks if t.task_id in scheduled_task_ids and asset_dict[t.asset_id].criticality >= 7]
    
    # When critical task is done, asset status is resolved, increasing availability
    projected_maint_assets = max(0, current_maint_assets - len(scheduled_critical_tasks))
    projected_avail = 100.0 - ((projected_maint_assets / max(1, total_critical_count)) * 100)
    
    # 2. Block Utilization
    block_utils = {}
    for block in active_blocks:
        scheduled_in_block = [p for p in generated_plans if p["block_id"] == block.block_id]
        if scheduled_in_block:
            # Sum task durations
            block_tasks = [t for t in tasks if t.task_id in [s["task_id"] for s in scheduled_in_block]]
            utilized_hours = sum(t.duration_hours for t in block_tasks)
            block_utils[block.block_id] = min(100.0, (utilized_hours / block.duration_hours) * 100)
        else:
            block_utils[block.block_id] = 0.0
            
    avg_block_util = sum(block_utils.values()) / max(1, len(active_blocks))
    
    # 3. Team Utilization
    team_assigned_hours = {team.team_id: 0.0 for team in teams}
    for plan in generated_plans:
        task = next(t for t in tasks if t.task_id == plan["task_id"])
        team_assigned_hours[plan["team_id"]] += task.duration_hours
        
    team_utils = {}
    for team in teams:
        limit = reduced_team_hours.get(team.team_id, team.available_hours)
        if limit > 0:
            team_utils[team.team_id] = min(100.0, (team_assigned_hours[team.team_id] / limit) * 100)
        else:
            team_utils[team.team_id] = 0.0
            
    avg_team_util = sum(team_utils.values()) / max(1, len(teams))
    
    # 4. Joint blocks metrics
    joint_blocks_count = 0
    for block in active_blocks:
        scheduled_in_block = [p for p in generated_plans if p["block_id"] == block.block_id]
        if len(scheduled_in_block) > 1:
            depts = set(next(t for t in tasks if t.task_id == p["task_id"]).department for p in scheduled_in_block)
            if len(depts) > 1:
                joint_blocks_count += 1
                
    # 5. Average train impact of scheduled blocks
    scheduled_block_ids = set(p["block_id"] for p in generated_plans)
    if scheduled_block_ids:
        avg_train_impact = sum(block_impact_map[bid]["score"] for bid in scheduled_block_ids) / len(scheduled_block_ids)
    else:
        avg_train_impact = 0.0

    metrics = {
        "tasks_completed": len(generated_plans),
        "block_utilization": round(avg_block_util, 2),
        "team_utilization": round(avg_team_util, 2),
        "train_impact": round(avg_train_impact, 2),
        "current_asset_availability": round(current_avail, 2),
        "projected_asset_availability": round(projected_avail, 2),
        "joint_blocks_scheduled": joint_blocks_count,
        "unscheduled_critical_tasks": sum(1 for t in tasks if t.status == "Pending" and t.priority >= 80 and t.task_id not in scheduled_task_ids)
    }

    return {
        "plans": generated_plans,
        "explanations": explanations,
        "metrics": metrics
    }
