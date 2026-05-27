// Client-side API caller to communicate with Express backend which proxies to local DB or Google Sheets.

const clientCache = new Map<string, { data: any; timestamp: number }>();
const CLIENT_CACHE_TTL_MS = 15000; // 15 seconds cache TTL

function clearClientCache() {
  clientCache.clear();
  console.log("🧼 Client-side RAM cache flushed cleanly.");
}

export async function rpcCall(action: string, args: any[] = []): Promise<any> {
  const isWrite = action.startsWith("create") || 
                  action.startsWith("update") || 
                  action.startsWith("delete") || 
                  action.startsWith("save") || 
                  action.startsWith("trigger") || 
                  action.startsWith("login") ||
                  action.startsWith("sendWhatsApp") ||
                  action.startsWith("clear");

  if (isWrite) {
    clearClientCache();
  } else {
    // Check local client-side memory cache for super-fast offline-first responses
    const cacheKey = `${action}::${JSON.stringify(args || [])}`;
    const cachedEntry = clientCache.get(cacheKey);
    if (cachedEntry && (Date.now() - cachedEntry.timestamp < CLIENT_CACHE_TTL_MS)) {
      console.log(`⚡ [Client RAM Cache Hit] Auto-serving action [${action}] instantly`);
      return cachedEntry.data;
    }
  }

  try {
    const isGitHubPages = window.location.hostname.endsWith(".github.io");
    const appsScriptUrl = "https://script.google.com/macros/s/AKfycbyboh73f8icdlfpxDCK6DBQLnIkwVdsDgwxDj-CqmkaIUop2_BmqMUWsl64Jb3wkX_nIQ/exec";

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
    const resultJson = JSON.parse(textResult);

    // If it is a read query and succeeded, save to client-side memory cache
    if (!isWrite && resultJson && resultJson.success !== false) {
      const cacheKey = `${action}::${JSON.stringify(args || [])}`;
      clientCache.set(cacheKey, {
        data: resultJson,
        timestamp: Date.now()
      });
    }

    return resultJson;
  } catch (error: any) {
    console.error(`RPC Exception for ${action}:`, error);
    return { success: false, message: error.message || String(error) };
  }
}

// Named exports for clarity
export const api = {
  clearCache: () => clearClientCache(),
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
  updateUser: (userId: string, updates: any) => rpcCall("updateUser", [userId, updates]),
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
