/**
 * Project Management Yajur - Google Sheets Database Backend (code.gs)
 * 
 * Paste this code into your Google Apps Script associated with your Google Sheet.
 * Make sure to deploy it as a Web App:
 * 1. Click "Deploy" -> "New deployment"
 * 2. Select type: "Web app"
 * 3. Set Execute as: "Me"
 * 4. Set Who has access: "Anyone"
 * 5. Copy the Web App URL and configure it as APPS_SCRIPT_URL.
 */

function doPost(e) {
  try {
    // Enable CORS by handling parameters beautifully and returning TextOutput
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;
    var args = requestData.args || [];
    
    // Ensure all sheets are initialized and prepared
    initializeGoogleSheet();
    
    var result = executeAction(action, args);
    return ContentService.createTextOutput(JSON.stringify(result))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Apps Script Error: " + error.toString(),
      stack: error.stack
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "Project Management Yajur API endpoint is operational. Use POST RPC calls to communicate."
  })).setMimeType(ContentService.MimeType.JSON);
}

// Map the sheets to their columns for dynamic initialization
var SCHEMA = {
  "Users": ["id", "username", "password", "fullName", "email", "role", "department", "managerId", "createdDate", "lastLogin", "status", "contactNumber"],
  "Tasks": ["id", "name", "description", "department", "owner", "status", "tags", "startDate", "dueDate", "priority", "completion", "group", "createdDate", "autoProgress", "parentTaskId", "calculatedAuto", "dependency"],
  "Issues": ["id", "name", "description", "department", "reporter", "createdTime", "assignee", "tags", "lastModifiedTime", "dueDate", "status", "severity", "classification", "flag", "autoProgress", "manualProgress"],
  "Departments": ["id", "name", "description", "owner", "status", "totalTasks", "openTasks", "createdDate"],
  "Dependencies": ["id", "taskId", "dependsOn", "type", "status", "createdDate", "notes"],
  "Notifications": ["id", "referenceId", "type", "recipientId", "recipientName", "recipientEmail", "channel", "status", "message", "sentDate", "triggeredBy"],
  "Settings": ["key", "value"]
};

// Auto-build and prepare columns if sheets are empty or do not exist
function initializeGoogleSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  for (var sheetName in SCHEMA) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    if (sheet.getLastRow() === 0) {
      // Write headers
      sheet.appendRow(SCHEMA[sheetName]);
      
      // Populate defaults for certain sheets
      if (sheetName === "Users") {
        sheet.appendRow([
          "USR-0001",
          "admin",
          "admin123",
          "Administrator",
          "admin@projectyajur.com",
          "Admin",
          "Management",
          "",
          new Date().toISOString(),
          new Date().toISOString(),
          "Active",
          ""
        ]);
      } else if (sheetName === "Departments") {
        var defaultDepts = [
          ["DEPT-001", "Management", "Management and Administration Department", "USR-0001", "Open", "0", "0", new Date().toISOString()],
          ["DEPT-002", "IT", "Information Technology Department", "USR-0001", "Open", "0", "0", new Date().toISOString()],
          ["DEPT-003", "QA", "Quality Assurance Department", "USR-0001", "Open", "0", "0", new Date().toISOString()],
          ["DEPT-004", "HR", "Human Resources Department", "USR-0001", "Open", "0", "0", new Date().toISOString()],
          ["DEPT-005", "Project Management", "Project Management Department", "USR-0001", "Open", "0", "0", new Date().toISOString()],
          ["DEPT-006", "Civil", "Civil Engineering Department", "USR-0001", "Open", "0", "0", new Date().toISOString()],
          ["DEPT-007", "Electrical", "Electrical Engineering Department", "USR-0001", "Open", "0", "0", new Date().toISOString()],
          ["DEPT-008", "Operation", "Operations Department", "USR-0001", "Open", "0", "0", new Date().toISOString()],
          ["DEPT-009", "Project Planning and Control", "Project Planning and Control Department", "USR-0001", "Open", "0", "0", new Date().toISOString()],
          ["DEPT-010", "Maintenance", "Maintenance Department", "USR-0001", "Open", "0", "0", new Date().toISOString()]
        ];
        defaultDepts.forEach(function(row) { sheet.appendRow(row); });
      } else if (sheetName === "Settings") {
        var defaultSettings = [
          ["email_enabled", "true"],
          ["auto_notify_task_create", "true"],
          ["auto_notify_task_assign", "true"],
          ["auto_notify_issue_assign", "false"],
          ["email_from_name", "Project Management Yajur"]
        ];
        defaultSettings.forEach(function(row) { sheet.appendRow(row); });
      }
    }
  }
}

// Database helper functions to read sheet data as array of JSON objects
function readSheetData(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return []; // Only headers or empty
  
  var headers = SCHEMA[sheetName];
  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  
  var data = [];
  for (var r = 0; r < values.length; r++) {
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = values[r][c];
    }
    data.push(obj);
  }
  return data;
}

// Database helper to rewrite a full sheet's rows (skipping headers)
function writeSheetData(sheetName, dataList) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  // Clear all content below the header row
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  
  if (dataList.length === 0) return;
  
  var headers = SCHEMA[sheetName];
  var rowsToWrite = [];
  for (var i = 0; i < dataList.length; i++) {
    var item = dataList[i];
    var row = [];
    for (var c = 0; c < headers.length; c++) {
      var val = item[headers[c]];
      row.push(val === undefined || val === null ? "" : val);
    }
    rowsToWrite.push(row);
  }
  
  sheet.getRange(2, 1, rowsToWrite.length, headers.length).setValues(rowsToWrite);
}

// Check task access restrictions
function checkTaskAccess(userId, userRole, taskOwner, taskTags, requestingUsername, usersList) {
  var strUserId = String(userId).trim();
  var strOwner = String(taskOwner).trim();
  var role = String(userRole).toLowerCase().trim();
  var tags = String(taskTags || "").trim();

  if (role === "admin") return true;

  if (role === "user") {
    if (strOwner === strUserId) return true;
    if (requestingUsername && tags.toLowerCase().indexOf(requestingUsername.toLowerCase()) !== -1) return true;
    return false;
  }

  if (role === "manager") {
    if (strOwner === strUserId) return true;
    if (requestingUsername && tags.toLowerCase().indexOf(requestingUsername.toLowerCase()) !== -1) return true;
    if (usersList && usersList.length > 0) {
      for (var i = 0; i < usersList.length; i++) {
        var u = usersList[i];
        if (String(u.id || "").trim() === strOwner && String(u.managerId || "").trim() === strUserId) {
          return true;
        }
      }
    }
  }
  return false;
}

// Calculation of progress percentage
function calculateAutoProgress(startDateStr, dueDateStr) {
  try {
    if (!startDateStr || !dueDateStr) return 0;
    var start = new Date(startDateStr);
    var due = new Date(dueDateStr);
    if (isNaN(start.getTime()) || isNaN(due.getTime())) return 0;
    var now = new Date();
    if (now < start) return 0;
    if (now > due) return 100;
    var totalDuration = due.getTime() - start.getTime();
    if (totalDuration <= 0) return 0;
    var elapsedDuration = now.getTime() - start.getTime();
    var result = Math.round((elapsedDuration / totalDuration) * 100);
    return isFinite(result) ? result : 0;
  } catch (e) {
    return 0;
  }
}

// Core action handler routing
function executeAction(action, args) {
  switch (action) {
    case "loginUser": {
      var username = args[0];
      var password = args[1];
      var users = readSheetData("Users");
      
      var found = null;
      for (var i = 0; i < users.length; i++) {
        if (users[i].username === username && users[i].password === password) {
          found = users[i];
          break;
        }
      }
      
      if (found) {
        if (found.status === "Active") {
          found.lastLogin = new Date().toISOString();
          writeSheetData("Users", users);
          
          var managerName = "";
          if (found.managerId) {
            for (var j = 0; j < users.length; j++) {
              if (users[j].id === found.managerId) {
                managerName = users[j].fullName;
                break;
              }
            }
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
      var userId = args[0];
      var userRole = args[1];
      
      var users = readSheetData("Users");
      var tasks = readSheetData("Tasks");
      var issues = readSheetData("Issues");
      
      var requestingUsername = "";
      for (var i=0; i<users.length; i++) {
        if (users[i].id === userId) {
          requestingUsername = users[i].username;
          break;
        }
      }

      var openTasks = 0, closedTasks = 0, openIssues = 0, closedIssues = 0;

      for (var t = 0; t < tasks.length; t++) {
        var task = tasks[t];
        if (checkTaskAccess(userId, userRole, task.owner, task.tags, requestingUsername, users)) {
          var status = String(task.status || "").toLowerCase().trim();
          if (status === "closed") closedTasks++;
          else openTasks++;
        }
      }

      for (var j = 0; j < issues.length; j++) {
        var issue = issues[j];
        if (checkTaskAccess(userId, userRole, issue.assignee, issue.tags, requestingUsername, users)) {
          var istatus = String(issue.status || "").toLowerCase().trim();
          if (istatus === "closed") closedIssues++;
          else openIssues++;
        }
      }

      return { success: true, data: { openTasks, closedTasks, openIssues, closedIssues } };
    }

    case "getTasks": {
      var filter = args[0];
      var userId = args[1];
      var userRole = args[2];
      
      var users = readSheetData("Users");
      var tasks = readSheetData("Tasks");
      
      var requestingUsername = "";
      for (var i=0; i<users.length; i++) {
        if (users[i].id === userId) {
          requestingUsername = users[i].username;
          break;
        }
      }

      var result = [];
      var groupsSet = {};

      for (var t = 0; t < tasks.length; t++) {
        var task = tasks[t];
        if (!checkTaskAccess(userId, userRole, task.owner, task.tags, requestingUsername, users)) continue;
        var statusLower = String(task.status || "").toLowerCase();

        if (filter === "Open Task" && statusLower === "closed") continue;
        if (filter === "Complete Task" && statusLower !== "closed") continue;
        if (filter === "View by Owner" && String(task.owner).trim() !== String(userId).trim()) continue;

        var autoP = calculateAutoProgress(task.startDate, task.dueDate);
        task.completion = Number(task.completion || 0);
        task.autoProgress = autoP;
        task.calculatedAuto = autoP;
        
        result.push(task);
        if (task.group) {
          groupsSet[task.group] = true;
        }
      }

      var groups = Object.keys(groupsSet);

      return { success: true, data: result, groups: groups };
    }

    case "createTask": {
      var taskData = args[0];
      var creatorId = args[1];
      
      var tasks = readSheetData("Tasks");
      var newId = "";

      if (taskData.parentTaskId) {
        var parentId = taskData.parentTaskId;
        var subtasks = tasks.filter(function(t) { return String(t.id).indexOf(parentId) === 0 && t.id.length > parentId.length; });
        var suffixes = [];
        subtasks.forEach(function(st) {
          var suffix = String(st.id).substring(parentId.length);
          if (suffix.length === 1) {
            suffixes.push(suffix.charCodeAt(0));
          }
        });

        if (suffixes.length > 0) {
          var maxChar = Math.max.apply(null, suffixes);
          newId = parentId + String.fromCharCode(maxChar + 1);
        } else {
          newId = parentId + "A";
        }
      } else {
        var lastNum = 0;
        tasks.forEach(function(t) {
          if (String(t.id).indexOf("TASK-") === 0 && t.id.length === 9) {
            var numPart = parseInt(t.id.split("-")[1]);
            if (!isNaN(numPart) && numPart > lastNum) lastNum = numPart;
          }
        });
        newId = "TASK-" + String(lastNum + 1).padStart(4, "0");
      }

      var startDate = taskData.startDate || new Date().toISOString();
      var dueDate = taskData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      var pct = calculateAutoProgress(startDate, dueDate);

      var newTask = {
        id: newId,
        name: taskData.name,
        description: taskData.description || "",
        department: taskData.department,
        owner: taskData.owner || creatorId,
        status: taskData.status || "Open",
        tags: taskData.tags || "",
        startDate: startDate,
        dueDate: dueDate,
        priority: taskData.priority || "Medium",
        completion: 0,
        group: taskData.group || "",
        createdDate: new Date().toISOString(),
        autoProgress: pct,
        parentTaskId: taskData.parentTaskId || "",
        calculatedAuto: pct,
        dependency: "No"
      };

      tasks.push(newTask);
      writeSheetData("Tasks", tasks);

      // System settings check for auto notification
      var settingsList = readSheetData("Settings");
      var settings = {};
      settingsList.forEach(function(s) { settings[s.key] = s.value; });
      var assignTargetId = taskData.owner || creatorId;
      
      if (settings.auto_notify_task_create === "true" && assignTargetId && assignTargetId !== creatorId) {
        var users = readSheetData("Users");
        var recipient = users.find(function(u) { return u.id === assignTargetId; });
        if (recipient) {
          var notifications = readSheetData("Notifications");
          var notifId = "NOTIF-" + String(notifications.length + 1).padStart(4, "0");
          notifications.push({
            id: notifId,
            referenceId: newId,
            type: "Task Assignment",
            recipientId: recipient.id,
            recipientName: recipient.fullName,
            recipientEmail: recipient.email,
            channel: "Email",
            status: "Sent",
            message: "New Task Assigned: " + taskData.name + ". Priority: " + (taskData.priority || "Medium"),
            sentDate: new Date().toISOString(),
            triggeredBy: "System"
          });
          writeSheetData("Notifications", notifications);
        }
      }

      return { success: true, taskId: newId, message: "Task created successfully" };
    }

    case "updateTask": {
      var taskId = args[0];
      var updates = args[1];
      
      var tasks = readSheetData("Tasks");
      var idx = -1;
      for (var i = 0; i < tasks.length; i++) {
        if (tasks[i].id === taskId) {
          idx = i;
          break;
        }
      }
      
      if (idx !== -1) {
        var task = tasks[idx];
        if (updates.status !== undefined) task.status = updates.status;
        if (updates.completion !== undefined) task.completion = Number(updates.completion);
        if (updates.priority !== undefined) task.priority = updates.priority;
        if (updates.dependency !== undefined) task.dependency = updates.dependency;
        
        var notifyOnReassign = false;
        var oldOwner = task.owner;
        if (updates.owner !== undefined) {
          task.owner = updates.owner;
          if (updates.owner !== oldOwner) {
            notifyOnReassign = true;
          }
        }
        
        task.autoProgress = calculateAutoProgress(task.startDate, task.dueDate);
        task.calculatedAuto = task.autoProgress;

        writeSheetData("Tasks", tasks);

        // System settings check
        if (notifyOnReassign) {
          var settingsList = readSheetData("Settings");
          var settings = {};
          settingsList.forEach(function(s) { settings[s.key] = s.value; });
          
          if (settings.auto_notify_task_assign === "true") {
            var users = readSheetData("Users");
            var recipient = users.find(function(u) { return u.id === updates.owner; });
            if (recipient) {
              var notifications = readSheetData("Notifications");
              var notifId = "NOTIF-" + String(notifications.length + 1).padStart(4, "0");
              notifications.push({
                id: notifId,
                referenceId: taskId,
                type: "Task Reassignment",
                recipientId: recipient.id,
                recipientName: recipient.fullName,
                recipientEmail: recipient.email,
                channel: "Email",
                status: "Sent",
                message: "Task Assigned: " + task.name,
                sentDate: new Date().toISOString(),
                triggeredBy: "System"
              });
              writeSheetData("Notifications", notifications);
            }
          }
        }

        return { success: true, message: "Task updated successfully" };
      }
      return { success: false, message: "Task not found" };
    }

    case "deleteTask": {
      var taskId = args[0];
      var tasks = readSheetData("Tasks");
      var originalLength = tasks.length;
      tasks = tasks.filter(function(t) { return t.id !== taskId; });
      if (tasks.length < originalLength) {
        writeSheetData("Tasks", tasks);
        return { success: true, message: "Task deleted successfully" };
      }
      return { success: false, message: "Task not found" };
    }

    case "getDependencies": {
      var dependencies = readSheetData("Dependencies");
      return { success: true, data: dependencies };
    }

    case "createDependency": {
      var depData = args[0];
      var dependencies = readSheetData("Dependencies");
      var lastNum = 0;
      dependencies.forEach(function(d) {
        if (String(d.id).indexOf("DEP-") === 0) {
          var numPart = parseInt(d.id.split("-")[1]);
          if (!isNaN(numPart) && numPart > lastNum) lastNum = numPart;
        }
      });
      var newId = "DEP-" + String(lastNum + 1).padStart(4, "0");

      var newDep = {
        id: newId,
        taskId: depData.taskId,
        dependsOn: depData.dependsOn,
        type: depData.type,
        status: "Active",
        createdDate: new Date().toISOString(),
        notes: depData.notes || ""
      };

      dependencies.push(newDep);
      writeSheetData("Dependencies", dependencies);
      return { success: true, message: "Dependency created successfully" };
    }

    case "updateDependency": {
      var depId = args[0];
      var updates = args[1];
      var dependencies = readSheetData("Dependencies");
      
      var found = null;
      for (var i = 0; i < dependencies.length; i++) {
        if (dependencies[i].id === depId) {
          found = dependencies[i];
          break;
        }
      }
      if (found) {
        if (updates.status !== undefined) found.status = updates.status;
        writeSheetData("Dependencies", dependencies);
        return { success: true, message: "Dependency updated successfully" };
      }
      return { success: false, message: "Dependency not found" };
    }

    case "deleteDependency": {
      var depId = args[0];
      var dependencies = readSheetData("Dependencies");
      var originalLength = dependencies.length;
      dependencies = dependencies.filter(function(d) { return d.id !== depId; });
      if (dependencies.length < originalLength) {
        writeSheetData("Dependencies", dependencies);
        return { success: true, message: "Dependency deleted" };
      }
      return { success: false, message: "Dependency not found" };
    }

    case "getIssues": {
      var filter = args[0];
      var userId = args[1];
      var userRole = args[2];
      
      var users = readSheetData("Users");
      var issues = readSheetData("Issues");
      
      var requestingUsername = "";
      for (var i = 0; i < users.length; i++) {
        if (users[i].id === userId) {
          requestingUsername = users[i].username;
          break;
        }
      }

      var result = [];
      var deptsSet = {};

      for (var j = 0; j < issues.length; j++) {
        var issue = issues[j];
        if (!checkTaskAccess(userId, userRole, issue.assignee, issue.tags, requestingUsername, users)) continue;
        var statusLower = String(issue.status || "").toLowerCase();

        if (filter === "Open Issue" && statusLower === "closed") continue;
        if (filter === "Closed Issue" && statusLower !== "closed") continue;
        if (filter === "View by Owner" && String(issue.assignee).trim() !== String(userId).trim()) continue;

        var autoP = calculateAutoProgress(issue.createdTime, issue.dueDate);
        issue.manualProgress = Number(issue.manualProgress || 0);
        issue.autoProgress = autoP;

        result.push(issue);
        if (issue.department) {
          deptsSet[issue.department] = true;
        }
      }

      var groups = Object.keys(deptsSet);
      return { success: true, data: result, groups: groups };
    }

    case "createIssue": {
      var issueData = args[0];
      var userId = args[1];
      
      var issues = readSheetData("Issues");
      var lastNum = 0;
      issues.forEach(function(i) {
        if (String(i.id).indexOf("ISSUE-") === 0) {
          var numPart = parseInt(i.id.split("-")[1]);
          if (!isNaN(numPart) && numPart > lastNum) lastNum = numPart;
        }
      });
      var newId = "ISSUE-" + String(lastNum + 1).padStart(4, "0");

      var now = new Date().toISOString();
      var dueDate = issueData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      var pct = calculateAutoProgress(now, dueDate);

      var newIssue = {
        id: newId,
        name: issueData.name,
        description: issueData.description || "",
        department: issueData.department,
        reporter: userId,
        createdTime: now,
        assignee: issueData.assignee || userId,
        tags: issueData.tags || "",
        lastModifiedTime: now,
        dueDate: dueDate,
        status: "Open",
        severity: issueData.severity || "Medium",
        classification: issueData.classification || "Bug",
        flag: issueData.flag || "Normal",
        autoProgress: pct,
        manualProgress: 0
      };

      issues.push(newIssue);
      writeSheetData("Issues", issues);

      // System Settings check
      var settingsList = readSheetData("Settings");
      var settings = {};
      settingsList.forEach(function(s) { settings[s.key] = s.value; });
      var assignTargetId = issueData.assignee || userId;

      if (settings.auto_notify_issue_assign === "true" && assignTargetId && assignTargetId !== userId) {
        var users = readSheetData("Users");
        var recipient = users.find(function(u) { return u.id === assignTargetId; });
        if (recipient) {
          var notifications = readSheetData("Notifications");
          var notifId = "NOTIF-" + String(notifications.length + 1).padStart(4, "0");
          notifications.push({
            id: notifId,
            referenceId: newId,
            type: "Issue Assignment",
            recipientId: recipient.id,
            recipientName: recipient.fullName,
            recipientEmail: recipient.email,
            channel: "Email",
            status: "Sent",
            message: "New Issue Assigned: " + issueData.name + ". Severity: " + (issueData.severity || "Medium"),
            sentDate: new Date().toISOString(),
            triggeredBy: "System"
          });
          writeSheetData("Notifications", notifications);
        }
      }

      return { success: true, issueId: newId, message: "Issue created successfully" };
    }

    case "updateIssue": {
      var issueId = args[0];
      var updates = args[1];
      
      var issues = readSheetData("Issues");
      var idx = -1;
      for (var i = 0; i < issues.length; i++) {
        if (issues[i].id === issueId) {
          idx = i;
          break;
        }
      }

      if (idx !== -1) {
        var issue = issues[idx];
        var now = new Date().toISOString();
        if (updates.status !== undefined) { issue.status = updates.status; issue.lastModifiedTime = now; }
        if (updates.severity !== undefined) { issue.severity = updates.severity; issue.lastModifiedTime = now; }
        if (updates.classification !== undefined) issue.classification = updates.classification;
        if (updates.flag !== undefined) issue.flag = updates.flag;
        if (updates.completion !== undefined) issue.manualProgress = Number(updates.completion);
        
        var notifyOnReassign = false;
        var oldAssignee = issue.assignee;
        if (updates.assignee !== undefined) {
          issue.assignee = updates.assignee;
          issue.lastModifiedTime = now;
          if (updates.assignee !== oldAssignee) {
            notifyOnReassign = true;
          }
        }

        writeSheetData("Issues", issues);

        if (notifyOnReassign) {
          var settingsList = readSheetData("Settings");
          var settings = {};
          settingsList.forEach(function(s) { settings[s.key] = s.value; });
          
          if (settings.auto_notify_issue_assign === "true") {
            var users = readSheetData("Users");
            var recipient = users.find(function(u) { return u.id === updates.assignee; });
            if (recipient) {
              var notifications = readSheetData("Notifications");
              var notifId = "NOTIF-" + String(notifications.length + 1).padStart(4, "0");
              notifications.push({
                id: notifId,
                referenceId: issueId,
                type: "Issue Assignment",
                recipientId: recipient.id,
                recipientName: recipient.fullName,
                recipientEmail: recipient.email,
                channel: "Email",
                status: "Sent",
                message: "Issue Assigned: " + issue.name,
                sentDate: new Date().toISOString(),
                triggeredBy: "System"
              });
              writeSheetData("Notifications", notifications);
            }
          }
        }

        return { success: true, message: "Issue updated successfully" };
      }
      return { success: false, message: "Issue not found" };
    }

    case "deleteIssue": {
      var issueId = args[0];
      var issues = readSheetData("Issues");
      var originalLength = issues.length;
      issues = issues.filter(function(i) { return i.id !== issueId; });
      if (issues.length < originalLength) {
        writeSheetData("Issues", issues);
        return { success: true, message: "Issue deleted successfully" };
      }
      return { success: false, message: "Issue not found" };
    }

    case "getUsers": {
      var userRole = args[0];
      var userId = args[1];
      
      var users = readSheetData("Users");
      var roleLower = String(userRole).toLowerCase();

      var result = [];
      for (var i = 0; i < users.length; i++) {
        var u = users[i];
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
      var userData = args[0];
      var creatorId = args[1];
      
      var users = readSheetData("Users");
      var exists = users.some(function(u) { return u.username === userData.username; });
      if (exists) {
        return { success: false, message: "Username already exists" };
      }

      var lastNum = 0;
      users.forEach(function(u) {
        if (String(u.id).indexOf("USR-") === 0) {
          var numPart = parseInt(u.id.split("-")[1]);
          if (!isNaN(numPart) && numPart > lastNum) lastNum = numPart;
        }
      });
      var newId = "USR-" + String(lastNum + 1).padStart(4, "0");

      var newUser = {
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

      users.push(newUser);
      writeSheetData("Users", users);
      return { success: true, userId: newId, message: "User created successfully" };
    }

    case "getDepartments": {
      var dFilter = args[0];
      var dUserId = args[1];
      
      var depts = readSheetData("Departments");
      var tasks = readSheetData("Tasks");
      
      var result = [];
      for (var i = 0; i < depts.length; i++) {
        var d = depts[i];
        if (dFilter === "Open Department" && d.status !== "Open") continue;
        if (dFilter === "Complete Department" && d.status !== "Closed") continue;
        if (dFilter === "View by Owner" && String(d.owner).trim() !== String(dUserId).trim()) continue;

        // Auto count total & open tasks for department
        var deptTasks = tasks.filter(function(t) { return t.department === d.name; });
        d.totalTasks = deptTasks.length;
        d.openTasks = deptTasks.filter(function(t) { return String(t.status).toLowerCase() !== "closed"; }).length;

        result.push(d);
      }
      return { success: true, data: result };
    }

    case "createDepartment": {
      var deptData = args[0];
      var creatorId = args[1];
      
      var depts = readSheetData("Departments");
      var lastNum = 0;
      depts.forEach(function(d) {
        if (String(d.id).indexOf("DEPT-") === 0) {
          var numPart = parseInt(d.id.split("-")[1]);
          if (!isNaN(numPart) && numPart > lastNum) lastNum = numPart;
        }
      });
      var newId = "DEPT-" + String(lastNum + 1).padStart(3, "0");

      var newDept = {
        id: newId,
        name: deptData.name,
        description: deptData.description || "",
        owner: deptData.owner || creatorId,
        status: "Open",
        totalTasks: 0,
        openTasks: 0,
        createdDate: new Date().toISOString()
      };

      depts.push(newDept);
      writeSheetData("Departments", depts);
      return { success: true, deptId: newId, message: "Department created successfully" };
    }

    case "getDepartmentList": {
      var depts = readSheetData("Departments");
      var openDepts = depts
        .filter(function(d) { return d.status === "Open"; })
        .map(function(d) { return { id: d.id, name: d.name }; });
      return { success: true, data: openDepts };
    }

    case "getManagers": {
      var users = readSheetData("Users");
      var managers = users
        .filter(function(u) { return (u.role === "Manager" || u.role === "Admin") && u.status === "Active"; })
        .map(function(u) { return { id: u.id, name: u.fullName, role: u.role }; });
      return { success: true, data: managers };
    }

    case "getAllActiveUsers": {
      var users = readSheetData("Users");
      var activeUsers = users
        .filter(function(u) { return u.status === "Active"; })
        .map(function(u) { return { id: u.id, username: u.username, name: u.fullName, role: u.role, department: u.department }; });
      return { success: true, data: activeUsers };
    }

    case "deleteUser": {
      var uId = args[0];
      var users = readSheetData("Users");
      var lenBefore = users.length;
      users = users.filter(function(u) { return u.id !== uId; });
      if (users.length < lenBefore) {
        writeSheetData("Users", users);
        return { success: true };
      }
      return { success: false, message: "User not found" };
    }

    case "deleteDepartment": {
      var dId = args[0];
      var depts = readSheetData("Departments");
      var lenBefore = depts.length;
      depts = depts.filter(function(d) { return d.id !== dId; });
      if (depts.length < lenBefore) {
        writeSheetData("Departments", depts);
        return { success: true };
      }
      return { success: false, message: "Department not found" };
    }

    case "getSettings": {
      var settingsList = readSheetData("Settings");
      var settings = {};
      settingsList.forEach(function(s) { settings[s.key] = s.value; });
      return { success: true, data: settings };
    }

    case "saveSettings": {
      var newSettings = args[0];
      var settingsList = readSheetData("Settings");
      
      var settingsMap = {};
      settingsList.forEach(function(s) { settingsMap[s.key] = s.value; });
      
      for (var key in newSettings) {
        settingsMap[key] = String(newSettings[key]);
      }
      
      var updatedList = [];
      for (var key in settingsMap) {
        updatedList.push({ key: key, value: settingsMap[key] });
      }
      
      writeSheetData("Settings", updatedList);
      return { success: true, message: "Settings saved successfully" };
    }

    case "getNotifications": {
      var nUserId = args[0];
      var nUserRole = args[1];
      var roleLower = String(nUserRole).toLowerCase();

      var notifications = readSheetData("Notifications");
      var result = [];
      for (var i = 0; i < notifications.length; i++) {
        var n = notifications[i];
        if (roleLower !== "admin" && String(n.recipientId).trim() !== String(nUserId).trim()) continue;
        result.push(n);
      }
      return { success: true, data: result.reverse() };
    }

    case "deleteNotification": {
      var notifId = args[0];
      var notifications = readSheetData("Notifications");
      var lenBefore = notifications.length;
      notifications = notifications.filter(function(n) { return n.id !== notifId; });
      if (notifications.length < lenBefore) {
        writeSheetData("Notifications", notifications);
        return { success: true, message: "Notification deleted" };
      }
      return { success: false, message: "Notification not found" };
    }

    case "clearAllNotifications": {
      var cUserId = args[0];
      var cUserRole = args[1];
      if (String(cUserRole).toLowerCase() !== "admin") {
        return { success: false, message: "Admin access required" };
      }
      writeSheetData("Notifications", []);
      return { success: true, message: "All notifications cleared" };
    }

    case "triggerTaskNotification": {
      var nTaskId = args[0];
      var triggeredByUserId = args[1];
      
      var tasks = readSheetData("Tasks");
      var task = tasks.find(function(t) { return t.id === nTaskId; });
      if (!task) return { success: false, message: "Task not found" };

      var users = readSheetData("Users");
      var recipient = users.find(function(u) { return u.id === task.owner; });
      if (!recipient) return { success: false, message: "Recipient not found for task owner ID: " + task.owner };

      var triggerer = users.find(function(u) { return u.id === triggeredByUserId; });
      var triggeredByName = triggerer ? triggerer.fullName : triggeredByUserId;

      var notifications = readSheetData("Notifications");
      var notifId = "NOTIF-" + String(notifications.length + 1).padStart(4, "0");
      var message = "A task requires your attention:\n\n• Task ID: " + nTaskId + "\n• Name: " + task.name + "\n• Status: " + task.status;

      notifications.push({
        id: notifId,
        referenceId: nTaskId,
        type: "Task Notification",
        recipientId: recipient.id,
        recipientName: recipient.fullName,
        recipientEmail: recipient.email,
        channel: "Email",
        status: "Sent",
        message: message,
        sentDate: new Date().toISOString(),
        triggeredBy: triggeredByName
      });

      writeSheetData("Notifications", notifications);
      return { success: true, emailResult: "Sent (Logged to Notification Log)" };
    }

    case "triggerIssueNotification": {
      var nIssueId = args[0];
      var triggeredByUserId = args[1];
      
      var issues = readSheetData("Issues");
      var issue = issues.find(function(i) { return i.id === nIssueId; });
      if (!issue) return { success: false, message: "Issue not found" };

      var users = readSheetData("Users");
      var recipient = users.find(function(u) { return u.id === issue.assignee; });
      if (!recipient) return { success: false, message: "Recipient not found for assignee ID: " + issue.assignee };

      var triggerer = users.find(function(u) { return u.id === triggeredByUserId; });
      var triggeredByName = triggerer ? triggerer.fullName : triggeredByUserId;

      var notifications = readSheetData("Notifications");
      var notifId = "NOTIF-" + String(notifications.length + 1).padStart(4, "0");
      var message = "An issue requires your attention:\n\n• Issue ID: " + nIssueId + "\n• Name: " + issue.name + "\n• Status: " + issue.status;

      notifications.push({
        id: notifId,
        referenceId: nIssueId,
        type: "Issue Notification",
        recipientId: recipient.id,
        recipientName: recipient.fullName,
        recipientEmail: recipient.email,
        channel: "Email",
        status: "Sent",
        message: message,
        sentDate: new Date().toISOString(),
        triggeredBy: triggeredByName
      });

      writeSheetData("Notifications", notifications);
      return { success: true, emailResult: "Sent (Logged to Notification Log)" };
    }
  }

  return { success: false, message: "Action not defined: " + action };
}
