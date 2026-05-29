export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
  managerId: string;
  managerName?: string;
  createdDate: string;
  lastLogin: string;
  status: string;
  contactNumber: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  department: string;
  owner: string;
  status: string;
  tags: string;
  startDate: string;
  dueDate: string;
  priority: string;
  completion: number;
  group: string;
  createdDate: string;
  autoProgress: number;
  parentTaskId: string;
  calculatedAuto: number;
  dependency: string;
}

export interface Issue {
  id: string;
  name: string;
  description: string;
  department: string;
  reporter: string;
  createdTime: string;
  assignee: string;
  tags: string;
  lastModifiedTime: string;
  dueDate: string;
  status: string;
  severity: string;
  classification: string;
  flag: string;
  autoProgress: number;
  manualProgress: number;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  owner: string;
  status: string;
  totalTasks: number;
  openTasks: number;
  createdDate: string;
}

export interface Dependency {
  id: string;
  taskId: string;
  dependsOn: string;
  type: string;
  status: string;
  createdDate: string;
  notes: string;
}

export interface NotificationLog {
  id: string;
  referenceId: string;
  type: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  channel: string;
  status: string;
  message: string;
  sentDate: string;
  triggeredBy: string;
}

export interface AppSettings {
  email_enabled: string;
  auto_notify_task_create: string;
  auto_notify_task_assign: string;
  auto_notify_issue_assign: string;
  email_from_name: string;
  wa_template_name?: string;
}

export interface DashboardCounts {
  openTasks: number;
  closedTasks: number;
  openIssues: number;
  closedIssues: number;
}
