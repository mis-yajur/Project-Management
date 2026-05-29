import React, { useState, useEffect } from "react";
import { Users, UserPlus, Search, Trash2, Edit, Loader2, RotateCw } from "lucide-react";
import { api } from "../api";
import { User } from "../types";

interface UsersTabProps {
  currentUser: User;
}

export default function UsersTab({ currentUser }: UsersTabProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  
  // Modal toggle
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editId, setEditId] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    role: "User",
    department: "",
    contactNumber: "",
    managerId: ""
  });
  const [managers, setManagers] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers(currentUser.role, currentUser.id);
      if (res && res.success) {
        setUsers(res.data);
        setFilteredUsers(res.data);
      }
      
      const deptsRes = await api.getDepartmentList();
      if (deptsRes && deptsRes.success) {
        setDepartments(deptsRes.data);
      }

      const mgrsRes = await api.getManagers();
      if (mgrsRes && mgrsRes.success) {
        setManagers(mgrsRes.data);
      }
    } catch (err) {
      console.error("Load users fail", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Handle local searching/filtering
  useEffect(() => {
    let result = [...users];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(u => 
        u.username.toLowerCase().includes(s) || 
        u.fullName.toLowerCase().includes(s) || 
        u.email.toLowerCase().includes(s)
      );
    }
    if (roleFilter) {
      result = result.filter(u => u.role === roleFilter);
    }
    if (deptFilter) {
      result = result.filter(u => u.department === deptFilter);
    }
    setFilteredUsers(result);
  }, [search, roleFilter, deptFilter, users]);

  const handleEditClick = (u: any) => {
    setModalMode("edit");
    setEditId(u.id);
    setFormData({
      username: u.username,
      password: "", // Leave blank to not update, or allow updating
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      department: u.department,
      contactNumber: u.contactNumber || "",
      managerId: u.managerId || ""
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (currentUser.role !== "Admin") {
      alert("Unauthorized. Only administrators can delete accounts.");
      return;
    }
    if (id === currentUser.id) {
       alert("Invalid target. Cannot delete your own administrative session.");
       return;
    }
    if (!window.confirm("Are you sure you want to delete this user? This process cannot be undone.")) return;

    try {
      const res = await api.deleteUser(id);
      if (res.success) {
        alert("Account deprovisioned successfully.");
        loadData();
      } else {
        alert(res.message || "Failed to delete user");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || (modalMode === "create" && !formData.password) || !formData.fullName || !formData.email || !formData.department) {
      alert("Please fill all required (*) fields.");
      return;
    }
    setCreating(true);
    try {
      let res;
      if (modalMode === "create") {
        res = await api.createUser(formData, currentUser.id);
      } else {
        const edits = { ...formData };
        if (!edits.password) delete edits.password;
        res = await api.updateUser(editId, edits);
      }
      
      if (res.success) {
        alert(`Security user successfully ${modalMode === "create" ? "provisioned" : "updated"}!`);
        setShowModal(false);
        setFormData({
          username: "",
          password: "",
          fullName: "",
          email: "",
          role: "User",
          department: "",
          contactNumber: "",
          managerId: ""
        });
        loadData();
      } else {
        alert(res.message || `Could not ${modalMode} user.`);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Action Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white px-6 py-5 rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] backdrop-blur">
        <div className="space-y-1">
          <h2 className="text-xl font-display font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <Users size={20} className="text-blue-400" />
            Security Users Management
          </h2>
          <p className="text-xs text-slate-500 font-sans">Provision credentials, roles, and administrative departments.</p>
        </div>
        {currentUser.role === "Admin" && (
          <button
            onClick={() => {
              setModalMode("create");
              setFormData({
                username: "",
                password: "",
                fullName: "",
                email: "",
                role: "User",
                department: "",
                contactNumber: "",
                managerId: ""
              });
              setShowModal(true);
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-white flex items-center gap-2 text-sm shadow-lg shadow-blue-500/10 hover:shadow-blue-500/15 group tracking-wide cursor-pointer transition-all duration-200"
          >
            <UserPlus size={16} />
            New Security User
          </button>
        )}
      </div>

      {/* Local Filter Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-white/10 p-4 rounded-xl border border-slate-200/20">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            className="w-full bg-white/40 border border-slate-200/60 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="Search username, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <select
            className="w-full bg-white/40 border border-slate-200/60 rounded-lg py-2 px-3 text-sm text-slate-700 focus:outline-none focus:border-blue-500"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="User">User</option>
          </select>
        </div>
        <div>
          <select
            className="w-full bg-white/40 border border-slate-200/60 rounded-lg py-2 px-3 text-sm text-slate-700 focus:outline-none focus:border-blue-500"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 border border-slate-200 hover:bg-white font-medium text-xs text-slate-600 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer hover:border-slate-300 transition-all duration-200"
        >
          <RotateCw size={12} />
          Reload List
        </button>
      </div>

      {/* Users Ledger Table */}
      <div className="bg-white/30 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/80 border-b border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] text-slate-500 text-[11px] font-semibold uppercase tracking-wider font-mono">
                <th className="py-4 px-6">ID</th>
                <th className="py-4 px-6">Username</th>
                <th className="py-4 px-6">Full Name</th>
                <th className="py-4 px-6">Email Address</th>
                <th className="py-4 px-6">Role</th>
                <th className="py-4 px-6">Department</th>
                <th className="py-4 px-6">Contact Number</th>
                {currentUser.role === "Admin" && <th className="py-4 px-6 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 text-sm text-slate-600">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <Loader2 size={32} className="animate-spin text-blue-400 mx-auto" />
                    <p className="text-sm font-sans text-slate-500 mt-2">Connecting to auth servers...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-slate-500 font-sans">
                    No registry matching criteria found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-500 group-hover:text-blue-500">{u.id}</td>
                    <td className="py-4 px-6 font-medium text-slate-700">{u.username}</td>
                    <td className="py-4 px-6">{u.fullName}</td>
                    <td className="py-4 px-6 font-mono text-xs text-slate-500">{u.email}</td>
                    <td className="py-4 px-6">
                      <span className={`text-[10px] font-medium tracking-wide border font-mono px-2.5 py-0.5 rounded-full ${
                        u.role === 'Admin' ? 'bg-rose-500/10 text-rose-400 border-rose-500/15' :
                        u.role === 'Manager' ? 'bg-blue-500/10 text-blue-400 border-blue-500/15' :
                        'bg-green-500/10 text-green-400 border-green-500/15'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500">{u.department || "-"}</td>
                    <td className="py-4 px-6 font-mono text-slate-500 text-xs">{u.contactNumber || "-"}</td>
                    {currentUser.role === "Admin" && (
                      <td className="py-4 px-6 text-center space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleEditClick(u)}
                          className="p-1.5 text-slate-500 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-all cursor-pointer inline-flex items-center justify-center gap-1"
                          title="Edit Account"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={u.id === currentUser.id}
                          className="p-1.5 text-slate-500 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-500 rounded-lg hover:bg-red-50 transition-all cursor-pointer inline-flex items-center justify-center gap-1"
                          title="Deprovision Account"
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
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="text-lg font-display font-medium text-slate-900">Deprovision / Register Security User</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreateUserSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block required">Username</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      placeholder="e.g. jdoe"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={`text-xs font-semibold text-slate-500 uppercase tracking-wider block ${modalMode === "create" ? "required" : ""}`}>Password {modalMode === "edit" ? "(Leave blank to keep)" : ""}</label>
                    <input
                      type="password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      placeholder={modalMode === "edit" ? "•••••••• (unchanged)" : "••••••••"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={modalMode === "create"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block required">Full Name</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      placeholder="e.g. John Doe"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block required">Email Address</label>
                    <input
                      type="email"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      placeholder="e.g. jdoe@yajur.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block required">Role</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      required
                    >
                      <option value="Admin">Admin</option>
                      <option value="Manager">Manager</option>
                      <option value="User">User</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Contact Number</label>
                    <input
                      type="tel"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      placeholder="+91 XXXXX XXXXX"
                      value={formData.contactNumber}
                      onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block required">Dept Segment</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  {formData.role === "User" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Direct Line Manager</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                        value={formData.managerId}
                        onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                      >
                        <option value="">Select Manager</option>
                        {managers.map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-white text-sm shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  {creating && <Loader2 size={14} className="animate-spin" />}
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
