import { useState, useEffect } from "react";
import { CheckSquare, AlertTriangle, Play, Check, ArrowRight, Loader2, ListTodo, ShieldAlert, LayoutDashboard } from "lucide-react";
import { api } from "../api";
import { Task, Issue, DashboardCounts, User } from "../types";

interface DashboardProps {
  currentUser: User;
  onNavigateTab: (tabId: string, filter?: string) => void;
}

export default function DashboardTab({ currentUser, onNavigateTab }: DashboardProps) {
  const [counts, setCounts] = useState<DashboardCounts>({ openTasks: 0, closedTasks: 0, openIssues: 0, closedIssues: 0 });
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [myIssues, setMyIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const countsRes = await api.getDashboardCounts(currentUser.id, currentUser.role);
      if (countsRes.success && countsRes.data) {
        setCounts(countsRes.data);
      }
      
      const tasksRes = await api.getTasks("Open Task", currentUser.id, currentUser.role);
      if (tasksRes.success && tasksRes.data) {
        setMyTasks(tasksRes.data.slice(0, 5));
      }

      const issuesRes = await api.getIssues("View by Owner", currentUser.id, currentUser.role);
      if (issuesRes.success && issuesRes.data) {
        setMyIssues(issuesRes.data.slice(0, 5));
      }
    } catch (err) {
      console.error("Dashboard load failure", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("progress")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (s.includes("review")) return "bg-amber-50 text-amber-700 border-amber-200";
    if (s.includes("test")) return "bg-cyan-50 text-cyan-700 border-cyan-200";
    if (s.includes("closed")) return "bg-slate-100 text-slate-600 border-slate-200";
    return "bg-green-50 text-green-700 border-green-200";
  };

  const getPriorityStyle = (priority: string) => {
    const p = priority.toLowerCase();
    if (p.includes("high")) return "bg-rose-50 text-rose-700 border-rose-200";
    if (p.includes("low")) return "bg-green-50 text-green-700 border-green-200";
    if (p.includes("medium")) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-100 text-slate-650 border-slate-200";
  };

  const getHeatmapColorStyle = (pct: number) => {
    if (pct <= 25) return "bg-red-500";
    if (pct <= 50) return "bg-amber-500";
    if (pct <= 75) return "bg-orange-500";
    if (pct <= 90) return "bg-emerald-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-8">
      {/* Upper header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 bg-gradient-primary shadow-lg shadow-purple-500/25 text-white rounded-2xl flex items-center justify-center">
            <LayoutDashboard size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-extrabold text-[#343a40] tracking-tight flex items-center gap-2">
              Dashboard Overview
            </h1>
            <p className="text-xs text-slate-500 font-bold tracking-wide">
              Overview of active operations, deliverables, and ledger progress
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold tracking-wide bg-slate-100 hover:bg-slate-200/60 px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-[#9a55ff]/5">
            <span>Overview</span>
            <span className="w-4 h-4 bg-gradient-primary text-white rounded-full flex items-center justify-center text-[9px] font-black font-mono">i</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 text-xs bg-white hover:bg-purple-50/20 border border-slate-205 hover:border-[#9a55ff]/40 rounded-xl font-bold text-slate-700 flex items-center gap-2 tracking-wide transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin text-[#9a55ff]" />
            ) : (
              "Refresh Analytics"
            )}
          </button>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Open Tasks */}
        <div
          onClick={() => onNavigateTab("tasks", "Open Task")}
          className="bg-gradient-danger hover:shadow-[0_15px_30px_rgba(254,112,150,0.32)] rounded-3xl p-6 shadow-md shadow-orange-500/5 transition-all duration-300 cursor-pointer group flex flex-col justify-between relative overflow-hidden text-white min-h-[160px]"
        >
          {/* Overlapping circular abstract shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-6 -mt-6 transition-transform duration-500 group-hover:scale-125"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-4 translate-y-4 transition-transform duration-500 group-hover:scale-125"></div>
          
          <div className="relative z-10 w-full">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#ffffffea]">Weekly Sales</span>
              <div className="w-10 h-10 rounded-full bg-white/20 select-none text-white flex items-center justify-center backdrop-blur-md transition-transform duration-300 group-hover:rotate-12 border border-white/15">
                <CheckSquare size={18} />
              </div>
            </div>
            <div className="mt-2 text-left">
              <span className="text-4xl font-display font-extrabold tracking-tight block text-white">{counts.openTasks}</span>
              <p className="text-xs text-white/80 font-bold mt-1">Active Milestones</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-white/95 font-bold text-xs uppercase tracking-wider group-hover:gap-2 transition-all z-10">
            <span>View Tasks</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Closed Tasks */}
        <div
          onClick={() => onNavigateTab("tasks", "Complete Task")}
          className="bg-gradient-info hover:shadow-[0_15px_30px_rgba(4,126,223,0.22)] rounded-3xl p-6 shadow-md shadow-blue-500/5 transition-all duration-300 cursor-pointer group flex flex-col justify-between relative overflow-hidden text-white min-h-[160px]"
        >
          {/* Overlapping circular abstract shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-6 -mt-6 transition-transform duration-500 group-hover:scale-125"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-4 translate-y-4 transition-transform duration-500 group-hover:scale-125"></div>
          
          <div className="relative z-10 w-full">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#ffffffea]">Weekly Orders</span>
              <div className="w-10 h-10 rounded-full bg-white/20 select-none text-white flex items-center justify-center backdrop-blur-md transition-transform duration-300 group-hover:rotate-12 border border-white/15">
                <Check className="stroke-[3]" size={18} />
              </div>
            </div>
            <div className="mt-2 text-left">
              <span className="text-4xl font-display font-extrabold tracking-tight block text-white">{counts.closedTasks}</span>
              <p className="text-xs text-white/80 font-bold mt-1">Compliant Deliverables</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-white/95 font-bold text-xs uppercase tracking-wider group-hover:gap-2 transition-all z-10">
            <span>View Done</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Open Issues */}
        <div
          onClick={() => onNavigateTab("issues", "Open Issue")}
          className="bg-gradient-success hover:shadow-[0_15px_30px_rgba(7,205,174,0.22)] rounded-3xl p-6 shadow-md shadow-[#07cdae]/5 transition-all duration-300 cursor-pointer group flex flex-col justify-between relative overflow-hidden text-white min-h-[160px]"
        >
          {/* Overlapping circular abstract shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-6 -mt-6 transition-transform duration-500 group-hover:scale-125"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-4 translate-y-4 transition-transform duration-500 group-hover:scale-125"></div>
          
          <div className="relative z-10 w-full">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#ffffffea]">Open Issues</span>
              <div className="w-10 h-10 rounded-full bg-white/20 select-none text-white flex items-center justify-center backdrop-blur-md transition-transform duration-300 group-hover:rotate-12 border border-white/15">
                <AlertTriangle size={18} />
              </div>
            </div>
            <div className="mt-2 text-left">
              <span className="text-4xl font-display font-extrabold tracking-tight block text-white">{counts.openIssues}</span>
              <p className="text-xs text-white/80 font-bold mt-1">Assigned Blockers</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-white/95 font-bold text-xs uppercase tracking-wider group-hover:gap-2 transition-all z-10">
            <span>View Issues</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 4: Closed Issues */}
        <div
          onClick={() => onNavigateTab("issues", "Closed Issue")}
          className="bg-gradient-primary hover:shadow-[0_15px_30px_rgba(154,85,255,0.32)] rounded-3xl p-6 shadow-md shadow-purple-500/5 transition-all duration-300 cursor-pointer group flex flex-col justify-between relative overflow-hidden text-white min-h-[160px]"
        >
          {/* Overlapping circular abstract shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-6 -mt-6 transition-transform duration-500 group-hover:scale-125"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-4 translate-y-4 transition-transform duration-500 group-hover:scale-125"></div>
          
          <div className="relative z-10 w-full">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#ffffffea]">Closed Issues</span>
              <div className="w-10 h-10 rounded-full bg-white/20 select-none text-white flex items-center justify-center backdrop-blur-md transition-transform duration-300 group-hover:rotate-12 border border-white/15">
                <ShieldAlert size={18} />
              </div>
            </div>
            <div className="mt-2 text-left">
              <span className="text-4xl font-display font-extrabold tracking-tight block text-white">{counts.closedIssues}</span>
              <p className="text-xs text-white/80 font-bold mt-1">Resolved Blockers</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-white/95 font-bold text-xs uppercase tracking-wider group-hover:gap-2 transition-all z-10">
            <span>View Closed</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Row of My Tasks & My Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Box 1: My Tasks */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-display font-medium text-slate-800 tracking-wide flex items-center gap-2">
              <ListTodo size={18} className="text-blue-500" />
              My Active Deliverables
            </h3>
            <button
              onClick={() => onNavigateTab("tasks")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors group cursor-pointer"
            >
              Browse All Tasks
              <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="py-24 text-center">
                <Loader2 size={32} className="animate-spin text-slate-400 mx-auto" />
                <p className="text-sm text-slate-500 mt-3">Compiling active tasks...</p>
              </div>
            ) : myTasks.length === 0 ? (
              <div className="py-20 text-center text-slate-400 px-6">
                <CheckSquare size={36} className="mx-auto text-slate-400 mb-3 stroke-[1.5]" />
                <p className="text-sm">Clean Desk! No pending deliverables.</p>
              </div>
            ) : (
              myTasks.map((t) => (
                <div key={t.id} className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1 max-w-[65%]">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-205">{t.id}</span>
                      <h4 className="text-sm font-semibold text-slate-800 truncate">{t.name}</h4>
                    </div>
                    {t.description && (
                      <p className="text-xs text-slate-500 truncate mt-1">{t.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${getStatusStyle(t.status)}`}>
                      {t.status}
                    </span>
                    <div className="flex flex-col gap-1 text-right min-w-[90px]">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                        <span>Done:</span>
                        <span className="font-bold text-blue-600">{t.completion || 0}%</span>
                      </div>
                      <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden relative" title={`Completion: ${t.completion || 0}%, Auto target: ${t.autoProgress || 0}%`}>
                        {/* Auto progress bar layer under manual */}
                        <div
                          className={`absolute inset-y-0 left-0 opacity-40 ${getHeatmapColorStyle(t.autoProgress || 0)}`}
                          style={{ width: `${t.autoProgress || 0}%` }}
                        ></div>
                        {/* Manual progress bar layer */}
                        <div
                          className="absolute inset-y-0 left-0 bg-blue-500 rounded-full"
                          style={{ width: `${t.completion || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Box 2: My Issues */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-display font-medium text-slate-800 tracking-wide flex items-center gap-2">
              <ShieldAlert size={18} className="text-amber-500" />
              My Assigned Blockers
            </h3>
            <button
              onClick={() => onNavigateTab("issues")}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors group cursor-pointer"
            >
              Browse All Issues
              <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="py-24 text-center">
                <Loader2 size={32} className="animate-spin text-slate-400 mx-auto" />
                <p className="text-sm text-slate-500 mt-3">Compiling blocker reports...</p>
              </div>
            ) : myIssues.length === 0 ? (
              <div className="py-20 text-center text-slate-400 px-6">
                <AlertTriangle size={36} className="mx-auto text-slate-400 mb-3 stroke-[1.5]" />
                <p className="text-sm">Safe! No flags assigned to you.</p>
              </div>
            ) : (
              myIssues.map((i) => (
                <div key={i.id} className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1 max-w-[65%]">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-205">{i.id}</span>
                      <h4 className="text-sm font-semibold text-slate-800 truncate">{i.name}</h4>
                    </div>
                    {i.description && (
                      <p className="text-xs text-slate-500 truncate mt-1">{i.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${getPriorityStyle(i.severity)}`}>
                      {i.severity}
                    </span>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${getStatusStyle(i.status)}`}>
                      {i.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
