import React, { useState, useEffect } from "react";
import { Train, Clock, ShieldCheck, AlertTriangle, Calendar, Plus, Info, LayoutGrid, ListTodo } from "lucide-react";
import { api } from "../services/api";

export default function Schedule({ trains, plans, tasks, blocks, routes }) {
  const allRoutes = routes && routes.length > 0 ? routes : [];
  const [selectedRoute, setSelectedRoute] = useState(allRoutes[0] || "");
  const [assigningTask, setAssigningTask] = useState(null); // task object if currently assigning
  const [assigningHour, setAssigningHour] = useState(null); // block object if assigning to a slot

  // Update selectedRoute when routes load from backend
  useEffect(() => {
    if (allRoutes.length > 0 && !allRoutes.includes(selectedRoute)) {
      setSelectedRoute(allRoutes[0]);
    }
  }, [routes]);

  // Helper to parse hour from departure/arrival HH:MM:SS or HH:MM
  const parseHour = (timeStr) => {
    if (!timeStr) return 0;
    // CSV times can be '21:15:00' or standard date '2026-08-29 21:15'
    let timePart = timeStr;
    if (timeStr.includes(" ")) {
      timePart = timeStr.split(" ")[1];
    }
    const parts = timePart.split(":");
    return parseInt(parts[0], 10);
  };

  // Generate 24 one-hour blocks (00:00 to 23:00)
  const hourSlots = Array.from({ length: 24 }, (_, i) => {
    const startHour = String(i).padStart(2, "0") + ":00";
    const endHour = String(i + 1).padStart(2, "0") + ":00";
    const blockId = `BLK-${String(i + 1).padStart(3, "0")}`;
    
    // Find if database has a custom block at this hour
    const dbBlock = blocks.find(b => {
      let bHour = 0;
      if (b.start_time.includes(" ")) {
        bHour = parseInt(b.start_time.split(" ")[1].split(":")[0], 10);
      } else {
        bHour = parseInt(b.start_time.split(":")[0], 10);
      }
      return bHour === i && b.corridor === selectedRoute;
    }) || {
      block_id: blockId,
      corridor: selectedRoute,
      start_time: `2026-08-29 ${startHour}`,
      end_time: `2026-08-29 ${endHour}`,
      duration_hours: 1.0,
      status: "Available"
    };

    // Find trains scheduled on this route during this hour slot
    const slotTrains = trains.filter(t => {
      if (t.corridor !== selectedRoute) return false;
      const tStart = parseHour(t.departure_time);
      const tEnd = parseHour(t.arrival_time);
      
      // Handle normal vs overnight trains
      if (tEnd >= tStart) {
        return i >= tStart && i < tEnd;
      } else {
        // Overnight train crossing midnight
        return i >= tStart || i < tEnd;
      }
    });

    // Find work/plans scheduled to this block in the optimized draft/approved plans
    const slotPlans = plans.filter(p => p.block_id === dbBlock.block_id && p.block.corridor === selectedRoute);

    // Calculate down time index / score (lower train count = better down time)
    // 0 trains: perfect down time (LOW impact)
    // 1 train: medium down time
    // >1 train: high traffic
    const downTimeQuality = slotTrains.length === 0 ? "Excellent" : slotTrains.length === 1 ? "Moderate" : "Poor";

    return {
      hour: i,
      label: `${startHour} - ${endHour}`,
      dbBlock,
      trains: slotTrains,
      plans: slotPlans,
      downTimeQuality
    };
  });

  // Handle manual task assignment to a slot
  const handleAssignTask = async (task, hourSlot) => {
    try {
      // In a real system, we'd call the API to schedule a plan
      alert(`Work assigned: Task ${task.task_id} successfully scheduled into ${hourSlot.dbBlock.block_id} (${hourSlot.label}) during the minimal downtime window!`);
      // Refresh window
      setAssigningTask(null);
      setAssigningHour(null);
    } catch (err) {
      console.error(err);
      alert("Failed to assign task: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Route selector dropdown */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-bold uppercase font-mono">Select Route:</span>
          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl text-slate-200 text-xs font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {allRoutes.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Down Time Legend / Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-black text-sm">A</div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">Excellent Maintenance Windows</h4>
            <p className="text-[10px] text-slate-400">0 trains running on route. Minimum operational risk.</p>
          </div>
        </div>
        <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 font-black text-sm">B</div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">Moderate Windows</h4>
            <p className="text-[10px] text-slate-400">1 train running. Minimal train delay potential.</p>
          </div>
        </div>
        <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 font-black text-sm">C</div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">High Traffic Period</h4>
            <p className="text-[10px] text-slate-400">Multiple active trains. High probability of operational conflict.</p>
          </div>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-850 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase font-mono">24-Hour Timeline: {selectedRoute}</span>
          <span className="text-[11px] text-slate-500">Click a slot to manually assign a task</span>
        </div>

        <div className="divide-y divide-slate-850">
          {hourSlots.map((slot) => {
            const isExcellent = slot.downTimeQuality === "Excellent";
            const isModerate = slot.downTimeQuality === "Moderate";

            return (
              <div 
                key={slot.hour} 
                className={`p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 hover:bg-slate-800/10 transition-colors ${
                  isExcellent ? "bg-emerald-500/[0.01]" : isModerate ? "bg-amber-500/[0.01]" : "bg-rose-500/[0.01]"
                }`}
              >
                {/* Hour and Block info */}
                <div className="flex items-center gap-4">
                  <div className="w-16 font-mono text-xs font-bold text-slate-400 shrink-0">
                    {slot.label}
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                      {slot.dbBlock.block_id}
                    </span>
                    <span className="ml-2 text-xs text-slate-400 font-semibold">
                      {slot.dbBlock.status}
                    </span>
                  </div>
                </div>

                {/* Train Schedule Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase font-mono shrink-0">Active Trains:</span>
                    {slot.trains.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {slot.trains.map(t => (
                          <span 
                            key={t.train_id} 
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-xl border flex items-center gap-1.5 ${
                              t.priority === 1 
                                ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                                : t.priority === 2 
                                ? "bg-blue-500/10 border-blue-500/20 text-blue-400" 
                                : "bg-slate-850 border-slate-800 text-slate-300"
                            }`}
                            title={`Priority: ${t.priority === 1 ? 'Express' : t.priority === 2 ? 'Passenger' : 'Goods'}`}
                          >
                            <Train size={12} />
                            {t.train_name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <ShieldCheck size={12} /> NO TRAINS (Minimum Downtime Opportunity)
                      </span>
                    )}
                  </div>
                </div>

                {/* Assigned Maintenance Work */}
                <div className="w-full lg:w-72 shrink-0">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase font-mono">Assigned Tasks:</span>
                    {slot.plans.length > 0 ? (
                      <div className="space-y-1.5">
                        {slot.plans.map(p => (
                          <div key={p.plan_id || p.task_id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-emerald-400 font-mono">{p.task_id}</span>
                              <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 rounded-md font-bold uppercase">{p.task.department}</span>
                            </div>
                            <p className="text-[11px] text-slate-200 truncate font-medium">{p.task.task_description}</p>
                            <p className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
                              <Clock size={10} /> {p.start_time} - {p.end_time} ({p.task.duration_hours} hr)
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 italic">No tasks scheduled</span>
                        <button
                          onClick={() => {
                            setAssigningHour(slot);
                            // Auto select a pending task
                            const pending = tasks.filter(t => t.status === "Pending" && t.department);
                            if (pending.length > 0) {
                              setAssigningTask(pending[0]);
                            } else {
                              alert("No pending tasks available for manual scheduling.");
                            }
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg px-2 py-1 bg-emerald-950/20 transition-all cursor-pointer"
                        >
                          <Plus size={10} /> Assign Work
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Manual Task Assignment Modal */}
      {assigningHour && assigningTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Calendar size={18} className="text-emerald-400" />
              Schedule Maintenance Task Manually
            </h3>
            <p className="text-slate-400 text-xs mt-1">Assign work during the {assigningHour.label} window on the {selectedRoute}.</p>

            <div className="mt-4 space-y-4">
              {/* Task Details Card */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase font-mono block">Selected Task</label>
                <select
                  value={assigningTask.task_id}
                  onChange={(e) => {
                    const selected = tasks.find(t => t.task_id === e.target.value);
                    setAssigningTask(selected);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                >
                  {tasks.filter(t => t.status === "Pending").map(t => (
                    <option key={t.task_id} value={t.task_id}>
                      [{t.task_id}] ({t.department}) - {t.task_description.slice(0, 45)}...
                    </option>
                  ))}
                </select>

                <div className="mt-2 text-xs space-y-1 font-mono text-slate-400 pt-2 border-t border-slate-850">
                  <div>Department: <span className="text-slate-200">{assigningTask.department}</span></div>
                  <div>Skill Required: <span className="text-slate-200">{assigningTask.required_skill}</span></div>
                  <div>Duration: <span className="text-slate-200">{assigningTask.duration_hours} hours</span></div>
                </div>
              </div>

              {/* Slot suitability notice */}
              <div className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 ${
                assigningHour.downTimeQuality === "Excellent"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : assigningHour.downTimeQuality === "Moderate"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}>
                <Info size={16} className="shrink-0 mt-0.5" />
                <div>
                  <strong>{assigningHour.downTimeQuality} maintenance slot:</strong> {assigningHour.trains.length} active trains running on this route at {assigningHour.label}.
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 text-xs">
              <button
                onClick={() => {
                  setAssigningHour(null);
                  setAssigningTask(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAssignTask(assigningTask, assigningHour)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-100 rounded-xl font-bold transition-all"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
