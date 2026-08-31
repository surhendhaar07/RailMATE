import React, { useState } from "react";
import { Users, ShieldCheck, Wrench, Zap } from "lucide-react";

export default function Teams({ teams }) {
  const [deptFilter, setDeptFilter] = useState("All");

  if (!teams || teams.length === 0) {
    return <div className="text-slate-400 p-8">Loading teams...</div>;
  }

  const filteredTeams = teams.filter((t) => {
    return deptFilter === "All" || t.department === deptFilter;
  });

  const getDeptIcon = (dept) => {
    switch (dept) {
      case "Engineering":
        return <Wrench className="text-amber-500" size={18} />;
      case "S&T":
        return <ShieldCheck className="text-emerald-500" size={18} />;
      case "Traction":
        return <Zap className="text-rose-500 animate-pulse" size={18} />;
      default:
        return <Users className="text-slate-400" size={18} />;
    }
  };

  const getDeptColor = (dept) => {
    switch (dept) {
      case "Engineering":
        return "border-amber-500/20 bg-amber-500/5";
      case "S&T":
        return "border-emerald-500/20 bg-emerald-500/5";
      case "Traction":
        return "border-rose-500/20 bg-rose-500/5";
      default:
        return "border-slate-800 bg-slate-900/40";
    }
  };

  return (
    <div className="space-y-6">
      {/* Department filter tabs */}
      <div className="flex justify-end mb-4">
        <div className="flex bg-slate-900/60 p-1 border border-slate-800 rounded-2xl">
          {["All", "Engineering", "S&T", "Traction"].map((d) => (
            <button
              key={d}
              onClick={() => setDeptFilter(d)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                deptFilter === d
                  ? "bg-slate-850 text-slate-100 shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {d === "All" ? "All Departments" : d}
            </button>
          ))}
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <div 
            key={team.team_id} 
            className={`border rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${getDeptColor(team.department)}`}
          >
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest bg-slate-950/60 border border-slate-800 px-2 py-0.5 rounded-md">
                  {team.team_id}
                </span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  {getDeptIcon(team.department)}
                  {team.department}
                </div>
              </div>

              <h3 className="text-base font-extrabold text-slate-100">{team.team_name}</h3>
              <p className="text-xs text-slate-400 mt-2 flex flex-col gap-1">
                <span>📍 <strong>Base Corridor:</strong> {team.location}</span>
                <span>🛠️ <strong>Specialized Skill:</strong> {team.skill}</span>
              </p>
            </div>

            {/* Workload Progress */}
            <div className="mt-6 pt-4 border-t border-slate-800/40">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400 font-semibold">Shift Workload:</span>
                <span className="font-bold text-slate-200">{team.utilization}%</span>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-slate-950 border border-slate-850 h-3 rounded-full overflow-hidden mb-3">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    team.utilization > 80
                      ? "bg-rose-500"
                      : team.utilization > 40
                      ? "bg-amber-500"
                      : team.utilization > 0
                      ? "bg-emerald-500"
                      : "bg-slate-800"
                  }`}
                  style={{ width: `${team.utilization}%` }}
                ></div>
              </div>

              {/* Workload hours details */}
              <div className="flex justify-between items-center text-[11px] font-mono text-slate-500">
                <span>Shift Cap: {team.available_hours} hrs</span>
                <span className="text-slate-300 font-semibold">Assigned: {team.assigned_hours} hrs</span>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
