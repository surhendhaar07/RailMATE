import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Blocks from "./pages/Blocks";
import Teams from "./pages/Teams";
import Planner from "./pages/Planner";
import Login from "./pages/Login";
import DepartmentDashboard from "./pages/DepartmentDashboard";
import Schedule from "./pages/Schedule";
import NotificationPanel from "./components/NotificationPanel";
import Settings from "./pages/Settings";
import { api } from "./services/api";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("isLoggedIn") === "true";
  });

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = () => {
    setIsLoggedIn(true);
    const saved = localStorage.getItem("user");
    setUser(saved ? JSON.parse(saved) : null);
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUser(null);
  };

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("theme", next);
      return next;
    });
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
  }, [theme]);

  const [activePage, setActivePage] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [trains, setTrains] = useState([]);
  const [plans, setPlans] = useState([]);
  const [explanations, setExplanations] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [highlightTaskId, setHighlightTaskId] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async (showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    try {
      const [statsData, tasksData, blocksData, teamsData, trainsData, plansData, routesData] = await Promise.all([
        api.getDashboardStats(),
        api.getPrioritizedTasks(),
        api.getBlocks(),
        api.getTeams(),
        api.getTrains(),
        api.getPlans(),
        api.getRoutes(),
      ]);

      setStats(statsData);
      setTasks(tasksData);
      setBlocks(blocksData);
      setTeams(teamsData);
      setTrains(trainsData);
      setPlans(plansData);
      setRoutes(routesData);

      // Extract metrics from plans if they already exist
      if (plansData.length > 0) {
        // Build mock explanations if they aren't loaded yet
        // In a real load, we might recalculate or reload explanations
        const mockExps = plansData.map((p) => {
          const totalDuration = plansData.filter(x => x.block_id === p.block_id).reduce((sum, x) => sum + x.task.duration_hours, 0);
          const utilPct = Math.round((totalDuration / p.block.duration_hours) * 100);
          return {
            task_id: p.task_id,
            block_id: p.block_id,
            reasons: [
              { title: `Asset Criticality: ${p.task.priority > 60 ? 8 : 5}/10`, status: "check", detail: "High priority asset scheduling." },
              { title: "Failure Risk Prediction", status: "info", detail: `Assessment: ${p.task.priority}% failure risk probability.` },
              { title: "Low Train Impact", status: "check", detail: `Scheduled in block ${p.block_id} with low disruption potential.` },
              { title: `Block Utilization: ${utilPct}%`, status: "check", detail: `Optimal usage of block window.` },
            ],
          };
        });
        setExplanations(mockExps);
        
        // Populate standard metrics
        setMetrics({
          tasks_completed: plansData.length,
          block_utilization: statsData.avg_block_utilization,
          team_utilization: statsData.avg_team_utilization,
          train_impact: statsData.avg_train_impact,
          projected_asset_availability: statsData.projected_asset_availability,
          current_asset_availability: statsData.asset_availability,
        });
      } else {
        setPlans([]);
        setExplanations([]);
        setMetrics(null);
      }
      setError(null);
    } catch (err) {
      console.error("Failed to load initial master data:", err);
      setError("Unable to connect to the backend server. Please verify FastAPI is running on port 8000.");
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  useEffect(() => {
    if (isLoggedIn && user && user.role !== "Department") {
      loadNotifications();
      const interval = setInterval(loadNotifications, 8000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, user]);

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    try {
      const res = await api.generatePlan();
      setExplanations(res.explanations);
      setMetrics(res.metrics);
      
      // Reload all database syncs (including all approved, rejected, and draft plans)
      await loadData(false);
    } catch (err) {
      console.error("Planning generation failed:", err);
      alert("Planning generation failed: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprovePlan = async (id) => {
    try {
      await api.approvePlan(id);
      
      // Update plan state in local state
      setPlans((prev) =>
        prev.map((p) => (p.plan_id === id ? { ...p, status: "APPROVED" } : p))
      );
      
      // Silent reload all data to keep team/block lists in sync
      await loadData(false);
    } catch (err) {
      console.error("Approve failed:", err);
      alert("Failed to approve plan: " + err.message);
    }
  };

  const handleRejectPlan = async (id) => {
    try {
      await api.rejectPlan(id);
      
      // Update plan state in local state
      setPlans((prev) =>
        prev.map((p) => (p.plan_id === id ? { ...p, status: "REJECTED" } : p))
      );
      
      // Silent reload all data to keep team/block lists in sync
      await loadData(false);
    } catch (err) {
      console.error("Reject failed:", err);
      alert("Failed to reject plan: " + err.message);
    }
  };

  const handleUpdateBlock = async (blockId, corridor) => {
    try {
      const updatedBlock = await api.updateBlockRoute(blockId, corridor);
      setBlocks((prev) => prev.map((b) => (b.block_id === blockId ? updatedBlock : b)));
      
      // Silent reload all data to keep team/block lists in sync
      await loadData(false);
    } catch (err) {
      console.error("Failed to update block route:", err);
      alert("Failed to update block route: " + err.message);
    }
  };

  const handleResetData = async () => {
    if (!window.confirm("Are you sure you want to reset all demo datasets back to default values?")) return;
    setIsResetting(true);
    try {
      await api.resetDemoData();
      await loadData();
    } catch (err) {
      console.error("Reset failed:", err);
      alert("Reset failed: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleNavigatePage = (page) => {
    setActivePage(page);
    setHighlightTaskId(null);
  };


  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard stats={stats} theme={theme} />;
      case "tasks":
        return <Tasks tasks={tasks} highlightTaskId={highlightTaskId} />;
      case "blocks":
        return <Blocks blocks={blocks} onUpdateBlock={handleUpdateBlock} />;

      case "teams":
        return <Teams teams={teams} />;
      case "planner":
        return (
          <Planner
            plans={plans}
            explanations={explanations}
            metrics={metrics}
            onGenerate={handleGeneratePlan}
            onApprovePlan={handleApprovePlan}
            onRejectPlan={handleRejectPlan}
            isGenerating={isGenerating}
            highlightTaskId={highlightTaskId}
            tasks={tasks}
            onRefreshData={() => loadData(false)}
          />
        );
      case "schedule":
        return (
          <Schedule
            trains={trains}
            plans={plans}
            tasks={tasks}
            blocks={blocks}
            routes={routes}
          />
        );
      case "settings":
        return <Settings />;
      default:
        return <Dashboard stats={stats} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center font-sans">
        <div className="h-10 w-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-mono">Syncing Railway databases...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto gap-5 font-sans">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl">
          ⚠️ <strong>Connection Error:</strong> {error}
        </div>
        <button
          onClick={loadData}
          className="bg-slate-800 hover:bg-slate-700 text-slate-100 px-6 py-2.5 rounded-xl text-xs font-bold font-mono uppercase border border-slate-750 transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  if (user && user.role === "Department") {
    return <DepartmentDashboard user={user} onLogout={handleLogout} />;
  }

  const getPageHeaderInfo = () => {
    switch (activePage) {
      case "dashboard":
        return {
          title: "Control Room Dashboard",
          subtitle: "Real-time status of Indian Railways maintenance operations, asset health, and block schedules."
        };
      case "tasks":
        return {
          title: "Maintenance Tasks Registry",
          subtitle: "Registry of all reported track defects, signaling faults, and traction anomalies with AI-computed priorities."
        };
      case "blocks":
        return {
          title: "Railway Corridor Blocks",
          subtitle: "Available block windows across major trunk routes, illustrating overlapping train traffic conflicts and utilization efficiency."
        };
      case "teams":
        return {
          title: "Maintenance Teams Workload",
          subtitle: "Overview of maintenance teams across Engineering, S&T and Traction departments, detailing active shift utilization."
        };
      case "planner":
        return {
          title: "AI Maintenance Block Planner",
          subtitle: "Generate mathematical optimizations for railway maintenance tasks, blocks, and crew scheduling using Google OR-Tools."
        };
      case "schedule":
        return {
          title: "Train Schedules & Down Time Planner",
          subtitle: "Visualize train paths, identify lowest train traffic slots (Minimum Down Time), and dispatch maintenance teams efficiently."
        };
      case "settings":
        return {
          title: "System Settings",
          subtitle: "Manage user credentials and department access levels for the RailMATE platform."
        };
      default:
        return {
          title: "Control Room Dashboard",
          subtitle: "Real-time status of Indian Railways maintenance operations, asset health, and block schedules."
        };
    }
  };

  const headerInfo = getPageHeaderInfo();

  return (
    <div className="min-h-screen bg-slate-950/60 flex text-slate-100 selection:bg-emerald-500/30 selection:text-slate-100">
      <Sidebar
        activePage={activePage}
        setActivePage={handleNavigatePage}
        onResetData={handleResetData}
        isResetting={isResetting}
        theme={theme}
        toggleTheme={toggleTheme}
        onLogout={handleLogout}
      />
      <main className="flex-1 max-h-screen overflow-y-auto relative flex flex-col">
        {/* Stationary Top Page Header */}
        <div className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-8 lg:px-10 py-5 flex justify-between items-center select-none">
          <div>
            <h2 className="text-2xl font-black text-slate-100 uppercase tracking-wide">{headerInfo.title}</h2>
            <p className="text-slate-400 text-xs mt-1 font-medium">{headerInfo.subtitle}</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <NotificationPanel 
              notifications={notifications} 
              onRefresh={() => { loadNotifications(); loadData(false); }} 
              onNavigatePage={setActivePage}
              onHighlightTask={setHighlightTaskId}
            />
          </div>
        </div>

        {/* Page Content Container */}
        <div className="flex-1 px-8 pb-8 pt-4 lg:px-10 lg:pb-10 lg:pt-5 max-w-7xl w-full mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
