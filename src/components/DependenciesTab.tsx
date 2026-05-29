import React, { useState, useEffect } from "react";
import { Link, Plus, Search, RotateCw, Edit, Trash2, Loader2 } from "lucide-react";
import { api } from "../api";
import { Dependency, User } from "../types";

interface DependenciesTabProps {
  currentUser: User;
  overrideSearch?: string;
}

export default function DependenciesTab({ currentUser, overrideSearch }: DependenciesTabProps) {
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [filteredDependencies, setFilteredDependencies] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(overrideSearch || "");

  // Modal toggle
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDependency, setSelectedDependency] = useState<Dependency | null>(null);
  
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Creation form
  const [createForm, setCreateForm] = useState({
    taskId: "",
    dependsOn: "",
    type: "Finish to Start",
    notes: ""
  });

  // Edit status form
  const [statusForm, setStatusForm] = useState("Active");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getDependencies();
      if (res && res.success) {
        setDependencies(res.data);
        setFilteredDependencies(res.data);
      }

      const tasksRes = await api.getTasks("All Task", currentUser.id, currentUser.role);
      if (tasksRes && tasksRes.success) {
        setActiveTasks(tasksRes.data);
      }
    } catch (err) {
      console.error("Dependency load failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  useEffect(() => {
    if (overrideSearch) {
      setSearch(overrideSearch);
    }
  }, [overrideSearch]);

  useEffect(() => {
    let result = [...dependencies];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(d => 
        d.id.toLowerCase().includes(s) || 
        d.taskId.toLowerCase().includes(s) || 
        d.dependsOn.toLowerCase().includes(s) ||
        (d.notes && d.notes.toLowerCase().includes(s))
      );
    }
    setFilteredDependencies(result);
  }, [search, dependencies]);

  const handleDelete = async (id: string) => {
    if (currentUser.role !== "Admin") {
      alert("Unauthorized. Only administrators can delete core dependency logs.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this dependency? It will unlink the tasks.")) return;
    try {
      const res = await api.deleteDependency(id);
      if (res.success) {
        alert("Dependency unlinked successfully!");
        loadData();
      } else {
        alert(res.message || "Unlink transaction failed.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.taskId || !createForm.dependsOn) {
      alert("Please select both tasks.");
      return;
    }
    if (createForm.taskId === createForm.dependsOn) {
      alert("Invalid: A task cannot establish a circular dependency on itself.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.createDependency(createForm);
      if (res.success) {
        alert("Dependency linked successfully!");
        setShowModal(false);
        setCreateForm({ taskId: "", dependsOn: "", type: "Finish to Start", notes: "" });
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

  const handleEditClick = (d: Dependency) => {
    setSelectedDependency(d);
    setStatusForm(d.status);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDependency) return;
    setSubmitting(true);
    try {
      const res = await api.updateDependency(selectedDependency.id, { status: statusForm });
      if (res.success) {
        alert("Dependency state updated!");
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

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("blocked")) return "bg-red-500/10 text-red-400 border-red-500/15";
    if (s.includes("resolved")) return "bg-green-500/10 text-green-400 border-green-500/15";
    return "bg-blue-500/10 text-blue-400 border-blue-500/15";
  };

  return (
    <div className="space-y-6">
      {/* Search & Action Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white px-6 py-5 rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] backdrop-blur">
        <div className="space-y-1">
          <h2 className="text-xl font-display font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <Link size={20} className="text-blue-400" />
            Task Dependencies
          </h2>
          <p className="text-xs text-slate-500 font-sans">Establish and prioritize strict execution flow and predecessor blockages.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-white flex items-center gap-2 text-sm shadow-lg shadow-blue-500/10 hover:shadow-blue-500/15 group tracking-wide cursor-pointer transition-all duration-200"
        >
          <Plus size={16} />
          New Dependency Link
        </button>
      </div>

      {/* Ribbon Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white/10 p-4 rounded-xl border border-slate-200/20">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            className="w-full bg-white/40 border border-slate-200/60 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="Search by Dependency ID or Task ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 border border-slate-200 hover:bg-white font-medium text-xs text-slate-600 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer hover:border-slate-300 transition-all duration-200"
        >
          <RotateCw size={12} />
          Refresh List
        </button>
      </div>

      {/* Dependencies Table Ledger */}
      <div className="bg-white/30 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/80 border-b border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] text-slate-500 text-[11px] font-semibold uppercase tracking-wider font-mono">
                <th className="py-4 px-6">Dependency ID</th>
                <th className="py-4 px-6">Target Task ID</th>
                <th className="py-4 px-6">Predecessor (Depends On)</th>
                <th className="py-4 px-6">Constraint Type</th>
                <th className="py-4 px-6">Link Status</th>
                <th className="py-4 px-6">Established Date</th>
                <th className="py-4 px-6">Predecessor Notes</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 text-sm text-slate-600">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <Loader2 size={32} className="animate-spin text-blue-400 mx-auto" />
                    <p className="text-sm font-sans text-slate-500 mt-2">Connecting to sheets database...</p>
                  </td>
                </tr>
              ) : filteredDependencies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-slate-500 font-sans">
                    No matching task dependency links are currently established.
                  </td>
                </tr>
              ) : (
                filteredDependencies.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-500">{d.id}</td>
                    <td className="py-4 px-6 font-semibold text-blue-400 font-mono">{d.taskId}</td>
                    <td className="py-4 px-6 font-semibold text-amber-500 font-mono">{d.dependsOn}</td>
                    <td className="py-4 px-6 text-slate-600 font-medium text-xs">{d.type}</td>
                    <td className="py-4 px-6">
                      <span className={`text-[10px] font-medium tracking-wide border font-mono px-2 py-0.5 rounded-full ${getStatusStyle(d.status)}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-mono text-xs">
                      {d.createdDate ? new Date(d.createdDate).toLocaleDateString() : "-"}
                    </td>
                    <td className="py-4 px-6 text-slate-500 max-w-sm truncate" title={d.notes}>{d.notes || "-"}</td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEditClick(d)}
                          className="p-1 px-1.5 text-slate-500 hover:text-blue-400 rounded hover:bg-slate-700/50 cursor-pointer"
                          title="Edit predecessor status"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          disabled={currentUser.role !== "Admin"}
                          className="p-1 px-1.5 text-slate-500 hover:text-red-400 disabled:opacity-20 rounded hover:bg-slate-700/50 cursor-pointer"
                          title="Delete link"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="text-lg font-display font-medium text-slate-900">Establish Predecessor Link</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block required font-mono">Dependent Task ID (Target)</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                    value={createForm.taskId}
                    onChange={(e) => setCreateForm({ ...createForm, taskId: e.target.value })}
                    required
                  >
                    <option value="">Select Task</option>
                    {activeTasks.map(t => (
                      <option key={t.id} value={t.id}>{t.id} — {t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block required font-mono">Predecessor Task ID (Depends On)</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                    value={createForm.dependsOn}
                    onChange={(e) => setCreateForm({ ...createForm, dependsOn: e.target.value })}
                    required
                  >
                    <option value="">Select Predecessor</option>
                    {activeTasks.map(t => (
                      <option key={t.id} value={t.id}>{t.id} — {t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Dependency Constraint</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                    value={createForm.type}
                    onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                  >
                    <option value="Finish to Start">Finish to Start</option>
                    <option value="Start to Start">Start to Start</option>
                    <option value="Finish to Finish">Finish to Finish</option>
                    <option value="Start to Finish">Start to Finish</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Predecessor Notes</label>
                  <textarea
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    placeholder="Enter detailed reason for the block..."
                    rows={2}
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-white text-sm shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Link Predecessor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedDependency && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="text-lg font-display font-medium text-slate-900">Predecessor State: {selectedDependency.id}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Dependency Status</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                    value={statusForm}
                    onChange={(e) => setStatusForm(e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-white text-sm shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Save State
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
