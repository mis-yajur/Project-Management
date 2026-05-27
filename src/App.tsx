import { useState, useEffect } from "react";
import { LayoutDashboard, ListTodo, AlertCircle, Link, Users, Building2, Bell, LogOut, Loader2, Sparkles } from "lucide-react";
import LoginScreen from "./components/LoginScreen";
import DashboardTab from "./components/DashboardTab";
import TasksTab from "./components/TasksTab";
import IssuesTab from "./components/IssuesTab";
import DependenciesTab from "./components/DependenciesTab";
import UsersTab from "./components/UsersTab";
import DepartmentsTab from "./components/DepartmentsTab";
import NotificationsTab from "./components/NotificationsTab";
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
    { id: "users", label: "Team Members", icon: Users, adminOnly: true },
    { id: "departments", label: "Segment Departments", icon: Building2, adminOnly: true },
    { id: "notifications", label: "System Alerts", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-blue-600/30 font-sans">
      
      {/* Dynamic top control navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/10">
            <Sparkles size={18} className="text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-md font-display font-medium text-slate-100 tracking-tight leading-none">
              Project Management Yajur
            </h1>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">Sheets Integrated Network Ledger v1.0</span>
          </div>
        </div>

        {/* User profile & Action capsule */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-800/30 px-3.5 py-1.5 rounded-full border border-slate-800">
            <div className="h-6 w-6 rounded-full bg-blue-500/15 text-blue-400 font-bold border border-blue-500/20 text-xs flex items-center justify-center font-mono">
              {currentUser.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-semibold text-slate-200 block max-w-[100px] truncate leading-none">
                {currentUser.name}
              </span>
              <span className="text-[9px] text-blue-400 font-semibold font-mono block uppercase tracking-wider mt-0.5 leading-none">
                {currentUser.role}
              </span>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="p-2 bg-slate-800/30 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/15 rounded-full cursor-pointer transition-all duration-150"
            title="Log out of active session"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Top Horizontal Menu Bar */}
      <div className="bg-slate-900 border-b border-slate-800/60 px-6 py-3 overflow-x-auto scrollbar-none flex items-center gap-2 whitespace-nowrap">
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
              className={`px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 tracking-wide cursor-pointer transition-all duration-150 select-none ${
                isActive
                  ? "bg-blue-600 text-slate-100 shadow-md shadow-blue-500/10"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/35"
              }`}
            >
              <IconComp
                size={14}
                className={`transition-colors duration-150 ${
                  isActive ? "text-slate-100" : "text-slate-500"
                }`}
              />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Main Structural layout body */}
      <div className="flex-1 flex flex-col">
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
