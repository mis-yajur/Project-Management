import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Path to local mock/fallback database file
const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "database.json");

// Google Apps Script Proxy setup
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || "";

// Ensure database folders and defaults exist
function initializeLocalDatabase() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    const defaultDb = {
      users: [
        {
          id: "USR-0001",
          username: "admin",
          password: "admin123",
          fullName: "Administrator",
          email: "admin@projectyajur.com",
          role: "Admin",
          department: "Management",
          managerId: "",
          createdDate: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          status: "Active",
          contactNumber: ""
        }
      ],
      tasks: [],
      subtasks: [],
      issues: [],
      departments: [
        { id: "DEPT-001", name: "Management", description: "Management and Administration Department", owner: "USR-0001", status: "Open", totalTasks: 0, openTasks: 0, createdDate: new Date().toISOString() },
        { id: "DEPT-002", name: "IT", description: "Information Technology Department", owner: "USR-0001", status: "Open", totalTasks: 0, openTasks: 0, createdDate: new Date().toISOString() },
        { id: "DEPT-003", name: "QA", description: "Quality Assurance Department", owner: "USR-0001", status: "Open", totalTasks: 0, openTasks: 0, createdDate: new Date().toISOString() },
        { id: "DEPT-004", name: "HR", description: "Human Resources Department", owner: "USR-0001", status: "Open", totalTasks: 0, openTasks: 0, createdDate: new Date().toISOString() },
        { id: "DEPT-005", name: "Project Management", description: "Project Management Department", owner: "USR-0001", status: "Open", totalTasks: 0, openTasks: 0, createdDate: new Date().toISOString() },
        { id: "DEPT-006", name: "Civil", description: "Civil Engineering Department", owner: "USR-0001", status: "Open", totalTasks: 0, openTasks: 0, createdDate: new Date().toISOString() },
        { id: "DEPT-007", name: "Electrical", description: "Electrical Engineering Department", owner: "USR-0001", status: "Open", totalTasks: 0, openTasks: 0, createdDate: new Date().toISOString() },
        { id: "DEPT-008", name: "Operation", description: "Operations Department", owner: "USR-0001", status: "Open", totalTasks: 0, openTasks: 0, createdDate: new Date().toISOString() },
        { id: "DEPT-009", name: "Project Planning and Control", description: "Project Planning and Control Department", owner: "USR-0001", status: "Open", totalTasks: 0, openTasks: 0, createdDate: new Date().toISOString() },
        { id: "DEPT-010", name: "Maintenance", description: "Maintenance Department", owner: "USR-0001", status: "Open", totalTasks: 0, openTasks: 0, createdDate: new Date().toISOString() }
      ],
      dependencies: [],
      notifications: [],
      settings: {
        email_enabled: "true",
        auto_notify_task_create: "true",
        auto_notify_task_assign: "true",
        auto_notify_issue_assign: "false",
        email_from_name: "Project Management Yajur"
      }
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), "utf8");
    console.log("Initialized local database with defaults.");
  }
}

initializeLocalDatabase();

// Helper to read local DB
function readLocalDb() {
  try {
    const content = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(content);
  } catch (e) {
    console.error("Error reading database file", e);
    return null;
  }
}

// Helper to write local DB
function writeLocalDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error("Error writing to database file", e);
    return false;
  }
}

// Helper: Calculate progress percentage over timeframe
function calculateAutoProgress(startDateStr: string, dueDateStr: string): number {
  try {
    if (!startDateStr || !dueDateStr) return 0;
    const start = new Date(startDateStr);
    const due = new Date(dueDateStr);
    if (isNaN(start.getTime()) || isNaN(due.getTime())) return 0;
    const now = new Date();
    if (now < start) return 0;
    if (now > due) return 100;
    const totalDuration = due.getTime() - start.getTime();
    if (totalDuration <= 0) return 0;
    const elapsedDuration = now.getTime() - start.getTime();
    const result = Math.round((elapsedDuration / totalDuration) * 100);
    return isFinite(result) ? result : 0;
  } catch (e) {
    return 0;
  }
}

// Helper: Check task access constraints
function checkTaskAccess(userId: string, userRole: string, taskOwner: string, taskTags: string, requestingUsername: string, usersData: any[]): boolean {
  const strUserId = String(userId).trim();
  const strOwner = String(taskOwner).trim();
  const role = String(userRole).toLowerCase().trim();
  const tags = String(taskTags || "").trim();

  if (role === "admin") return true;

  if (role === "user") {
    if (strOwner === strUserId) return true;
    if (requestingUsername && tags.toLowerCase().includes(requestingUsername.toLowerCase())) return true;
    return false;
  }

  if (role === "manager") {
    if (strOwner === strUserId) return true;
    if (requestingUsername && tags.toLowerCase().includes(requestingUsername.toLowerCase())) return true;
    if (usersData && usersData.length > 0) {
      for (const u of usersData) {
        const uID = String(u.id || "").trim();
        const mID = String(u.managerId || "").trim();
        if (uID === strOwner && mID === strUserId) return true;
      }
    }
  }
  return false;
}

// REST Proxy / Execution function
// If APPS_SCRIPT_URL is provided, we send a server POST request to Google Apps Script.
// Otherwise, we perform local operations.
async function executeAction(action: string, args: any[]): Promise<any> {
  if (APPS_SCRIPT_URL) {
    try {
      console.log(`📡 Sending [${action}] direct request to Google Apps Script...`);
      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" }, // Avoid CORS issues on redirection preflight by using simple content-type if handled by Apps Script
        body: JSON.stringify({ action, args }),
      });
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        return json;
      } catch (e) {
        console.error("Non-JSON Apps Script response:", text);
        return { success: false, message: "Response from Google was not valid JSON", details: text };
      }
    } catch (err: any) {
      console.error(`Apps Script failover for ${action}:`, err);
      // Failover to local computation so the server NEVER crashes:
    }
  }

  // --- LOCAL IMPLEMENTATION OF CODE.GS LOGIC ---
  const db = readLocalDb();
  if (!db) return { success: false, message: "Local database load error" };

  switch (action) {
    case "loginUser": {
      const [username, password] = args;
      const found = db.users.find((u: any) => u.username === username && u.password === password);
      if (found) {
        if (found.status === "Active") {
          found.lastLogin = new Date().toISOString();
          writeLocalDb(db);
          let managerName = "";
          if (found.managerId) {
            const manager = db.users.find((u: any) => u.id === found.managerId);
            if (manager) managerName = manager.fullName;
          }
          return {
            success: true,
            id: found.id,
            username: found.username,
            fullName: found.fullName,
            email: found.email,
            role: found.role,
            department: found.department,
            managerId: found.managerId,
            managerName: managerName,
            status: found.status,
            contactNumber: found.contactNumber || ""
          };
        } else {
          return { success: false, message: "Your account is inactive" };
        }
      }
      return { success: false, message: "Invalid username or password" };
    }

    case "getDashboardCounts": {
      const [userId, userRole] = args;
      const user = db.users.find((u: any) => u.id === userId);
      const requestingUsername = user ? user.username : "";

      let openTasks = 0;
      let closedTasks = 0;
      let openIssues = 0;
      let closedIssues = 0;

      for (const t of db.tasks) {
        if (checkTaskAccess(userId, userRole, t.owner, t.tags, requestingUsername, db.users)) {
          const status = String(t.status || "").toLowerCase().trim();
          if (status === "closed") {
            closedTasks++;
          } else {
            openTasks++;
          }
        }
      }

      for (const i of db.issues) {
        if (checkTaskAccess(userId, userRole, i.assignee, i.tags, requestingUsername, db.users)) {
          const status = String(i.status || "").toLowerCase().trim();
          if (status === "closed") {
            closedIssues++;
          } else {
            openIssues++;
          }
        }
      }

      return { success: true, data: { openTasks, closedTasks, openIssues, closedIssues } };
    }

    case "getTasks": {
      const [filter, userId, userRole] = args;
      const user = db.users.find((u: any) => u.id === userId);
      const requestingUsername = user ? user.username : "";

      const result: any[] = [];
      for (const t of db.tasks) {
        if (!checkTaskAccess(userId, userRole, t.owner, t.tags, requestingUsername, db.users)) continue;
        const statusLower = String(t.status || "").toLowerCase();

        if (filter === "Open Task" && statusLower === "closed") continue;
        if (filter === "Complete Task" && statusLower !== "closed") continue;
        if (filter === "View by Owner" && String(t.owner).trim() !== String(userId).trim()) continue;

        const autoP = calculateAutoProgress(t.startDate, t.dueDate);
        result.push({
          ...t,
          autoProgress: autoP,
          calculatedAuto: autoP
        });
      }

      const groupsSet = new Set<string>();
      result.forEach(t => {
        if (t.group) groupsSet.add(t.group);
      });

      return { success: true, data: result, groups: Array.from(groupsSet) };
    }

    case "createTask": {
      const [taskData, creatorId] = args;
      let newId = "";

      if (taskData.parentTaskId) {
        const parentId = taskData.parentTaskId;
        const subtasks = db.tasks.filter((t: any) => String(t.id).startsWith(parentId) && t.id.length > parentId.length);
        const suffixes: number[] = [];
        subtasks.forEach((st: any) => {
          const suffix = String(st.id).substring(parentId.length);
          if (suffix.length === 1) {
            suffixes.push(suffix.charCodeAt(0));
          }
        });

        if (suffixes.length > 0) {
          const maxChar = Math.max(...suffixes);
          newId = parentId + String.fromCharCode(maxChar + 1);
        } else {
          newId = parentId + "A";
        }
      } else {
        let lastNum = 0;
        db.tasks.forEach((t: any) => {
          if (String(t.id).startsWith("TASK-") && t.id.length === 9) {
            const numPart = parseInt(t.id.split("-")[1]);
            if (!isNaN(numPart) && numPart > lastNum) lastNum = numPart;
          }
        });
        newId = "TASK-" + String(lastNum + 1).padStart(4, "0");
      }

      const startDate = taskData.startDate || new Date().toISOString();
      const dueDate = taskData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const pct = calculateAutoProgress(startDate, dueDate);

      const newTask = {
        id: newId,
        name: taskData.name,
        description: taskData.description || "",
        department: taskData.department,
        owner: taskData.owner || creatorId,
        status: taskData.status || "Open",
        tags: taskData.tags || "",
        startDate,
        dueDate,
        priority: taskData.priority || "Medium",
        completion: 0,
        group: taskData.group || "",
        createdDate: new Date().toISOString(),
        autoProgress: pct,
        parentTaskId: taskData.parentTaskId || "",
        calculatedAuto: pct,
        dependency: "No"
      };

      db.tasks.push(newTask);

      // Trigger automatic local notification record in database
      const assignTargetId = taskData.owner || creatorId;
      if (db.settings.auto_notify_task_create === "true" && assignTargetId && assignTargetId !== creatorId) {
        const recipient = db.users.find((u: any) => u.id === assignTargetId);
        if (recipient) {
          const notifId = "NOTIF-" + String(db.notifications.length + 1).padStart(4, "0");
          db.notifications.push({
            id: notifId,
            referenceId: newId,
            type: "Task Assignment",
            recipientId: recipient.id,
            recipientName: recipient.fullName,
            recipientEmail: recipient.email,
            channel: "Email",
            status: "Sent",
            message: `New Task Assigned: ${taskData.name}. Priority: ${taskData.priority || 'Medium'}`,
            sentDate: new Date().toISOString(),
            triggeredBy: "System"
          });
        }
      }

      writeLocalDb(db);
      return { success: true, taskId: newId, message: "Task created successfully" };
    }

    case "updateTask": {
      const [taskId, updates] = args;
      const idx = db.tasks.findIndex((t: any) => t.id === taskId);
      if (idx !== -1) {
        const task = db.tasks[idx];
        if (updates.status !== undefined) task.status = updates.status;
        if (updates.completion !== undefined) task.completion = Number(updates.completion);
        if (updates.priority !== undefined) task.priority = updates.priority;
        if (updates.dependency !== undefined) task.dependency = updates.dependency;
        if (updates.owner !== undefined) {
          const oldOwner = task.owner;
          task.owner = updates.owner;

          if (updates.owner !== oldOwner && db.settings.auto_notify_task_assign === "true") {
            const recipient = db.users.find((u: any) => u.id === updates.owner);
            if (recipient) {
              const notifId = "NOTIF-" + String(db.notifications.length + 1).padStart(4, "0");
              db.notifications.push({
                id: notifId,
                referenceId: taskId,
                type: "Task Reassignment",
                recipientId: recipient.id,
                recipientName: recipient.fullName,
                recipientEmail: recipient.email,
                channel: "Email",
                status: "Sent",
                message: `Task Assigned: ${task.name}`,
                sentDate: new Date().toISOString(),
                triggeredBy: "System"
              });
            }
          }
        }
        task.autoProgress = calculateAutoProgress(task.startDate, task.dueDate);
        task.calculatedAuto = task.autoProgress;

        writeLocalDb(db);
        return { success: true, message: "Task updated successfully" };
      }
      return { success: false, message: "Task not found" };
    }

    case "deleteTask": {
      const [taskId] = args;
      const originalLength = db.tasks.length;
      db.tasks = db.tasks.filter((t: any) => t.id !== taskId);
      if (db.tasks.length < originalLength) {
        writeLocalDb(db);
        return { success: true, message: "Task deleted successfully" };
      }
      return { success: false, message: "Task not found" };
    }

    case "getDependencies": {
      return { success: true, data: db.dependencies };
    }

    case "createDependency": {
      const [depData] = args;
      let lastNum = 0;
      db.dependencies.forEach((d: any) => {
        if (String(d.id).startsWith("DEP-")) {
          const numPart = parseInt(d.id.split("-")[1]);
          if (!isNaN(numPart) && numPart > lastNum) lastNum = numPart;
        }
      });
      const newId = "DEP-" + String(lastNum + 1).padStart(4, "0");

      const newDep = {
        id: newId,
        taskId: depData.taskId,
        dependsOn: depData.dependsOn,
        type: depData.type,
        status: "Active",
        createdDate: new Date().toISOString(),
        notes: depData.notes || ""
      };

      db.dependencies.push(newDep);
      writeLocalDb(db);
      return { success: true, message: "Dependency created successfully" };
    }

    case "updateDependency": {
      const [depId, updates] = args;
      const found = db.dependencies.find((d: any) => d.id === depId);
      if (found) {
        if (updates.status !== undefined) found.status = updates.status;
        writeLocalDb(db);
        return { success: true, message: "Dependency updated successfully" };
      }
      return { success: false, message: "Dependency not found" };
    }

    case "deleteDependency": {
      const [depId] = args;
      const originalLength = db.dependencies.length;
      db.dependencies = db.dependencies.filter((d: any) => d.id !== depId);
      if (db.dependencies.length < originalLength) {
        writeLocalDb(db);
        return { success: true, message: "Dependency deleted" };
      }
      return { success: false, message: "Dependency not found" };
    }

    case "getIssues": {
      const [filter, userId, userRole] = args;
      const user = db.users.find((u: any) => u.id === userId);
      const requestingUsername = user ? user.username : "";

      const result: any[] = [];
      for (const i of db.issues) {
        if (!checkTaskAccess(userId, userRole, i.assignee, i.tags, requestingUsername, db.users)) continue;
        const statusLower = String(i.status || "").toLowerCase();

        if (filter === "Open Issue" && statusLower === "closed") continue;
        if (filter === "Closed Issue" && statusLower !== "closed") continue;
        if (filter === "View by Owner" && String(i.assignee).trim() !== String(userId).trim()) continue;

        const autoP = calculateAutoProgress(i.createdTime, i.dueDate);
        result.push({
          ...i,
          autoProgress: autoP,
          manualProgress: i.manualProgress || 0
        });
      }

      const deptsSet = new Set<string>();
      result.forEach(i => {
        if (i.department) deptsSet.add(i.department);
      });

      return { success: true, data: result, groups: Array.from(deptsSet) };
    }

    case "createIssue": {
      const [issueData, userId] = args;
      let lastNum = 0;
      db.issues.forEach((i: any) => {
        if (String(i.id).startsWith("ISSUE-")) {
          const numPart = parseInt(i.id.split("-")[1]);
          if (!isNaN(numPart) && numPart > lastNum) lastNum = numPart;
        }
      });
      const newId = "ISSUE-" + String(lastNum + 1).padStart(4, "0");

      const now = new Date().toISOString();
      const dueDate = issueData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const pct = calculateAutoProgress(now, dueDate);

      const newIssue = {
        id: newId,
        name: issueData.name,
        description: issueData.description || "",
        department: issueData.department,
        reporter: userId,
        createdTime: now,
        assignee: issueData.assignee || userId,
        tags: issueData.tags || "",
        lastModifiedTime: now,
        dueDate,
        status: "Open",
        severity: issueData.severity || "Medium",
        classification: issueData.classification || "Bug",
        flag: issueData.flag || "Normal",
        autoProgress: pct,
        manualProgress: 0
      };

      db.issues.push(newIssue);

      // Trigger auto notify on issue
      const assignTargetId = issueData.assignee || userId;
      if (db.settings.auto_notify_issue_assign === "true" && assignTargetId && assignTargetId !== userId) {
        const recipient = db.users.find((u: any) => u.id === assignTargetId);
        if (recipient) {
          const notifId = "NOTIF-" + String(db.notifications.length + 1).padStart(4, "0");
          db.notifications.push({
            id: notifId,
            referenceId: newId,
            type: "Issue Assignment",
            recipientId: recipient.id,
            recipientName: recipient.fullName,
            recipientEmail: recipient.email,
            channel: "Email",
            status: "Sent",
            message: `New Issue Assigned: ${issueData.name}. Severity: ${issueData.severity || 'Medium'}`,
            sentDate: new Date().toISOString(),
            triggeredBy: "System"
          });
        }
      }

      writeLocalDb(db);
      return { success: true, issueId: newId, message: "Issue created successfully" };
    }

    case "updateIssue": {
      const [issueId, updates] = args;
      const idx = db.issues.findIndex((i: any) => i.id === issueId);
      if (idx !== -1) {
        const issue = db.issues[idx];
        const now = new Date().toISOString();
        if (updates.status !== undefined) { issue.status = updates.status; issue.lastModifiedTime = now; }
        if (updates.severity !== undefined) { issue.severity = updates.severity; issue.lastModifiedTime = now; }
        if (updates.classification !== undefined) issue.classification = updates.classification;
        if (updates.flag !== undefined) issue.flag = updates.flag;
        if (updates.completion !== undefined) issue.manualProgress = Number(updates.completion);
        if (updates.assignee !== undefined) {
          const oldAssignee = issue.assignee;
          issue.assignee = updates.assignee;
          issue.lastModifiedTime = now;

          if (updates.assignee !== oldAssignee && db.settings.auto_notify_issue_assign === "true") {
            const recipient = db.users.find((u: any) => u.id === updates.assignee);
            if (recipient) {
              const notifId = "NOTIF-" + String(db.notifications.length + 1).padStart(4, "0");
              db.notifications.push({
                id: notifId,
                referenceId: issueId,
                type: "Issue Assignment",
                recipientId: recipient.id,
                recipientName: recipient.fullName,
                recipientEmail: recipient.email,
                channel: "Email",
                status: "Sent",
                message: `Issue Assigned: ${issue.name}`,
                sentDate: new Date().toISOString(),
                triggeredBy: "System"
              });
            }
          }
        }

        writeLocalDb(db);
        return { success: true, message: "Issue updated successfully" };
      }
      return { success: false, message: "Issue not found" };
    }

    case "deleteIssue": {
      const [issueId] = args;
      const originalLength = db.issues.length;
      db.issues = db.issues.filter((i: any) => i.id !== issueId);
      if (db.issues.length < originalLength) {
        writeLocalDb(db);
        return { success: true, message: "Issue deleted successfully" };
      }
      return { success: false, message: "Issue not found" };
    }

    case "getUsers": {
      const [userRole, userId] = args;
      const roleLower = String(userRole).toLowerCase();

      let result = [];
      for (const u of db.users) {
        if (u.status !== "Active") continue;
        if (roleLower === "user") {
          if (String(u.id).trim() !== String(userId).trim()) continue;
        } else if (roleLower === "manager") {
          if (String(u.id).trim() !== String(userId).trim() && String(u.managerId).trim() !== String(userId).trim()) continue;
        }
        result.push({
          id: u.id,
          username: u.username,
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          department: u.department || "",
          managerId: u.managerId || "",
          status: u.status,
          createdDate: u.createdDate,
          lastLogin: u.lastLogin,
          contactNumber: u.contactNumber || ""
        });
      }
      return { success: true, data: result };
    }

    case "createUser": {
      const [userData, creatorId] = args;
      const exists = db.users.some((u: any) => u.username === userData.username);
      if (exists) {
        return { success: false, message: "Username already exists" };
      }

      let lastNum = 0;
      db.users.forEach((u: any) => {
        if (String(u.id).startsWith("USR-")) {
          const numPart = parseInt(u.id.split("-")[1]);
          if (!isNaN(numPart) && numPart > lastNum) lastNum = numPart;
        }
      });
      const newId = "USR-" + String(lastNum + 1).padStart(4, "0");

      const newUser = {
        id: newId,
        username: userData.username,
        password: userData.password,
        fullName: userData.fullName,
        email: userData.email,
        role: userData.role,
        department: userData.department || "",
        managerId: userData.managerId || "",
        createdDate: new Date().toISOString(),
        lastLogin: "",
        status: "Active",
        contactNumber: userData.contactNumber || ""
      };

      db.users.push(newUser);
      writeLocalDb(db);
      return { success: true, userId: newId, message: "User created successfully" };
    }

    case "getDepartments": {
      const [filter, userId] = args;
      const result = [];
      for (const d of db.departments) {
        if (filter === "Open Department" && d.status !== "Open") continue;
        if (filter === "Complete Department" && d.status !== "Closed") continue;
        if (filter === "View by Owner" && String(d.owner).trim() !== String(userId).trim()) continue;

        // Auto count total & open tasks for department
        const deptTasks = db.tasks.filter((t: any) => t.department === d.name);
        d.totalTasks = deptTasks.length;
        d.openTasks = deptTasks.filter((t: any) => String(t.status).toLowerCase() !== "closed").length;

        result.push(d);
      }
      return { success: true, data: result };
    }

    case "createDepartment": {
      const [deptData, creatorId] = args;
      let lastNum = 0;
      db.departments.forEach((d: any) => {
        if (String(d.id).startsWith("DEPT-")) {
          const numPart = parseInt(d.id.split("-")[1]);
          if (!isNaN(numPart) && numPart > lastNum) lastNum = numPart;
        }
      });
      const newId = "DEPT-" + String(lastNum + 1).padStart(3, "0");

      const newDept = {
        id: newId,
        name: deptData.name,
        description: deptData.description || "",
        owner: deptData.owner || creatorId,
        status: "Open",
        totalTasks: 0,
        openTasks: 0,
        createdDate: new Date().toISOString()
      };

      db.departments.push(newDept);
      writeLocalDb(db);
      return { success: true, deptId: newId, message: "Department created successfully" };
    }

    case "getDepartmentList": {
      const openDepts = db.departments
        .filter((d: any) => d.status === "Open")
        .map((d: any) => ({ id: d.id, name: d.name }));
      return { success: true, data: openDepts };
    }

    case "getManagers": {
      const managers = db.users
        .filter((u: any) => (u.role === "Manager" || u.role === "Admin") && u.status === "Active")
        .map((u: any) => ({ id: u.id, name: u.fullName, role: u.role }));
      return { success: true, data: managers };
    }

    case "getAllActiveUsers": {
      const activeUsers = db.users
        .filter((u: any) => u.status === "Active")
        .map((u: any) => ({ 
          id: u.id, 
          username: u.username, 
          name: u.fullName, 
          role: u.role, 
          department: u.department,
          email: u.email || "",
          contactNumber: u.contactNumber || ""
        }));
      return { success: true, data: activeUsers };
    }

    case "deleteUser": {
      const [userId] = args;
      const originalLength = db.users.length;
      db.users = db.users.filter((u: any) => u.id !== userId);
      if (db.users.length < originalLength) {
        writeLocalDb(db);
        return { success: true };
      }
      return { success: false, message: "User not found" };
    }

    case "deleteDepartment": {
      const [deptId] = args;
      const originalLength = db.departments.length;
      db.departments = db.departments.filter((d: any) => d.id !== deptId);
      if (db.departments.length < originalLength) {
        writeLocalDb(db);
        return { success: true };
      }
      return { success: false, message: "Department not found" };
    }

    case "getSettings": {
      return { success: true, data: db.settings };
    }

    case "saveSettings": {
      const [newSettings] = args;
      db.settings = {
        ...db.settings,
        ...newSettings
      };
      writeLocalDb(db);
      return { success: true, message: "Settings saved successfully" };
    }

    case "getNotifications": {
      const [userId, userRole] = args;
      const roleLower = String(userRole).toLowerCase();

      const result = [];
      for (const n of db.notifications) {
        if (roleLower !== "admin" && String(n.recipientId).trim() !== String(userId).trim()) continue;
        result.push(n);
      }
      // Return reversed order as in script.gs
      return { success: true, data: [...result].reverse() };
    }

    case "deleteNotification": {
      const [notifId] = args;
      const originalLength = db.notifications.length;
      db.notifications = db.notifications.filter((n: any) => n.id !== notifId);
      if (db.notifications.length < originalLength) {
        writeLocalDb(db);
        return { success: true, message: "Notification deleted" };
      }
      return { success: false, message: "Notification not found" };
    }

    case "clearAllNotifications": {
      const [userId, userRole] = args;
      if (String(userRole).toLowerCase() !== "admin") {
        return { success: false, message: "Admin access required" };
      }
      db.notifications = [];
      writeLocalDb(db);
      return { success: true, message: "All notifications cleared" };
    }

    case "triggerTaskNotification": {
      const [taskId, triggeredByUserId] = args;
      const task = db.tasks.find((t: any) => t.id === taskId);
      if (!task) return { success: false, message: "Task not found" };

      const recipient = db.users.find((u: any) => u.id === task.owner);
      if (!recipient) return { success: false, message: "Recipient not found for task owner ID: " + task.owner };

      const triggerer = db.users.find((u: any) => u.id === triggeredByUserId);
      const triggeredByName = triggerer ? triggerer.fullName : triggeredByUserId;

      const notifId = "NOTIF-" + String(db.notifications.length + 1).padStart(4, "0");
      const message = `A task requires your attention:\n\n• Task ID: ${taskId}\n• Name: ${task.name}\n• Status: ${task.status}`;

      db.notifications.push({
        id: notifId,
        referenceId: taskId,
        type: "Task Notification",
        recipientId: recipient.id,
        recipientName: recipient.fullName,
        recipientEmail: recipient.email,
        channel: "Email",
        status: "Sent",
        message,
        sentDate: new Date().toISOString(),
        triggeredBy: triggeredByName
      });

      writeLocalDb(db);
      return { success: true, emailResult: "Sent (Logged to Notification Log)" };
    }

    case "triggerIssueNotification": {
      const [issueId, triggeredByUserId] = args;
      const issue = db.issues.find((i: any) => i.id === issueId);
      if (!issue) return { success: false, message: "Issue not found" };

      const recipient = db.users.find((u: any) => u.id === issue.assignee);
      if (!recipient) return { success: false, message: "Recipient not found for assignee ID: " + issue.assignee };

      const triggerer = db.users.find((u: any) => u.id === triggeredByUserId);
      const triggeredByName = triggerer ? triggerer.fullName : triggeredByUserId;

      const notifId = "NOTIF-" + String(db.notifications.length + 1).padStart(4, "0");
      const message = `An issue requires your attention:\n\n• Issue ID: ${issueId}\n• Name: ${issue.name}\n• Status: ${issue.status}`;

      db.notifications.push({
        id: notifId,
        referenceId: issueId,
        type: "Issue Notification",
        recipientId: recipient.id,
        recipientName: recipient.fullName,
        recipientEmail: recipient.email,
        channel: "Email",
        status: "Sent",
        message,
        sentDate: new Date().toISOString(),
        triggeredBy: triggeredByName
      });

      writeLocalDb(db);
      return { success: true, emailResult: "Sent (Logged to Notification Log)" };
    }

    case "sendWhatsApp": {
      const [phone, name, taskId, daysLimit, priority, taskUpdateLink] = args;
      if (!phone) {
        return { success: false, message: "Recipient phone number is missing." };
      }

      const formattedPhone = String(phone).replace(/[+\s-]/g, "");

      try {
        const url = new URL("https://bhashsms.com/api/sendmsgutil.php");
        url.searchParams.append("user", process.env.WA_USER || "YajurFibre_BWAI");
        url.searchParams.append("pass", process.env.WA_PASS || "123456");
        url.searchParams.append("sender", process.env.WA_SENDER || "BUZWAP");
        url.searchParams.append("phone", formattedPhone);
        url.searchParams.append("text", "tsk_9");
        url.searchParams.append("priority", "wa");
        url.searchParams.append("stype", "normal");
        
        // Params = Name, Task ID, Days Limit, Priority, task update Link
        // Name is: Doer (Tags)
        const paramsValue = `${encodeURIComponent(name || "")},${encodeURIComponent(taskId || "")},${encodeURIComponent(daysLimit || "")},${encodeURIComponent(priority || "")},${encodeURIComponent(taskUpdateLink || "")}`;
        url.searchParams.append("Params", paramsValue);

        console.log(`Sending WhatsApp call via BhashSMS API to ${formattedPhone} (Params: ${paramsValue})`);
        
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "Accept": "application/json, text/plain, */*"
          }
        });

        const responseText = await response.text();
        console.log(`WhatsApp API response text: ${responseText}`);

        // Track notification in database
        const notifId = "NOTIF-" + String(db.notifications.length + 1).padStart(4, "0");
        db.notifications.push({
          id: notifId,
          referenceId: taskId || "",
          type: "WhatsApp Broadcast",
          recipientId: "",
          recipientName: name || "",
          recipientEmail: "",
          channel: "WhatsApp",
          status: "Sent",
          message: `WhatsApp template 'tsk_9' sent successfully. Recipient: ${name} (${formattedPhone})`,
          sentDate: new Date().toISOString(),
          triggeredBy: "WhatsApp Integration Client"
        });
        writeLocalDb(db);

        return { 
          success: true, 
          message: "WhatsApp broadcast successfully sent and status logged.", 
          response: responseText 
        };
      } catch (err: any) {
        console.error("WhatsApp broadcast exception:", err);
        return { 
          success: false, 
          message: "Failed to dispatch WhatsApp message: " + err.message 
        };
      }
    }
  }

  return { success: false, message: "Action not defined locally: " + action };
}

// REST API mapping for our Front-End client calls
const rpcCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 15000; // 15 seconds

function clearRpcCache() {
  rpcCache.clear();
  console.log("🧹 In-memory database cache flushed.");
}

app.post("/api/rpc", async (req, res) => {
  const { action, args } = req.body;
  console.log(`📥 API RPC received: ${action}`, args);
  
  const isWrite = action.startsWith("create") || 
                  action.startsWith("update") || 
                  action.startsWith("delete") || 
                  action.startsWith("save") || 
                  action.startsWith("trigger") || 
                  action.startsWith("login");

  if (isWrite) {
    clearRpcCache();
  } else if (action.startsWith("get") || action.startsWith("list") || action.startsWith("all")) {
    const cacheKey = `${action}::${JSON.stringify(args || [])}`;
    const cachedEntry = rpcCache.get(cacheKey);
    if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS)) {
      console.log(`⚡ Blazing-fast Cache Hit: returning cached response for action [${action}]`);
      return res.json(cachedEntry.data);
    }
  }

  try {
    const response = await executeAction(action, args || []);
    
    // Catch successful reads and save to cache
    if (!isWrite && response && response.success !== false) {
      const cacheKey = `${action}::${JSON.stringify(args || [])}`;
      rpcCache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });
    }
    
    res.json(response);
  } catch (err: any) {
    console.error(`Error executing action ${action}:`, err);
    res.status(500).json({ success: false, message: err.message || "Internal server error" });
  }
});

// Configure Vite or production static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running successfully on http://localhost:${PORT}`);
  });
}

startServer();
