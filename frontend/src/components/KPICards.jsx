import React from "react";
import { ShieldCheck, AlertTriangle, Blocks, Percent, Users, TrendingUp } from "lucide-react";

export default function KPICards({ stats }) {
  const cards = [
    {
      title: "Asset Availability",
      value: `${stats.asset_availability}%`,
      sub: `Projected: ${stats.projected_asset_availability}%`,
      icon: ShieldCheck,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Critical Tasks",
      value: stats.critical_tasks_count,
      sub: "Overdue >= 80 Priority",
      icon: AlertTriangle,
      color: stats.critical_tasks_count > 0 ? "text-rose-500 animate-pulse" : "text-amber-500",
      bg: stats.critical_tasks_count > 0 ? "bg-rose-500/10 border-rose-500/20" : "bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Available Blocks",
      value: stats.available_blocks_count,
      sub: "Active corridors",
      icon: Blocks,
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Block Utilization",
      value: `${stats.avg_block_utilization}%`,
      sub: "Scheduled hours",
      icon: Percent,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Team Utilization",
      value: `${stats.avg_team_utilization}%`,
      sub: "Engineering, S&T, Traction",
      icon: Users,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Train Impact",
      value: stats.avg_train_impact,
      sub: stats.avg_train_impact > 60 ? "HIGH Traffic Conflict" : stats.avg_train_impact > 30 ? "MEDIUM Impact" : "LOW Traffic Impact",
      icon: TrendingUp,
      color: stats.avg_train_impact > 60 ? "text-rose-500" : stats.avg_train_impact > 30 ? "text-amber-500" : "text-emerald-500",
      bg: stats.avg_train_impact > 60 ? "bg-rose-500/10 border-rose-500/20" : stats.avg_train_impact > 30 ? "bg-amber-500/10 border-amber-500/20" : "bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className={`border rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${card.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{card.title}</span>
              <Icon className={card.color} size={20} />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-100 tracking-tight">{card.value}</div>
              <p className="text-[11px] font-medium text-slate-400 mt-1">{card.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
