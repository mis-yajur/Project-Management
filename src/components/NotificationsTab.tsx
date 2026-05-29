import { useState, useEffect } from "react";
import { Bell, Mail, Send, RotateCw, Trash2, Loader2, Save, Search, CheckCircle, AlertTriangle } from "lucide-react";
import { api } from "../api";
import { NotificationLog, AppSettings, User } from "../types";

interface NotificationsTabProps {
  currentUser: User;
}

export default function NotificationsTab({ currentUser }: NotificationsTabProps) {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings states
  const [settings, setSettings] = useState<AppSettings>({
    email_enabled: "true",
    auto_notify_task_create: "true",
    auto_notify_task_assign: "true",
    auto_notify_issue_assign: "false",
    email_from_name: "Project Management Yajur"
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Manual Trigger states
  const [manualType, setManualType] = useState<"task" | "issue">("task");
  const [manualTargets, setManualTargets] = useState<any[]>([]);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Filters for logs
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch current settings
      const settingsRes = await api.getSettings();
      if (settingsRes && settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data);
      }

      // 2. Fetch logs
      const logsRes = await api.getNotifications(currentUser.id, currentUser.role);
      if (logsRes && logsRes.success) {
        setLogs(logsRes.data || []);
        setFilteredLogs(logsRes.data || []);
      }

      // 3. Fetch manual select items
      loadManualTargets(manualType);
    } catch (err) {
      console.error("Load notifications error", err);
    } finally {
      setLoading(false);
    }
  };

  const loadManualTargets = async (type: "task" | "issue") => {
    try {
      if (type === "task") {
        const res = await api.getTasks("All Task", currentUser.id, currentUser.role);
        if (res && res.success) {
          setManualTargets(res.data);
        }
      } else {
        const res = await api.getIssues("All Issue", currentUser.id, currentUser.role);
        if (res && res.success) {
          setManualTargets(res.data);
        }
      }
    } catch (err) {
      console.error("Load targets fail", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Handle changes in manual type
  useEffect(() => {
    setSelectedTarget("");
    loadManualTargets(manualType);
  }, [manualType]);

  // Apply search/filters on logs
  useEffect(() => {
    let result = [...logs];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(n => 
        n.id.toLowerCase().includes(s) || 
        n.referenceId.toLowerCase().includes(s) || 
        n.recipientName.toLowerCase().includes(s) || 
        n.recipientEmail.toLowerCase().includes(s) || 
        n.message.toLowerCase().includes(s) || 
        n.triggeredBy.toLowerCase().includes(s)
      );
    }
    if (statusFilter) {
      if (statusFilter === "Sent") {
        result = result.filter(n => n.status.toLowerCase() === "sent");
      } else if (statusFilter === "Failed") {
         result = result.filter(n => n.status.toLowerCase().startsWith("failed"));
      }
    }
    if (typeFilter) {
      result = result.filter(n => n.type === typeFilter);
    }
    setFilteredLogs(result);
  }, [search, statusFilter, typeFilter, logs]);

  const handleSaveSettings = async () => {
    if (currentUser.role === "User") {
      alert("Access Denied: Only Admin or Managers can reconfigure transmission rules.");
      return;
    }
    setSavingSettings(true);
    try {
      const res = await api.saveSettings(settings);
      if (res.success) {
        alert("Automation rules saved successfully!");
      } else {
        alert(res.message || "Failed to update rules.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendManual = async () => {
    if (!selectedTarget) {
      alert("Pre-condition failure: Please select which deliverable to notify on.");
      return;
    }
    setSendingEmail(true);
    try {
      let res;
      if (manualType === "task") {
        res = await api.triggerTaskNotification(selectedTarget, currentUser.id);
      } else {
        res = await api.triggerIssueNotification(selectedTarget, currentUser.id);
      }

      if (res && res.success) {
        alert(`Email dispatch processed successfully!\x0AStatus: ${res.emailResult || "Sent (Logged to Notification Log)"}`);
        loadData();
      } else {
        alert(res ? res.message : "Mail dispatch failed.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    try {
      const res = await api.deleteNotification(id);
      if (res.success) {
        setLogs(prev => prev.filter(l => l.id !== id));
      } else {
        alert(res.message || "Failed to delete log rows");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleClearAll = async () => {
    if (currentUser.role !== "Admin") return;
    if (!window.confirm("Are you sure you want to permanently erase the absolute notification log log? This row clearing is irreversible.")) return;
    try {
      const res = await api.clearAllNotifications(currentUser.id, currentUser.role);
      if (res.success) {
        alert("Logs cleared!");
        setLogs([]);
      } else {
        alert(res.message || "Clearing request rejected.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white px-6 py-5 rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] backdrop-blur">
        <div className="space-y-1">
          <h2 className="text-xl font-display font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <Bell size={20} className="text-blue-400" />
            Notification Settings & Audit Logs
          </h2>
          <p className="text-xs text-slate-500 font-sans">Manage email settings, trigger manual notifications, and inspect dispatched mail indexes.</p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 border border-slate-200 hover:bg-white font-medium text-xs text-slate-600 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer hover:border-slate-300 transition-all duration-200"
        >
          <RotateCw size={12} />
          Reload logs
        </button>
      </div>

      {/* Grid: Settings and Manual Trigger Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Email Configuration */}
        <div className="bg-slate-50 border-b border-slate-200/60 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="px-6 py-5 border-b border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center gap-2 bg-white/10">
            <Mail size={18} className="text-blue-400" />
            <span className="font-display font-medium text-slate-700 tracking-wide">Automated Email System API</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-semibold text-slate-700 tracking-wide" htmlFor="email_enabled">Enable Email Notifications</label>
                <p className="text-xs text-slate-500 font-sans">Dispatches logs directly via standard SMTP/MailApp services.</p>
              </div>
              <input
                type="checkbox"
                id="email_enabled"
                disabled={currentUser.role === "User"}
                className="w-5 h-5 text-blue-600 bg-white border-slate-200 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-30"
                checked={settings.email_enabled === "true"}
                onChange={(e) => setSettings({ ...settings, email_enabled: e.target.checked ? "true" : "false" })}
              />
            </div>
            
            <hr className="border-slate-200/45 my-2" />

            <div className="space-y-3">
              <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-500">Auto-trigger Event Rules</span>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs text-slate-600" htmlFor="auto_notify_task_create">On New Task Creation</label>
                  <p className="text-[10px] text-slate-500 font-sans">Alerts the assignee only when task is created by another team member.</p>
                </div>
                <input
                  type="checkbox"
                  id="auto_notify_task_create"
                  disabled={currentUser.role === "User"}
                  className="w-4 h-4 text-blue-600 bg-white border-slate-200 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-30"
                  checked={settings.auto_notify_task_create === "true"}
                  onChange={(e) => setSettings({ ...settings, auto_notify_task_create: e.target.checked ? "true" : "false" })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs text-slate-600" htmlFor="auto_notify_task_assign">On Task Reassignment Change</label>
                  <p className="text-[10px] text-slate-500 font-sans">Triggers instant notification specifically when a leader reallocates task owner.</p>
                </div>
                <input
                  type="checkbox"
                  id="auto_notify_task_assign"
                  disabled={currentUser.role === "User"}
                  className="w-4 h-4 text-blue-600 bg-white border-slate-200 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-30"
                  checked={settings.auto_notify_task_assign === "true"}
                  onChange={(e) => setSettings({ ...settings, auto_notify_task_assign: e.target.checked ? "true" : "false" })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs text-slate-600" htmlFor="auto_notify_issue_assign">On Issue Assignment Change</label>
                  <p className="text-[10px] text-slate-500 font-sans">Alerts assigned developer profile that a new blocker contains their tag.</p>
                </div>
                <input
                  type="checkbox"
                  id="auto_notify_issue_assign"
                  disabled={currentUser.role === "User"}
                  className="w-4 h-4 text-blue-600 bg-white border-slate-200 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-30"
                  checked={settings.auto_notify_issue_assign === "true"}
                  onChange={(e) => setSettings({ ...settings, auto_notify_issue_assign: e.target.checked ? "true" : "false" })}
                />
              </div>
            </div>
          </div>
          <div className="p-4 px-6 border-t border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] bg-white/20">
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings || currentUser.role === "User"}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-35"
            >
              {savingSettings ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {currentUser.role === "User" ? "Admin / Manager Access only" : "Save Automation Parameters"}
            </button>
          </div>
        </div>

        {/* Card 2: Manual Notification Dispatcher */}
        <div className="bg-slate-50 border-b border-slate-200/60 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="px-6 py-5 border-b border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center gap-2 bg-white/10">
            <Send size={18} className="text-indigo-400" />
            <span className="font-display font-medium text-slate-700 tracking-wide">Manual Mail Dispatcher Terminal</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Scope Category</label>
              <select
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-blue-500"
                value={manualType}
                onChange={(e) => setManualType(e.target.value as "task" | "issue")}
              >
                <option value="task">Milestone Deliverable Tasks</option>
                <option value="issue">Blockers or Issue Tickets</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Select Target deliverable</label>
              <select
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-blue-500"
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
              >
                <option value="">Choose item...</option>
                {manualTargets.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.id} — {item.name} ({item.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-blue-600/5 border border-blue-500/10 p-3.5 rounded-xl text-xs text-slate-500 font-sans leading-relaxed">
              <strong>💡 Mechanism:</strong> Resolves the recipient address associated with the target’s owner profile tag dynamically, drafts a structured email complete with priority variables, logs the outcome, and attempts to send SMTP mail safely.
            </div>
          </div>
          <div className="p-4 px-6 border-t border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] bg-white/20">
            <button
              onClick={handleSendManual}
              disabled={sendingEmail || !selectedTarget}
              className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-sm font-semibold shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {sendingEmail ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
              Send Alert Email Now
            </button>
          </div>
        </div>
      </div>

      {/* Notification Log History Section */}
      <div className="space-y-3">
        <div className="bg-slate-50/70 border border-slate-200/25 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:max-w-2xl">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
                <Search size={14} />
              </span>
              <input
                type="text"
                className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <select
                className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Sent">Sent</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
            <div>
              <select
                className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="Task Assignment">Task Assignment</option>
                <option value="Task Reassignment">Task Reassignment</option>
                <option value="Task Notification">Task Notification</option>
                <option value="Issue Assignment">Issue Assignment</option>
                <option value="Issue Notification">Issue Notification</option>
              </select>
            </div>
          </div>
          {currentUser.role === "Admin" && logs.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3.5 py-1.5 text-xs bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 font-medium rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all duration-150 ml-auto"
            >
              <Trash2 size={13} />
              Clear Log History
            </button>
          )}
        </div>

        {/* Audit Log table */}
        <div className="bg-white/30 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-white/80 border-b border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] text-slate-500 text-[11px] font-semibold uppercase tracking-wider font-mono">
                  <th className="py-4 px-6 w-28">Notif ID</th>
                  <th className="py-4 px-6">Reference ID</th>
                  <th className="py-4 px-6">Alert Category</th>
                  <th className="py-4 px-6">Recipient Name</th>
                  <th className="py-4 px-6">Email Address</th>
                  <th className="py-4 px-6">Status Indicator</th>
                  <th className="py-4 px-6 max-w-sm">Summary Body</th>
                  <th className="py-4 px-6">Dispatched date</th>
                  <th className="py-4 px-6">Triggered By</th>
                  <th className="py-4 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 text-xs text-slate-600">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <span className="animate-spin inline-block border-2 border-blue-500 border-t-transparent rounded-full w-5 h-5 mr-1"></span>
                      <span className="font-sans text-slate-500">Querying logs audit ledger...</span>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-slate-500 font-sans">
                      No notifications rows match criteria or catalog is currently blank.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-3.5 px-6 font-mono text-slate-500 font-semibold">{log.id}</td>
                      <td className="py-3.5 px-6 font-mono text-blue-400 font-semibold">{log.referenceId || "—"}</td>
                      <td className="py-3.5 px-6">
                        <span className={`text-[9px] font-semibold font-mono border px-2 py-0.5 rounded-full ${
                          log.type.includes("Issue") ? "bg-orange-500/10 text-orange-400 border-orange-500/15" : "bg-blue-500/10 text-blue-400 border-blue-500/15"
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-semibold">{log.recipientName}</td>
                      <td className="py-3.5 px-6 font-mono text-slate-500">{log.recipientEmail}</td>
                      <td className="py-3.5 px-6">
                        {log.status === "Sent" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-green-400 font-medium tracking-wide">
                            <CheckCircle size={10} />
                            Dispatched
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-red-400 font-medium tracking-wide" title={log.status}>
                            <AlertTriangle size={10} />
                            Blocked
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 max-w-sm shrink text-slate-500 font-sans line-clamp-1" title={log.message}>{log.message}</td>
                      <td className="py-3.5 px-6 text-slate-500 font-mono text-[10px]">
                        {log.sentDate ? new Date(log.sentDate).toLocaleString() : "—"}
                      </td>
                      <td className="py-3.5 px-6 text-slate-500 font-mono text-[10px]">{log.triggeredBy}</td>
                      <td className="py-3.5 px-6 text-center">
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-1 px-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700/50 rounded transition-all cursor-pointer"
                          title="Purge transaction row"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
