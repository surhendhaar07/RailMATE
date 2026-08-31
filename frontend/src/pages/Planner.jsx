import React, { useState, useEffect } from "react";
import { Sparkles, HelpCircle, CheckCircle, XCircle, Clock, Users, ArrowRight, AlertTriangle } from "lucide-react";
import PlanDetailModal from "../components/PlanDetailModal";
import { api } from "../services/api";

export default function Planner({ 
  plans, 
  explanations, 
  metrics, 
  onGenerate, 
  onApprovePlan, 
  onRejectPlan,
  isGenerating,
  highlightTaskId,
  tasks,
  onRefreshData
}) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [assignModal, setAssignModal] = useState(null);   // task pending assignment
  const [suggestion, setSuggestion] = useState(null);     // AI suggestion response
  const [isSuggesting, setIsSuggesting] = useState(false); // loading state
  const [isAssigning, setIsAssigning] = useState(false);  // confirming assignment
  const [activeTab, setActiveTab] = useState("unprocessed"); // "unprocessed" or "processed"

  const handleManualAssign = async (blockId, teamId, evictPlanIds = []) => {
    setIsAssigning(true);
    try {
      await api.manualAssignTask(
        assignModal.task_id,
        blockId,
        teamId,
        evictPlanIds,
        true   // auto_approve: skip DRAFT, approve immediately
      );
      setAssignModal(null);
      setSuggestion(null);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert("Assignment failed: " + (err.message || "Unknown error"));
    } finally {
      setIsAssigning(false);
    }
  };


  useEffect(() => {
    if (highlightTaskId && plans) {
      const targetPlan = plans.find(p => p.task_id === highlightTaskId);
      if (targetPlan) {
        if (targetPlan.status === "DRAFT") {
          setActiveTab("unprocessed");
        } else {
          setActiveTab("processed");
        }
      }
      setTimeout(() => {
        const element = document.getElementById(`plan-task-${highlightTaskId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
    }
  }, [highlightTaskId, plans]);

  const unprocessedPlans = (plans || []).filter(p => p.status === "DRAFT");
  const processedPlans = (plans || []).filter(p => p.status === "APPROVED" || p.status === "REJECTED");

  const currentTabPlans = activeTab === "unprocessed" ? unprocessedPlans : processedPlans;

  // Group plans by Block ID for visual grouping (Joint Blocks)
  const plansByBlock = currentTabPlans
    .filter(p => p.task?.status !== "Completed")
    .reduce((acc, plan) => {
      if (!acc[plan.block_id]) {
        acc[plan.block_id] = {
          block: plan.block,
          schedules: []
        };
      }
      acc[plan.block_id].schedules.push(plan);
      return acc;
    }, {});

  const getExplanation = (taskId, blockId) => {
    return explanations.find(e => e.task_id === taskId && e.block_id === blockId);
  };

  const isJointBlock = (schedules) => {
    const departments = new Set(schedules.map(s => s.task.department));
    return departments.size > 1;
  };

  const scheduledTaskIds = new Set(plans.map(p => p.task_id));
  const pendingRequests = (tasks || [])
    .filter((t) => !scheduledTaskIds.has(t.task_id) && t.status === "Pending")
    .sort((a, b) => {
      const numA = parseInt(a.task_id.replace(/\D/g, ""), 10);
      const numB = parseInt(b.task_id.replace(/\D/g, ""), 10);
      return numA - numB;
    });

  return (
    <div className="space-y-6">
      {/* Header action button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-slate-100 rounded-2xl px-6 py-3 font-bold text-sm tracking-wide shadow-lg shadow-emerald-600/10 transition-all select-none cursor-pointer"
        >
          <Sparkles size={16} className={isGenerating ? "animate-spin" : ""} />
          {isGenerating ? "Optimizing Blocks..." : "Generate Optimal Block Plan"}
        </button>
      </div>

      {/* Loader */}
      {isGenerating && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 text-center">
          <div className="h-12 w-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <div>
            <h3 className="text-slate-200 font-bold">Solving Schedule Optimization Problem...</h3>
            <p className="text-slate-400 text-xs mt-1">Executing Random Forest defect evaluation and CP-SAT block matching constraints.</p>
          </div>
        </div>
      )}

      {/* Solver Metrics Bar */}
      {!isGenerating && plans.length > 0 && metrics && (
        <div className="bg-emerald-950/10 border border-emerald-500/15 rounded-3xl p-5 grid grid-cols-2 md:grid-cols-4 gap-6 font-mono text-center">
          <div>
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Tasks Scheduled</span>
            <span className="text-xl font-extrabold text-slate-200">{metrics.tasks_completed} Tasks</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Block Util Rate</span>
            <span className="text-xl font-extrabold text-slate-200">{metrics.block_utilization}%</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Crew Utilization</span>
            <span className="text-xl font-extrabold text-slate-200">{metrics.team_utilization}%</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Projected Avail.</span>
            <span className="text-xl font-extrabold text-emerald-400">{metrics.projected_asset_availability}%</span>
          </div>
        </div>
      )}

      {/* No Plan Generated State */}
      {!isGenerating && plans.length === 0 && pendingRequests.length === 0 && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-16 flex flex-col items-center justify-center text-center max-w-xl mx-auto gap-4">
          <HelpCircle className="text-slate-600" size={48} />
          <div>
            <h3 className="text-slate-300 font-bold">No Active Plan Recommendations</h3>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
              Click the <strong>Generate Optimal Block Plan</strong> button in the top right to start the optimization engine and schedule pending tasks.
            </p>
          </div>
        </div>
      )}

      {/* Pending Department Requests — unscheduled tasks awaiting to be added to a plan */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-widest text-amber-400 font-mono">
              ⚡ Pending Department Requests
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded-lg">
              {pendingRequests.length} awaiting schedule
            </span>
          </div>
          <p className="text-slate-500 text-[11px]">
            These tasks were reported by departments and are not yet scheduled. Click <strong>Generate Optimal Block Plan</strong> to include them in the next plan.
          </p>
          <div className="space-y-2">
            {pendingRequests.map((task) => (
              <div
                key={task.task_id}
                id={`plan-task-${task.task_id}`}
                className={`p-5 rounded-2xl border flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 transition-all ${
                  highlightTaskId === task.task_id
                    ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20"
                    : "bg-slate-900/40 border-slate-800"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold font-mono text-amber-400">{task.task_id}</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-800 text-slate-300">{task.department}</span>
                    <span className="text-xs font-bold text-slate-200">{task.required_skill}</span>
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">PENDING</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-100">{task.task_description}</p>
                  <p className="text-[11px] font-mono text-slate-500">
                    <Clock size={11} className="inline mr-1" />
                    Estimated Duration: {task.duration_hours} hrs · Asset: {task.asset_id}
                  </p>
                </div>
                <div className="flex items-center justify-end">
                  {/* Single Smart Schedule button: opens AI suggestion modal */}
                  <button
                    onClick={async () => {
                      setAssignModal(task);
                      setSuggestion(null);
                      setIsSuggesting(true);
                      try {
                        const result = await api.autoSuggestBlock(task.task_id);
                        setSuggestion(result);
                      } catch (err) {
                        setSuggestion({ error: err.message || "No suitable block found." });
                      } finally {
                        setIsSuggesting(false);
                      }
                    }}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-slate-100 rounded-xl px-5 py-2.5 text-xs font-bold tracking-wide transition-all shadow shadow-emerald-600/15"
                  >
                    <Sparkles size={13} /> Smart Schedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      {!isGenerating && plans.length > 0 && (
        <div className="flex border-b border-slate-800/60 pb-px gap-6 mb-6">
          <button
            onClick={() => setActiveTab("unprocessed")}
            className={`pb-3 text-sm font-bold tracking-wide relative transition-all ${
              activeTab === "unprocessed"
                ? "text-emerald-400 font-black border-b-2 border-emerald-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Unprocessed Drafts ({unprocessedPlans.length})
          </button>
          
          <button
            onClick={() => setActiveTab("processed")}
            className={`pb-3 text-sm font-bold tracking-wide relative transition-all ${
              activeTab === "processed"
                ? "text-emerald-400 font-black border-b-2 border-emerald-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Processed Schedules ({processedPlans.length})
          </button>
        </div>
      )}

      {/* Empty Tab State */}
      {!isGenerating && plans.length > 0 && currentTabPlans.length === 0 && (
        <div className="bg-slate-900/20 border border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto my-6 space-y-2">
          <Clock className="text-slate-650 mx-auto animate-pulse" size={36} />
          <h4 className="text-slate-300 font-bold text-sm">
            {activeTab === "unprocessed" ? "No Unprocessed Drafts" : "No Processed Schedules"}
          </h4>
          <p className="text-slate-500 text-xs">
            {activeTab === "unprocessed" 
              ? "All generated recommendations have been approved or rejected." 
              : "Approve or Reject draft recommendations to see them tracked here."}
          </p>
        </div>
      )}

      {/* Plan list grouped by Block */}
      {!isGenerating && plans.length > 0 && currentTabPlans.length > 0 && (
        <div className="space-y-6">
          {Object.entries(plansByBlock).map(([blockId, item]) => {
            const jointBlock = isJointBlock(item.schedules);

            // Teams work in PARALLEL inside a block — utilization = busiest single team's hours / block duration
            // (summing all teams would give 300% for 3 fully-utilised teams, which is wrong)
            const teamHoursMap = {};
            item.schedules.forEach(s => {
              const tid = s.team_id;
              teamHoursMap[tid] = (teamHoursMap[tid] || 0) + s.task.duration_hours;
            });
            const maxTeamHours = Object.values(teamHoursMap).length > 0
              ? Math.max(...Object.values(teamHoursMap))
              : 0;
            const utilization = item.block.duration_hours > 0
              ? Math.round((maxTeamHours / item.block.duration_hours) * 100)
              : 0;
            const utilizationCapped = Math.min(utilization, 100);
            const isOverloaded = utilization > 100;
            const teamsUsed = new Set(item.schedules.map(s => s.team_id)).size;
            const deptsCombined = Array.from(new Set(item.schedules.map(s => s.task.department))).join(" + ");

            return (
              <div key={blockId} className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                
                {/* Block Header info */}
                <div className="bg-slate-950/40 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-100">{blockId}</span>
                      <span className="h-1.5 w-1.5 bg-slate-700 rounded-full"></span>
                      <span className="text-xs font-bold text-slate-300">{item.block.corridor}</span>
                      
                      {jointBlock && (
                        <span className="px-2 py-0.5 text-[9px] font-black tracking-wider rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                          JOINT MAINTENANCE BLOCK
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[11px] font-mono text-slate-500 mt-1">
                      🕔 {item.block.start_time} to {item.block.end_time} ({item.block.duration_hours} hrs block)
                    </p>
                  </div>

                  {/* Block metrics */}
                  <div className="flex gap-4 font-mono text-[11px] text-slate-400">
                    <div>
                      <span className="text-slate-600 block text-[9px] font-black uppercase">Block Util</span>
                      <span className={`font-semibold ${isOverloaded ? 'text-rose-400' : utilization > 80 ? 'text-amber-400' : 'text-slate-200'}`}>
                        {utilizationCapped}%
                        {isOverloaded && <span className="text-[9px] text-rose-500 ml-1 font-bold">⚠ OVER</span>}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600 block text-[9px] font-black uppercase">Teams Assigned</span>
                      <span className="font-semibold text-slate-200">{teamsUsed} teams</span>
                    </div>
                    {jointBlock && (
                      <div>
                        <span className="text-slate-600 block text-[9px] font-black uppercase">Coordination</span>
                        <span className="font-semibold text-emerald-400">{deptsCombined}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scheduled Tasks List inside the block */}
                <div className="divide-y divide-slate-850">
                  {item.schedules.map((plan) => (
                    <div 
                      key={plan.plan_id || plan.task_id} 
                      id={`plan-task-${plan.task_id}`}
                      className={`p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 hover:bg-slate-800/5 transition-colors ${
                        highlightTaskId === plan.task_id
                          ? "bg-amber-500/10 border-l-4 border-amber-500 ring-2 ring-amber-500/20"
                          : ""
                      }`}
                    >
                      
                      {/* Left: Task description */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold font-mono text-emerald-400">{plan.task_id}</span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-800 text-slate-300">
                            {plan.task.department}
                          </span>
                          <span className="text-xs font-bold text-slate-200">{plan.task.required_skill}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-100">{plan.task.task_description}</p>
                        <p className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                          <Clock size={12} className="inline" /> Allocated Time: {plan.start_time} - {plan.end_time} ({plan.task.duration_hours} hrs)
                        </p>
                      </div>

                      {/* Middle: Team Assigned */}
                      <div className="flex items-center gap-2.5 font-mono text-xs bg-slate-950/40 px-4 py-2 rounded-2xl border border-slate-800/40">
                        <Users size={14} className="text-slate-500" />
                        <div>
                          <span className="text-[10px] text-slate-600 block font-black uppercase">ASSIGNED TEAM</span>
                          <span className="font-semibold text-slate-300">{plan.team.team_name}</span>
                        </div>
                      </div>

                      {/* Right: Actions and Status */}
                      <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                        {/* Explain Button */}
                        <button
                          onClick={() => setSelectedPlan({ plan, explanation: getExplanation(plan.task_id, plan.block_id) })}
                          className="flex items-center gap-1.5 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all"
                        >
                          <HelpCircle size={14} /> Why this plan?
                        </button>

                        {plan.status === "DRAFT" ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => onRejectPlan(plan.plan_id)}
                              className="text-rose-500 border border-rose-500/20 hover:bg-rose-500/10 px-3 py-2 rounded-xl transition-all cursor-pointer"
                              title="Reject Plan"
                            >
                              <XCircle size={16} />
                            </button>
                            <button
                              onClick={async () => {
                                setAssignModal(plan.task);
                                setSuggestion(null);
                                setIsSuggesting(true);
                                try {
                                  const result = await api.autoSuggestBlock(plan.task.task_id);
                                  setSuggestion(result);
                                } catch (err) {
                                  setSuggestion({ error: err.message || "No suitable block found." });
                                } finally {
                                  setIsSuggesting(false);
                                }
                              }}
                              className="flex items-center gap-1.5 border border-amber-500/30 hover:bg-amber-500/10 text-amber-400 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer"
                              title="Reschedule Task"
                            >
                              <Clock size={14} /> Reschedule
                            </button>
                            <button
                              onClick={() => onApprovePlan(plan.plan_id)}
                              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-slate-100 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shadow shadow-emerald-600/10 cursor-pointer"
                            >
                              <CheckCircle size={14} /> Approve
                            </button>
                          </div>
                        ) : plan.status === "APPROVED" ? (
                          <div className="flex gap-2 items-center">
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl flex items-center gap-1.5">
                              ✅ APPROVED
                            </span>
                            <button
                              onClick={() => onRejectPlan(plan.plan_id)}
                              className="text-rose-500 border border-rose-500/20 hover:bg-rose-500/10 px-3 py-2 rounded-xl transition-all cursor-pointer"
                              title="Reject Plan"
                            >
                              <XCircle size={16} />
                            </button>
                            <button
                              onClick={async () => {
                                setAssignModal(plan.task);
                                setSuggestion(null);
                                setIsSuggesting(true);
                                try {
                                  const result = await api.autoSuggestBlock(plan.task.task_id);
                                  setSuggestion(result);
                                } catch (err) {
                                  setSuggestion({ error: err.message || "No suitable block found." });
                                } finally {
                                  setIsSuggesting(false);
                                }
                              }}
                              className="flex items-center gap-1.5 border border-amber-500/30 hover:bg-amber-500/10 text-amber-400 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer"
                              title="Reschedule Task"
                            >
                              <Clock size={14} /> Reschedule
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 items-center">
                            <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 rounded-xl flex items-center gap-1.5">
                              ❌ REJECTED
                            </span>
                            <button
                              onClick={() => onApprovePlan(plan.plan_id)}
                              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-slate-100 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shadow shadow-emerald-600/10 cursor-pointer"
                              title="Approve Plan"
                            >
                              <CheckCircle size={14} /> Approve
                            </button>
                            <button
                              onClick={async () => {
                                setAssignModal(plan.task);
                                setSuggestion(null);
                                setIsSuggesting(true);
                                try {
                                  const result = await api.autoSuggestBlock(plan.task.task_id);
                                  setSuggestion(result);
                                } catch (err) {
                                  setSuggestion({ error: err.message || "No suitable block found." });
                                } finally {
                                  setIsSuggesting(false);
                                }
                              }}
                              className="flex items-center gap-1.5 border border-amber-500/30 hover:bg-amber-500/10 text-amber-400 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer"
                              title="Reschedule Task"
                            >
                              <Clock size={14} /> Reschedule
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  ))}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Rationale Explain Modal */}
      {selectedPlan && (
        <PlanDetailModal
          plan={selectedPlan.plan}
          explanation={selectedPlan.explanation}
          onClose={() => setSelectedPlan(null)}
        />
      )}

      {/* AI Smart Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{backgroundColor: 'rgba(2, 6, 23, 0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-5">

            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-slate-100 tracking-wide flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-400" /> AI Smart Assignment
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  AI has selected the best block based on priority score, train impact, and available capacity.
                </p>
              </div>
              <button
                onClick={() => { setAssignModal(null); setSuggestion(null); }}
                className="text-slate-500 hover:text-slate-200 transition-colors p-1 cursor-pointer"
              >✕</button>
            </div>

            {/* Task info */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold font-mono text-amber-400">{assignModal.task_id}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-800 text-slate-300">{assignModal.department}</span>
                <span className="text-xs font-semibold text-slate-200">{assignModal.required_skill}</span>
              </div>
              <p className="text-sm font-semibold text-slate-100">{assignModal.task_description}</p>
              <p className="text-[11px] font-mono text-slate-500">
                <Clock size={11} className="inline mr-1" />
                {assignModal.duration_hours} hrs · Asset: {assignModal.asset_id}
              </p>
            </div>

            {/* Loading state */}
            {isSuggesting && (
              <div className="flex items-center justify-center gap-3 py-8">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-slate-400 font-medium">Analysing blocks &amp; priority scores…</span>
              </div>
            )}

            {/* Error state */}
            {!isSuggesting && suggestion?.error && (
              <div className="space-y-4">
                <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 text-center">
                  <p className="text-sm font-semibold text-rose-400">⚠ {suggestion.error}</p>
                  {(!suggestion.preemptive_options || suggestion.preemptive_options.length === 0) && (
                    <p className="text-xs text-slate-500 mt-1">No available block has enough capacity for this task. Try generating a new plan first.</p>
                  )}
                </div>

                {/* Preemptive Options */}
                {suggestion.preemptive_options && suggestion.preemptive_options.length > 0 && (
                  <div className="space-y-3">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                      <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle size={14} /> Rescheduling &amp; Preemption Options
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        High priority task can fit in these blocks if we evict the following lower-priority tasks:
                      </p>
                    </div>

                    <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                      {suggestion.preemptive_options.map((opt, idx) => {
                        const evictPlanIds = opt.evict_plans.map(p => p.plan_id);
                        return (
                          <div key={idx} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-xs font-bold font-mono text-slate-300">{opt.suggested_block_id}</span>
                                <span className="text-[10px] text-slate-500 ml-2 font-mono">({opt.corridor})</span>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  {opt.block_start.split(" ")[1]} - {opt.block_end.split(" ")[1]} · Impact: {opt.train_impact_level}
                                </div>
                                <div className="text-[10px] text-slate-500 font-semibold mt-1">
                                  Crew: {opt.team_name}
                                </div>
                              </div>
                              
                              <button
                                disabled={isAssigning}
                                onClick={() => handleManualAssign(opt.suggested_block_id, opt.team_id, evictPlanIds)}
                                className="bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:opacity-40 text-slate-100 rounded-xl px-3 py-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer shadow shadow-amber-600/10 font-sans"
                              >
                                Evict &amp; Schedule
                              </button>
                            </div>
                            
                            <div className="pl-3 border-l-2 border-rose-500/30 space-y-2">
                              <p className="text-[9px] font-black uppercase text-rose-450 tracking-wider">Conflicting Tasks to Evict:</p>
                              {opt.evict_plans.map((p) => (
                                <div key={p.plan_id} className="text-xs font-mono">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-300 font-bold">{p.task_id}</span>
                                    <span className="text-[10px] text-rose-400">({p.priority} Priority)</span>
                                    <span className="text-slate-600">·</span>
                                    <span className="text-slate-500">{p.duration_hours}h</span>
                                  </div>
                                  <p className="text-[11px] font-sans text-slate-400 truncate max-w-[320px]">{p.task_description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Suggestion card */}
            {!isSuggesting && suggestion && !suggestion.error && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Recommended Assignment</p>
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Block</p>
                      <p className="text-sm font-bold text-slate-100 font-mono">{suggestion.suggested_block_id}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Corridor</p>
                      <p className="text-sm font-bold text-slate-100">{suggestion.corridor}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Scheduled Window</p>
                      <p className="text-sm font-bold text-slate-100 font-mono">{suggestion.suggested_start} – {suggestion.suggested_end}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Block Free Capacity</p>
                      <p className="text-sm font-bold text-emerald-400">{suggestion.remaining_hours}h remaining</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Assigned Team</p>
                      <p className="text-sm font-bold text-slate-100">{suggestion.team_name}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Train Impact</p>
                      <p className={`text-sm font-bold ${suggestion.train_impact_level === "LOW" ? "text-emerald-400" : suggestion.train_impact_level === "MEDIUM" ? "text-amber-400" : "text-rose-400"}`}>
                        {suggestion.train_impact_level} ({suggestion.train_impact_score})
                      </p>
                    </div>
                  </div>
                  {suggestion.affected_trains?.length > 0 && (
                    <p className="text-[10px] text-slate-500 font-mono">
                      Affected trains: {suggestion.affected_trains.join(", ")}
                    </p>
                  )}
                </div>

                {/* Deny / Reschedule / Approve buttons — always shown once suggestion is loaded */}
                {!isSuggesting && suggestion && (
                  <div className="flex gap-2 pt-1">
                    {/* Approve — only active when a valid block suggestion exists */}
                    <button
                      disabled={isAssigning || !suggestion?.suggested_block_id}
                      onClick={() => handleManualAssign(suggestion.suggested_block_id, suggestion.team_id)}
                      className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-100 rounded-2xl py-3 text-xs font-bold tracking-wide transition-all cursor-pointer shadow shadow-emerald-600/15"
                    >
                      {isAssigning
                        ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Approving…</>
                        : <><CheckCircle size={14} /> Approve</>
                      }
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}



