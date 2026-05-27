import { useState, useEffect } from "react";
import { BarChart3, FileDown, RotateCw, Search, X } from "lucide-react";
import { api } from "../api";
import { Task, User } from "../types";

interface ReportTabProps {
  currentUser: User;
}

export default function ReportTab({ currentUser }: ReportTabProps) {
  const [reportTasks, setReportTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic filter lists
  const [departments, setDepartments] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);

  // Filter conditions
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState(""); // "" (All), "parent" (Parent Tasks), "subtask" (Subtasks only)
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Sorting
  const [sortKey, setSortKey] = useState<string>("id");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Summary Metrics
  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    closed: 0,
    high: 0,
    overdue: 0,
    avg: 0
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getTasks("All Task", currentUser.id, currentUser.role);
      if (res && res.success) {
        setReportTasks(res.data);
        setFilteredTasks(res.data);
        
        // Extract filters dynamically
        const deptsSet = new Set<string>();
        const grpsSet = new Set<string>();
        res.data.forEach((t: Task) => {
          if (t.department) deptsSet.add(t.department);
          if (t.group) grpsSet.add(t.group);
        });
        setDepartments(Array.from(deptsSet).sort());
        setGroups(Array.from(grpsSet).sort());
      }
    } catch (err) {
      console.error("Load report error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Apply filters & calculate summaries
  useEffect(() => {
    let result = [...reportTasks];
    const now = new Date();

    if (statusFilter) {
      result = result.filter(t => t.status === statusFilter);
    }
    if (priorityFilter) {
      result = result.filter(t => t.priority === priorityFilter);
    }
    if (deptFilter) {
      result = result.filter(t => t.department === deptFilter);
    }
    if (groupFilter) {
      result = result.filter(t => t.group === groupFilter);
    }
    if (typeFilter) {
      if (typeFilter === "parent") {
        result = result.filter(t => !t.parentTaskId);
      } else if (typeFilter === "subtask") {
        result = result.filter(t => !!t.parentTaskId);
      }
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(t => 
        t.id.toLowerCase().includes(s) || 
        t.name.toLowerCase().includes(s) || 
        (t.description && t.description.toLowerCase().includes(s)) || 
        (t.owner && t.owner.toLowerCase().includes(s)) || 
        (t.tags && t.tags.toLowerCase().includes(s))
      );
    }
    if (dateFrom) {
      result = result.filter(t => t.dueDate && t.dueDate.slice(0, 10) >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(t => t.dueDate && t.dueDate.slice(0, 10) <= dateTo);
    }

    // Apply Sorting
    result.sort((a, b) => {
      let va = (a as any)[sortKey] ?? "";
      let vb = (b as any)[sortKey] ?? "";

      if (sortKey === "completion" || sortKey === "autoProgress") {
        va = Number(va);
        vb = Number(vb);
      } else if (["startDate", "dueDate", "createdDate"].includes(sortKey)) {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      } else {
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
      }

      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });

    setFilteredTasks(result);

    // Summary calculations
    const total = result.length;
    const open = result.filter(t => t.status.toLowerCase() !== "closed").length;
    const closed = result.filter(t => t.status.toLowerCase() === "closed").length;
    const high = result.filter(t => (t.priority || "").toLowerCase() === "high").length;
    const overdue = result.filter(t => {
      if (!t.dueDate || t.status.toLowerCase() === "closed") return false;
      return new Date(t.dueDate) < now;
    }).length;
    const avg = total > 0 ? Math.round(result.reduce((s, t) => s + (Number(t.completion) || 0), 0) / total) : 0;

    setSummary({ total, open, closed, high, overdue, avg });
  }, [search, statusFilter, priorityFilter, deptFilter, groupFilter, typeFilter, dateFrom, dateTo, sortKey, sortAsc, reportTasks]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const handleClearFilters = () => {
    setStatusFilter("");
    setPriorityFilter("");
    setDeptFilter("");
    setGroupFilter("");
    setTypeFilter("");
    setSearch("");
    setDateFrom("");
    setDateTo("");
  };

  const getHeatmapColorStyle = (pct: number) => {
    if (pct <= 25) return "bg-red-500 text-red-100";
    if (pct <= 50) return "bg-amber-500 text-amber-950";
    if (pct <= 75) return "bg-orange-500 text-orange-950";
    if (pct <= 90) return "bg-lime-500 text-lime-950";
    return "bg-green-500 text-green-100";
  };

  const getHeatmapColor = (pct: number) => {
    if (pct <= 25) return "#ef4444";
    if (pct <= 50) return "#f97316";
    if (pct <= 75) return "#f59e0b";
    if (pct <= 90) return "#84cc16";
    return "#22c55e";
  };

  const downloadCSV = () => {
    if (filteredTasks.length === 0) {
      alert("Validation Error: No printable row records matching filters to export.");
      return;
    }
    const headers = ["Task ID", "Type", "Task Name", "Description", "Department", "Owner", "Doer (Tags)", "Status", "Priority", "Group", "Start Date", "Due Date", "Manual %", "Auto %", "Parent Task ID", "Dependency", "Created Date"];
    const rows = filteredTasks.map(t => {
      const isSub = !!t.parentTaskId;
      return [
        t.id,
        isSub ? "Subtask" : "Task",
        t.name,
        t.description || "",
        t.department || "",
        t.owner || "",
        t.tags || "",
        t.status || "",
        t.priority || "None",
        t.group || "",
        t.startDate ? t.startDate.slice(0,10) : "",
        t.dueDate ? t.dueDate.slice(0,10) : "",
        `${t.completion || 0}%`,
        `${t.autoProgress || 0}%`,
        t.parentTaskId || "",
        t.dependency || "No",
        t.createdDate ? t.createdDate.slice(0,10) : ""
      ];
    });

    const csvContent = [headers, ...rows].map(r => 
      r.map(val => {
        const strVal = String(val).replace(/"/g, '""');
        return strVal.includes(",") || strVal.includes('"') || strVal.includes("\n") ? `"${strVal}"` : strVal;
      }).join(",")
    ).join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Task_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    alert(`Reporting ledger exported. Total of ${filteredTasks.length} indices written successfully.`);
  };

  return (
    <div className="space-y-6">
      {/* Search & Action Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/20 px-6 py-5 rounded-2xl border border-slate-700/35 backdrop-blur">
        <div className="space-y-1">
          <h2 className="text-xl font-display font-medium text-slate-100 tracking-tight flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-400" />
            Analytical Management Reports
          </h2>
          <p className="text-xs text-slate-400 font-sans">Query performance thresholds, dates, segments, and export standard spreadsheets files.</p>
        </div>
        <button
          onClick={downloadCSV}
          className="px-5 py-2.5 bg-green-600 hover:bg-green-500 rounded-xl font-medium text-slate-150 flex items-center gap-2 text-sm shadow-lg shadow-green-500/10 hover:shadow-green-500/15 group tracking-wide cursor-pointer transition-all duration-200"
        >
          <FileDown size={16} />
          Download CSV Ledger
        </button>
      </div>

      {/* Multipurpose Filter Bento Grid */}
      <div className="bg-slate-800/10 p-5 rounded-xl border border-slate-700/25 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <select
            className="bg-slate-900/60 border border-slate-700/60 rounded-lg py-1.5 px-2.5 text-xs text-slate-350 focus:outline-none focus:border-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="To Be Tested">To Be Tested</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            className="bg-slate-900/60 border border-slate-700/60 rounded-lg py-1.5 px-2.5 text-xs text-slate-350 focus:outline-none focus:border-blue-500"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            <option value="None">None</option>
          </select>

          <select
            className="bg-slate-900/60 border border-slate-700/60 rounded-lg py-1.5 px-2.5 text-xs text-slate-350 focus:outline-none focus:border-blue-500"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            className="bg-slate-900/60 border border-slate-700/60 rounded-lg py-1.5 px-2.5 text-xs text-slate-350 focus:outline-none focus:border-blue-500"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="">All Groups</option>
            {groups.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select
            className="bg-slate-900/60 border border-slate-700/60 rounded-lg py-1.5 px-2.5 text-xs text-slate-350 focus:outline-none focus:border-blue-500"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Tasks & Subtasks</option>
            <option value="parent">Parent Tasks only</option>
            <option value="subtask">Subtasks only</option>
          </select>

          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-500 pointer-events-none">
              <Search size={14} />
            </span>
            <input
              type="text"
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg py-1.5 pl-8 pr-7 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Query search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-100 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1 font-mono text-[10px]">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold tracking-wider uppercase">Due Date Range:</span>
            <input
              type="date"
              className="bg-slate-900 border border-slate-700 rounded p-1 text-slate-350 select-text"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              className="bg-slate-900 border border-slate-700 rounded p-1 text-slate-350 select-text"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <button
              onClick={handleClearFilters}
              className="bg-slate-800 hover:bg-slate-750 text-[10px] text-slate-300 font-semibold border border-slate-700 rounded px-2.5 py-1 flex items-center gap-1 cursor-pointer transition-all inline-block ml-3"
            >
              Reset Filters
            </button>
          </div>
          <span className="text-slate-400 font-medium font-sans text-xs">
            Showing <strong className="text-blue-400 text-sm font-semibold">{summary.total}</strong> record{summary.total !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
        {[
          { label: "Total Rows", val: summary.total, color: "text-blue-400" },
          { label: "Open Tickets", val: summary.open, color: "text-cyan-400" },
          { label: "Closed Milestones", val: summary.closed, color: "text-slate-400" },
          { label: "High Urgency", val: summary.high, color: "text-red-400 animated-pulse" },
          { label: "Calendar Overdue", val: summary.overdue, color: "text-amber-500" },
          { label: "Average Complete", val: `${summary.avg}%`, color: "text-green-400" }
        ].map((met, i) => (
          <div key={i} className="bg-slate-800/25 border border-slate-700/35 rounded-xl p-4 text-center hover:translate-y-[-2px] transition-transform duration-200">
            <span className={`text-2xl font-display font-semibold block leading-tight ${met.color}`}>{met.val}</span>
            <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider mt-1.5 leading-none">{met.label}</span>
          </div>
        ))}
      </div>

      {/* Report Matrix Grid */}
      <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1400px]">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700/50 text-[11px] font-semibold uppercase tracking-wider font-mono select-none">
                {[
                  { key: "id", label: "Task ID" },
                  { key: "type", label: "Type", noSort: true },
                  { key: "name", label: "Task Name" },
                  { key: "description", label: "Description", noSort: true },
                  { key: "department", label: "Department" },
                  { key: "owner", label: "Owner" },
                  { key: "tags", label: "Doer (Tags)" },
                  { key: "status", label: "Status" },
                  { key: "priority", label: "Priority" },
                  { key: "group", label: "Group", noSort: true },
                  { key: "startDate", label: "Start Date" },
                  { key: "dueDate", label: "Due Date" },
                  { key: "daysLeft", label: "Days Left", noSort: true },
                  { key: "completion", label: "Manual %" },
                  { key: "autoProgress", label: "Auto %" },
                  { key: "parentTaskId", label: "Parent ID", noSort: true },
                  { key: "dependency", label: "Dependency", noSort: true },
                  { key: "createdDate", label: "Created Date" }
                ].map((th) => (
                  <th
                    key={th.key}
                    onClick={() => !th.noSort && toggleSort(th.key)}
                    className={`py-4 px-4 ${!th.noSort ? "cursor-pointer hover:bg-slate-750 text-slate-350" : "text-slate-450"}`}
                  >
                    <div className="flex items-center gap-1">
                      {th.label}
                      {!th.noSort && (
                        <span className="text-[10px] opacity-40">
                          {sortKey === th.key ? (sortAsc ? "▲" : "▼") : "⇅"}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30 text-xs text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={18} className="py-24 text-center">
                    <span className="animate-spin inline-block border-2 border-blue-500 border-t-transparent rounded-full w-6 h-6 mr-2"></span>
                    <span className="font-sans text-slate-500">Compiling ledger reports...</span>
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-20 text-center text-slate-500 font-sans">
                    No registry rows match your specified filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => {
                  const isSub = !!t.parentTaskId;
                  const typeLabel = isSub ? "Subtask" : "Task";
                  const pctM = Number(t.completion) || 0;
                  const pctA = Number(t.autoProgress) || 0;

                  // Days calculation
                  let dlimitText = "-";
                  let dlimitStyle = "text-slate-400";
                  if (t.dueDate) {
                    if (t.status.toLowerCase() === "closed") {
                      dlimitText = "Completed";
                      dlimitStyle = "text-slate-500";
                    } else {
                      const due = new Date(t.dueDate);
                      const now = new Date();
                      const days = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      if (days < 0) {
                        dlimitText = `${Math.abs(days)}d Overdue`;
                        dlimitStyle = "text-red-400 font-semibold";
                      } else if (days <= 3) {
                        dlimitText = `${days}d Left`;
                        dlimitStyle = "text-amber-400 font-semibold";
                      } else {
                        dlimitText = `${days} days`;
                        dlimitStyle = "text-slate-300";
                      }
                    }
                  }

                  return (
                    <tr key={t.id} className={`hover:bg-slate-800/15 transition-colors group ${isSub ? "bg-slate-850/15" : ""}`}>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-400 group-hover:text-blue-450">{t.id}</td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[9px] font-medium px-2 py-0.5 rounded font-mono border ${
                          isSub ? "bg-slate-700/20 text-slate-400 border-slate-700/25" : "bg-blue-500/10 text-blue-400 border-blue-500/15"
                        }`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-150 truncate max-w-[150px]" title={t.name}>{t.name}</td>
                      <td className="py-3.5 px-4 text-slate-400 max-w-[170px] truncate" title={t.description}>{t.description || "-"}</td>
                      <td className="py-3.5 px-4 text-slate-400 truncate max-w-[120px]" title={t.department}>{t.department}</td>
                      <td className="py-3.5 px-4 text-slate-450 truncate" title={t.owner}>{t.owner}</td>
                      <td className="py-3.5 px-4 text-slate-450 truncate font-mono text-xs">{t.tags || "-"}</td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border inline-block ${
                          t.status === "Closed" ? "bg-slate-500/10 text-slate-400 border-slate-500/10" : "bg-blue-500/10 text-blue-400 border-blue-500/15"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">{t.priority}</td>
                      <td className="py-3.5 px-4 text-slate-450 font-mono text-xs truncate max-w-[100px]">{t.group || "-"}</td>
                      <td className="py-3.5 px-4 font-mono text-[10px] text-slate-450">{t.startDate ? t.startDate.slice(0,10) : "-"}</td>
                      <td className="py-3.5 px-4 font-mono text-[10px] text-slate-450">{t.dueDate ? t.dueDate.slice(0,10) : "-"}</td>
                      <td className={`py-3.5 px-4 font-mono font-medium ${dlimitStyle}`}>{dlimitText}</td>
                      <td className="py-3.5 px-4 text-slate-350">
                        {/* Manual progress indicator */}
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-slate-700/60 h-1.5 rounded-full overflow-hidden relative">
                            <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full" style={{ width: `${pctM}%` }}></div>
                          </div>
                          <span className="font-semibold text-blue-400 font-mono">{pctM}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-350">
                        {/* Auto progress timeline indicator */}
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-slate-700/60 h-1.5 rounded-full overflow-hidden relative">
                            <div className="absolute inset-y-0 left-0 rounded-full opacity-65" style={{ width: `${pctA}%`, backgroundColor: getHeatmapColor(pctA) }}></div>
                          </div>
                          <span className="font-semibold font-mono" style={{ color: getHeatmapColor(pctA) }}>{pctA}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-450 text-[10px]">{t.parentTaskId || "-"}</td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded inline-block ${
                          t.dependency === "Yes" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/15" : "text-slate-500"
                        }`}>
                          {t.dependency}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[10px] text-slate-450">{t.createdDate ? t.createdDate.slice(0,10) : "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
