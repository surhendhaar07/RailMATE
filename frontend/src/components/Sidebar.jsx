import { LayoutDashboard, CheckSquare, Layers, Calendar, CalendarRange, Users, HelpCircle, RotateCcw, Sun, Moon, LogOut, Settings } from "lucide-react";

export default function Sidebar({ activePage, setActivePage, onResetData, isResetting, theme, toggleTheme, onLogout }) {
  const menuItems = [
    { id: "dashboard", name: "Control Dashboard", icon: LayoutDashboard },
    { id: "tasks", name: "Maintenance Tasks", icon: CheckSquare },
    { id: "blocks", name: "Corridor Blocks", icon: Layers },
    { id: "schedule", name: "Train Schedule", icon: Calendar },
    { id: "planner", name: "AI Block Planner", icon: CalendarRange },
    { id: "teams", name: "Maintenance Teams", icon: Users },
    { id: "settings", name: "Admin Settings", icon: Settings },
  ];


  return (
    <div className="w-64 bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800 shadow-xl h-screen sticky top-0">
      <div>
        {/* Title / Logo Header */}
        <div className="p-6 border-b border-slate-800 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <h1 className="text-xl font-bold tracking-wider text-slate-100">RailMATE</h1>
          </div>
          <span className="text-[10px] text-slate-400 font-mono tracking-tight">Railway Maintenance Allocation & Task Optimization Engine</span>
        </div>

        {/* Navigation List */}
        <nav className="mt-6 px-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
                  ? "bg-emerald-500/10 text-emerald-400 border-l-4 border-emerald-500"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100 border-l-4 border-transparent"
                  }`}
              >
                <Icon
                  size={18}
                  className={`transition-colors duration-200 ${isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                />
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Safety Disclaimer and Reset Demo Button */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-center gap-2 bg-slate-800/40 hover:bg-slate-800/80 active:bg-slate-900/60 text-slate-300 border border-slate-700/30 hover:border-slate-600 rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wide transition-all cursor-pointer"
        >
          {theme === "light" ? (
            <>
              <Moon size={14} className="text-indigo-400" />
              <span>Dark Theme</span>
            </>
          ) : (
            <>
              <Sun size={14} className="text-amber-400" />
              <span>Light Theme</span>
            </>
          )}
        </button>

        {/* Reset Demo Button */}
        <button
          onClick={onResetData}
          disabled={isResetting}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-amber-500 border border-slate-700/50 hover:border-amber-500/30 rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wide transition-all disabled:opacity-50"
        >
          <RotateCcw size={14} className={isResetting ? "animate-spin" : ""} />
          {isResetting ? "Resetting Data..." : "Reset Demo Data"}
        </button>

        {/* Logout Session Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wide transition-all cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        )}

        {/* Safety Disclaimer */}
        <div className="bg-slate-950/80 border border-amber-900/30 rounded-lg p-3">
          <p className="text-[10px] text-amber-500/80 leading-relaxed text-center italic">
            ⚠️ <strong>Safety Disclaimer:</strong> AI-generated schedules are recommendations only and require authorized railway personnel approval.
          </p>
        </div>
      </div>
    </div>
  );
}
