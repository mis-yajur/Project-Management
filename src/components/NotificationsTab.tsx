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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
        {/* Card 1: Email Configuration */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2 bg-white">
            <Mail size={18} className="text-[#9a55ff]" />
            <span className="font-display font-extrabold text-slate-900 tracking-wide">Automated Email System API</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-semibold text-slate-900 tracking-wide" htmlFor="email_enabled">Enable Email Notifications</label>
                <p className="text-xs text-slate-500 font-bold">Dispatches logs directly via standard SMTP/MailApp services.</p>
              </div>
              <input
                type="checkbox"
                id="email_enabled"
                disabled={currentUser.role === "User"}
                className="w-5 h-5 text-purple-600 accent-purple-600 bg-white border-slate-300 rounded focus:ring-[#9a55ff] cursor-pointer disabled:opacity-30"
                checked={settings.email_enabled === "true"}
                onChange={(e) => setSettings({ ...settings, email_enabled: e.target.checked ? "true" : "false" })}
              />
            </div>
            
            <hr className="border-slate-100 my-2" />

            <div className="space-y-3">
              <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-550">Auto-trigger Event Rules</span>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs text-slate-700" htmlFor="auto_notify_task_create">On New Task Creation</label>
                  <p className="text-[10px] text-slate-500 font-sans">Alerts the assignee only when task is created by another team member.</p>
                </div>
                <input
                  type="checkbox"
                  id="auto_notify_task_create"
                  disabled={currentUser.role === "User"}
                  className="w-4 h-4 text-purple-600 accent-purple-600 bg-white border-slate-300 rounded focus:ring-[#9a55ff] cursor-pointer disabled:opacity-30"
                  checked={settings.auto_notify_task_create === "true"}
                  onChange={(e) => setSettings({ ...settings, auto_notify_task_create: e.target.checked ? "true" : "false" })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs text-slate-700" htmlFor="auto_notify_task_assign">On Task Reassignment Change</label>
                  <p className="text-[10px] text-slate-500 font-sans">Triggers instant notification specifically when a leader reallocates task owner.</p>
                </div>
                <input
                  type="checkbox"
                  id="auto_notify_task_assign"
                  disabled={currentUser.role === "User"}
                  className="w-4 h-4 text-purple-600 accent-purple-600 bg-white border-slate-300 rounded focus:ring-[#9a55ff] cursor-pointer disabled:opacity-30"
                  checked={settings.auto_notify_task_assign === "true"}
                  onChange={(e) => setSettings({ ...settings, auto_notify_task_assign: e.target.checked ? "true" : "false" })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs text-slate-700" htmlFor="auto_notify_issue_assign">On Issue Assignment Change</label>
                  <p className="text-[10px] text-slate-500 font-sans">Alerts assigned developer profile that a new blocker contains their tag.</p>
                </div>
                <input
                  type="checkbox"
                  id="auto_notify_issue_assign"
                  disabled={currentUser.role === "User"}
                  className="w-4 h-4 text-purple-600 accent-purple-600 bg-white border-slate-300 rounded focus:ring-[#9a55ff] cursor-pointer disabled:opacity-30"
                  checked={settings.auto_notify_issue_assign === "true"}
                  onChange={(e) => setSettings({ ...settings, auto_notify_issue_assign: e.target.checked ? "true" : "false" })}
                />
              </div>
            </div>
          </div>
          <div className="p-4 px-6 border-t border-slate-100 bg-white">
            <button
               onClick={handleSaveSettings}
               disabled={savingSettings || currentUser.role === "User"}
               className="w-full py-2.5 bg-gradient-primary hover:opacity-95 text-white font-bold rounded-xl text-sm shadow-md shadow-purple-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-35 transition-all"
             >
               {savingSettings ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
               {currentUser.role === "User" ? "Admin / Manager Access only" : "Save Automation Parameters"}
            </button>
          </div>
        </div>

        {/* Card 2: Manual Notification Dispatcher */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between font-sans">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2 bg-white">
            <Send size={18} className="text-[#9a55ff]" />
            <span className="font-display font-extrabold text-slate-900 tracking-wide">Manual Mail Dispatcher Terminal</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Scope Category</label>
              <select
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm text-[#343a40] outline-none focus:border-[#9a55ff] focus:ring-1 focus:ring-[#9a55ff]"
                value={manualType}
                onChange={(e) => setManualType(e.target.value as "task" | "issue")}
              >
                <option value="task">Milestone Deliverable Tasks</option>
                <option value="issue">Blockers or Issue Tickets</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Select Target Deliverable</label>
              <select
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm text-[#343a40] outline-none focus:border-[#9a55ff] focus:ring-1 focus:ring-[#9a55ff]"
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

            <div className="bg-purple-50 border border-purple-100/70 p-3.5 rounded-xl text-xs text-[#343a40] font-bold leading-relaxed">
              <strong>💡 Mechanism:</strong> Resolves the recipient address associated with the target’s owner profile tag dynamically, drafts a structured email complete with priority variables, logs the outcome, and attempts to send SMTP mail safely.
            </div>
          </div>
          <div className="p-4 px-6 border-t border-slate-100 bg-white">
            <button
              onClick={handleSendManual}
              disabled={sendingEmail || !selectedTarget}
              className="w-full py-2.5 bg-gradient-primary hover:opacity-95 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 transition-all font-bold"
            >
              {sendingEmail ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
              Send Alert Email Now
            </button>
          </div>
        </div>
      </div>

      {/* Notification Log History Section */}
      <div className="space-y-3 font-sans">
        <div className="bg-slate-50/70 border border-slate-200/40 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:max-w-2xl">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                <Search size={14} />
              </span>
              <input
                type="text"
                className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-[#9a55ff] focus:ring-1 focus:ring-[#9a55ff] transition-colors"
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <select
                className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3.5 text-xs text-slate-700 outline-none focus:border-[#9a55ff] focus:ring-1 focus:ring-[#9a55ff]"
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
                className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3.5 text-xs text-slate-700 outline-none focus:border-[#9a55ff] focus:ring-1 focus:ring-[#9a55ff]"
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
        </div>

        {/* Audit Log Modern Color-Coded Card Display */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-xs">
            <div className="flex flex-col items-center justify-center gap-3">
              <span className="animate-spin inline-block border-3 border-purple-650 border-t-transparent rounded-full w-8 h-8"></span>
              <p className="text-sm font-semibold tracking-wide text-slate-600 font-sans">Querying logs and compiling audit ledger...</p>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl py-16 px-6 text-center max-w-2xl mx-auto shadow-xs">
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-slate-50 mb-4 text-slate-350">
              <Bell size={24} className="animate-pulse" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800 tracking-tight font-display">No logs found</h3>
            <p className="text-xs text-slate-500 mt-1 mb-1 font-sans">
              There are currently no notification rows matching your search parameters or the log database is empty.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {filteredLogs.map((log) => {
              const isIssue = log.type.includes("Issue");
              const isSent = log.status === "Sent";
              
              return (
                <div 
                  key={log.id} 
                  className={`relative bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.015)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-300 flex flex-col justify-between overflow-hidden group ${
                    isSent ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-rose-400"
                  }`}
                >
                  {/* Card Main Area */}
                  <div className="p-5 space-y-4">
                    {/* Header: ID & Meta tags */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        {log.referenceId ? (
                          <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md tracking-wider border ${
                            isIssue 
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20" 
                              : "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                          }`}>
                            {log.referenceId}
                          </span>
                        ) : null}
                        
                        <span className={`text-[9px] font-semibold tracking-wider uppercase font-sans ${
                          isIssue ? "text-amber-500" : "text-indigo-500"
                        }`}>
                          {log.type}
                        </span>
                      </div>
                      
                      <span className="text-[10px] font-mono select-all bg-slate-50 border border-slate-100 rounded-md px-1.5 py-0.5 text-slate-400 font-semibold shadow-2xs">
                        {log.id}
                      </span>
                    </div>

                    {/* Recipient User Block */}
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-800 tracking-tight font-sans">
                        {log.recipientName}
                      </div>
                      <div className="text-[10px] font-mono text-slate-450 flex items-center gap-1">
                        <Mail size={10} className="text-slate-350" />
                        {log.recipientEmail}
                      </div>
                    </div>

                    {/* Speech snippet of the alert content */}
                    <div className="bg-slate-50 hover:bg-slate-50/80 rounded-xl p-3 border border-slate-100/85 transition-colors">
                      <p className="text-xs text-slate-600 leading-relaxed font-sans line-clamp-3 select-text" title={log.message}>
                        {log.message}
                      </p>
                    </div>
                  </div>

                  {/* Card bottom metadata ribbon */}
                  <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-1.5 text-[10px] font-mono text-slate-450 mt-auto">
                    <div className="flex flex-col gap-0.5 shrink">
                      <div className="text-slate-500 font-bold">
                        {log.sentDate ? new Date(log.sentDate).toLocaleString() : "—"}
                      </div>
                      <div className="text-slate-400">
                        Triggered: <span className="text-slate-520 font-semibold">{log.triggeredBy}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="shrink-0">
                        {isSent ? (
                          <span className="inline-flex items-center gap-1 text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-200/60 font-bold px-2 py-0.5 rounded-full select-none shadow-2xs">
                            <CheckCircle size={9} />
                            Dispatched
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] text-rose-500 bg-rose-50 border border-rose-200/60 font-bold px-2 py-0.5 rounded-full select-none shadow-2xs" title={log.status}>
                            <AlertTriangle size={9} />
                            Failed
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50/80 rounded-lg transition-all cursor-pointer border border-transparent hover:border-rose-100/80"
                        title="Purge transaction record"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
