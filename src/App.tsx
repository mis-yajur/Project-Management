import { useState, useEffect } from "react";
import { LayoutDashboard, ListTodo, AlertCircle, Link, Users, Building2, Bell, LogOut, Loader2, Sparkles, BarChart3 } from "lucide-react";
import LoginScreen from "./components/LoginScreen";
import DashboardTab from "./components/DashboardTab";
import TasksTab from "./components/TasksTab";
import IssuesTab from "./components/IssuesTab";
import DependenciesTab from "./components/DependenciesTab";
import UsersTab from "./components/UsersTab";
import DepartmentsTab from "./components/DepartmentsTab";
import NotificationsTab from "./components/NotificationsTab";
import ReportTab from "./components/ReportTab";
import { User } from "./types";
import { api } from "./api";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [loading, setLoading] = useState(true);

  // Deep communication states across tabs
  const [taskOverrideFilter, setTaskOverrideFilter] = useState<string>("");
  const [dependencyOverrideSearch, setDependencyOverrideSearch] = useState<string>("");

  useEffect(() => {
    // Check local storage for persistent session
    const stored = localStorage.getItem("yajur_current_user");
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch (e) {
        console.error("Session parse failed", e);
      }
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("yajur_current_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out from Project Management Yajur?")) {
      setCurrentUser(null);
      localStorage.removeItem("yajur_current_user");
    }
  };

  // Safe navigation function allowing drill-downs
  const handleNavigateTab = (tabId: string, payload?: string) => {
    if (tabId === "tasks") {
      setTaskOverrideFilter(payload || "All Task");
      setActiveTab("tasks");
    } else if (tabId === "dependency") {
      setDependencyOverrideSearch(payload || "");
      setActiveTab("dependency");
    } else {
      setActiveTab(tabId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center">
        <Loader2 size={36} className="animate-spin text-blue-500 mb-2" />
        <p className="text-sm font-sans text-slate-500">Initializing workspace...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Segment permissions
  const isAdmin = currentUser.role === "Admin";

  const menuItems = [
    { id: "dashboard", label: "Overview Hub", icon: LayoutDashboard },
    { id: "tasks", label: "Milestones Backlog", icon: ListTodo },
    { id: "issues", label: "Blockers & Issues", icon: AlertCircle },
    { id: "dependency", label: "Predecessor Links", icon: Link },
    { id: "reports", label: "Ledger Reports", icon: BarChart3 },
    { id: "users", label: "Team Members", icon: Users, adminOnly: true },
    { id: "departments", label: "Segment Departments", icon: Building2, adminOnly: true },
    { id: "notifications", label: "System Alerts", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col antialiased selection:bg-blue-600/30 font-sans">
      
      {/* Dynamic top control navbar */}
      <header className="sticky top-0 z-40 bg-[#0F172A]/70 backdrop-blur-xl border-b border-slate-800/80 px-6 py-4 flex items-center justify-between shadow-xl shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-tr from-blue-500 via-indigo-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10 border border-white/10 animate-pulse-subtle">
            <Sparkles size={19} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-md font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-50 via-slate-100 to-slate-200 tracking-tight leading-none">
                Project Management Yajur
              </h1>
              <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-full font-mono uppercase font-black">PRO</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-1 block">Sheets Integrated Network Ledger v1.0</span>
          </div>
        </div>

        {/* User profile & Action capsule */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-1.5 rounded-2xl border border-slate-800/80">
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black border border-white/10 text-xs flex items-center justify-center font-mono shadow-inner shadow-white/25">
              {currentUser.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold text-slate-200 block max-w-[130px] truncate leading-none">
                {currentUser.name}
              </span>
              <span className="text-[9px] text-indigo-400 font-semibold font-mono block uppercase tracking-wider mt-0.5 leading-none">
                {currentUser.role}
              </span>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="p-2 bg-slate-900/50 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 rounded-xl cursor-pointer transition-all duration-150"
            title="Log out of active session"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Structural layout body */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Left Side menu drawers */}
        <aside className="w-full md:w-64 bg-[#0F172A]/20 border-b md:border-b-0 md:border-r border-slate-800/60 p-5 shrink-0 [content-visibility:auto]">
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              if (item.adminOnly && !isAdmin) return null;
              const IconComp = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    // Reset payloads unless specified
                    if (item.id !== "tasks") setTaskOverrideFilter("");
                    if (item.id !== "dependency") setDependencyOverrideSearch("");
                    setActiveTab(item.id);
                  }}
                  className={`w-full text-left px-4.5 py-3 rounded-xl font-medium text-xs flex items-center gap-3.5 tracking-wide cursor-pointer group transition-all duration-150 ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-slate-50 shadow-lg shadow-blue-500/20 border-t border-white/10"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/40"
                  }`}
                >
                  <IconComp
                    size={17}
                    className={`transition-colors duration-150 ${
                      isActive ? "text-slate-50" : "text-slate-500 group-hover:text-slate-300"
                    }`}
                  />
                  {item.label}
                </button>
              );
            })}
          </nav>
          
          <div className="mt-8 pt-4 border-t border-slate-800/40 px-3 hidden md:block">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block font-semibold">User Context</span>
            <div className="mt-2 space-y-1 text-[11px] font-sans text-slate-400 leading-tight">
              <p>Email: <strong className="text-slate-200">{currentUser.email || "mis@yajurfibres.com"}</strong></p>
              <p>Access Level: <strong className="text-indigo-400 capitalize">{currentUser.role}</strong></p>
            </div>
          </div>
        </aside>

        {/* Content canvas */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-full">
          {activeTab === "dashboard" && (
            <DashboardTab
              currentUser={currentUser}
              onNavigateTab={handleNavigateTab}
            />
          )}

          {activeTab === "tasks" && (
            <TasksTab
              currentUser={currentUser}
              onNavigateTab={handleNavigateTab}
              overrideFilter={taskOverrideFilter}
            />
          )}

          {activeTab === "issues" && (
            <IssuesTab
              currentUser={currentUser}
            />
          )}

          {activeTab === "reports" && (
            <ReportTab
              currentUser={currentUser}
            />
          )}

          {activeTab === "dependency" && (
            <DependenciesTab
              currentUser={currentUser}
              overrideSearch={dependencyOverrideSearch}
            />
          )}

          {activeTab === "users" && isAdmin && (
            <UsersTab
              currentUser={currentUser}
            />
          )}

          {activeTab === "departments" && isAdmin && (
            <DepartmentsTab
              currentUser={currentUser}
            />
          )}

          {activeTab === "notifications" && (
            <NotificationsTab
              currentUser={currentUser}
            />
          )}
        </main>
      </div>

      {/* Humble branding credits */}
      <footer className="bg-slate-950 border-t border-slate-900 py-3.5 px-6 text-center text-[10px] text-slate-600 font-mono tracking-widest uppercase">
        © 2026 Yajur Fibres. Google Sheets Powered Infrastructure. All rights reserved.
      </footer>
    </div>
  );
}
