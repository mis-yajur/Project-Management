import React, { useState, useEffect } from "react";
import { Building2, Plus, Search, RotateCw, Trash2, Loader2 } from "lucide-react";
import { api } from "../api";
import { Department, User } from "../types";

interface DepartmentsTabProps {
  currentUser: User;
}

export default function DepartmentsTab({ currentUser }: DepartmentsTabProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSel, setFilterSel] = useState("All Departments");
  const [search, setSearch] = useState("");
  const [activeUsers, setActiveUsers] = useState<any[]>([]);

  // Modal setup
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    owner: ""
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getDepartments(filterSel, currentUser.id);
      if (res && res.success) {
        setDepartments(res.data);
        setFilteredDepartments(res.data);
      }
      
      const usersRes = await api.getAllActiveUsers();
      if (usersRes && usersRes.success) {
        setActiveUsers(usersRes.data);
      }
    } catch (err) {
      console.error("Load depts failure", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterSel, currentUser]);

  useEffect(() => {
    let result = [...departments];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(d => 
        d.name.toLowerCase().includes(s) || 
        d.description.toLowerCase().includes(s)
      );
    }
    setFilteredDepartments(result);
  }, [search, departments]);

  const handleDelete = async (id: string) => {
    if (currentUser.role !== "Admin") {
      alert("Unauthorized. Only administrators can delete core organizational sections.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this department? Any associated tasks and dependencies may be orphaned.")) return;
    try {
      const res = await api.deleteDepartment(id);
      if (res.success) {
        alert("Department deprovisioned.");
        loadData();
      } else {
        alert(res.message || "Failed to delete department");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Please specify the Department Name.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.createDepartment(formData, currentUser.id);
      if (res.success) {
        alert("Department created successfully!");
        setShowModal(false);
        setFormData({ name: "", description: "", owner: "" });
        loadData();
      } else {
        alert(res.message || "Could not register department.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Action Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white px-6 py-5 rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] backdrop-blur">
        <div className="space-y-1">
          <h2 className="text-xl font-display font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <Building2 size={20} className="text-blue-400" />
            Departments Segments
          </h2>
          <p className="text-xs text-slate-500 font-sans">Manage corporate partitions and section performance indices.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-white flex items-center gap-2 text-sm shadow-lg shadow-blue-500/10 hover:shadow-blue-500/15 group tracking-wide cursor-pointer transition-all duration-200"
        >
          <Plus size={16} />
          New Department
        </button>
      </div>

      {/* Ribbon Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/10 p-4 rounded-xl border border-slate-200/20">
        <div>
          <select
            className="w-full bg-white/40 border border-slate-200/60 rounded-lg py-2 px-3 text-sm text-slate-700 focus:outline-none focus:border-blue-500"
            value={filterSel}
            onChange={(e) => setFilterSel(e.target.value)}
          >
            <option value="All Departments">All Departments</option>
            <option value="Open Department">Open Department</option>
            <option value="Complete Department">Complete Department</option>
            <option value="View by Owner">View by Owner</option>
          </select>
        </div>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            className="w-full bg-white/40 border border-slate-200/60 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="Search department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 border border-slate-200 hover:bg-white font-medium text-xs text-slate-600 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer hover:border-slate-300 transition-all duration-200"
        >
          <RotateCw size={12} />
          Reload Sections
        </button>
      </div>

      {/* Departments Table */}
      <div className="bg-white/30 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/80 border-b border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] text-slate-500 text-[11px] font-semibold uppercase tracking-wider font-mono">
                <th className="py-4 px-6">Dept ID</th>
                <th className="py-4 px-6">Department Name</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6">Owner Indicator</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-center">Total Tasks</th>
                <th className="py-4 px-6 text-center">Open Tasks</th>
                {currentUser.role === "Admin" && <th className="py-4 px-6 text-center">Action</th>}
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
              ) : filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-slate-500 font-sans">
                    No registry rows matching specifications are currently found.
                  </td>
                </tr>
              ) : (
                filteredDepartments.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-500">{d.id}</td>
                    <td className="py-4 px-6 font-medium text-slate-700">{d.name}</td>
                    <td className="py-4 px-6 text-slate-500 max-w-sm truncate" title={d.description}>{d.description || "-"}</td>
                    <td className="py-4 px-6 text-slate-500">{d.owner || "-"}</td>
                    <td className="py-4 px-6">
                      <span className={`text-[10px] font-medium tracking-wide font-mono px-2.5 py-0.5 rounded-full border ${
                        d.status === "Open" ? "bg-green-500/10 text-green-400 border-green-500/15" : "bg-slate-500/10 text-slate-500 border-slate-500/15"
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center font-semibold font-mono text-slate-700">{d.totalTasks}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`font-semibold font-mono px-2 py-0.5 rounded ${
                        d.openTasks > 0 ? "text-amber-400 bg-amber-500/5" : "text-green-400 bg-green-500/5"
                      }`}>
                        {d.openTasks}
                      </span>
                    </td>
                    {currentUser.role === "Admin" && (
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/15 transition-all cursor-pointer"
                          title="Delete Segment"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-display font-medium text-slate-700">Register New Segment</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-800 text-sm font-semibold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreateDept}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block required">Segment Name</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Quality Engineering"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Description</label>
                  <textarea
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    placeholder="Brief description of responsibilities"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Managing Director / Owner</label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-blue-500"
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  >
                    <option value="">Select Owner</option>
                    {activeUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200/60 bg-slate-50 flex justify-end gap-3">
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
                  Create Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
