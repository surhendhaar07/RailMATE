import React, { useState } from "react";
import { HelpCircle, Play, Sparkles, AlertTriangle, ShieldCheck, Clock, Percent, Users, TrendingUp } from "lucide-react";
import { api } from "../services/api";

export default function Simulator({ defaultBlocks, defaultTasks, defaultTeams, routes }) {
  // Derive dynamic route list from blocks or routes prop
  const allRoutes = routes && routes.length > 0 ? routes : [...new Set((defaultBlocks || []).map(b => b.corridor))].sort();

  const [cancelledBlocks, setCancelledBlocks] = useState([]);
  const [delayedTasks, setDelayedTasks] = useState([]);
  const [reducedTeamHours, setReducedTeamHours] = useState({}); // team_id -> float
  const [emergencyTasks, setEmergencyTasks] = useState([]); // list of temporary tasks

  // Form for emergency task
  const [emgDesc, setEmgDesc] = useState("");
  const [emgDept, setEmgDept] = useState("Engineering");
  const [emgSkill, setEmgSkill] = useState("");
  const [emgDuration, setEmgDuration] = useState(1.0);
  const [emgRoute, setEmgRoute] = useState(allRoutes[0] || "");

  // Route filter for block window cancellation
  const [blockCorridorFilter, setBlockCorridorFilter] = useState("All");

  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleBlockToggle = (blockId) => {
    setCancelledBlocks((prev) =>
      prev.includes(blockId) ? prev.filter((id) => id !== blockId) : [...prev, blockId]
    );
  };

  const handleTaskToggle = (taskId) => {
    setDelayedTasks((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleTeamHoursChange = (teamId, val) => {
    setReducedTeamHours((prev) => ({
      ...prev,
      [teamId]: parseFloat(val),
    }));
  };

  const handleAddEmergencyTask = (e) => {
    e.preventDefault();
    if (!emgDesc || !emgSkill) return;

    const newTask = {
      task_id: `EMG-${Date.now().toString().slice(-3)}`,
      asset_id: "AST-001", // Default anchor
      department: emgDept,
      task_description: emgDesc,
      priority: 95.0,
      duration_hours: parseFloat(emgDuration),
      overdue_days: 0,
      required_skill: emgSkill,
      status: "Pending",
      corridor: emgRoute,
    };

    setEmergencyTasks((prev) => [...prev, newTask]);
    setEmgDesc("");
    setEmgSkill("");
  };

  const handleRemoveEmergencyTask = (idx) => {
    setEmergencyTasks((prev) => prev.filter((_, i) => i !== idx));
  };

  const runSimulation = async () => {
    setIsSimulating(true);
    try {
      const config = {
        cancelled_block_ids: cancelledBlocks,
        delayed_task_ids: delayedTasks,
        emergency_tasks: emergencyTasks,
        reduced_team_hours: reducedTeamHours,
      };

      const res = await api.runSimulation(config);
      setSimulationResult(res);
    } catch (err) {
      console.error("Simulation failed:", err);
      alert("Simulation failed: " + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const getDeptSkills = (dept) => {
    if (dept === "Engineering") return ["Track Welding", "Track Alignment", "Structural Inspection"];
    if (dept === "S&T") return ["Interlocking System", "Cabling & Telecom", "Point Machine Repair"];
    return ["OHE Wire Tensioning", "Insulator Replacement", "Substation Maintenance"];
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-100 uppercase tracking-wide">What-If Scenario Simulator</h2>
        <p className="text-slate-400 text-xs mt-1">Alter railway parameters on the fly and simulate outcomes to review how block scheduling adjustments handle real-time emergencies.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Configuration Controls */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Action Trigger Button */}
          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:opacity-50 text-slate-100 py-3.5 rounded-2xl font-bold text-sm tracking-wide shadow-lg shadow-amber-600/10 transition-all select-none"
          >
            <Play size={16} className={isSimulating ? "animate-pulse" : ""} />
            {isSimulating ? "Recalculating Optimization..." : "Simulate Scenario Parameters"}
          </button>

          {/* 1. Cancel Blocks */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                🚫 Cancel Block Windows ({cancelledBlocks.length} selected)
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase font-mono">Route:</span>
                <select
                  value={blockCorridorFilter}
                  onChange={(e) => setBlockCorridorFilter(e.target.value)}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs font-semibold focus:outline-none focus:border-amber-500"
                >
                  <option value="All">All Routes</option>
                  {allRoutes.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {defaultBlocks
                .filter(b => b.status === "Available")
                .filter(b => blockCorridorFilter === "All" || b.corridor === blockCorridorFilter)
                .map((block) => (
                <label key={block.block_id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/30 border border-slate-800/60 cursor-pointer select-none transition-all">
                  <input
                    type="checkbox"
                    checked={cancelledBlocks.includes(block.block_id)}
                    onChange={() => handleBlockToggle(block.block_id)}
                    className="accent-amber-500 rounded h-4 w-4"
                  />
                  <div className="flex-1 flex justify-between items-center gap-2">
                    <div>
                      <span className="font-mono font-bold text-emerald-400">{block.block_id}</span>
                      <span className="text-slate-600 mx-1.5">|</span>
                      <span className="text-slate-200 font-semibold">{block.corridor}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
                      {block.start_time.split(" ")[1]} (1.0 hr)
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 2. Delay Tasks */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              ⏳ Delay Task Deadlines ({delayedTasks.length} selected)
            </h3>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {defaultTasks.filter(t => t.status === "Pending").slice(0, 15).map((task) => (
                <label key={task.task_id} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/40 hover:bg-slate-800/20 border border-slate-805/40 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={delayedTasks.includes(task.task_id)}
                    onChange={() => handleTaskToggle(task.task_id)}
                    className="accent-amber-500 rounded"
                  />
                  <div>
                    <span className="font-mono font-bold text-slate-300">{task.task_id}</span>
                    <span className="text-slate-500 mx-1.5">|</span>
                    <span className="text-slate-400 font-semibold">{task.department}</span>
                    <span className="text-[10px] text-slate-500 font-medium block mt-0.5 truncate max-w-[220px]">{task.task_description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 3. Reduce Team Available Hours */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              👥 Reduce Team Shift Hours
            </h3>
            <div className="max-h-40 overflow-y-auto space-y-3 pr-1 text-xs">
              {defaultTeams.map((team) => {
                const currentVal = reducedTeamHours[team.team_id] !== undefined ? reducedTeamHours[team.team_id] : team.available_hours;
                return (
                  <div key={team.team_id} className="flex items-center justify-between gap-4 p-2 bg-slate-950/40 rounded-xl border border-slate-805/40">
                    <div className="w-1/3">
                      <span className="font-bold text-slate-300 block">{team.team_name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{team.department}</span>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max={team.available_hours}
                        step="1"
                        value={currentVal}
                        onChange={(e) => handleTeamHoursChange(team.team_id, e.target.value)}
                        className="w-full accent-amber-500 bg-slate-800"
                      />
                      <span className="font-mono text-slate-300 font-bold w-12 text-right">{currentVal}h</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Add Emergency Task */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              🚨 Add Emergency Maintenance Task
            </h3>
            <form onSubmit={handleAddEmergencyTask} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1 font-semibold uppercase">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Track fracture near Mumbai..."
                  value={emgDesc}
                  onChange={(e) => setEmgDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold uppercase">Department</label>
                  <select
                    value={emgDept}
                    onChange={(e) => {
                      setEmgDept(e.target.value);
                      setEmgSkill(getDeptSkills(e.target.value)[0]);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="S&T">S&T</option>
                    <option value="Traction">Traction</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold uppercase">Duration (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    step="0.5"
                    value={emgDuration}
                    onChange={(e) => setEmgDuration(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold uppercase">Route / Corridor</label>
                <select
                  value={emgRoute}
                  onChange={(e) => setEmgRoute(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {allRoutes.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold uppercase">Required Skill</label>
                <select
                  value={emgSkill}
                  onChange={(e) => setEmgSkill(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none"
                >
                  <option value="">Select Required Skill</option>
                  {getDeptSkills(emgDept).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-700 text-amber-500 border border-slate-700 rounded-xl py-2 font-bold transition-all shadow-sm"
              >
                + Add Emergency Task
              </button>
            </form>

            {/* List of Emergency Tasks */}
            {emergencyTasks.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800/40">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Temporary Emergency Tasks:</span>
                {emergencyTasks.map((t, idx) => (
                  <div key={t.task_id} className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-rose-900/20 text-xs">
                    <div>
                      <span className="font-mono font-bold text-rose-400">{t.task_id}</span>
                      <span className="text-slate-200 ml-1.5 font-semibold">{t.task_description}</span>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{t.department} | <span className="text-amber-400/90 font-semibold">{t.corridor || allRoutes[0] || "N/A"}</span> | {t.duration_hours} hrs</div>
                    </div>
                    <button
                      onClick={() => handleRemoveEmergencyTask(idx)}
                      className="text-rose-500 hover:text-rose-400 font-bold px-1.5"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Comparative Results */}
        <div className="lg:col-span-7 space-y-6">
          {!simulationResult && (
            <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-16 flex flex-col items-center justify-center text-center h-[500px] gap-4">
              <Sparkles className="text-slate-600 animate-pulse" size={48} />
              <div>
                <h3 className="text-slate-300 font-bold">Simulator Ready</h3>
                <p className="text-slate-400 text-xs mt-1.5 leading-relaxed max-w-sm">
                  Modify the operational parameters on the left and click **Simulate Scenario Parameters** to run the solver and compare metrics.
                </p>
              </div>
            </div>
          )}

          {simulationResult && (
            <div className="space-y-6">
              
              {/* Comparative Metrics Grid */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Metrics Comparison</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Metric Box */}
                  {[
                    { label: "Asset Availability", orig: `${simulationResult.original_metrics.current_asset_availability}%`, sim: `${simulationResult.simulated_metrics.current_asset_availability}%`, sub: `Proj: ${simulationResult.simulated_metrics.projected_asset_availability}%`, icon: ShieldCheck, color: "emerald" },
                    { label: "Tasks Scheduled", orig: simulationResult.original_metrics.tasks_completed, sim: simulationResult.simulated_metrics.tasks_completed, sub: `Unscheduled Critical: ${simulationResult.simulated_metrics.unscheduled_critical_tasks}`, icon: Clock, color: "amber" },
                    { label: "Block Utilization", orig: `${simulationResult.original_metrics.block_utilization}%`, sim: `${simulationResult.simulated_metrics.block_utilization}%`, sub: `Joint blocks: ${simulationResult.simulated_metrics.joint_blocks_scheduled}`, icon: Percent, color: "emerald" },
                    { label: "Crew Utilization", orig: `${simulationResult.original_metrics.team_utilization}%`, sim: `${simulationResult.simulated_metrics.team_utilization}%`, sub: "Overall crew utilization", icon: Users, color: "emerald" }
                  ].map((m, idx) => {
                    const Icon = m.icon;
                    return (
                      <div key={idx} className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono block mb-1">{m.label}</span>
                          <div className="flex items-center gap-3">
                            <div>
                              <span className="text-[10px] text-slate-600 block font-bold">ORIGINAL</span>
                              <span className="text-lg font-mono font-bold text-slate-400">{m.orig}</span>
                            </div>
                            <span className="text-slate-700">→</span>
                            <div>
                              <span className="text-[10px] text-amber-500 block font-bold">SIMULATED</span>
                              <span className="text-xl font-mono font-black text-slate-200">{m.sim}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-2">{m.sub}</span>
                        </div>
                        <Icon size={24} className="text-slate-700" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Simulated Plan Schedule */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Simulated Schedule Output</h3>
                
                {simulationResult.simulated_plans.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {simulationResult.simulated_plans.map((plan, idx) => (
                      <div key={idx} className="p-3 bg-slate-950/50 border border-slate-850 rounded-xl flex justify-between items-center text-xs font-mono">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-emerald-400 font-bold">{plan.task_id}</span>
                            <span className="text-slate-600">|</span>
                            <span className="text-slate-300 font-semibold">{plan.block_id}</span>
                            <span className="text-slate-600">|</span>
                            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{plan.task.department}</span>
                          </div>
                          <p className="text-slate-400 font-sans font-medium mt-1 truncate max-w-[280px]">{plan.task.task_description}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-200 block">{plan.start_time} - {plan.end_time}</span>
                          <span className="text-[10px] text-slate-500 block">{plan.team.team_name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                    No tasks could be scheduled under simulated constraints. Check team availability or block windows.
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
