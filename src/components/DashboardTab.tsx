import { useState, useEffect } from "react";
import { CheckSquare, AlertTriangle, Play, Check, ArrowRight, Loader2, ListTodo, ShieldAlert, Database, Cpu, Layers, Network, Code2 } from "lucide-react";
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
  const [selectedStack, setSelectedStack] = useState("stack2");

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
    return "bg-slate-100 text-slate-605 border-slate-200";
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-medium text-slate-800 tracking-tight flex items-center gap-2">
            Personal Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-sans">
            Overview of your active deliverables, operations, and logs.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 text-xs bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 flex items-center gap-2 tracking-wide transition-all duration-200 cursor-pointer"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin text-blue-500" />
          ) : (
            "Refresh Analytics"
          )}
        </button>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Open Tasks */}
        <div
          onClick={() => onNavigateTab("tasks", "Open Task")}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all duration-300 cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Open Tasks</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100 shadow-inner">
                <CheckSquare size={18} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-display font-extrabold text-amber-500">{counts.openTasks}</span>
              <p className="text-[11px] text-slate-500 font-semibold font-sans mt-0.5">Active Milestones</p>
            </div>
          </div>
          <div className="mt-4 bg-gradient-to-r from-amber-500 to-orange-400 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-xl flex items-center justify-between shadow-sm">
            <span>Tracking active backlog</span>
            <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Closed Tasks */}
        <div
          onClick={() => onNavigateTab("tasks", "Complete Task")}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all duration-300 cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Closed Tasks</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 shadow-inner">
                <Check className="stroke-[3]" size={18} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-display font-extrabold text-emerald-500">{counts.closedTasks}</span>
              <p className="text-[11px] text-slate-500 font-semibold font-sans mt-0.5">Compliant Deliverables</p>
            </div>
          </div>
          <div className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-400 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-xl flex items-center justify-between shadow-sm">
            <span>Workorder achievements</span>
            <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Open Issues */}
        <div
          onClick={() => onNavigateTab("issues", "Open Issue")}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all duration-300 cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Open Issues</span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100 shadow-inner">
                <AlertTriangle size={18} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-display font-extrabold text-rose-500">{counts.openIssues}</span>
              <p className="text-[11px] text-slate-500 font-semibold font-sans mt-0.5">Assigned Blockers</p>
            </div>
          </div>
          <div className="mt-4 bg-gradient-to-r from-rose-500 to-red-400 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-xl flex items-center justify-between shadow-sm">
            <span>Requires rapid response</span>
            <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 4: Closed Issues */}
        <div
          onClick={() => onNavigateTab("issues", "Closed Issue")}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all duration-300 cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Closed Issues</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-105 shadow-inner">
                <ShieldAlert size={18} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-display font-extrabold text-blue-500">{counts.closedIssues}</span>
              <p className="text-[11px] text-slate-500 font-semibold font-sans mt-0.5">Resolved Blockers</p>
            </div>
          </div>
          <div className="mt-4 bg-gradient-to-r from-blue-500 to-indigo-400 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-xl flex items-center justify-between shadow-sm">
            <span>Stability checkpoints</span>
            <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
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
                <CheckSquare size={36} className="mx-auto text-slate-350 mb-3 stroke-[1.5]" />
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
                <AlertTriangle size={36} className="mx-auto text-slate-350 mb-3 stroke-[1.5]" />
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

      {/* Yajur Fibres Multi-Stack Ecosystem Matrix */}
      <div id="tech-stack-matrix" className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs mt-8">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="font-display font-bold text-slate-800 tracking-wide flex items-center gap-2 text-md">
              <Network size={19} className="text-[#3fc2f6] text-blue-500" />
              System Integration Stacks
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Multi-pipeline framework layers and engineering toolchains designed for Yajur Fibres operations.
            </p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40 gap-1 overflow-x-auto max-w-full">
            <button
              id="btn-stack-2"
              onClick={() => setSelectedStack("stack2")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                selectedStack === "stack2"
                  ? "bg-white text-blue-600 shadow-xs border border-slate-200/20"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Cpu size={13} />
              App Engine Stack
            </button>
            <button
              id="btn-stack-1"
              onClick={() => setSelectedStack("stack1")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                selectedStack === "stack1"
                  ? "bg-white text-blue-600 shadow-xs border border-slate-200/20"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Database size={13} />
              Enterprise Data Hub
            </button>
            <button
              id="btn-stack-3"
              onClick={() => setSelectedStack("stack3")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                selectedStack === "stack3"
                  ? "bg-white text-blue-600 shadow-xs border border-slate-200/20"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Layers size={13} />
              Mobile Admin Hub
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Display active stack description */}
          {selectedStack === "stack2" && (
            <div id="info-stack-2" className="mb-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="space-y-1">
                <span className="text-[10px] font-sans font-black text-blue-600 tracking-wider uppercase bg-blue-100/60 px-2 py-0.5 rounded-md">Integrated Core Engine</span>
                <p className="text-sm font-bold text-slate-800 mt-1">Cloud Ledger App Engine Stack</p>
                <p className="text-xs text-slate-500">High-performance reactive environment designed for Vite compiling and web application rendering.</p>
              </div>
              <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 self-start sm:self-auto shrink-0">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider">Active Compiler</span>
              </div>
            </div>
          )}

          {selectedStack === "stack1" && (
            <div id="info-stack-1" className="mb-6 p-4 bg-amber-50/50 rounded-xl border border-amber-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="space-y-1">
                <span className="text-[10px] font-sans font-black text-amber-600 tracking-wider uppercase bg-amber-100/60 px-2 py-0.5 rounded-md">Data Gateway Pipeline</span>
                <p className="text-sm font-bold text-slate-800 mt-1">Enterprise Data Hub Stack</p>
                <p className="text-xs text-slate-500">Optimized for ledger networking, relational query compilation, and backend database sync.</p>
              </div>
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 self-start sm:self-auto shrink-0">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-[10px] font-mono font-bold text-blue-700 uppercase tracking-wider">Sync Active</span>
              </div>
            </div>
          )}

          {selectedStack === "stack3" && (
            <div id="info-stack-3" className="mb-6 p-4 bg-rose-50/50 rounded-xl border border-rose-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="space-y-1">
                <span className="text-[10px] font-sans font-black text-rose-600 tracking-wider uppercase bg-rose-100/60 px-2 py-0.5 rounded-md">Material Adaptive Framework</span>
                <p className="text-sm font-bold text-slate-800 mt-1">Mobile & Admin Hub Portal</p>
                <p className="text-xs text-slate-500">Visual administration framework styled with material structures and reactive transitions.</p>
              </div>
              <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 self-start sm:self-auto shrink-0">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                <span className="text-[10px] font-mono font-bold text-purple-700 uppercase tracking-wider">Hot Standby Node</span>
              </div>
            </div>
          )}

          {/* Grid Layout of Technologies inside the selected stack */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {selectedStack === "stack2" && [
              { name: "React 18", category: "Core Frontend", status: "Secure", version: "v18.3.1", color: "border-l-4 border-l-blue-500" },
              { name: "Tailwind CSS", category: "Utility Style", status: "Active Compiler", version: "v4.1.14", color: "border-l-4 border-l-cyan-500" },
              { name: "TypeScript", category: "Strong Typing", status: "Active", version: "v5.8.2", color: "border-l-4 border-l-sky-500" },
              { name: "Vite", category: "App Builder", status: "Dev Native", version: "v6.2.3", color: "border-l-4 border-l-indigo-500" },
              { name: "ApexCharts.js", category: "Dynamic Charts", status: "Interactive", version: "v3.46.0", color: "border-l-4 border-l-emerald-500" },
              { name: "Flatpickr", category: "Temporal Inputs", status: "Functional", version: "v4.6.13", color: "border-l-4 border-l-yellow-500" },
              { name: "React-toastify", category: "Alert System", status: "Realtime Alerts", version: "v10.0.4", color: "border-l-4 border-l-orange-500" },
              { name: "Webpack", category: "Module Bundler", status: "Legacy Bridge", version: "v5.90.3", color: "border-l-4 border-l-slate-400" },
              { name: "Autoprefixer", category: "Browser Vendor", status: "Style Optimiser", version: "v10.4.18", color: "border-l-4 border-l-purple-500" },
              { name: "Jsvectormap", category: "Geospatial Maps", status: "Interactive", version: "v1.5.3", color: "border-l-4 border-l-green-500" },
              { name: "HeadlessUI", category: "Unstyled Inputs", status: "Accessible", version: "v2.0.0", color: "border-l-4 border-l-rose-500" },
              { name: "Prettier", category: "Code Formatter", status: "Automation", version: "v3.2.5", color: "border-l-4 border-l-zinc-500" },
              { name: "PostCSS", category: "Style Compiler", status: "Active", version: "v8.4.35", color: "border-l-4 border-l-amber-500" }
            ].map((tech) => (
              <div key={tech.name} id={`tech-node-${tech.name.replace(/[^a-zA-Z0-9]/g, '')}`} className={`${tech.color} bg-slate-50/50 hover:bg-slate-50 border border-slate-200/60 hover:border-slate-300 rounded-xl p-4 shadow-3xs transition-all duration-200 flex flex-col justify-between h-28`}>
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center justify-between">
                    <span>{tech.category}</span>
                    <span className="font-mono text-slate-500">{tech.version}</span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-800">{tech.name}</h4>
                </div>
                <div className="flex justify-between items-center text-[10px] border-t border-slate-200/50 pt-2 text-slate-500">
                  <span className="font-mono font-semibold">Integrator Engine</span>
                  <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-black uppercase text-[8px] tracking-wider border border-emerald-100">{tech.status}</span>
                </div>
              </div>
            ))}

            {selectedStack === "stack1" && [
              { name: "React 18", category: "Core Frontend", status: "Secure", version: "v18.3.1", color: "border-l-4 border-l-blue-500" },
              { name: "Bootstrap", category: "Layout Grid", status: "Legacy Integrated", version: "v5.3.3", color: "border-l-4 border-l-violet-500" },
              { name: "TypeScript", category: "Strong Typing", status: "Active", version: "v5.8.2", color: "border-l-4 border-l-sky-500" },
              { name: "Redux Toolkit", category: "State Sync", status: "Asynchronous", version: "v2.2.1", color: "border-l-4 border-l-indigo-500" },
              { name: "Axios", category: "Network Agent", status: "Secure Client", version: "v1.6.7", color: "border-l-4 border-l-teal-500" },
              { name: "Sequelize", category: "ORM Database", status: "Relational Mapping", version: "v6.37.1", color: "border-l-4 border-l-orange-500" },
              { name: "React-charts", category: "Data Plotter", status: "Client Compiled", version: "v3.0.0", color: "border-l-4 border-l-emerald-500" },
              { name: "Font-awesome", category: "Vector Icons", status: "Asset Loaded", version: "v6.5.1", color: "border-l-4 border-l-yellow-500" },
              { name: "ESLint", category: "Linter Tool", status: "Active Guard", version: "v8.57.0", color: "border-l-4 border-l-rose-500" },
              { name: "GraphQL", category: "API Gateway", status: "Sync Endpoint", version: "v16.8.1", color: "border-l-4 border-l-amber-500" },
              { name: "PostCSS", category: "Style Compiler", status: "Active", version: "v8.4.35", color: "border-l-4 border-l-[#2c3e50]" }
            ].map((tech) => (
              <div key={tech.name} id={`tech-node-${tech.name.replace(/[^a-zA-Z0-9]/g, '')}`} className={`${tech.color} bg-slate-50/50 hover:bg-slate-50 border border-slate-200/60 hover:border-slate-300 rounded-xl p-4 shadow-3xs transition-all duration-200 flex flex-col justify-between h-28`}>
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center justify-between">
                    <span>{tech.category}</span>
                    <span className="font-mono text-slate-500">{tech.version}</span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-800">{tech.name}</h4>
                </div>
                <div className="flex justify-between items-center text-[10px] border-t border-slate-200/50 pt-2 text-slate-500">
                  <span className="font-mono font-semibold">Database Sync</span>
                  <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-black uppercase text-[8px] tracking-wider border border-blue-100">{tech.status}</span>
                </div>
              </div>
            ))}

            {selectedStack === "stack3" && [
              { name: "React 18", category: "Core Frontend", status: "Secure", version: "v18.3.1", color: "border-l-4 border-l-blue-500" },
              { name: "Material UI", category: "Material Widgets", status: "Active Theme", version: "v5.15.11", color: "border-l-4 border-l-indigo-500" },
              { name: "JavaScript", category: "Runtime Engine", status: "Native", version: "ESNext", color: "border-l-4 border-l-yellow-500" },
              { name: "Redux Toolkit", category: "State Sync", status: "Integrated", version: "v2.2.1", color: "border-l-4 border-l-sky-500" },
              { name: "Framer Motion", category: "Physical Motion", status: "Active Canvas", version: "v11.0.8", color: "border-l-4 border-l-pink-500" },
              { name: "Formik", category: "Structured Forms", status: "Validation", version: "v2.4.5", color: "border-l-4 border-l-teal-500" },
              { name: "ApexCharts.js", category: "Visual Charts", status: "Interactive", version: "v3.46.0", color: "border-l-4 border-l-emerald-500" },
              { name: "React-router", category: "State Router", status: "Active Flow", version: "v6.22.2", color: "border-l-4 border-l-purple-500" },
              { name: "ESLint", category: "Linter Tool", status: "Active Guard", version: "v8.57.0", color: "border-l-4 border-l-red-500" },
              { name: "Prettier", category: "Code Formatter", status: "Automation", version: "v3.2.5", color: "border-l-4 border-l-zinc-500" },
              { name: "Sass", category: "Style Sheet", status: "Active Compiler", version: "v1.71.1", color: "border-l-4 border-l-rose-500" }
            ].map((tech) => (
              <div key={tech.name} id={`tech-node-${tech.name.replace(/[^a-zA-Z0-9]/g, '')}`} className={`${tech.color} bg-slate-50/50 hover:bg-slate-50 border border-slate-200/60 hover:border-slate-300 rounded-xl p-4 shadow-3xs transition-all duration-200 flex flex-col justify-between h-28`}>
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center justify-between">
                    <span>{tech.category}</span>
                    <span className="font-mono text-slate-500">{tech.version}</span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-800">{tech.name}</h4>
                </div>
                <div className="flex justify-between items-center text-[10px] border-t border-slate-200/50 pt-2 text-slate-500">
                  <span className="font-mono font-semibold">Portal System</span>
                  <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-black uppercase text-[8px] tracking-wider border border-purple-100">{tech.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
