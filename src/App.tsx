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
    <div className="min-h-screen bg-[#f8fafd] text-slate-800 flex flex-col antialiased selection:bg-blue-600/10 font-sans">
      
      {/* Dynamic top control navbar with horizontal integrated menu */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/50 px-6 pt-4 pb-0 flex flex-col gap-3 shadow-sm text-slate-800">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 shadow-sm">
              <Sparkles size={19} className="text-blue-650" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-md font-display font-extrabold text-slate-900 tracking-tight leading-none">
                  Project Management Yajur
                </h1>
                <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full font-mono uppercase font-black tracking-wider">PRO</span>
              </div>
              <span className="text-[10px] font-extrabold mt-0.5 block bg-gradient-to-r from-blue-600 via-emerald-500 via-amber-500 to-rose-600 bg-clip-text text-transparent font-sans">
                Sheets Integrated Network Ledger v1.0
              </span>
            </div>
          </div>

          {/* User profile & Action capsule */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl">
              <div className="h-6.5 w-6.5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center font-mono shadow-sm">
                {currentUser.username.substring(0, 2).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-xs font-bold text-slate-800 block max-w-[120px] truncate leading-none">
                  {currentUser.name}
                </span>
                <span className="text-[9px] text-slate-500 font-extrabold font-mono block uppercase tracking-wider mt-0.5 leading-none">
                  {currentUser.role}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600 border border-slate-200/80 rounded-xl cursor-pointer transition-all duration-155"
              title="Log out of active session"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Horizontal Nav Bar containing all Menu items */}
        <nav className="flex items-center gap-1 overflow-x-auto pb-0 -mx-6 px-6 scrollbar-none border-t border-slate-100 mt-1">
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
                    ? "border-blue-600 text-blue-600 font-semibold bg-blue-50/30"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <IconComp
                  size={15}
                  className={`transition-colors duration-150 ${
                    isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-700"
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
        © 2026 Yajur Fibres. All rights reserved.
      </footer>
    </div>
  );
}
