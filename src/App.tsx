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
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <Loader2 size={36} className="animate-spin text-blue-600 mb-2" />
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
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "tasks", label: "Tasks", icon: ListTodo },
    { id: "issues", label: "Issues", icon: AlertCircle },
    { id: "dependency", label: "Dependencies", icon: Link },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users, adminOnly: true },
    { id: "departments", label: "Departments", icon: Building2, adminOnly: true },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7fd] text-slate-800 flex flex-col antialiased selection:bg-blue-600/10 font-sans">
      
      {/* Dynamic top control navbar with horizontal integrated menu */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-[#2c6df4] via-[#356efd] to-[#458afc] border-b border-blue-700/20 px-6 pt-4 pb-0 flex flex-col gap-3 shadow-md shadow-blue-500/5 text-white">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white/15 rounded-xl flex items-center justify-center border border-white/15 shadow-sm">
              <Sparkles size={19} className="text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-md font-display font-extrabold text-white tracking-tight leading-none">
                  Project Management Yajur
                </h1>
                <span className="text-[9px] bg-white/20 text-white border border-white/30 px-1.5 py-0.5 rounded-full font-mono uppercase font-black tracking-wider">PRO</span>
              </div>
              <span className="text-[10px] text-blue-100/80 font-mono mt-0.5 block">Sheets Integrated Network Ledger v1.0</span>
            </div>
          </div>

          {/* User profile & Action capsule */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl">
              <div className="h-6.5 w-6.5 rounded-full bg-white text-blue-600 font-black text-[10px] flex items-center justify-center font-mono shadow-sm">
                {currentUser.username.substring(0, 2).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-xs font-bold text-white block max-w-[120px] truncate leading-none">
                  {currentUser.name}
                </span>
                <span className="text-[9px] text-blue-100 font-extrabold font-mono block uppercase tracking-wider mt-0.5 leading-none">
                  {currentUser.role}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2 bg-white/10 hover:bg-rose-500/20 hover:border-rose-300 text-blue-100 hover:text-white border border-white/10 rounded-xl cursor-pointer transition-all duration-150"
              title="Log out of active session"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Horizontal Nav Bar containing all Menu items */}
        <nav className="flex items-center gap-1 overflow-x-auto pb-0 -mx-6 px-6 scrollbar-none border-t border-white/10 mt-1">
          {menuItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const IconComp = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id !== "tasks") setTaskOverrideFilter("");
                  if (item.id !== "dependency") setDependencyOverrideSearch("");
                  setActiveTab(item.id);
                }}
                className={`px-4 py-3 border-b-2 font-medium text-xs flex items-center gap-2 tracking-wide cursor-pointer group transition-all duration-150 shrink-0 ${
                  isActive
                    ? "border-white text-white font-semibold bg-white/10"
                    : "border-transparent text-blue-100/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <IconComp
                  size={15}
                  className={`transition-colors duration-150 ${
                    isActive ? "text-white" : "text-blue-100/60 group-hover:text-white"
                  }`}
                />
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Structural layout body */}
      <div className="flex-1 flex flex-col">

        {/* Content canvas */}
        <main className="flex-1 p-5 lg:p-6 overflow-y-auto max-w-full">
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
      <footer className="bg-white border-t border-slate-200 py-3.5 px-6 text-center text-[10px] text-slate-500 font-mono tracking-widest uppercase">
        © 2026 Yajur Fibres. Google Sheets Powered Infrastructure. All rights reserved.
      </footer>
    </div>
  );
}
