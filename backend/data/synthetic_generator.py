import os
import sys
import random
from datetime import datetime, timedelta

# Ensure backend root is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from models import Asset, Defect, MaintenanceTask, MaintenanceTeam, Block, Train, GeneratedPlan, User
from services.ml_model import predict_failure_risk
from services.priority_engine import calculate_priority_score

CORRIDORS = ["Delhi-Mumbai Corridor", "Howrah-Delhi Corridor", "Mumbai-Chennai Corridor"]

DEPTS = {
    "Engineering": {
        "asset_types": ["Track Section", "Bridge structure", "Turnout Point"],
        "skills": ["Track Welding", "Track Alignment", "Structural Inspection"],
        "task_desc": ["Urgent welding of joint", "Track ballast tamping", "Turnout packing", "Sleeper replacement", "Bridge girder inspection"]
    },
    "S&T": {
        "asset_types": ["Signal Post", "Axle Counter", "Interlocking Unit"],
        "skills": ["Interlocking System", "Cabling & Telecom", "Point Machine Repair"],
        "task_desc": ["Point machine overhaul", "Signal bulb/LED repair", "Axle counter replacement", "Track circuit testing", "Relay room cabling"]
    },
    "Traction": {
        "asset_types": ["OHE Cantilever", "Substation Transformer", "Insulator String"],
        "skills": ["OHE Wire Tensioning", "Insulator Replacement", "Substation Maintenance"],
        "task_desc": ["OHE contact wire adjustment", "Insulator washing & replacement", "Transformer oil testing", "Dropper adjustment", "Substation breaker check"]
    }
}

def generate_db_data(db: Session):
    # Clear existing data
    db.query(GeneratedPlan).delete()
    db.query(Train).delete()
    db.query(Block).delete()
    db.query(MaintenanceTeam).delete()
    db.query(MaintenanceTask).delete()
    db.query(Defect).delete()
    db.query(Asset).delete()
    db.query(User).delete()
    db.commit()

    # Seed default users
    default_users = [
        User(username="admin", email="admin@railmate.in", password="admin", department="Admin"),
        User(username="eng_user", email="engineering@railmate.in", password="password", department="Engineering"),
        User(username="st_user", email="signals@railmate.in", password="password", department="S&T"),
        User(username="tra_user", email="traction@railmate.in", password="password", department="Traction"),
    ]
    for u in default_users:
        db.add(u)
    db.commit()

    random.seed(42)  # Deterministic generation
    base_date = datetime(2026, 8, 28) # Matching system time month/year

    # Load dynamic routes from CSV first to populate CORRIDORS
    import csv
    csv_path = os.path.join(os.path.dirname(__file__), "railway_train_dataset_max_5_routes.csv")
    dynamic_corridors = set()
    if os.path.exists(csv_path):
        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.reader(f)
            header = next(reader)
            for row in reader:
                if row and len(row) >= 6:
                    src_name = row[3].strip().strip("'")
                    dst_name = row[5].strip().strip("'")
                    dynamic_corridors.add(f"{src_name} → {dst_name}")
    
    global CORRIDORS
    if dynamic_corridors:
        CORRIDORS = sorted(list(dynamic_corridors))

    # 1. Generate Assets (50)
    assets = []
    asset_types_pool = []
    
    # Pre-generate some asset metadata to pick from
    for dept, info in DEPTS.items():
        for t in info["asset_types"]:
            asset_types_pool.append((dept, t))

    for i in range(1, 51):
        asset_id = f"AST-{i:03d}"
        dept, asset_type = random.choice(asset_types_pool)
        corridor = random.choice(CORRIDORS)
        criticality = random.randint(3, 10) if i % 4 == 0 else random.randint(1, 8) # some very critical
        installation_year = random.randint(1995, 2022)
        
        status = "Active"
        if i % 8 == 0:
            status = "Degraded"
        elif i % 12 == 0:
            status = "Under Maintenance"

        asset = Asset(
            asset_id=asset_id,
            asset_name=f"{asset_type} {i}",
            asset_type=asset_type,
            department=dept,
            location=corridor,
            criticality=criticality,
            installation_year=installation_year,
            status=status
        )
        db.add(asset)
        assets.append(asset)
    db.commit()

    # 2. Generate Defects (100)
    defects = []
    for i in range(1, 101):
        defect_id = f"DEF-{i:03d}"
        asset = random.choice(assets)
        severity = random.randint(1, 10)
        
        # Detected date within last 30 days
        days_back = random.randint(1, 30)
        detected_date = (base_date - timedelta(days=days_back)).strftime("%Y-%m-%d")
        
        status = "Pending"
        if i % 5 == 0:
            status = "Addressed" # Some resolved already

        defect = Defect(
            defect_id=defect_id,
            asset_id=asset.asset_id,
            description=f"Defect in {asset.asset_name}: {random.choice(DEPTS[asset.department]['task_desc'])}",
            severity=severity,
            detected_date=detected_date,
            status=status
        )
        db.add(defect)
        defects.append(defect)
    db.commit()

    # 3. Generate Maintenance Teams (15)
    teams = []
    dept_names = list(DEPTS.keys())
    
    # 5 teams per department
    team_idx = 1
    for dept in dept_names:
        skills = DEPTS[dept]["skills"]
        for j in range(5):
            team_id = f"TEM-{team_idx:03d}"
            skill = skills[j % len(skills)]
            corridor = CORRIDORS[j % len(CORRIDORS)]
            
            team = MaintenanceTeam(
                team_id=team_id,
                team_name=f"{dept} Team {j+1}",
                department=dept,
                skill=skill,
                location=corridor,
                available_hours=24.0 # Shifts
            )
            db.add(team)
            teams.append(team)
            team_idx += 1
    db.commit()

    # Load routes from the CSV file dynamically
    # Clean up single quotes from CSV values
    import csv
    csv_path = os.path.join(os.path.dirname(__file__), "railway_train_dataset_max_5_routes.csv")
    
    csv_trains = []
    dynamic_corridors = set()
    if os.path.exists(csv_path):
        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.reader(f)
            header = next(reader)
            # Map columns by index:
            # 0: Train No., 1: Train Name, 2: Source Station Code, 3: Source Station, 4: Destination Station Code, 5: Destination Station, 6: Departure Time, 7: Arrival Time, 8: Route Distance (km)
            for row in reader:
                if not row or len(row) < 9:
                    continue
                t_id = row[0].strip().strip("'")
                t_name = row[1].strip().strip("'")
                src_code = row[2].strip().strip("'")
                src_name = row[3].strip().strip("'")
                dst_code = row[4].strip().strip("'")
                dst_name = row[5].strip().strip("'")
                dep_time = row[6].strip().strip("'")
                arr_time = row[7].strip().strip("'")
                dist = float(row[8].strip().strip("'") or 0.0)
                
                corr = f"{src_name} → {dst_name}"
                dynamic_corridors.add(corr)
                
                # Derive priority and type
                t_type = "Express"
                priority = 1
                if "PASS" in t_name or "EXP" not in t_name and "RAJDHNI" not in t_name and "DURONTO" not in t_name and "SHATABDI" not in t_name and "SATABDI" not in t_name:
                    t_type = "Passenger"
                    priority = 2
                
                csv_trains.append({
                    "train_id": t_id,
                    "train_name": t_name,
                    "source_station_code": src_code,
                    "source_station": src_name,
                    "destination_station_code": dst_code,
                    "destination_station": dst_name,
                    "departure_time": dep_time,
                    "arrival_time": arr_time,
                    "route_distance": dist,
                    "train_type": t_type,
                    "priority": priority,
                    "corridor": corr
                })
    
    # 4. Generate Blocks (24 blocks of 1 hour each)
    blocks = []
    for i in range(1, 25):
        block_id = f"BLK-{i:03d}"
        corridor = CORRIDORS[(i - 1) % len(CORRIDORS)]
        
        # Schedule blocks sequentially from hour 0 to 23 of base_date + 1 day
        days_forward = 1
        hour = i - 1  # 24 blocks, each at a different hour of the day (0-23)
        duration_hours = 1.0
        
        start_dt = base_date + timedelta(days=days_forward, hours=hour)
        end_dt = start_dt + timedelta(hours=duration_hours)
        
        status = "Available"
        if i % 8 == 0:
            status = "Cancelled" # Simulator block cancelling testing

        block = Block(
            block_id=block_id,
            corridor=corridor,
            start_time=start_dt.strftime("%Y-%m-%d %H:%M"),
            end_time=end_dt.strftime("%Y-%m-%d %H:%M"),
            duration_hours=duration_hours,
            status=status
        )
        db.add(block)
        blocks.append(block)
    db.commit()

    # 5. Populate Trains from CSV data
    for t in csv_trains:
        train = Train(
            train_id=t["train_id"],
            train_name=t["train_name"],
            source_station_code=t["source_station_code"],
            source_station=t["source_station"],
            destination_station_code=t["destination_station_code"],
            destination_station=t["destination_station"],
            departure_time=t["departure_time"],
            arrival_time=t["arrival_time"],
            route_distance=t["route_distance"],
            train_type=t["train_type"],
            priority=t["priority"],
            corridor=t["corridor"]
        )
        db.add(train)
    db.commit()

    # 6. Generate Maintenance Tasks (75)
    # Tasks are generated based on Pending defects
    pending_defects = [d for d in defects if d.status == "Pending"]
    
    # Calculate a train traffic density on corridors to use for Train Operational Impact
    corridor_trains_count = {}
    for c in CORRIDORS:
        # Simplistic train count
        corridor_trains_count[c] = random.randint(10, 30)

    for i in range(1, 76):
        task_id = f"TSK-{i:03d}"
        
        # Connect to a defect if available, else pick a random asset
        defect = None
        if i <= len(pending_defects):
            defect = pending_defects[i - 1]
            asset = db.query(Asset).filter(Asset.asset_id == defect.asset_id).first()
        else:
            asset = random.choice(assets)
            
        dept = asset.department
        task_desc = defect.description if defect else f"Preventive check for {asset.asset_name}: {random.choice(DEPTS[dept]['task_desc'])}"
        
        # Variables for priority scoring
        criticality = asset.criticality
        defect_severity = defect.severity if defect else random.randint(1, 4)
        overdue_days = random.randint(0, 90)
        
        # Predict failure risk using ML Model
        # Input features: asset_age, criticality, defect_severity, overdue_days, previous_failures, maintenance_frequency
        asset_age = 2026 - asset.installation_year
        previous_failures = random.randint(0, 4)
        maintenance_frequency = random.randint(2, 8)
        
        failure_risk_prob = predict_failure_risk(
            asset_age=asset_age,
            criticality=criticality,
            defect_severity=defect_severity,
            overdue_days=overdue_days,
            previous_failures=previous_failures,
            maintenance_frequency=maintenance_frequency
        )
        
        # Normal train traffic factor based on corridor
        corr_traffic = corridor_trains_count[asset.location]
        train_impact_score = min(corr_traffic / 30.0, 1.0) * 100.0
        
        # Calc score
        score_details = calculate_priority_score(
            criticality=criticality,
            failure_risk_prob=failure_risk_prob,
            overdue_days=overdue_days,
            defect_severity=defect_severity,
            train_impact_score=train_impact_score
        )
        
        duration_hours = float(random.choice([0.5, 1.0]))
        skill = random.choice(DEPTS[dept]["skills"])
        
        status = "Pending"
        # Let's say a small fraction are already scheduled/completed to show different statuses
        if i % 15 == 0:
            status = "Completed"
        elif i % 20 == 0:
            status = "Scheduled"

        task = MaintenanceTask(
            task_id=task_id,
            asset_id=asset.asset_id,
            department=dept,
            task_description=task_desc,
            priority=score_details["score"], # Store the score in priority
            duration_hours=duration_hours,
            overdue_days=overdue_days,
            required_skill=skill,
            status=status
        )
        db.add(task)
    db.commit()

    print("Synthetic data loaded successfully.")
