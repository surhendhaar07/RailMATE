import React, { useState } from "react";
import { Train, Info, AlertCircle } from "lucide-react";

export default function Blocks({ blocks, onUpdateBlock }) {
  const [corridorFilter, setCorridorFilter] = useState("All");

  if (!blocks || blocks.length === 0) {
    return <div className="text-slate-400 p-8">Loading blocks...</div>;
  }

  const corridors = ["Delhi-Mumbai Corridor", "Howrah-Delhi Corridor", "Mumbai-Chennai Corridor"];

  // Filter logic
  const filteredBlocks = blocks.filter((block) => {
    return corridorFilter === "All" || block.corridor === corridorFilter;
  });

  const getTrainImpactBadge = (score) => {
    if (score > 60) {
      return (
        <span className="flex items-center justify-center gap-1 px-2.5 py-1 text-[10px] font-black rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 tracking-wider">
          <AlertCircle size={10} /> HIGH
        </span>
      );
    } else if (score > 30) {
      return (
        <span className="flex items-center justify-center gap-1 px-2.5 py-1 text-[10px] font-black rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 tracking-wider">
          <Info size={10} /> MEDIUM
        </span>
      );
    } else {
      return (
        <span className="flex items-center justify-center gap-1 px-2.5 py-1 text-[10px] font-black rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tracking-wider">
          <Train size={10} /> LOW
        </span>
      );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Cancelled":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/15 text-rose-400">Cancelled</span>;
      case "Scheduled":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-500/15 text-blue-400">Scheduled</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/15 text-emerald-400">Available</span>;
    }
  };

  return (
    <div className="space-y-6">


      {/* Filters Bar */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">Filter Corridor:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCorridorFilter("All")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                corridorFilter === "All"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              All Corridors
            </button>
            {corridors.map((c) => (
              <button
                key={c}
                onClick={() => setCorridorFilter(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  corridorFilter === c
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {c.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Blocks Grid */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] font-black uppercase tracking-wider bg-slate-950/20">
                <th className="py-4 px-6">Block ID</th>
                <th className="py-4 px-6">Corridor Segment</th>
                <th className="py-4 px-6">Scheduled Window</th>
                <th className="py-4 px-6 text-center">Duration</th>
                <th className="py-4 px-6 text-center">Train Impact</th>
                <th className="py-4 px-6 text-center">Affected Trains</th>
                <th className="py-4 px-6 text-center">Utilization</th>
                <th className="py-4 px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
              {filteredBlocks.length > 0 ? (
                filteredBlocks.map((block) => (
                  <tr key={block.block_id} className="hover:bg-slate-800/10 transition-colors">
                    <td className="py-4 px-6 font-bold font-mono text-emerald-400">{block.block_id}</td>
                    <td className="py-4 px-6 font-semibold text-slate-200">
                      <select
                        value={block.corridor}
                        onChange={(e) => onUpdateBlock(block.block_id, e.target.value)}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/80 font-sans font-semibold cursor-pointer hover:bg-slate-900 transition-all"
                      >
                        {corridors.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-400">
                      <div>{block.start_time}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">to {block.end_time}</div>
                    </td>
                    <td className="py-4 px-6 text-center font-mono font-bold text-slate-100">{block.duration_hours} hrs</td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {getTrainImpactBadge(block.train_impact)}
                        <span className="text-[10px] text-slate-500 font-mono">Score: {block.train_impact}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center font-mono">
                      {block.affected_trains.length > 0 ? (
                        <div className="text-rose-400 font-bold hover:underline cursor-pointer" title={block.affected_trains.join(", ")}>
                          {block.affected_trains.length} Trains ({block.estimated_delay_mins} min delay)
                        </div>
                      ) : (
                        <span className="text-emerald-400 font-semibold">0 Trains</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-300 font-mono">{block.utilization}%</span>
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${block.utilization > 70 ? 'bg-emerald-500' : block.utilization > 30 ? 'bg-amber-500' : 'bg-slate-600'}`}
                            style={{ width: `${block.utilization}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">{getStatusBadge(block.status)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 font-medium">
                    No blocks matching the selected corridor found.
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
