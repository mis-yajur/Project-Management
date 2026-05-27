import React, { useState, useEffect } from "react";
import { ListTodo, Plus, Search, RotateCw, Edit, Trash2, Eye, Loader2, ChevronDown, ChevronRight, HelpCircle } from "lucide-react";
import { api } from "../api";
import { Task, User } from "../types";

interface TasksTabProps {
  currentUser: User;
  onNavigateTab: (tabId: string, searchVal?: string) => void;
  overrideFilter?: string;
}

export default function TasksTab({ currentUser, onNavigateTab, overrideFilter }: TasksTabProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering states
  const [filterType, setFilterType] = useState(overrideFilter || "All Task");
  const [groupFilter, setGroupFilter] = useState("");
  const [groups, setGroups] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  // Expand / collapse subtasks keys
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  // Dropdown options
  const [departments, setDepartments] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [parentTasks, setParentTasks] = useState<Task[]>([]);

  // Modals Toggle
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Forms states
  const [createForm, setCreateForm] = useState({
    name: "",
    department: "",
    description: "",
    startDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    priority: "Medium",
    tags: "", // Doer
    group: "",
    owner: "",
    status: "Open",
    parentTaskId: ""
  });
  const [isSubtask, setIsSubtask] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit form states
  const [editForm, setEditForm] = useState({
    status: "Open",
    completion: 0,
    priority: "Medium",
    owner: ""
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getTasks(filterType, currentUser.id, currentUser.role);
      if (res && res.success) {
        setTasks(res.data);
        setFilteredTasks(res.data);
        setGroups(res.groups || []);
      }

      const deptsRes = await api.getDepartmentList();
      if (deptsRes && deptsRes.success) setDepartments(deptsRes.data);

      const usersRes = await api.getAllActiveUsers();
      if (usersRes && usersRes.success) setActiveUsers(usersRes.data);

      // Get list of possible parent tasks
      const allTasksRes = await api.getTasks("All Task", currentUser.id, currentUser.role);
      if (allTasksRes && allTasksRes.success) {
        setParentTasks(allTasksRes.data.filter((t: any) => !t.parentTaskId));
      }
    } catch (err) {
      console.error("Task load failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterType, currentUser]);

  // Adjust override filter if prop changes
  useEffect(() => {
    if (overrideFilter) {
      setFilterType(overrideFilter);
    }
  }, [overrideFilter]);

  // Search & filter matching logic
  useEffect(() => {
    let result = [...tasks];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(t => 
        t.name.toLowerCase().includes(s) || 
        t.id.toLowerCase().includes(s) || 
        (t.description && t.description.toLowerCase().includes(s)) || 
        (t.tags && t.tags.toLowerCase().includes(s))
      );
    }
    if (groupFilter) {
      result = result.filter(t => t.group === groupFilter);
    }
    setFilteredTasks(result);
  }, [search, groupFilter, tasks]);

  const toggleParent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedParents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = async (t: Task) => {
    if (currentUser.role !== "Admin" && currentUser.id !== t.owner) {
      alert("Unauthorized. Only administrators or the task owner can delete this record.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this task? This cannot be undone.")) return;
    try {
      const res = await api.deleteTask(t.id);
      if (res.success) {
        alert("Task deleted!");
        loadData();
      } else {
        alert(res.message || "Failed to delete task");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.department || !createForm.startDate || !createForm.dueDate) {
      alert("Please fill all required (*) fields.");
      return;
    }
    if (createForm.startDate > createForm.dueDate) {
      alert("Syntax Error: Start Date cannot be set after Due Date.");
      return;
    }
    if (isSubtask && !createForm.parentTaskId) {
      alert("Please select a parent task segment.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...createForm,
        parentTaskId: isSubtask ? createForm.parentTaskId : ""
      };
      const res = await api.createTask(payload, currentUser.id);
      if (res.success) {
        alert("Task successfully provisioned!");
        setShowCreateModal(false);
        setCreateForm({
          name: "",
          department: "",
          description: "",
          startDate: new Date().toISOString().split("T")[0],
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          priority: "Medium",
          tags: "",
          group: "",
          owner: "",
          status: "Open",
          parentTaskId: ""
        });
        setIsSubtask(false);
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

  const handleEditClick = (t: Task) => {
    setSelectedTask(t);
    setEditForm({
      status: t.status,
      completion: t.completion || 0,
      priority: t.priority || "Medium",
      owner: t.owner || ""
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setSubmitting(true);
    try {
      const res = await api.updateTask(selectedTask.id, editForm);
      if (res.success) {
        alert("Task updated successfully!");
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

  const handleDependencyChange = async (t: Task, val: string) => {
    try {
      const res = await api.updateTask(t.id, { dependency: val });
      if (res.success) {
        loadData();
      } else {
        alert(res.message || "Failed to update dependency parameter.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const viewTaskDetails = (t: Task) => {
    setSelectedTask(t);
    setShowViewModal(true);
  };

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("progress")) return "bg-blue-500/10 text-blue-400 border-blue-500/15";
    if (s.includes("review")) return "bg-amber-500/10 text-amber-400 border-amber-500/15";
    if (s.includes("test")) return "bg-cyan-500/10 text-cyan-400 border-cyan-500/15";
    if (s.includes("closed")) return "bg-slate-500/10 text-slate-400 border-slate-500/10";
    return "bg-green-500/10 text-green-400 border-green-500/15";
  };

  const getPriorityStyle = (priority: string) => {
    const p = (priority || "").toLowerCase();
    if (p.includes("high")) return "bg-rose-500/10 text-rose-400 border-rose-500/15";
    if (p.includes("low")) return "bg-green-500/10 text-green-400 border-green-500/15";
    if (p.includes("medium")) return "bg-amber-500/10 text-amber-400 border-amber-500/15";
    return "bg-slate-500/10 text-slate-400 border-slate-500/15";
  };

  const getHeatmapColor = (pct: number) => {
    if (pct <= 25) return "#ef4444"; // red
    if (pct <= 50) return "#f59e0b"; // amber
    if (pct <= 75) return "#f97316"; // orange
    if (pct <= 90) return "#84cc16"; // lime
    return "#22c55e"; // green
  };

  // Grouping hierarchy sorting - parent then children directly under them
  const mainParents = filteredTasks.filter(t => !t.parentTaskId).sort((a,b) => a.id.localeCompare(b.id));
  const subMap: Record<string, Task[]> = {};
  filteredTasks.forEach(t => {
    if (t.parentTaskId) {
      if (!subMap[t.parentTaskId]) subMap[t.parentTaskId] = [];
      subMap[t.parentTaskId].push(t);
    }
  });

  const calculateDaysLeft = (dueDateStr: string, status: string) => {
    if (!dueDateStr) return { text: "-", style: "text-slate-400" };
    if (status.toLowerCase() === "closed") return { text: "Completed", style: "text-slate-500" };
    
    const due = new Date(dueDateStr);
    const now = new Date();
    const d = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (d < 0) {
      return { text: `${Math.abs(d)}d overdue`, style: "text-red-400 font-semibold" };
    } else if (d <= 2) {
      return { text: `${d}d left`, style: "text-amber-400 font-semibold" };
    }
    return { text: `${d} days`, style: "text-slate-350" };
  };

  return (
    <div className="space-y-6">
      {/* Search & Action Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/20 px-6 py-5 rounded-2xl border border-slate-700/35 backdrop-blur">
        <div className="space-y-1">
          <h2 className="text-xl font-display font-medium text-slate-100 tracking-tight flex items-center gap-2">
            <ListTodo size={20} className="text-blue-400" />
            Milestones and Deliverables
          </h2>
          <p className="text-xs text-slate-400 font-sans">Complete backlog directory of project assignments and hierarchy structures.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-slate-100 flex items-center gap-2 text-sm shadow-lg shadow-blue-500/10 hover:shadow-blue-500/15 group tracking-wide cursor-pointer transition-all duration-200"
        >
          <Plus size={16} />
          New Task Milestone
        </button>
      </div>

      {/* Ribbon Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-800/10 p-4 rounded-xl border border-slate-700/20">
        <div>
          <select
            className="w-full bg-slate-900/40 border border-slate-700/60 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All Task">All Task</option>
            <option value="Open Task">Open Task</option>
            <option value="Complete Task">Complete Task</option>
            <option value="View by Owner">View by Owner</option>
          </select>
        </div>
        <div>
          <select
            className="w-full bg-slate-900/40 border border-slate-700/60 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="">All Groups</option>
            {groups.map(g => (
              <option key={g} value={g}>{g}</option>
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
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 border border-slate-700 hover:bg-slate-800 font-medium text-xs text-slate-300 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer hover:border-slate-600 transition-all duration-200"
        >
          <RotateCw size={12} />
          Reload List
        </button>
      </div>

      {/* Task Matrix Ledger */}
      <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1250px]">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700/50 text-slate-400 text-[11px] font-semibold uppercase tracking-wider font-mono">
                <th className="py-4 px-6 w-28">Task ID</th>
                <th className="py-4 px-6">Task Name</th>
                <th className="py-4 px-6 max-w-xs">Description</th>
                <th className="py-4 px-6">Department</th>
                <th className="py-4 px-6">Owner</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Doer (Tags)</th>
                <th className="py-4 px-6 text-center">Days Limit</th>
                <th className="py-4 px-6">Priority</th>
                <th className="py-4 px-6 min-w-[180px]">Double Progress %</th>
                <th className="py-4 px-6">Group</th>
                <th className="py-4 px-6">Dependency</th>
                <th className="py-4 px-6 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30 text-sm text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-20 text-center">
                    <Loader2 size={32} className="animate-spin text-blue-400 mx-auto" />
                    <p className="text-sm font-sans text-slate-500 mt-2">Connecting to Sheets databases...</p>
                  </td>
                </tr>
              ) : mainParents.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-20 text-center text-slate-500 font-sans">
                    No matching task deliverables found in sheets directory.
                  </td>
                </tr>
              ) : (
                mainParents.map((t) => {
                  const children = subMap[t.id] || [];
                  const isExpanded = !!expandedParents[t.id];
                  const dlimit = calculateDaysLeft(t.dueDate, t.status);
                  const hasChildren = children.length > 0;

                  return (
                    <>
                      {/* Parent Row */}
                      <tr key={t.id} className="hover:bg-slate-800/15 transition-colors group">
                        <td className="py-4 px-6 flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-400 group-hover:text-blue-450">
                          {hasChildren ? (
                            <button
                              onClick={(e) => toggleParent(t.id, e)}
                              className="text-blue-400 hover:bg-slate-700/40 p-0.5 rounded cursor-pointer"
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          ) : (
                            <span className="w-5"></span>
                          )}
                          {t.dependency === "Yes" ? (
                            <button
                              onClick={() => onNavigateTab("dependency", t.id)}
                              className="text-blue-400 font-bold hover:underline cursor-pointer"
                            >
                              {t.id}
                            </button>
                          ) : (
                            <span>{t.id}</span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-150">{t.name}</td>
                        <td className="py-4 px-6 text-slate-400 max-w-xs truncate" title={t.description}>
                          {t.description || "-"}
                        </td>
                        <td className="py-4 px-6 text-slate-400">{t.department}</td>
                        <td className="py-4 px-6 text-slate-400">{t.owner}</td>
                        <td className="py-4 px-6">
                          <span className={`text-[10px] font-medium tracking-wide border font-mono px-2 py-0.5 rounded-full ${getStatusStyle(t.status)}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-400">{t.tags || "-"}</td>
                        <td className={`py-4 px-6 text-center text-xs font-mono ${dlimit.style}`}>{dlimit.text}</td>
                        <td className="py-4 px-6">
                          <span className={`text-[10px] font-medium tracking-wide border font-mono px-2 py-0.5 rounded-full ${getPriorityStyle(t.priority)}`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {/* Double Progress visual rendering */}
                          <div className="flex flex-col gap-1 w-full font-mono text-[10px] font-medium text-slate-400">
                            <div className="flex items-center justify-between">
                              <span>Manual Done:</span>
                              <span className="font-semibold text-blue-400">{t.completion || 0}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Auto Target:</span>
                              <span className="font-semibold" style={{ color: getHeatmapColor(t.autoProgress) }}>
                                {t.autoProgress || 0}%
                              </span>
                            </div>
                            {/* The combined linear bar track */}
                            <div className="h-2 w-full bg-slate-700/60 rounded-full relative overflow-hidden" title={`Manual: ${t.completion || 0}%, Auto target: ${t.autoProgress || 0}%`}>
                              <div
                                className="absolute inset-y-0 left-0 opacity-45"
                                style={{
                                  width: `${t.autoProgress || 0}%`,
                                  backgroundColor: getHeatmapColor(t.autoProgress)
                                }}
                              ></div>
                              <div
                                className="absolute inset-y-0 left-0 bg-blue-500 rounded-full"
                                style={{ width: `${t.completion || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-400 font-mono text-xs">{t.group || "-"}</td>
                        <td className="py-4 px-6">
                          <select
                            className="bg-slate-900 border border-slate-700 rounded-md px-1.5 py-1 text-xs text-slate-350 focus:outline-none"
                            value={t.dependency}
                            onChange={(e) => handleDependencyChange(t, e.target.value)}
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => viewTaskDetails(t)}
                              className="p-1 px-1.5 text-slate-500 hover:text-slate-100 rounded hover:bg-slate-700/50 cursor-pointer"
                              title="View Details"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleEditClick(t)}
                              className="p-1 px-1.5 text-slate-500 hover:text-blue-400 rounded hover:bg-slate-700/50 cursor-pointer"
                              title="Update Task"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(t)}
                              disabled={currentUser.role !== "Admin" && currentUser.id !== t.owner}
                              className="p-1 px-1.5 text-slate-500 hover:text-red-400 disabled:opacity-20 rounded hover:bg-slate-700/50 cursor-pointer"
                              title="Delete Task"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Subtasks Rows */}
                      {hasChildren && isExpanded && children.map((c) => {
                        const childLimit = calculateDaysLeft(c.dueDate, c.status);
                        return (
                          <tr key={c.id} className="bg-slate-800/10 hover:bg-slate-800/15 border-l-2 border-blue-500/50 transition-colors group">
                            <td className="py-3 px-6 pl-10 font-mono text-xs font-semibold text-slate-500">
                              {c.id}
                            </td>
                            <td className="py-3 px-6 text-slate-300">
                              <span className="text-slate-500 font-sans text-xs mr-1">└─</span>
                              {c.name}
                            </td>
                            <td className="py-3 px-6 text-slate-450 text-xs max-w-xs truncate" title={c.description}>
                              {c.description || "-"}
                            </td>
                            <td className="py-3 px-6 text-slate-450 text-xs">{c.department}</td>
                            <td className="py-3 px-6 text-slate-450 text-xs">{c.owner}</td>
                            <td className="py-3 px-6">
                              <span className={`text-[9px] font-medium tracking-wide border font-mono px-1.5 py-0.5 rounded-full ${getStatusStyle(c.status)}`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="py-3 px-6 text-slate-450 text-xs">{c.tags || "-"}</td>
                            <td className={`py-3 px-6 text-center text-xs font-mono ${childLimit.style}`}>{childLimit.text}</td>
                            <td className="py-3 px-6">
                              <span className={`text-[9px] font-medium tracking-wide border font-mono px-1.5 py-0.5 rounded-full ${getPriorityStyle(c.priority)}`}>
                                {c.priority}
                              </span>
                            </td>
                            <td className="py-3 px-6">
                              <div className="flex flex-col gap-1 w-full max-w-[150px] font-mono text-[9px] font-medium text-slate-500">
                                <div className="flex items-center justify-between">
                                  <span>Manual: {c.completion || 0}%</span>
                                  <span style={{ color: getHeatmapColor(c.autoProgress) }}>Auto: {c.autoProgress || 0}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-700/60 rounded-full relative overflow-hidden" title={`Manual: ${c.completion || 0}%, Auto target: ${c.autoProgress || 0}%`}>
                                  <div
                                    className="absolute inset-y-0 left-0 opacity-45"
                                    style={{
                                      width: `${c.autoProgress || 0}%`,
                                      backgroundColor: getHeatmapColor(c.autoProgress)
                                    }}
                                  ></div>
                                  <div
                                    className="absolute inset-y-0 left-0 bg-blue-500 rounded-full"
                                    style={{ width: `${c.completion || 0}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-6 text-slate-450 text-xs font-mono">{c.group || "-"}</td>
                            <td className="py-3 px-6">
                              <span className="text-slate-500">-</span>
                            </td>
                            <td className="py-3 px-6 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => viewTaskDetails(c)}
                                  className="p-1 text-slate-500 hover:text-slate-100 rounded hover:bg-slate-700/50 cursor-pointer"
                                >
                                  <Eye size={12} />
                                </button>
                                <button
                                  onClick={() => handleEditClick(c)}
                                  className="p-1 text-slate-500 hover:text-blue-400 rounded hover:bg-slate-700/50 cursor-pointer"
                                >
                                  <Edit size={12} />
                                </button>
                                <button
                                  onClick={() => handleDelete(c)}
                                  disabled={currentUser.role !== "Admin" && currentUser.id !== c.owner}
                                  className="p-1 text-slate-500 hover:text-red-400 disabled:opacity-20 rounded hover:bg-slate-700/50 cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </>
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
              <h3 className="text-lg font-display font-medium text-slate-200">Create Task Deliverable</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-100 text-sm font-semibold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block required">Task Name</label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                      placeholder="e.g. Conduct compliance checks"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block required">Department Segment</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      value={createForm.department}
                      onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                      required
                    >
                      <option value="">Select Segment</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Description</label>
                  <textarea
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    placeholder="Enter detailed instructions or bullet items..."
                    rows={3}
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block required">Start Date</label>
                    <input
                      type="date"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      value={createForm.startDate}
                      onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block required">Due Date</label>
                    <input
                      type="date"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      value={createForm.dueDate}
                      onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Priority</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      value={createForm.priority}
                      onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    >
                      <option value="None">None</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Doer (Assignee Tags)</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      value={createForm.tags}
                      onChange={(e) => setCreateForm({ ...createForm, tags: e.target.value })}
                    >
                      <option value="">Select User Profile Tag</option>
                      {activeUsers.map(u => (
                        <option key={u.id} value={u.username}>{u.username} ({u.name})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Group Index</label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                      placeholder="e.g. Phase-1, Project-Alpha"
                      value={createForm.group || ""}
                      onChange={(e) => setCreateForm({ ...createForm, group: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Milestone Owner</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      value={createForm.owner}
                      onChange={(e) => setCreateForm({ ...createForm, owner: e.target.value })}
                    >
                      <option value="">Select Owner</option>
                      {activeUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="createIsSubtask"
                      className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-500 focus:ring-1"
                      checked={isSubtask}
                      onChange={(e) => setIsSubtask(e.target.checked)}
                    />
                    <label htmlFor="createIsSubtask" className="text-sm font-medium text-slate-200 cursor-pointer">This is a subtask</label>
                  </div>
                </div>

                {isSubtask && (
                  <div className="space-y-1.5 transition-all">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block required">Select Parent Miletone</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      value={createForm.parentTaskId}
                      onChange={(e) => setCreateForm({ ...createForm, parentTaskId: e.target.value })}
                      required
                    >
                      <option value="">Select Parent Task</option>
                      {parentTasks.map(p => (
                        <option key={p.id} value={p.id}>{p.id} — {p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
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
                  Register Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE MODAL */}
      {showEditModal && selectedTask && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-700/65 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-lg font-display font-medium text-slate-200">Update Deliverable details: {selectedTask.id}</h3>
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
                    <option value="In Progress">In Progress</option>
                    <option value="In Review">In Review</option>
                    <option value="To Be Tested">To Be Tested</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Manual Completion %</label>
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
                  <span className="text-[10px] text-slate-500 block">Sliding details is synchronized automatically on save.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Priority</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  >
                    <option value="None">None</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Milestone Owner</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    value={editForm.owner}
                    onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })}
                  >
                    <option value="">Select Owner</option>
                    {activeUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
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

      {/* VIEW MODAL */}
      {showViewModal && selectedTask && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-700/65 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-lg font-display font-medium text-slate-200">Milestone Details & Ledger</h3>
              <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-slate-100 text-sm font-semibold cursor-pointer">✕</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <table className="w-full text-slate-350 border-collapse divide-y divide-slate-750 font-sans text-sm">
                <tbody>
                  {[
                    { label: "Task ID", val: selectedTask.id },
                    { label: "Milestone Name", val: selectedTask.name },
                    { label: "Description", val: selectedTask.description || "-" },
                    { label: "Associated Segment", val: selectedTask.department },
                    { label: "Leader / Owner", val: selectedTask.owner },
                    { label: "Status Level", val: selectedTask.status },
                    { label: "Doer (Tags / Assignee)", val: selectedTask.tags || "-" },
                    { label: "Start Date", val: selectedTask.startDate ? new Date(selectedTask.startDate).toLocaleDateString() : "-" },
                    { label: "Due Date Limit", val: selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : "-" },
                    { label: "Priority Level", val: selectedTask.priority },
                    { label: "Manual Completion", val: `${selectedTask.completion || 0}%` },
                    { label: "Auto Progress Timeline", val: `${selectedTask.autoProgress || 0}%` },
                    { label: "Subtask Parent ID", val: selectedTask.parentTaskId || "-" },
                    { label: "Cluster Group", val: selectedTask.group || "-" },
                    { label: "Dependency Factor", val: selectedTask.dependency || "No" },
                    { label: "Created Date", val: selectedTask.createdDate ? new Date(selectedTask.createdDate).toLocaleString() : "-" }
                  ].map((row, i) => (
                    <tr key={i} className="py-2.5 flex justify-between items-start border-b border-slate-700/40">
                      <td className="font-medium text-slate-400 uppercase text-[10px] tracking-wider py-2 font-mono w-44">{row.label}</td>
                      <td className="text-slate-200 text-right font-medium max-w-xs break-words py-2 font-sans">{row.val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-700/60 bg-slate-900/50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-200 text-sm font-semibold cursor-pointer transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
