import React, { useState, useEffect } from "react";
import { AlertCircle, Plus, Search, RotateCw, Edit, Trash2, Loader2, Eye, HelpCircle } from "lucide-react";
import { api } from "../api";
import { Issue, User } from "../types";

interface IssuesTabProps {
  currentUser: User;
}

export default function IssuesTab({ currentUser }: IssuesTabProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterSel, setFilterSel] = useState("All Issue");
  const [deptFilter, setDeptFilter] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  // Users lists
  const [activeUsers, setActiveUsers] = useState<any[]>([]);

  // Modals
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);

  // Form parameters
  const [createForm, setCreateForm] = useState({
    name: "",
    department: "",
    description: "",
    severity: "Medium",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    classification: "Bug",
    tags: "",
    flag: "Normal",
    assignee: ""
  });

  const [editForm, setEditForm] = useState({
    status: "Open",
    completion: 0,
    severity: "Medium",
    assignee: "",
    classification: "Bug",
    flag: ""
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getIssues(filterSel, currentUser.id, currentUser.role);
      if (res && res.success) {
        setIssues(res.data);
        setFilteredIssues(res.data);
      }
      
      const deptsRes = await api.getDepartmentList();
      if (deptsRes && deptsRes.success) {
        setDepartments(deptsRes.data);
      }

      const usersRes = await api.getAllActiveUsers();
      if (usersRes && usersRes.success) {
        setActiveUsers(usersRes.data);
      }
    } catch (err) {
      console.error("Load issues error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterSel, currentUser]);

  useEffect(() => {
    let result = [...issues];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(i => 
        i.name.toLowerCase().includes(s) || 
        i.id.toLowerCase().includes(s) ||
        (i.description && i.description.toLowerCase().includes(s))
      );
    }
    if (deptFilter) {
      result = result.filter(i => i.department === deptFilter);
    }
    setFilteredIssues(result);
  }, [search, deptFilter, issues]);

  const handleDelete = async (i: Issue) => {
    if (currentUser.role !== "Admin" && currentUser.id !== i.assignee) {
      alert("Unauthorized. Only administrators or the issue assignee can delete this log.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this issue?")) return;
    try {
      const res = await api.deleteIssue(i.id);
      if (res.success) {
        alert("Issue record deleted.");
        loadData();
      } else {
        alert(res.message || "Failed to delete issue");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.department || !createForm.severity) {
      alert("Please fill in all core required fields (*).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.createIssue(createForm, currentUser.id);
      if (res.success) {
        alert("Issue successfully recorded!");
        setShowCreateModal(false);
        setCreateForm({
          name: "",
          department: "",
          description: "",
          severity: "Medium",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          classification: "Bug",
          tags: "",
          flag: "Normal",
          assignee: ""
        });
        loadData();
      } else {
        alert(res.message || "Write transaction failed.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (i: Issue) => {
    setSelectedIssue(i);
    setEditForm({
      status: i.status,
      completion: i.manualProgress || 0,
      severity: i.severity || "Medium",
      assignee: i.assignee || "",
      classification: i.classification || "Bug",
      flag: i.flag || "Normal"
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    setSubmitting(true);
    try {
      const res = await api.updateIssue(selectedIssue.id, editForm);
      if (res.success) {
        alert("Issue metrics saved!");
        setShowEditModal(false);
        loadData();
      } else {
        alert(res.message || "Update transaction failed.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const showDetails = (i: Issue) => {
    alert(`Issue: ${i.id}\nName: ${i.name}\nDescription: ${i.description || "None"}\nStatus: ${i.status}\nSeverity: ${i.severity}\nClassification: ${i.classification}`);
  };

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("closed")) return "bg-slate-500/10 text-slate-400 border-slate-500/10";
    return "bg-rose-500/10 text-rose-400 border-rose-500/15";
  };

  const getPriorityStyle = (priority: string) => {
    const p = (priority || "").toLowerCase();
    if (p.includes("high")) return "bg-red-500/10 text-red-500 border-red-500/15";
    if (p.includes("low")) return "bg-green-500/10 text-green-500 border-green-500/15";
    if (p.includes("medium")) return "bg-amber-500/10 text-amber-500 border-amber-500/15";
    return "bg-slate-500/10 text-slate-400 border-slate-505/15";
  };

  const getHeatmapColor = (pct: number) => {
    if (pct <= 25) return "#ef4444";
    if (pct <= 50) return "#f97316";
    if (pct <= 75) return "#f59e0b";
    if (pct <= 90) return "#84cc16";
    return "#22c55e";
  };

  return (
    <div className="space-y-6">
      {/* Search & Action Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/20 px-6 py-5 rounded-2xl border border-slate-700/35 backdrop-blur">
        <div className="space-y-1">
          <h2 className="text-xl font-display font-medium text-slate-100 tracking-tight flex items-center gap-2">
            <AlertCircle size={20} className="text-amber-400" />
            Issue Defect Tracker
          </h2>
          <p className="text-xs text-slate-400 font-sans">Active blockers, improvements, and system logs audit directory.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-slate-100 flex items-center gap-2 text-sm shadow-lg shadow-blue-500/10 hover:shadow-blue-500/15 group tracking-wide cursor-pointer transition-all duration-200"
        >
          <Plus size={16} />
          New Issue Ticket
        </button>
      </div>

      {/* Ribbon Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-800/10 p-4 rounded-xl border border-slate-700/20">
        <div>
          <select
            className="w-full bg-slate-900/40 border border-slate-700/60 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            value={filterSel}
            onChange={(e) => setFilterSel(e.target.value)}
          >
            <option value="All Issue">All Issue</option>
            <option value="Open Issue">Open Issue</option>
            <option value="Closed Issue">Closed Issue</option>
            <option value="View by Owner">View by Owner</option>
          </select>
        </div>
        <div>
          <select
            className="w-full bg-slate-900/40 border border-slate-700/60 rounded-lg py-2 px-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            className="w-full bg-slate-900/40 border border-slate-700/60 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 border border-slate-700 hover:bg-slate-800 font-medium text-xs text-slate-300 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer hover:border-slate-600 transition-all duration-200"
        >
          <RotateCw size={12} />
          Reload Ledger
        </button>
      </div>

      {/* Issues Table Ledger */}
      <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700/50 text-slate-400 text-[11px] font-semibold uppercase tracking-wider font-mono">
                <th className="py-4 px-6">Issue ID</th>
                <th className="py-4 px-6">Issue Title</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6">Department</th>
                <th className="py-4 px-6">Reporter</th>
                <th className="py-4 px-6">Record Date</th>
                <th className="py-4 px-6">Assignee</th>
                <th className="py-4 px-6">Tags</th>
                <th className="py-4 px-6">Due Date</th>
                <th className="py-4 px-6 min-w-[150px]">Double Progress %</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Severity</th>
                <th className="py-4 px-6">Type</th>
                <th className="py-4 px-6">Flag</th>
                <th className="py-4 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30 text-sm text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={15} className="py-20 text-center">
                    <Loader2 size={32} className="animate-spin text-blue-400 mx-auto" />
                    <p className="text-sm font-sans text-slate-500 mt-2">Connecting to sheets database...</p>
                  </td>
                </tr>
              ) : filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-20 text-center text-slate-500 font-sans">
                    No registry rows matching specifications are currently logged.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((i) => {
                  const mp = i.manualProgress || 0;
                  const ap = i.autoProgress || 0;
                  
                  return (
                    <tr key={i.id} className="hover:bg-slate-800/15 transition-colors group">
                      <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-400">{i.id}</td>
                      <td className="py-4 px-6 font-medium text-slate-200">{i.name}</td>
                      <td className="py-4 px-6 text-slate-400 max-w-xs truncate" title={i.description}>{i.description || "-"}</td>
                      <td className="py-4 px-6 text-slate-400">{i.department}</td>
                      <td className="py-4 px-6 text-slate-400">{i.reporter}</td>
                      <td className="py-4 px-6 text-slate-400 font-mono text-xs">
                        {i.createdTime ? new Date(i.createdTime).toLocaleDateString() : "-"}
                      </td>
                      <td className="py-4 px-6 text-slate-400">{i.assignee}</td>
                      <td className="py-4 px-6 text-slate-400 text-xs">{i.tags || "-"}</td>
                      <td className="py-4 px-6 text-slate-400 font-mono text-xs">
                        {i.dueDate ? new Date(i.dueDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1 w-full max-w-[150px] font-mono text-[10px] font-medium text-slate-400">
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span>Manual: {mp}%</span>
                            <span style={{ color: getHeatmapColor(ap) }}>Auto: {ap}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-700/60 rounded-full relative overflow-hidden" title={`Manual: ${mp}%, Auto target: ${ap}%`}>
                            <div
                              className="absolute inset-y-0 left-0 opacity-45"
                              style={{ width: `${ap}%`, backgroundColor: getHeatmapColor(ap) }}
                            ></div>
                            <div
                              className="absolute inset-y-0 left-0 bg-blue-500 rounded-full"
                              style={{ width: `${mp}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-[10px] font-medium tracking-wide border font-mono px-2 py-0.5 rounded-full ${getStatusStyle(i.status)}`}>
                          {i.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-[10px] font-medium tracking-wide border font-mono px-2 py-0.5 rounded-full ${getPriorityStyle(i.severity)}`}>
                          {i.severity}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-400 font-mono text-xs">{i.classification || "-"}</td>
                      <td className="py-4 px-6">
                        <span className={`text-[10px] font-semibold tracking-wide border px-2 py-0.5 rounded ${
                          String(i.flag).toLowerCase() === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/15' :
                          String(i.flag).toLowerCase() === 'important' ? 'bg-amber-500/10 text-amber-400 border-amber-500/15' :
                          'bg-slate-500/10 text-slate-400 border-slate-500/15'
                        }`}>
                          {i.flag || "Normal"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => showDetails(i)}
                            className="p-1 text-slate-500 hover:text-slate-100 rounded hover:bg-slate-755/50 cursor-pointer"
                            title="Quick Info"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleEditClick(i)}
                            className="p-1 text-slate-500 hover:text-blue-400 rounded hover:bg-slate-755/50 cursor-pointer"
                            title="Update Ticket"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(i)}
                            disabled={currentUser.role !== "Admin" && currentUser.id !== i.assignee}
                            className="p-1 text-slate-500 hover:text-red-400 disabled:opacity-20 rounded hover:bg-slate-755/50 cursor-pointer"
                            title="Delete Ticket"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-700/65 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-lg font-display font-medium text-slate-200">Open Blocker / Ticket</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-100 text-sm font-semibold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block required">Issue Title</label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                      placeholder="e.g. Broken links on department portals"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block required">Associated Segment</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      value={createForm.department}
                      onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Detailed explanation</label>
                  <textarea
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    placeholder="Enter thorough details so the assignee has full context..."
                    rows={3}
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block required">Severity Level</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      value={createForm.severity}
                      onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })}
                      required
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block font-mono">Due Date Limit</label>
                    <input
                      type="date"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      value={createForm.dueDate}
                      onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Classification</label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                      placeholder="e.g. Bug, Improvement, Task"
                      value={createForm.classification}
                      onChange={(e) => setCreateForm({ ...createForm, classification: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Metadata Tags</label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                      placeholder="e.g. visual, logic, blocker"
                      value={createForm.tags}
                      onChange={(e) => setCreateForm({ ...createForm, tags: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Priority Flags</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      value={createForm.flag}
                      onChange={(e) => setCreateForm({ ...createForm, flag: e.target.value })}
                    >
                      <option value="Normal">Normal</option>
                      <option value="Important">Important</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Assignee Target</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      value={createForm.assignee}
                      onChange={(e) => setCreateForm({ ...createForm, assignee: e.target.value })}
                    >
                      <option value="">Select Assignee</option>
                      {activeUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-700/60 bg-slate-900/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-100 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-slate-100 text-sm shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Register Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedIssue && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-700/65 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-lg font-display font-medium text-slate-200">Update Issue Ticket: {selectedIssue.id}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-100 text-sm font-semibold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Status</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Completion percentage</label>
                    <span className="font-mono text-sm text-blue-400 font-bold">{editForm.completion}%</span>
                  </div>
                  <input
                    type="range"
                    className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                    min="0"
                    max="100"
                    step="5"
                    value={editForm.completion}
                    onChange={(e) => setEditForm({ ...editForm, completion: parseInt(e.target.value) })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Severity Level</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    value={editForm.severity}
                    onChange={(e) => setEditForm({ ...editForm, severity: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Assignee Target</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    value={editForm.assignee}
                    onChange={(e) => setEditForm({ ...editForm, assignee: e.target.value })}
                  >
                    <option value="">Select Assignee</option>
                    {activeUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Classification</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    value={editForm.classification}
                    onChange={(e) => setEditForm({ ...editForm, classification: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Priority Flag</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    value={editForm.flag}
                    onChange={(e) => setEditForm({ ...editForm, flag: e.target.value })}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Important">Important</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-700/60 bg-slate-900/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-100 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-slate-100 text-sm shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
