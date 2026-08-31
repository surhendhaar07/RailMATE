import React from "react";
import { X, CheckCircle2, AlertTriangle, Info } from "lucide-react";

export default function PlanDetailModal({ plan, explanation, onClose }) {
  if (!plan || !explanation) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Task Schedule Explanation</h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Task: {plan.task_id} | Block: {plan.block_id}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-800 p-2 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Plan Details Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 font-mono text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5">DEPARTMENT</span>
              <span className="font-semibold text-slate-200">{plan.task.department}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">LOCATION</span>
              <span className="font-semibold text-slate-200">{plan.block.corridor}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">TIMING</span>
              <span className="font-semibold text-slate-200">
                {plan.scheduled_date} ({plan.start_time} - {plan.end_time})
              </span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">ASSIGNED TEAM</span>
              <span className="font-semibold text-slate-200">{plan.team.team_name}</span>
            </div>
          </div>

          {/* Explanation Bullet Points */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Optimizer Rationale</h4>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {explanation.reasons.map((reason, idx) => {
                let Icon = Info;
                let colorClass = "text-slate-400 bg-slate-950 border-slate-800";
                
                if (reason.status === "check") {
                  Icon = CheckCircle2;
                  colorClass = "text-emerald-400 bg-emerald-500/5 border-emerald-500/10";
                } else if (reason.status === "warning") {
                  Icon = AlertTriangle;
                  colorClass = "text-rose-400 bg-rose-500/5 border-rose-500/10";
                }

                return (
                  <div 
                    key={idx} 
                    className={`flex items-start gap-3 p-3.5 rounded-xl border ${colorClass}`}
                  >
                    <Icon size={18} className="mt-0.5 shrink-0" />
                    <div>
                      <h5 className="text-sm font-semibold text-slate-200">{reason.title}</h5>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{reason.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/20 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-slate-100 px-5 py-2 rounded-xl text-sm font-semibold tracking-wide transition-all shadow-lg shadow-emerald-600/10"
          >
            Acknowledge Rationale
          </button>
        </div>
      </div>
    </div>
  );
}
