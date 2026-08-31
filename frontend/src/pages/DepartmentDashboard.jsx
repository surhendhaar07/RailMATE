import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, XCircle, Clock, AlertTriangle, AlertCircle, Info, Plus, 
  FileText, ShieldCheck, Hammer, Activity, Wrench, ArrowRight, Edit2, Trash2, RefreshCw 
} from "lucide-react";
import { api } from "../services/api";

export default function DepartmentDashboard({ user, onLogout }) {
  const department = user.department;
  const [tasks, setTasks] = useState([]);
  const [assets, setAssets] = useState([]);
  const [submittedRequests, setSubmittedRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("workload"); // workload or requests

  // Form toggles
  const [showDefectModal, setShowDefectModal] = useState(false);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states
  const [selectedAsset, setSelectedAsset] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState(5);
  const [requiredSkill, setRequiredSkill] = useState("");
  const [duration, setDuration] = useState(1.0);

  // Edit Form States
  const [editTask, setEditTask] = useState(null);
  const [editAsset, setEditAsset] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRequiredSkill, setEditRequiredSkill] = useState("");
  const [editDuration, setEditDuration] = useState(1.0);
  const [editSeverity, setEditSeverity] = useState(5);
  const [editFormError, setEditFormError] = useState("");
  const [isEditingRequest, setIsEditingRequest] = useState(false);

  const getDeptSkills = (dept) => {
    if (dept === "Engineering") return ["Track Welding", "Track Alignment", "Structural Inspection"];
    if (dept === "S&T") return ["Interlocking System", "Cabling & Telecom", "Point Machine Repair"];
    return ["OHE Wire Tensioning", "Insulator Replacement", "Substation Maintenance"];
  };

  const loadDeptData = async () => {
    setIsLoading(true);
    try {
      const [deptTasks, allAssets, requests] = await Promise.all([
        api.getDepartmentTasks(department),
        api.getAssets(),
        api.getSubmittedRequests(department)
      ]);
      setTasks(deptTasks);
      setSubmittedRequests(requests);
      
      // Filter assets by department
      const deptAssets = allAssets.filter(a => a.department === department);
      setAssets(deptAssets);
      if (deptAssets.length > 0) {
        setSelectedAsset(deptAssets[0].asset_id);
      }
      
      const skills = getDeptSkills(department);
      if (skills.length > 0) {
        setRequiredSkill(skills[0]);
      }
    } catch (err) {
      console.error("Failed to load department data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDeptData();
  }, [department]);

  // Handle task status update
  const handleUpdateStatus = async (taskId, newStatus, durationHours = null) => {
    try {
      const updated = await api.updateDepartmentTaskStatus(taskId, newStatus, durationHours);
      setTasks(prev => prev.map(t => t.task_id === taskId ? updated : t));
    } catch (err) {
      console.error(err);
      alert("Failed to update status: " + err.message);
    }
  };

  // Handle Defect report submission
  const handleSubmitDefect = async (e) => {
    e.preventDefault();
    if (!description) return;
    try {
      await api.reportDefect(selectedAsset, description, parseInt(severity));
      alert("Defect reported successfully! A new maintenance task has been created automatically.");
      setShowDefectModal(false);
      setDescription("");
      loadDeptData(); // reload tasks & requests
    } catch (err) {
      console.error(err);
      alert("Failed to report defect: " + err.message);
    }
  };

  // Handle Maintenance request submission
  const handleSubmitMaint = async (e) => {
    e.preventDefault();
    if (!description) return;
    try {
      await api.requestMaintenance(selectedAsset, description, requiredSkill, parseFloat(duration));
      alert("Maintenance request submitted successfully!");
      setShowMaintModal(false);
      setDescription("");
      loadDeptData(); // reload tasks & requests
    } catch (err) {
      console.error(err);
      alert("Failed to submit request: " + err.message);
    }
  };

  // Handle Edit Request Modal opening
  const handleOpenEditModal = (task) => {
    setEditTask(task);
    setEditAsset(task.asset_id);
    setEditRequiredSkill(task.required_skill);
    setEditDuration(task.duration_hours);
    
    // Extract description & severity if it was a defect report
    let desc = task.task_description;
    let sev = 5;
    if (task.task_description.startsWith("Fix defect DEF-")) {
      const parts = task.task_description.split(":");
      if (parts.length > 1) {
        desc = parts.slice(1).join(":").trim();
      }
      sev = Math.round(task.priority / 8.0) || 5;
    }
    setEditDescription(desc);
    setEditSeverity(sev);
    setEditFormError("");
    setShowEditModal(true);
  };

  // Handle Edit Request submission
  const handleSaveEditRequest = async (e) => {
    e.preventDefault();
    if (!editDescription) return;
    setIsEditingRequest(true);
    setEditFormError("");
    
    const isDefect = editTask.task_description.startsWith("Fix defect DEF-");
    const payload = {
      asset_id: editAsset,
      description: editDescription,
      required_skill: editRequiredSkill,
      duration_hours: parseFloat(editDuration),
      severity: isDefect ? parseInt(editSeverity) : undefined
    };
    
    try {
      await api.updateSubmittedRequest(editTask.task_id, payload);
      alert("Request updated successfully!");
      setShowEditModal(false);
      loadDeptData();
    } catch (err) {
      console.error(err);
      setEditFormError(err.message || "Failed to update request.");
    } finally {
      setIsEditingRequest(false);
    }
  };

  // Handle request deletion
  const handleDeleteRequest = async (taskId) => {
    if (!window.confirm("Are you sure you want to permanently delete this request? This will remove the task and any associated defect details.")) return;
    try {
      await api.deleteSubmittedRequest(taskId);
      alert("Request deleted successfully!");
      loadDeptData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete request: " + err.message);
    }
  };

  // KPI Calculations
  const pendingTasks = tasks.filter(t => t.status === "Pending");
  const scheduledTasks = tasks.filter(t => t.status === "Scheduled");
  const completedTasks = tasks.filter(t => t.status === "Completed" || t.status === "APPROVED");
  const totalCount = tasks.length;

  if (isLoading && tasks.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center font-sans">
        <div className="h-10 w-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-mono">Syncing Department database...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-slate-100 font-sans p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Hammer className="text-slate-950 h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-100 uppercase tracking-wide">{department} Portal</h2>
              <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/25 rounded-md">LIVE</span>
            </div>
            <p className="text-slate-400 text-xs mt-1">Operational view for {department} department task status tracking, defect reporting, and resource management.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onLogout}
            className="px-5 py-2.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 active:scale-95 text-rose-400 rounded-2xl font-bold text-xs tracking-wide transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-black uppercase font-mono block">Total Tasks</span>
            <span className="text-2xl font-black text-slate-200">{totalCount}</span>
          </div>
          <Activity className="text-slate-500" size={24} />
        </div>
        <div className="bg-amber-950/20 border border-amber-500/10 rounded-3xl p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-amber-500/70 font-black uppercase font-mono block">Pending Work</span>
            <span className="text-2xl font-black text-amber-400">{pendingTasks.length}</span>
          </div>
          <Clock className="text-amber-500" size={24} />
        </div>
        <div className="bg-blue-950/20 border border-blue-500/10 rounded-3xl p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-blue-500/70 font-black uppercase font-mono block">Scheduled</span>
            <span className="text-2xl font-black text-blue-400">{scheduledTasks.length}</span>
          </div>
          <Info className="text-blue-500" size={24} />
        </div>
        <div className="bg-emerald-950/20 border border-emerald-500/10 rounded-3xl p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-emerald-500/70 font-black uppercase font-mono block">Completed</span>
            <span className="text-2xl font-black text-emerald-400">{completedTasks.length}</span>
          </div>
          <CheckCircle2 className="text-emerald-500" size={24} />
        </div>
      </div>

      {/* Actions / Trigger Panel */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-200">Submit defect warnings or request line maintenance updates</h4>
          <p className="text-slate-400 text-xs">Reported defects instantly trigger scheduling priority modifications in dispatcher optimization runs.</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => setShowDefectModal(true)}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-slate-100 rounded-2xl px-5 py-3 font-bold text-xs tracking-wide shadow-lg shadow-rose-600/10 transition-all cursor-pointer"
          >
            <AlertCircle size={14} /> Report Asset Defect
          </button>
          <button
            onClick={() => setShowMaintModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-slate-100 rounded-2xl px-5 py-3 font-bold text-xs tracking-wide shadow-lg shadow-emerald-600/10 transition-all cursor-pointer"
          >
            <Plus size={14} /> Request Preventive Maintenance
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-slate-900/60 p-1 border border-slate-800 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("workload")}
          className={`px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
            activeTab === "workload"
              ? "bg-slate-850 text-slate-100 shadow border border-slate-700/50"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Assigned Workload
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
            activeTab === "requests"
              ? "bg-slate-850 text-slate-100 shadow border border-slate-700/50"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Submitted Requests
        </button>
      </div>

      {/* Main Tab Contents */}
      {activeTab === "workload" ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-850 flex justify-between items-center bg-slate-900/30">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">Assigned Tasks ({department})</h3>
            <button 
              onClick={loadDeptData}
              className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200"
              title="Refresh Tasks"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] font-black uppercase tracking-wider bg-slate-950/20">
                  <th className="py-4 px-6">Task ID</th>
                  <th className="py-4 px-6">Description</th>
                  <th className="py-4 px-6">Skill Requirement</th>
                  <th className="py-4 px-6 text-center">Duration</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300 text-xs">
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <tr key={task.task_id} className="hover:bg-slate-800/10 transition-colors">
                      <td className="py-4 px-6 font-bold font-mono text-emerald-400">{task.task_id}</td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-100">{task.task_description}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">Asset: {task.asset_id}</div>
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-200">{task.required_skill}</td>
                      <td className="py-4 px-6 text-center font-mono font-bold text-slate-100">{task.duration_hours} hrs</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                          task.status === "Completed" || task.status === "APPROVED"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : task.status === "Scheduled"
                            ? "bg-blue-500/15 text-blue-400"
                            : task.status === "Delayed"
                            ? "bg-rose-500/15 text-rose-400"
                            : "bg-amber-500/15 text-amber-400"
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          {task.status !== "Completed" && task.status !== "APPROVED" && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(task.task_id, "Completed")}
                                className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-bold transition-all border border-emerald-500/20 cursor-pointer"
                              >
                                Completed
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(task.task_id, "Delayed")}
                                className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-[10px] font-bold transition-all border border-rose-500/20 cursor-pointer"
                              >
                                Delayed
                              </button>
                              <button
                                onClick={() => {
                                  const hours = prompt("Request extension. Enter new duration in hours:", task.duration_hours + 1);
                                  if (hours) {
                                    handleUpdateStatus(task.task_id, task.status, parseFloat(hours));
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-bold transition-all border border-slate-750 cursor-pointer"
                              >
                                + Time
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-500 font-medium">
                      No active tasks assigned to this department.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-sm animate-in fade-in duration-200">
          <div className="p-6 border-b border-slate-850 flex justify-between items-center bg-slate-900/30">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">My Submitted Requests</h3>
            <button 
              onClick={loadDeptData}
              className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200"
              title="Refresh Requests"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] font-black uppercase tracking-wider bg-slate-950/20">
                  <th className="py-4 px-6">Request ID</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6">Description</th>
                  <th className="py-4 px-6">Skill Requirement</th>
                  <th className="py-4 px-6 text-center">Duration</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300 text-xs">
                {submittedRequests.length > 0 ? (
                  submittedRequests.map((request) => {
                    const isDefect = request.task_description.startsWith("Fix defect DEF-");
                    return (
                      <tr key={request.task_id} className="hover:bg-slate-800/10 transition-colors">
                        <td className="py-4 px-6 font-bold font-mono text-emerald-400">{request.task_id}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase border ${
                            isDefect 
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                              : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                          }`}>
                            {isDefect ? "Defect Report" : "Preventive"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-100">
                            {isDefect ? request.task_description.substring(request.task_description.indexOf(":") + 1).trim() : request.task_description}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">Asset: {request.asset_id}</div>
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-200">{request.required_skill}</td>
                        <td className="py-4 px-6 text-center font-mono font-bold text-slate-100">{request.duration_hours} hrs</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                            request.status === "Completed" || request.status === "APPROVED"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : request.status === "Scheduled"
                              ? "bg-blue-500/15 text-blue-400"
                              : request.status === "Delayed"
                              ? "bg-rose-500/15 text-rose-400"
                              : "bg-amber-500/15 text-amber-400"
                          }`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-2">
                            {request.status === "Pending" ? (
                              <>
                                <button
                                  onClick={() => handleOpenEditModal(request)}
                                  className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-350 hover:text-slate-100 rounded-xl transition-all cursor-pointer border border-slate-800"
                                  title="Edit Request"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteRequest(request.task_id)}
                                  className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 hover:text-rose-300 rounded-xl transition-all cursor-pointer border border-rose-500/10"
                                  title="Delete Request"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic font-mono px-2 py-1">Locked (Scheduled)</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-500 font-medium">
                      No custom requests submitted previously.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT DEFECT MODAL */}
      {showDefectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleSubmitDefect} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <AlertCircle size={18} className="text-rose-500" />
              Report Defect
            </h3>
            <p className="text-slate-400 text-xs font-medium">File a defect report for assets in your department. This automatically registers a pending defect and a corresponding maintenance task in the scheduling system.</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1 font-semibold uppercase">Select Asset</label>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-rose-500 cursor-pointer font-bold"
                >
                  {assets.map(a => (
                    <option key={a.asset_id} value={a.asset_id}>
                      {a.asset_id} - {a.asset_name} ({a.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold uppercase">Severity (1 to 10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-rose-500 font-bold"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold uppercase">Defect Description</label>
                <textarea
                  required
                  placeholder="Describe the defect in detail (e.g. Joint crack detected on line 3)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-24 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-rose-500 resize-none font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setShowDefectModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-slate-100 rounded-xl font-bold transition-all cursor-pointer shadow-lg shadow-rose-600/10"
              >
                Report Defect
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REQUEST MAINTENANCE MODAL */}
      {showMaintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleSubmitMaint} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Wrench size={18} className="text-emerald-500" />
              Request Preventive Maintenance
            </h3>
            <p className="text-slate-400 text-xs font-medium">Create a custom preventive checking task. The AI block planner allocates optimal shifts with minimum downtime based on constraints.</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1 font-semibold uppercase">Select Asset</label>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer font-bold"
                >
                  {assets.map(a => (
                    <option key={a.asset_id} value={a.asset_id}>
                      {a.asset_id} - {a.asset_name} ({a.location})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold uppercase">Required Skill</label>
                  <select
                    value={requiredSkill}
                    onChange={(e) => setRequiredSkill(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer font-bold"
                  >
                    {getDeptSkills(department).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 block mb-1 font-semibold uppercase">Est. Duration (hrs)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold uppercase">Maintenance Description</label>
                <textarea
                  required
                  placeholder="Describe the checking task requirements"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-24 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 resize-none font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setShowMaintModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-100 rounded-xl font-bold transition-all cursor-pointer shadow-lg shadow-emerald-600/10"
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT SUBMITTED REQUEST MODAL */}
      {showEditModal && editTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleSaveEditRequest} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 relative animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-3xl" />
            
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Edit2 size={18} className="text-emerald-500" />
              Edit Request ({editTask.task_id})
            </h3>
            <p className="text-slate-400 text-xs font-medium">Modify details of your pending request. Once scheduled by a dispatcher, these options will lock.</p>

            {editFormError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-2xl flex items-center gap-2 text-xs">
                <AlertCircle size={16} className="shrink-0" />
                <span>{editFormError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1 font-semibold uppercase">Asset ID</label>
                <select
                  value={editAsset}
                  onChange={(e) => setEditAsset(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer font-bold"
                >
                  {assets.map(a => (
                    <option key={a.asset_id} value={a.asset_id}>
                      {a.asset_id} - {a.asset_name} ({a.location})
                    </option>
                  ))}
                </select>
              </div>

              {editTask.task_description.startsWith("Fix defect DEF-") && (
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold uppercase">Severity (1 to 10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editSeverity}
                    onChange={(e) => setEditSeverity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold uppercase">Required Skill</label>
                  <select
                    value={editRequiredSkill}
                    onChange={(e) => setEditRequiredSkill(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer font-bold"
                  >
                    {getDeptSkills(department).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 block mb-1 font-semibold uppercase">Est. Duration (hrs)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold uppercase">Description</label>
                <textarea
                  required
                  placeholder="Describe the checking task requirements"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full h-24 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 resize-none font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isEditingRequest}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-100 rounded-xl font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-600/10"
              >
                {isEditingRequest ? (
                  <>
                    <div className="h-3 w-3 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
