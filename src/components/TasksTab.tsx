import React, { useState, useEffect } from "react";
import { ListTodo, Plus, Search, RotateCw, Edit, Trash2, Eye, Loader2, ChevronDown, ChevronRight, HelpCircle, MessageCircle, Link } from "lucide-react";
import { api } from "../api";
import { Task, User } from "../types";
import MaterialPopoverMenu from "./MaterialPopoverMenu";

interface TasksTabProps {
  currentUser: User;
  onNavigateTab: (tabId: string, searchVal?: string) => void;
  overrideFilter?: string;
}

export default function TasksTab({ currentUser, onNavigateTab, overrideFilter }: TasksTabProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [layoutMode, setLayoutMode] = useState<"table" | "board-status" | "board-group">("table");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [customTaskOrder, setCustomTaskOrder] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("project_task_custom_order");
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });
  
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
  const getOwnerName = (ownerId: string) => {
    if (!ownerId) return "-";
    const user = activeUsers.find(
      u => (String(u.id).trim().toLowerCase() === String(ownerId).trim().toLowerCase() ||
            String(u.username).trim().toLowerCase() === String(ownerId).trim().toLowerCase() ||
            String(u.name).trim().toLowerCase() === String(ownerId).trim().toLowerCase())
    );
    return user ? user.name : ownerId;
  };
  const [parentTasks, setParentTasks] = useState<Task[]>([]);

  // Modals Toggle
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // WhatsApp Notification Dialog States
  const [waModal, setWaModal] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "prompt";
    title: string;
    message: string;
    inputValue?: string;
    onConfirm?: (val: string) => void;
  }>({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
    inputValue: ""
  });

  // Quick Dependency Modal
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [dependencyTargetTask, setDependencyTargetTask] = useState<Task | null>(null);
  const [dependencyForm, setDependencyForm] = useState({
    dependsOn: "",
    type: "Finish to Start",
    notes: ""
  });
  const [dependencySubmitting, setDependencySubmitting] = useState(false);

  const openDependencyModal = (t: Task) => {
    setDependencyTargetTask(t);
    setDependencyForm({
      dependsOn: "",
      type: "Finish to Start",
      notes: ""
    });
    setShowDependencyModal(true);
  };

  const handleDependencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dependencyTargetTask) return;
    if (!dependencyForm.dependsOn) {
      alert("Please select a predecessor task.");
      return;
    }
    if (dependencyTargetTask.id === dependencyForm.dependsOn) {
      alert("Invalid: A task cannot establish a circular dependency on itself.");
      return;
    }

    setDependencySubmitting(true);
    try {
      const depRes = await api.createDependency({
        taskId: dependencyTargetTask.id,
        dependsOn: dependencyForm.dependsOn,
        type: dependencyForm.type,
        notes: dependencyForm.notes
      });

      if (!depRes.success) {
        alert(depRes.message || "Failed to create dependency link.");
        setDependencySubmitting(false);
        return;
      }

      // Automatically flag task dependency as "Yes"
      if (dependencyTargetTask.dependency !== "Yes") {
        await api.updateTask(dependencyTargetTask.id, { dependency: "Yes" });
      }

      alert("Dependency link established successfully!");
      setShowDependencyModal(false);
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setDependencySubmitting(false);
    }
  };

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
        alert("Task successfully provisioned! Dispatching automated notification...");
        const createdTask: Task = {
          id: res.taskId,
          name: payload.name,
          description: payload.description || "",
          department: payload.department,
          owner: payload.owner || currentUser.id,
          status: payload.status || "Open",
          tags: payload.tags || "",
          startDate: payload.startDate,
          dueDate: payload.dueDate,
          priority: payload.priority || "Medium",
          completion: 0,
          group: payload.group || "",
          createdDate: new Date().toISOString(),
          autoProgress: 0,
          parentTaskId: payload.parentTaskId,
          calculatedAuto: 0,
          dependency: "No"
        };
        
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
        
        // Trigger SMS sending automatically
        handleSendWhatsApp(createdTask);
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
    if (s.includes("progress")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (s.includes("review")) return "bg-amber-50 text-amber-700 border-amber-200";
    if (s.includes("test")) return "bg-cyan-50 text-cyan-700 border-cyan-200";
    if (s.includes("closed")) return "bg-slate-100 text-slate-600 border-slate-200";
    return "bg-green-50 text-green-700 border-green-200";
  };

  const getPriorityStyle = (priority: string) => {
    const p = (priority || "").toLowerCase();
    if (p.includes("high")) return "bg-rose-50 text-rose-700 border-rose-200";
    if (p.includes("low")) return "bg-green-50 text-green-700 border-green-200";
    if (p.includes("medium")) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  const getHeatmapColor = (pct: number) => {
    if (pct <= 25) return "#ef4444"; // red
    if (pct <= 50) return "#f59e0b"; // amber
    if (pct <= 75) return "#f97316"; // orange
    if (pct <= 90) return "#10b981"; // emerald
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
      return { text: `${Math.abs(d)}d overdue`, style: "text-red-600 font-semibold" };
    } else if (d <= 2) {
      return { text: `${d}d left`, style: "text-amber-600 font-semibold" };
    }
    return { text: `${d} days`, style: "text-slate-600" };
  };

  const getTaskRecipientUser = (t: Task) => {
    if (!activeUsers || activeUsers.length === 0) return null;

    // 1. Try to match by tags (case-insensitive username or name)
    if (t.tags) {
      const cleanTag = String(t.tags).trim().toLowerCase();
      const match = activeUsers.find(
        u => (String(u.username).trim().toLowerCase() === cleanTag ||
              String(u.name).trim().toLowerCase() === cleanTag)
      );
      if (match) return match;
    }

    // 2. Try to match by owner (case-insensitive id, username or name)
    if (t.owner) {
      const cleanOwner = String(t.owner).trim().toLowerCase();
      const match = activeUsers.find(
        u => (String(u.id).trim().toLowerCase() === cleanOwner ||
              String(u.username).trim().toLowerCase() === cleanOwner ||
              String(u.name).trim().toLowerCase() === cleanOwner)
      );
      if (match) return match;
    }

    return null;
  };

  const executeWhatsAppAPI = async (t: Task, phone: string, doer: string) => {
    const dlimit = calculateDaysLeft(t.dueDate, t.status);
    const daysLimitStr = dlimit.text;
    const priorityStr = t.priority || "Medium";
    const formattedLink = `https://mis-yajur.github.io/Project-Management/?tab=tasks&search=${t.id}`;
    
    // Resolve human owner name from ID, fallback to "Owner" if unresolved or empty
    const rawOwner = t.owner ? getOwnerName(t.owner) : "";
    const ownerNameStr = (rawOwner && !rawOwner.startsWith("USR-") && rawOwner !== "-") ? rawOwner : "Owner";

    console.log("Attempting to call api.sendWhatsApp with phone:", phone);
    try {
      const res = await api.sendWhatsApp(
        phone,
        doer,
        t.id,
        daysLimitStr,
        priorityStr,
        formattedLink,
        ownerNameStr
      );

      console.log("WhatsApp response:", res);

      if (res && res.success) {
        setWaModal({
          isOpen: true,
          type: "success",
          title: "Sms Sent Successfully!",
          message: `The WhatsApp automated message has been successfully dispatched to ${doer} (${phone}).`
        });
      } else {
        setWaModal({
          isOpen: true,
          type: "error",
          title: "Sms sending failed!",
          message: res?.message || "Failed to send WhatsApp message"
        });
      }
    } catch (err: any) {
      console.error("WhatsApp API Exception:", err);
      setWaModal({
        isOpen: true,
        type: "error",
        title: "API Exception Occurred",
        message: err.message || "An unexpected network exception was encountered."
      });
    }
  };

  const handleSendWhatsApp = async (t: Task) => {
    const recipient = getTaskRecipientUser(t);
    const defaultPhone = recipient?.contactNumber;
    const doerName = recipient?.name || t.tags || "Team Member";

    console.log("handleSendWhatsApp called for task", t.id, "recipient", recipient);

    let phoneVal = "";
    if (defaultPhone) {
        phoneVal = String(defaultPhone || "").trim().replace(/[+\s-]/g, "");
    }

    if (phoneVal) {
      // Confirmation not require... its auto ok! Skip prompt entirely, send directly and show beautiful HTML success/error popup
      await executeWhatsAppAPI(t, phoneVal, doerName);
    } else {
      // Prompt for phone number inside a beautiful HTML dialog instead of standard window.prompt
      setWaModal({
        isOpen: true,
        type: "prompt",
        title: "Recipient Phone Number Required",
        message: `Send auto task notification via WhatsApp?\n\nRecipient: ${doerName}\n\nPlease enter the phone number with country code (e.g. 919876543210):`,
        inputValue: "",
        onConfirm: async (inputVal: string) => {
          const formattedInput = inputVal.trim().replace(/[+\s-]/g, "");
          if (!formattedInput) {
            setWaModal({
              isOpen: true,
              type: "error",
              title: "Validation Error",
              message: "Error: Mobile phone number is required to trigger WhatsApp."
            });
            return;
          }
          await executeWhatsAppAPI(t, formattedInput, doerName);
        }
      });
    }
  };

  const sortTasksByCustomOrder = (taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
      const idxA = customTaskOrder.indexOf(a.id);
      const idxB = customTaskOrder.indexOf(b.id);
      
      if (idxA !== -1 && idxB !== -1) {
        return idxA - idxB;
      }
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.id.localeCompare(b.id);
    });
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleCardDropOnCard = (e: React.DragEvent, targetId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setDragOverColumn(null);

    const activeId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!activeId || activeId === targetId) return;

    const draggedTask = tasks.find(t => t.id === activeId);
    const targetTask = tasks.find(t => t.id === targetId);
    if (!draggedTask || !targetTask) return;

    const isStatusBoard = layoutMode === "board-status";
    const statusUpdate = isStatusBoard ? { status: targetTask.status } : { group: targetTask.group };

    // Optimistically update
    setTasks(prev => prev.map(t => t.id === activeId ? { ...t, ...statusUpdate } : t));

    setCustomTaskOrder(prev => {
      const filtered = prev.filter(id => id !== activeId);
      const targetIdx = filtered.indexOf(targetId);
      
      let newOrder = [...filtered];
      if (targetIdx !== -1) {
        newOrder.splice(targetIdx, 0, activeId);
      } else {
        newOrder.push(activeId);
      }
      localStorage.setItem("project_task_custom_order", JSON.stringify(newOrder));
      return newOrder;
    });

    api.updateTask(activeId, statusUpdate).then((res) => {
      if (!res.success) {
        alert("Failed to update task sequence/status: " + res.message);
        loadData();
      } else {
        loadData();
      }
    });
  };

  const handleColumnDrop = async (e: React.DragEvent, targetColId: string, groupMode: "status" | "group") => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId) return;

    const taskToMove = tasks.find(t => t.id === taskId);
    if (!taskToMove) return;

    if (groupMode === "status") {
      if (taskToMove.status === targetColId) return;

      // Optimistic locally
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetColId } : t));

      setCustomTaskOrder(prev => {
        const filtered = prev.filter(id => id !== taskId);
        filtered.push(taskId);
        localStorage.setItem("project_task_custom_order", JSON.stringify(filtered));
        return filtered;
      });

      try {
        const res = await api.updateTask(taskId, { status: targetColId });
        if (!res.success) {
          alert("Failed to update status: " + res.message);
          loadData();
        } else {
          loadData();
        }
      } catch (err: any) {
        alert("Error: " + err.message);
        loadData();
      }
    } else {
      const targetGroup = targetColId === "__none__" ? "" : targetColId;
      if (taskToMove.group === targetGroup) return;

      // Optimistic locally
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, group: targetGroup } : t));

      setCustomTaskOrder(prev => {
        const filtered = prev.filter(id => id !== taskId);
        filtered.push(taskId);
        localStorage.setItem("project_task_custom_order", JSON.stringify(filtered));
        return filtered;
      });

      try {
        const res = await api.updateTask(taskId, { group: targetGroup });
        if (!res.success) {
          alert("Failed to update group: " + res.message);
          loadData();
        } else {
          loadData();
        }
      } catch (err: any) {
        alert("Error: " + err.message);
        loadData();
      }
    }
  };

  const renderKanbanCard = (t: Task) => {
    const dlimit = calculateDaysLeft(t.dueDate, t.status);
    const recipient = getTaskRecipientUser(t);
    const doerName = recipient?.name || t.tags || "Team";
    const parentName = t.parentTaskId ? tasks.find(p => p.id === t.parentTaskId)?.name : null;

    return (
      <div
        key={t.id}
        draggable="true"
        onDragStart={(e) => handleDragStart(e, t.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => handleCardDropOnCard(e, t.id)}
        className={`bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing transition-all ${
          draggedTaskId === t.id ? "opacity-30 scale-95 border-blue-500" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-1 mb-2">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest flex flex-col">
            <span>{t.id}</span>
            {parentName && <span className="text-blue-500 text-[9px] lowercase font-sans font-normal truncate mt-0.5 max-w-[140px]" title={`Parent task: ${parentName}`}>part of: {parentName}</span>}
          </span>
          
          <MaterialPopoverMenu
            trigger={
              <button className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                <ChevronRight size={13} className="rotate-90" />
              </button>
            }
            items={[
              {
                label: "View Details",
                icon: <Eye size={13} className="text-blue-500" />,
                onClick: () => viewTaskDetails(t)
              },
              {
                label: "Update Milestone",
                icon: <Edit size={13} className="text-amber-500" />,
                onClick: () => handleEditClick(t)
              },
              {
                label: "Link Dependency",
                icon: <Link size={13} className="text-indigo-500" />,
                onClick: () => openDependencyModal(t)
              },
              {
                label: "Send WhatsApp",
                icon: <MessageCircle size={13} className="text-emerald-500" />,
                onClick: () => handleSendWhatsApp(t)
              },
              {
                label: "Delete Milestone",
                icon: <Trash2 size={13} className="text-rose-500" />,
                onClick: () => handleDelete(t),
                danger: true,
                className: (currentUser.role !== "Admin" && currentUser.id !== t.owner) ? "opacity-30 cursor-not-allowed pointer-events-none" : ""
              }
            ]}
            shape="standard"
          />
        </div>

        <h4 className="text-sm font-semibold text-slate-800 line-clamp-2 leading-relaxed mb-2 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => viewTaskDetails(t)} title={t.name}>
          {t.name}
        </h4>

        {t.description && (
          <p className="text-[11px] text-slate-500 line-clamp-1 mb-2.5 bg-slate-50/50 p-1 rounded-md px-1.5" title={t.description}>
            {t.description}
          </p>
        )}

        {t.group && (
          <span className="inline-block bg-slate-100 text-slate-600 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md mb-2.5 border border-slate-200/50">
            Folder: {t.group}
          </span>
        )}

        <div className="space-y-1 mb-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Target: {t.autoProgress || 0}%</span>
            <span className="font-bold text-blue-600">Done: {t.completion || 0}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-amber-500/20"
              style={{ width: `${t.autoProgress || 0}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-blue-600 rounded-full"
              style={{ width: `${t.completion || 0}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[10px]">
          <div className="flex items-center gap-1.5 text-slate-500 max-w-[100px] truncate" title={`Assignee: ${doerName}`}>
            <div className="w-5 h-5 bg-gradient-to-tr from-slate-200 to-slate-100 text-slate-700 rounded-full flex items-center justify-center font-semibold border border-white shrink-0 shadow-2xs">
              {doerName.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold truncate text-[10px]">{doerName}</span>
          </div>

          <span className={`font-mono font-bold px-1.5 py-0.5 rounded-md ${dlimit.style} border bg-slate-50/20`}>
            {dlimit.text}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Search & Action Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white px-6 py-5 rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(154,85,255,0.02)]">
        <div className="space-y-1">
          <h2 className="text-xl font-display font-extrabold text-[#343a40] tracking-tight flex items-center gap-2">
            <ListTodo size={20} className="text-gradient-primary" />
            Milestones and Deliverables
          </h2>
          <p className="text-xs text-slate-500 font-bold">Complete backlog directory of project assignments and hierarchy structures.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-gradient-primary hover:opacity-95 rounded-xl font-bold text-white flex items-center gap-2 text-sm shadow-md shadow-purple-500/10 hover:shadow-lg hover:shadow-purple-500/20 group tracking-wide cursor-pointer transition-all duration-200"
        >
          <Plus size={16} />
          New Task Milestone
        </button>
      </div>

      {/* Layout Selector tabs/buttons */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white border border-slate-200/60 p-3 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-50 border border-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setLayoutMode("table")}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              layoutMode === "table"
                ? "bg-gradient-primary text-white shadow-md shadow-purple-500/10 font-extrabold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <span>📋 Table View</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode("board-status")}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              layoutMode === "board-status"
                ? "bg-gradient-primary text-white shadow-md shadow-purple-500/10 font-extrabold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <span>🎯 Status Kanban Board</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode("board-group")}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              layoutMode === "board-group"
                ? "bg-gradient-primary text-white shadow-md shadow-purple-500/10 font-extrabold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <span>🏷️ Task Group Board</span>
          </button>
        </div>
        
        <div className="text-[11px] font-semibold text-[#343a40] bg-purple-50 border border-purple-100/40 rounded-xl px-3 py-1.5 flex items-center gap-1">
          <span>💡</span> <span>Drag & drop cards to reassign status or groups instantly</span>
        </div>
      </div>

      {/* Ribbon Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200/65 shadow-sm">
        <div>
          <select
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-700 outline-none focus:border-[#9a55ff] focus:ring-1 focus:ring-[#9a55ff]"
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
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-700 outline-none focus:border-[#9a55ff] focus:ring-1 focus:ring-[#9a55ff]"
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
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-[#9a55ff] focus:ring-1 focus:ring-[#9a55ff] focus:bg-white transition-colors"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => {
            api.clearCache();
            loadData();
          }}
          className="px-4 py-2 border border-slate-200/80 bg-white hover:bg-slate-50 font-bold text-xs text-slate-600 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer hover:border-[#9a55ff]/40 hover:text-[#9a55ff] transition-all duration-200"
        >
          <RotateCw size={12} className="text-[#9a55ff]" />
          Reload List
        </button>
      </div>

      {/* Task Matrix Ledger / Board Views */}
      {layoutMode === "table" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1250px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/85 text-slate-500 text-[11px] font-semibold uppercase tracking-wider font-mono">
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
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={13} className="py-20 text-center">
                      <Loader2 size={32} className="animate-spin text-blue-550 mx-auto" />
                      <p className="text-sm font-sans text-slate-400 mt-2">Connecting to Sheets databases...</p>
                    </td>
                  </tr>
                ) : mainParents.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-20 text-center text-slate-400 font-sans">
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
                      <React.Fragment key={t.id}>
                        {/* Parent Row */}
                        <tr className="hover:bg-slate-50/70 transition-colors group">
                          <td className="py-4 px-6 flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-500">
                            {hasChildren ? (
                              <button
                                onClick={(e) => toggleParent(t.id, e)}
                                className="text-blue-500 hover:bg-slate-100 p-0.5 rounded cursor-pointer"
                              >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            ) : (
                              <span className="w-5"></span>
                            )}
                            {t.dependency === "Yes" ? (
                              <button
                                onClick={() => onNavigateTab("dependency", t.id)}
                                className="text-blue-606 font-bold hover:underline cursor-pointer"
                              >
                                {t.id}
                              </button>
                            ) : (
                              <span>{t.id}</span>
                            )}
                          </td>
                          <td className="py-4 px-6 font-semibold text-slate-805">{t.name}</td>
                          <td className="py-4 px-6 text-slate-500 max-w-xs truncate" title={t.description}>
                            {t.description || "-"}
                          </td>
                          <td className="py-4 px-6 text-slate-500">{t.department}</td>
                          <td className="py-4 px-6 text-slate-500">{getOwnerName(t.owner)}</td>
                          <td className="py-4 px-6">
                            <span className={`text-[10px] font-bold tracking-wide border font-mono px-2 py-0.5 rounded-full ${getStatusStyle(t.status)}`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-500">{t.tags || "-"}</td>
                          <td className={`py-4 px-6 text-center text-xs font-mono ${dlimit.style}`}>{dlimit.text}</td>
                          <td className="py-4 px-6">
                            <span className={`text-[10px] font-bold tracking-wide border font-mono px-2 py-0.5 rounded-full ${getPriorityStyle(t.priority)}`}>
                              {t.priority}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1 w-full font-mono text-[10px] font-semibold text-slate-500">
                              <div className="flex items-center justify-between">
                                <span>Manual Done:</span>
                                <span className="font-bold text-blue-606">{t.completion || 0}%</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Auto Target:</span>
                                <span className="font-bold" style={{ color: getHeatmapColor(t.autoProgress) }}>
                                  {t.autoProgress || 0}%
                                </span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full relative overflow-hidden" title={`Manual: ${t.completion || 0}%, Auto target: ${t.autoProgress || 0}%`}>
                                <div
                                  className="absolute inset-y-0 left-0 opacity-25"
                                  style={{
                                    width: `${t.autoProgress || 0}%`,
                                    backgroundColor: getHeatmapColor(t.autoProgress)
                                  }}
                                ></div>
                                <div
                                  className="absolute inset-y-0 left-0 bg-blue-606 rounded-full"
                                  style={{ width: `${t.completion || 0}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-slate-500 font-mono text-xs">{t.group || "-"}</td>
                          <td className="py-4 px-6">
                            <select
                              className="bg-slate-55 border border-slate-200 rounded-md px-1.5 py-1 text-xs text-slate-606 focus:outline-none focus:bg-white"
                              value={t.dependency}
                              onChange={(e) => handleDependencyChange(t, e.target.value)}
                            >
                              <option value="No">No</option>
                              <option value="Yes">Yes</option>
                            </select>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <MaterialPopoverMenu
                              trigger={
                                <button className="mx-auto px-3 py-1.5 text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-slate-700 hover:text-slate-800 transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-xs">
                                  Actions <ChevronRight size={12} className="opacity-80 text-slate-400" />
                                </button>
                              }
                              items={[
                                {
                                  label: "View Details",
                                  icon: <Eye size={14} className="text-blue-500" />,
                                  onClick: () => viewTaskDetails(t)
                                },
                                {
                                  label: "Update Milestone",
                                  icon: <Edit size={14} className="text-amber-500" />,
                                  onClick: () => handleEditClick(t)
                                },
                                {
                                  label: "Link Dependency",
                                  icon: <Link size={14} className="text-indigo-500" />,
                                  onClick: () => openDependencyModal(t)
                                },
                                {
                                  label: "Send Auto WhatsApp",
                                  icon: <MessageCircle size={14} className="text-emerald-500" />,
                                  onClick: () => handleSendWhatsApp(t)
                                },
                                {
                                  label: "Delete Milestone",
                                  icon: <Trash2 size={14} className="text-rose-500" />,
                                  onClick: () => handleDelete(t),
                                  danger: true,
                                  className: (currentUser.role !== "Admin" && currentUser.id !== t.owner) ? "opacity-30 cursor-not-allowed pointer-events-none" : ""
                                }
                              ]}
                              shape="standard"
                              enableHighlight={true}
                            />
                          </td>
                        </tr>

                        {/* Expanded Subtasks Rows */}
                        {hasChildren && isExpanded && children.map((c) => {
                          const childLimit = calculateDaysLeft(c.dueDate, c.status);
                          return (
                            <tr key={c.id} className="bg-slate-50/50 hover:bg-blue-50/20 border-l-2 border-blue-500/80 transition-colors group">
                              <td className="py-3 px-6 pl-10 font-mono text-xs font-semibold text-slate-500">
                                {c.id}
                              </td>
                              <td className="py-3 px-6 text-slate-700">
                                <span className="text-slate-400 font-sans text-xs mr-1">└─</span>
                                {c.name}
                              </td>
                              <td className="py-3 px-6 text-slate-500 text-xs max-w-xs truncate" title={c.description}>
                                {c.description || "-"}
                              </td>
                              <td className="py-3 px-6 text-slate-500 text-xs">{c.department}</td>
                              <td className="py-3 px-6 text-slate-500 text-xs">{getOwnerName(c.owner)}</td>
                              <td className="py-3 px-6">
                                <span className={`text-[9px] font-bold tracking-wide border font-mono px-1.5 py-0.5 rounded-full ${getStatusStyle(c.status)}`}>
                                  {c.status}
                                </span>
                              </td>
                              <td className="py-3 px-6 text-slate-500 text-xs">{c.tags || "-"}</td>
                              <td className={`py-3 px-6 text-center text-xs font-mono ${childLimit.style}`}>{childLimit.text}</td>
                              <td className="py-3 px-6">
                                <span className={`text-[9px] font-bold tracking-wide border font-mono px-1.5 py-0.5 rounded-full ${getPriorityStyle(c.priority)}`}>
                                  {c.priority}
                                </span>
                              </td>
                              <td className="py-3 px-6">
                                <div className="flex flex-col gap-1 w-full max-w-[150px] font-mono text-[9px] font-semibold text-slate-500">
                                  <div className="flex items-center justify-between">
                                    <span>Manual: {c.completion || 0}%</span>
                                    <span style={{ color: getHeatmapColor(c.autoProgress) }}>Auto: {c.autoProgress || 0}%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-slate-100 rounded-full relative overflow-hidden" title={`Manual: ${c.completion || 0}%, Auto target: ${c.autoProgress || 0}%`}>
                                    <div
                                      className="absolute inset-y-0 left-0 opacity-25"
                                      style={{
                                        width: `${c.autoProgress || 0}%`,
                                        backgroundColor: getHeatmapColor(c.autoProgress)
                                      }}
                                    ></div>
                                    <div
                                      className="absolute inset-y-0 left-0 bg-blue-600 rounded-full"
                                      style={{ width: `${c.completion || 0}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-6 text-slate-500 text-xs font-mono">{c.group || "-"}</td>
                              <td className="py-3 px-6">
                                <span className="text-slate-400">-</span>
                              </td>
                              <td className="py-3 px-6 text-center">
                                <MaterialPopoverMenu
                                  trigger={
                                    <button className="mx-auto px-2 py-1 text-[10px] font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-lg text-slate-600 hover:text-slate-800 transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-xs">
                                      Actions <ChevronRight size={10} className="opacity-80 text-slate-400" />
                                    </button>
                                  }
                                  items={[
                                    {
                                      label: "View Details",
                                      icon: <Eye size={12} className="text-blue-500" />,
                                      onClick: () => viewTaskDetails(c)
                                    },
                                    {
                                      label: "Update Milestone",
                                      icon: <Edit size={12} className="text-amber-500" />,
                                      onClick: () => handleEditClick(c)
                                    },
                                    {
                                      label: "Link Dependency",
                                      icon: <Link size={12} className="text-indigo-500" />,
                                      onClick: () => openDependencyModal(c)
                                    },
                                    {
                                      label: "Send Auto WhatsApp",
                                      icon: <MessageCircle size={12} className="text-emerald-500" />,
                                      onClick: () => handleSendWhatsApp(c)
                                    },
                                    {
                                      label: "Delete Milestone",
                                      icon: <Trash2 size={12} className="text-rose-500" />,
                                      onClick: () => handleDelete(c),
                                      danger: true,
                                      className: (currentUser.role !== "Admin" && currentUser.id !== c.owner) ? "opacity-30 cursor-not-allowed pointer-events-none" : ""
                                    }
                                  ]}
                                  shape="standard"
                                  enableHighlight={true}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Status-Based Kanban Board */}
      {layoutMode === "board-status" && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5 pb-6 overflow-x-auto min-h-[550px]">
          {[
            { id: "Open", title: "Open 📂", color: "border-emerald-250 text-emerald-800 bg-emerald-50/45" },
            { id: "In Progress", title: "In Progress ⚙️", color: "border-blue-250 text-blue-800 bg-blue-50/45" },
            { id: "In Review", title: "In Review 👀", color: "border-amber-250 text-amber-800 bg-amber-50/45" },
            { id: "To Be Tested", title: "To Be Tested 🧪", color: "border-cyan-250 text-cyan-800 bg-cyan-50/45" },
            { id: "Closed", title: "Closed ✅", color: "border-slate-400 text-slate-700 bg-slate-50/45" }
          ].map((col) => {
            const colTasks = sortTasksByCustomOrder(
              filteredTasks.filter((task) => task.status === col.id)
            );
            const isOver = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => handleColumnDrop(e, col.id, "status")}
                className={`flex flex-col min-h-[520px] rounded-2xl p-4 border transition-all duration-250 ${
                  isOver
                    ? "bg-blue-50/60 border-blue-500 border-dashed ring-4 ring-blue-500/5 scale-[1.01]"
                    : "bg-slate-50/80 border-slate-200/60"
                }`}
              >
                {/* Column Headline */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className={`text-xs font-bold tracking-wide border px-2.5 py-1 rounded-xl ${col.color}`}>
                    {col.title}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded-lg border border-slate-200/60 shadow-2xs">
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Scroll Container */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[66vh] pr-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                  {colTasks.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-200/50 rounded-xl flex items-center justify-center text-xs text-slate-400 bg-white/40 text-center px-4 font-sans">
                      No cards here. Drag any task here to reassign status!
                    </div>
                  ) : (
                    colTasks.map((t) => renderKanbanCard(t))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive FolderGroup-Based Kanban Board */}
      {layoutMode === "board-group" && (
        <div className="flex gap-5 pb-6 overflow-x-auto min-h-[550px]">
          {["__none__", ...groups].map((gId) => {
            const label = gId === "__none__" ? "Unassigned Folder 📦" : `Folder: ${gId} 📁`;
            const colTasks = sortTasksByCustomOrder(
              filteredTasks.filter((task) => (gId === "__none__" ? !task.group : task.group === gId))
            );
            const isOver = dragOverColumn === gId;

            return (
              <div
                key={gId}
                onDragOver={(e) => handleDragOver(e, gId)}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => handleColumnDrop(e, gId, "group")}
                className={`flex flex-col min-h-[520px] w-80 shrink-0 rounded-2xl p-4 border transition-all duration-250 ${
                  isOver
                    ? "bg-blue-50/60 border-blue-500 border-dashed ring-4 ring-blue-500/5 scale-[1.01]"
                    : "bg-slate-50/80 border-slate-200/60"
                }`}
              >
                {/* Column Headline */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className={`text-xs font-bold tracking-wide border px-2.5 py-1 rounded-xl ${
                    gId === "__none__" ? "border-slate-300 text-slate-700 bg-slate-100" : "border-blue-300 text-blue-800 bg-blue-50/70"
                  }`}>
                    {label}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded-lg border border-slate-200/60 shadow-2xs">
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Scroll Container */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[66vh] pr-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                  {colTasks.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-200/50 rounded-xl flex items-center justify-center text-xs text-slate-400 bg-white/40 text-center px-4 font-sans">
                      Empty folder. Drag tasks here to group!
                    </div>
                  ) : (
                    colTasks.map((t) => renderKanbanCard(t))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-slate-200/80 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-display font-bold text-slate-800">Create Task Deliverable</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 text-base font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block required">Task Name</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-850 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g. Conduct compliance checks"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block required">Department Segment</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Description</label>
                  <textarea
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-850 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Enter detailed instructions or bullet items..."
                    rows={3}
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block required">Start Date</label>
                    <input
                      type="date"
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      value={createForm.startDate}
                      onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block required">Due Date</label>
                    <input
                      type="date"
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      value={createForm.dueDate}
                      onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Priority</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-855 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Doer (Assignee Tags)</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-855 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Group Index</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-850 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g. Phase-1, Project-Alpha"
                      value={createForm.group || ""}
                      onChange={(e) => setCreateForm({ ...createForm, group: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Milestone Owner</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-855 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                      className="w-4 h-4 text-indigo-650 bg-white border-slate-300 rounded focus:ring-indigo-500"
                      checked={isSubtask}
                      onChange={(e) => setIsSubtask(e.target.checked)}
                    />
                    <label htmlFor="createIsSubtask" className="text-sm font-semibold text-slate-700 cursor-pointer">This is a subtask</label>
                  </div>
                </div>

                {isSubtask && (
                  <div className="space-y-1.5 transition-all">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block required">Select Parent Milestone</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-855 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      value={createForm.parentTaskId}
                      onChange={(e) => setCreateForm({ ...createForm, parentTaskId: e.target.value })}
                      required
                    >
                      <option value="">Select Parent Task</option>
                      {parentTasks.map(p => (
                        <option key={p.id} value={p.id}>[{p.id}] {p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-[#fbfbfc] flex justify-end gap-3 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-slate-505 hover:text-slate-800 hover:bg-slate-100 rounded-xl font-medium cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#5f27cd] hover:bg-[#5f27cd]/90 rounded-xl font-semibold text-white text-sm shadow-md shadow-indigo-500/10 cursor-pointer transition-all flex items-center gap-1.5"
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-slate-200/80 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-display font-bold text-slate-800">Update Deliverable details: {selectedTask.id}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 text-base font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Status</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Manual Completion %</label>
                    <span className="font-mono text-sm text-indigo-650 font-bold">{editForm.completion}%</span>
                  </div>
                  <input
                    type="range"
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                    min="0"
                    max="100"
                    step="5"
                    value={editForm.completion}
                    onChange={(e) => setEditForm({ ...editForm, completion: parseInt(e.target.value) })}
                  />
                  <span className="text-[10px] text-slate-500 block">Sliding details is synchronized automatically on save.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Priority</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-855 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Milestone Owner</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-855 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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

              <div className="px-6 py-4 border-t border-slate-100 bg-[#fbfbfc] flex justify-end gap-3 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm text-slate-505 hover:text-slate-800 hover:bg-slate-100 rounded-xl font-medium cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#5f27cd] hover:bg-[#5f27cd]/90 rounded-xl font-semibold text-white text-sm shadow-md shadow-indigo-500/10 cursor-pointer transition-all flex items-center gap-1.5"
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-display font-bold text-slate-800">Milestone Details & Ledger</h3>
              <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-slate-600 text-base font-bold cursor-pointer">✕</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh] bg-white">
              <table className="w-full text-slate-600 border-collapse divide-y divide-slate-100 font-sans text-sm">
                <tbody>
                  {[
                    { label: "Task ID", val: selectedTask.id },
                    { label: "Milestone Name", val: selectedTask.name },
                    { label: "Description", val: selectedTask.description || "-" },
                    { label: "Associated Segment", val: selectedTask.department },
                    { label: "Leader / Owner", val: getOwnerName(selectedTask.owner) },
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
                    <tr key={i} className="py-2.5 flex justify-between items-start border-b border-slate-100">
                      <td className="font-bold text-slate-500 uppercase text-[10px] tracking-wider py-2 font-mono w-44">{row.label}</td>
                      <td className="text-slate-800 text-right font-medium max-w-xs break-words py-2 font-sans">{row.val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-[#fbfbfc] flex justify-end gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  handleSendWhatsApp(selectedTask);
                }}
                className="px-5 py-2.5 bg-[#25D366] hover:bg-[#20ba56] text-white rounded-xl text-sm font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-emerald-500/10"
              >
                <MessageCircle size={15} />
                Send via WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 text-sm font-bold cursor-pointer transition-all border border-slate-200/50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* QUICK DEPENDENCY MODAL */}
      {showDependencyModal && dependencyTargetTask && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="space-y-1">
                <h3 className="text-lg font-display font-bold text-slate-850">Establish Task Dependency</h3>
                <p className="text-[11px] text-slate-500 font-semibold">
                  Setting predecessor blocking constraints for <span className="font-semibold text-indigo-650 font-mono">{dependencyTargetTask.id}</span>
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowDependencyModal(false)} 
                className="text-slate-400 hover:text-slate-600 text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleDependencySubmit}>
              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto bg-white">
                {/* Target Info Read Only */}
                <div className="bg-indigo-50/40 border border-indigo-100/80 rounded-xl p-3.5 space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span className="font-semibold">Target Dependent Task:</span>
                    <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded font-mono">{dependencyTargetTask.id}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">{dependencyTargetTask.name}</h4>
                  <div className="text-xs text-slate-550 font-bold">Department Segment: <span className="text-indigo-650 font-extrabold">{dependencyTargetTask.department}</span></div>
                </div>

                {/* Predecessor Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block required">
                    Predecessor (Depends On)
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    value={dependencyForm.dependsOn}
                    onChange={(e) => setDependencyForm({ ...dependencyForm, dependsOn: e.target.value })}
                    required
                  >
                    <option value="">Select Predecessor Task</option>
                    {tasks
                      .filter((tk) => tk.id !== dependencyTargetTask.id)
                      .map((tk) => (
                        <option key={tk.id} value={tk.id}>
                          [{tk.id}] {tk.name} ({tk.department})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Constraint Type Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block required">
                    Constraint Type
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    value={dependencyForm.type}
                    onChange={(e) => setDependencyForm({ ...dependencyForm, type: e.target.value })}
                    required
                  >
                    <option value="Finish to Start">Finish to Start (FS)</option>
                    <option value="Start to Start">Start to Start (SS)</option>
                    <option value="Finish to Finish">Finish to Finish (FF)</option>
                    <option value="Start to Finish">Start to Finish (SF)</option>
                  </select>
                </div>

                {/* Predecessor Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Predecessor Notes
                  </label>
                  <textarea
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Provide context regarding pre-requisite actions..."
                    rows={2}
                    value={dependencyForm.notes}
                    onChange={(e) => setDependencyForm({ ...dependencyForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-[#fbfbfc] flex justify-end gap-3 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowDependencyModal(false)}
                  className="px-4 py-2 text-sm text-slate-505 hover:text-slate-800 hover:bg-slate-100 rounded-xl font-medium cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dependencySubmitting}
                  className="px-5 py-2 bg-[#5f27cd] hover:bg-[#5f27cd]/90 rounded-xl font-semibold text-white text-sm shadow-md shadow-indigo-500/10 cursor-pointer transition-all flex items-center gap-1.5"
                >
                  {dependencySubmitting && <Loader2 size={14} className="animate-spin" />}
                  Create Dependency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM WHATSAPP HTML POPUP MODAL */}
      {waModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center">
              {waModal.type === "success" && (
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4 shadow-inner">
                  <span className="text-3xl text-emerald-600">✓</span>
                </div>
              )}
              {waModal.type === "error" && (
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-rose-100 mb-4 shadow-inner">
                  <span className="text-3xl text-rose-600">✕</span>
                </div>
              )}
              {waModal.type === "prompt" && (
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-4 shadow-inner">
                  <span className="text-2xl text-indigo-600">📞</span>
                </div>
              )}

              <h3 className="text-lg font-bold text-slate-800 mb-2 font-display">
                {waModal.title}
              </h3>
              
              <div className="text-sm text-slate-605 mb-5 whitespace-pre-line leading-relaxed font-sans">
                {waModal.message}
              </div>

              {waModal.type === "prompt" && (
                <div className="mb-6">
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. 919876543210"
                    value={waModal.inputValue || ""}
                    onChange={(e) => setWaModal(prev => ({ ...prev, inputValue: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && waModal.onConfirm) {
                        const confirmFn = waModal.onConfirm;
                        const val = waModal.inputValue || "";
                        setWaModal(prev => ({ ...prev, isOpen: false }));
                        confirmFn(val);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-350 hover:border-slate-400 rounded-xl px-4 py-2.5 text-sm text-slate-800 text-center font-semibold tracking-wider font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="flex justify-center gap-3">
                {waModal.type === "prompt" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setWaModal(prev => ({ ...prev, isOpen: false }))}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-705 rounded-xl text-sm font-bold transition-all border border-slate-200/50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const confirmFn = waModal.onConfirm;
                        const val = waModal.inputValue || "";
                        setWaModal(prev => ({ ...prev, isOpen: false }));
                        if (confirmFn) confirmFn(val);
                      }}
                      className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-500/10 transition-all cursor-pointer"
                    >
                      Confirm
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setWaModal(prev => ({ ...prev, isOpen: false }))}
                    className={`px-6 py-2.5 text-white rounded-xl text-sm font-bold transition-all cursor-pointer shadow-md ${
                      waModal.type === "success" 
                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10" 
                        : "bg-rose-600 hover:bg-rose-700 shadow-rose-500/10"
                    }`}
                  >
                    OK
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
