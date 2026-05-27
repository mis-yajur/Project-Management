// Client-side API caller to communicate with Express backend which proxies to local DB or Google Sheets.

export async function rpcCall(action: string, args: any[] = []): Promise<any> {
  try {
    const isGitHubPages = window.location.hostname.endsWith(".github.io");
    const appsScriptUrl = "https://script.google.com/macros/s/AKfycbx8LMHDMa6ziSH5Vzv5C1E_C45LhXyfiaTqNXShesT8BAxZTsduoOBEdtB5nPU6Q5lqAg/exec";

    const fetchUrl = isGitHubPages ? appsScriptUrl : "/api/rpc";
    const fetchHeaders: Record<string, string> = {
      "Content-Type": "text/plain", // Keep text/plain to avoid preflight issues in simple-request CORS for Apps Script
    };

    if (!isGitHubPages) {
      fetchHeaders["Content-Type"] = "application/json";
    }

    const response = await fetch(fetchUrl, {
      method: "POST",
      headers: fetchHeaders,
      body: JSON.stringify({ action, args }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP error ${response.status}: ${text}`);
    }

    const textResult = await response.text();
    return JSON.parse(textResult);
  } catch (error: any) {
    console.error(`RPC Exception for ${action}:`, error);
    return { success: false, message: error.message || String(error) };
  }
}

// Named exports for clarity
export const api = {
  login: (username: string, password: string) => rpcCall("loginUser", [username, password]),
  getDashboardCounts: (userId: string, role: string) => rpcCall("getDashboardCounts", [userId, role]),
  getTasks: (filter: string, userId: string, role: string) => rpcCall("getTasks", [filter, userId, role]),
  createTask: (taskData: any, creatorId: string) => rpcCall("createTask", [taskData, creatorId]),
  updateTask: (taskId: string, updates: any) => rpcCall("updateTask", [taskId, updates]),
  deleteTask: (taskId: string) => rpcCall("deleteTask", [taskId]),
  
  getDependencies: () => rpcCall("getDependencies"),
  createDependency: (depData: any) => rpcCall("createDependency", [depData]),
  updateDependency: (depId: string, updates: any) => rpcCall("updateDependency", [depId, updates]),
  deleteDependency: (depId: string) => rpcCall("deleteDependency", [depId]),
  
  getIssues: (filter: string, userId: string, role: string) => rpcCall("getIssues", [filter, userId, role]),
  createIssue: (issueData: any, userId: string) => rpcCall("createIssue", [issueData, userId]),
  updateIssue: (issueId: string, updates: any) => rpcCall("updateIssue", [issueId, updates]),
  deleteIssue: (issueId: string) => rpcCall("deleteIssue", [issueId]),
  
  getUsers: (role: string, userId: string) => rpcCall("getUsers", [role, userId]),
  createUser: (userData: any, creatorId: string) => rpcCall("createUser", [userData, creatorId]),
  deleteUser: (userId: string) => rpcCall("deleteUser", [userId]),
  
  getDepartments: (filter: string, userId: string) => rpcCall("getDepartments", [filter, userId]),
  createDepartment: (deptData: any, userId: string) => rpcCall("createDepartment", [deptData, userId]),
  deleteDepartment: (deptId: string) => rpcCall("deleteDepartment", [deptId]),
  
  getDepartmentList: () => rpcCall("getDepartmentList"),
  getManagers: () => rpcCall("getManagers"),
  getAllActiveUsers: () => rpcCall("getAllActiveUsers"),
  
  getSettings: () => rpcCall("getSettings"),
  saveSettings: (settings: any) => rpcCall("saveSettings", [settings]),
  
  getNotifications: (userId: string, role: string) => rpcCall("getNotifications", [userId, role]),
  deleteNotification: (notifId: string) => rpcCall("deleteNotification", [notifId]),
  clearAllNotifications: (userId: string, role: string) => rpcCall("clearAllNotifications", [userId, role]),
  
  triggerTaskNotification: (taskId: string, triggeredByUserId: string) => rpcCall("triggerTaskNotification", [taskId, triggeredByUserId]),
  triggerIssueNotification: (issueId: string, triggeredByUserId: string) => rpcCall("triggerIssueNotification", [issueId, triggeredByUserId]),
  sendWhatsApp: (phone: string, name: string, taskId: string, daysLimit: string, priority: string, updateLink: string) => rpcCall("sendWhatsApp", [phone, name, taskId, daysLimit, priority, updateLink]),
};
