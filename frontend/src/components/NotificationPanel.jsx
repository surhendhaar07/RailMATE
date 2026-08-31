import React, { useState } from "react";
import { Bell, Check, Trash, CheckSquare, Clock, AlertCircle, X } from "lucide-react";
import { api } from "../services/api";

export default function NotificationPanel({ notifications, onRefresh, onNavigatePage, onHighlightTask }) {
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    try {
      await api.readAllNotifications();
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationAsRead(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative font-sans z-40">
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all select-none cursor-pointer"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 bg-rose-500 text-slate-100 font-bold text-[9px] flex items-center justify-center rounded-full border border-slate-950 animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Notifications</h4>
            <div className="flex gap-2.5">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-bold text-emerald-400 hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={async () => {
                    try {
                      await api.clearAllNotifications();
                      onRefresh();
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="text-[10px] font-bold text-rose-450 hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 pr-1 text-xs">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (n.task_id && onNavigatePage && onHighlightTask) {
                      onNavigatePage("planner");
                      onHighlightTask(n.task_id);
                      setIsOpen(false);
                    }
                    if (!n.is_read && n.action_type !== "extension") {
                      handleMarkRead(n.id);
                    }
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all relative group cursor-pointer ${
                    n.is_read
                      ? "bg-slate-950/30 border-slate-800/40 text-slate-500"
                      : "bg-slate-950/80 border-slate-850 text-slate-300 hover:border-emerald-500/20"
                  }`}
                >
                  {/* Delete individual notification button */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await api.deleteNotification(n.id);
                        onRefresh();
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="absolute top-2.5 right-2.5 p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-slate-805 cursor-pointer"
                    title="Dismiss notification"
                  >
                    <X size={11} />
                  </button>

                  <p className="leading-relaxed pr-6 font-medium">{n.message}</p>
                  <span className="text-[9px] font-mono text-slate-600 block mt-1.5">{n.timestamp}</span>


                  {!n.is_read && n.action_type === "extension" && (
                    <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={async () => {
                          try {
                            await api.approveNotificationAction(n.id);
                            onRefresh();
                          } catch (err) {
                            alert("Failed to approve action: " + err.message);
                          }
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-bold rounded-lg text-[10px] transition-all cursor-pointer shadow-sm shadow-emerald-600/10"
                      >
                        Approve
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await api.rejectNotificationAction(n.id);
                            onRefresh();
                          } catch (err) {
                            alert("Failed to reject action: " + err.message);
                          }
                        }}
                        className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold border border-rose-500/25 rounded-lg text-[10px] transition-all cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {!n.is_read && n.action_type !== "extension" && (
                    <span className="absolute top-3 right-3 h-1.5 w-1.5 bg-emerald-500 rounded-full group-hover:scale-125 transition-transform" />
                  )}
                </div>

              ))
            ) : (
              <div className="py-6 text-center text-slate-600 italic">No notifications yet</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
