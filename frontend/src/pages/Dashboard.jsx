import React from "react";
import KPICards from "../components/KPICards";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";

export default function Dashboard({ stats, theme }) {
  if (!stats) return <div className="text-slate-400 p-8">Loading stats...</div>;

  const isDark = theme !== "light";
  const gridColor = isDark ? "#334155" : "#e2e8f0";
  const axisColor = isDark ? "#94a3b8" : "#475569";
  const tooltipBg = isDark ? "#1e293b" : "#ffffff";
  const tooltipBorder = isDark ? "#334155" : "#e2e8f0";
  const tooltipText = isDark ? "#f8fafc" : "#0f172a";

  // 1. Health Distribution
  const healthData = [
    { name: "Active", value: stats.asset_health_distribution.Active || 0, color: "#10b981" },
    { name: "Degraded", value: stats.asset_health_distribution.Degraded || 0, color: "#f59e0b" },
    { name: "Under Maintenance", value: stats.asset_health_distribution.Under_Maintenance || stats.asset_health_distribution["Under Maintenance"] || 0, color: "#f43f5e" },
  ].filter((d) => d.value > 0);

  // 2. Tasks by Dept
  const deptData = stats.tasks_by_department;

  // 3. Block Util
  const blockUtilData = stats.block_utilization.slice(0, 10); // Show top 10

  // 4. Team Util
  const teamUtilData = stats.team_utilization;

  // 5. Weekly Schedule
  const weeklyData = stats.weekly_schedule;

  return (
    <div className="space-y-6">
      {/* Live System Indicator */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping"></span>
          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">SYSTEM LIVE</span>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards stats={stats} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Chart 1: Asset Health Distribution */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between h-[360px]">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Asset Health Distribution</h3>
          <div className="flex-1 flex items-center justify-center">
            {healthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {healthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "12px", fontFamily: "monospace" }}
                    itemStyle={{ color: tooltipText }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-xs text-slate-400 font-semibold">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-500 text-sm">No asset health data available</div>
            )}
          </div>
        </div>

        {/* Chart 2: Pending Tasks by Department */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between h-[360px]">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Pending Tasks by Department</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="department" stroke={axisColor} tick={{ fontSize: 11, fontFamily: "monospace" }} />
                <YAxis stroke={axisColor} tick={{ fontSize: 11, fontFamily: "monospace" }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "12px", fontFamily: "monospace" }}
                  itemStyle={{ color: tooltipText }}
                />
                <Legend formatter={(value) => <span className="text-xs text-slate-400 font-semibold">{value}</span>} />
                <Bar dataKey="task_count" name="Total Pending" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="critical_count" name="Critical Tasks" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Block Utilization */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between h-[360px]">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Corridor Block Utilization (Top 10 Blocks)</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={blockUtilData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="block_id" stroke={axisColor} tick={{ fontSize: 10, fontFamily: "monospace" }} />
                <YAxis stroke={axisColor} unit="%" tick={{ fontSize: 11, fontFamily: "monospace" }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "12px", fontFamily: "monospace" }}
                  itemStyle={{ color: tooltipText }}
                  formatter={(value) => [`${value}%`, "Utilization"]}
                />
                <Bar dataKey="utilization" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Team Utilization */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between h-[360px]">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Team Utilization rate</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamUtilData} layout="vertical" margin={{ top: 10, right: 20, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis type="number" unit="%" stroke={axisColor} tick={{ fontSize: 11, fontFamily: "monospace" }} />
                <YAxis dataKey="team_name" type="category" stroke={axisColor} tick={{ fontSize: 10, fontFamily: "monospace" }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "12px", fontFamily: "monospace" }}
                  itemStyle={{ color: tooltipText }}
                  formatter={(value) => [`${value}%`, "Utilization"]}
                />
                <Bar dataKey="utilization" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Weekly Maintenance Schedule */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between h-[360px] xl:col-span-2">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Weekly Schedule Workload Trend</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorBlocks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" stroke={axisColor} tick={{ fontSize: 11, fontFamily: "monospace" }} />
                <YAxis stroke={axisColor} tick={{ fontSize: 11, fontFamily: "monospace" }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "12px", fontFamily: "monospace" }}
                  itemStyle={{ color: tooltipText }}
                />
                <Legend formatter={(value) => <span className="text-xs text-slate-400 font-semibold">{value}</span>} />
                <Area type="monotone" dataKey="tasks_count" name="Scheduled Tasks" stroke="#10b981" fillOpacity={1} fill="url(#colorTasks)" />
                <Area type="monotone" dataKey="block_count" name="Corridor Blocks" stroke="#f59e0b" fillOpacity={1} fill="url(#colorBlocks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
