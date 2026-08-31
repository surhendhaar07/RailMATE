import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8000/api"

def make_request(url, method="GET", data=None):
    req = urllib.request.Request(url, method=method)
    if data:
        json_data = json.dumps(data).encode("utf-8")
        req.add_header("Content-Type", "application/json")
        req.data = json_data
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error for {url}: {e.code} - {e.read().decode('utf-8')}")
        raise e

def test_api():
    print("=== STARTING BACKEND VERIFICATION TEST ===")
    
    # 1. Test Dashboard Stats
    print("\n[TEST] GET /api/dashboard/stats...")
    status, res = make_request(f"{BASE_URL}/dashboard/stats")
    assert status == 200, "Dashboard stats failed"
    print("[OK] Dashboard Stats loaded successfully.")
    print(f"  Asset Availability: {res['asset_availability']}%")
    print(f"  Critical Tasks: {res['critical_tasks_count']}")
    print(f"  Available Blocks: {res['available_blocks_count']}")
    
    # 2. Test Prioritized Tasks
    print("\n[TEST] GET /api/tasks/prioritized...")
    status, tasks = make_request(f"{BASE_URL}/tasks/prioritized")
    assert status == 200, "Prioritized tasks failed"
    print(f"[OK] Loaded {len(tasks)} prioritized tasks successfully.")
    print(f"  Highest Priority Task: {tasks[0]['task_id']} (Score: {tasks[0]['priority']})")
    
    # 3. Test Block Planning Generation
    print("\n[TEST] POST /api/planner/generate...")
    status, plan_res = make_request(f"{BASE_URL}/planner/generate", method="POST")
    assert status == 200, "Planner generation failed"
    print(f"[OK] Optimal Block Plan generated successfully.")
    print(f"  Scheduled plans count: {len(plan_res['plans'])}")
    print(f"  Scheduled explanations count: {len(plan_res['explanations'])}")
    print(f"  Metrics: {plan_res['metrics']}")
    
    if len(plan_res['plans']) > 0:
        first_plan_id = plan_res['plans'][0]['plan_id']
        
        # 4. Test Approve Plan
        print(f"\n[TEST] POST /api/plans/{first_plan_id}/approve...")
        status, app_res = make_request(f"{BASE_URL}/plans/{first_plan_id}/approve", method="POST")
        assert status == 200, "Approve failed"
        assert app_res['status'] == "APPROVED", "Status is not APPROVED"
        print(f"[OK] Plan {first_plan_id} approved successfully.")
        
        # 5. Test Reject Plan
        print(f"\n[TEST] POST /api/plans/{first_plan_id}/reject...")
        status, rej_res = make_request(f"{BASE_URL}/plans/{first_plan_id}/reject", method="POST")
        assert status == 200, "Reject failed"
        assert rej_res['status'] == "REJECTED", "Status is not REJECTED"
        print(f"[OK] Plan {first_plan_id} rejected successfully.")
        
    # 6. Test What-If Simulator
    print("\n[TEST] POST /api/simulator/run...")
    sim_config = {
        "cancelled_block_ids": ["BLK-001"],
        "delayed_task_ids": ["TSK-001"],
        "emergency_tasks": [
            {
                "task_id": "TSK-EMG-TEST",
                "asset_id": "AST-001",
                "department": "Engineering",
                "task_description": "Emergency track fracture repair",
                "priority": 95.0,
                "duration_hours": 3.0,
                "overdue_days": 0,
                "required_skill": "Track Welding",
                "status": "Pending"
            }
        ],
        "reduced_team_hours": {}
    }
    status, sim_res = make_request(f"{BASE_URL}/simulator/run", method="POST", data=sim_config)
    assert status == 200, "Simulator failed"
    print("[OK] What-If Simulator run completed successfully.")
    print(f"  Original Availability: {sim_res['original_metrics']['current_asset_availability']}%")
    print(f"  Simulated Availability: {sim_res['simulated_metrics']['current_asset_availability']}%")
    print(f"  Simulated Scheduled Count: {len(sim_res['simulated_plans'])}")
    
    # 7. Test Department Login
    print("\n[TEST] POST /api/departments/login...")
    status, login_res = make_request(f"{BASE_URL}/departments/login", method="POST", data={"email": "engineering@railmate.in", "password": "password"})
    assert status == 200, "Department login failed"
    assert login_res["department"] == "Engineering", "Incorrect department returned"
    print("[OK] Department login validated successfully.")

    # 8. Test Get Department Tasks
    print("\n[TEST] GET /api/departments/tasks...")
    status, dept_tasks = make_request(f"{BASE_URL}/departments/tasks?department=Engineering")
    assert status == 200, "Get department tasks failed"
    print(f"[OK] Loaded {len(dept_tasks)} tasks for Engineering.")

    # 9. Test Report Defect
    print("\n[TEST] POST /api/departments/report-defect...")
    defect_payload = {
        "asset_id": "AST-001",
        "description": "Loose joint bolts reported by field crew",
        "severity": 7
    }
    status, defect_res = make_request(f"{BASE_URL}/departments/report-defect", method="POST", data=defect_payload)
    assert status == 200, "Report defect failed"
    assert defect_res["status"] == "Pending", "Defect status should be Pending"
    print("[OK] Defect reported and registered successfully.")

    # 10. Test Block Route Update (PATCH)
    print("\n[TEST] PATCH /api/blocks/BLK-001...")
    status, block_patch_res = make_request(f"{BASE_URL}/blocks/BLK-001", method="PATCH", data={"corridor": "Mumbai-Chennai Corridor"})
    assert status == 200, "Block patch failed"
    assert block_patch_res["corridor"] == "Mumbai-Chennai Corridor", "Block corridor did not update"
    print("[OK] Block corridor updated successfully via PATCH.")

    print("\n=== ALL BACKEND ENDPOINTS PASSED VERIFICATION ===")

if __name__ == "__main__":
    test_api()

