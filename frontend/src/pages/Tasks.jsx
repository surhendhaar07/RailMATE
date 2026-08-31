import React, { useState, useEffect } from "react";
import { Search, Filter, ShieldAlert } from "lucide-react";

export default function Tasks({ tasks, highlightTaskId }) {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    if (highlightTaskId) {
      setTimeout(() => {
        const element = document.getElementById(`task-row-${highlightTaskId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
    }
  }, [highlightTaskId]);

  if (!tasks || tasks.length === 0) {
    return <div className="text-slate-400 p-8">Loading tasks...</div>;
  }

  // Filter logic
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.task_id.toLowerCase().includes(search.toLowerCase()) ||
      task.task_description.toLowerCase().includes(search.toLowerCase()) ||
      task.asset_name.toLowerCase().includes(search.toLowerCase());

    const matchesDept = deptFilter === "All" || task.department === deptFilter;
    const matchesPriority = priorityFilter === "All" || task.priority_level === priorityFilter;
    const matchesStatus = statusFilter === "All" || task.status === statusFilter;

    return matchesSearch && matchesDept && matchesPriority && matchesStatus;
  });

  const getPriorityBadge = (level) => {
    switch (level) {
      case "CRITICAL":
        return <span className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 tracking-wider">CRITICAL</span>;
      case "HIGH":
        return <span className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 tracking-wider">HIGH</span>;
      case "MEDIUM":
        return <span className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tracking-wider">MEDIUM</span>;
      default:
        return <span className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-slate-500/10 text-slate-400 border border-slate-500/20 tracking-wider">LOW</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Completed":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/15 text-emerald-400">Completed</span>;
      case "Scheduled":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-500/15 text-blue-400">Scheduled</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-700/50 text-slate-300">Pending</span>;
    }
  };

  return (
    <div className="space-y-6">


      {/* Filters Bar */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 gap-4 flex flex-col lg:flex-row items-center justify-between shadow-sm">
        {/* Search */}
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-4 top-3 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Search by Task ID, Asset, Description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">Dept:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="All">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="S&T">S&T</option>
              <option value="Traction">Traction</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="All">All Priorities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Only</option>
              <option value="MEDIUM">Medium Only</option>
              <option value="LOW">Low Only</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] font-black uppercase tracking-wider bg-slate-950/20">
                <th className="py-4 px-6">Task ID</th>
                <th className="py-4 px-6">Asset Name</th>
                <th className="py-4 px-6">Department</th>
                <th className="py-4 px-6">Risk Profile</th>
                <th className="py-4 px-6">Priority Score</th>
                <th className="py-4 px-6 text-center">Priority Level</th>
                <th className="py-4 px-6 text-center">Duration</th>
                <th className="py-4 px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <tr 
                    key={task.task_id} 
                    id={`task-row-${task.task_id}`}
                    className={`hover:bg-slate-800/10 transition-colors ${
                      highlightTaskId === task.task_id
                        ? "bg-amber-500/10 border-l-4 border-amber-500 ring-2 ring-amber-500/20"
                        : ""
                    }`}
                  >
                    <td className="py-4 px-6 font-bold font-mono text-emerald-400">{task.task_id}</td>
                    <td className="py-4 px-6 font-medium">
                      <div className="text-slate-200">{task.asset_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{task.asset_id}</div>
                    </td>
                    <td className="py-4 px-6 font-semibold">{task.department}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold ${task.failure_risk > 70 ? 'text-rose-400' : task.failure_risk > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {task.failure_risk}%
                        </span>
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${task.failure_risk > 70 ? 'bg-rose-500' : task.failure_risk > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${task.failure_risk}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-100 font-mono">{task.priority}</td>
                    <td className="py-4 px-6 text-center">{getPriorityBadge(task.priority_level)}</td>
                    <td className="py-4 px-6 text-center font-mono">{task.duration_hours} hrs</td>
                    <td className="py-4 px-6 text-center">{getStatusBadge(task.status)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 font-medium">
                    No tasks matching the selected filters found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
