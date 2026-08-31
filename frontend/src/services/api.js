const API_BASE_URL = "http://localhost:8000/api";

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "API request failed");
  }
  return response.json();
};

export const api = {
  // Master Lists
  getAssets: () => fetch(`${API_BASE_URL}/assets`).then(handleResponse),
  getDefects: () => fetch(`${API_BASE_URL}/defects`).then(handleResponse),
  getTasks: () => fetch(`${API_BASE_URL}/tasks`).then(handleResponse),
  getPrioritizedTasks: () => fetch(`${API_BASE_URL}/tasks/prioritized`).then(handleResponse),
  getTeams: () => fetch(`${API_BASE_URL}/teams`).then(handleResponse),
  getBlocks: () => fetch(`${API_BASE_URL}/blocks`).then(handleResponse),
  getTrains: () => fetch(`${API_BASE_URL}/trains`).then(handleResponse),
  getRoutes: () => fetch(`${API_BASE_URL}/routes`).then(handleResponse),

  // Planner
  generatePlan: () => fetch(`${API_BASE_URL}/planner/generate`, { method: "POST" }).then(handleResponse),
  getPlans: () => fetch(`${API_BASE_URL}/plans`).then(handleResponse),
  approvePlan: (id) => fetch(`${API_BASE_URL}/plans/${id}/approve`, { method: "POST" }).then(handleResponse),
  rejectPlan: (id) => fetch(`${API_BASE_URL}/plans/${id}/reject`, { method: "POST" }).then(handleResponse),

  // Simulator
  runSimulation: (config) =>
    fetch(`${API_BASE_URL}/simulator/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    }).then(handleResponse),

  // Dashboard & Reset
  getDashboardStats: () => fetch(`${API_BASE_URL}/dashboard/stats`).then(handleResponse),
  resetDemoData: () => fetch(`${API_BASE_URL}/reset-data`, { method: "POST" }).then(handleResponse),

  // Block route update
  updateBlockRoute: (blockId, corridor) =>
    fetch(`${API_BASE_URL}/blocks/${blockId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corridor }),
    }).then(handleResponse),

  // Department Operations
  loginDepartment: (email, password) =>
    fetch(`${API_BASE_URL}/departments/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(handleResponse),

  getDepartmentTasks: (department) =>
    fetch(`${API_BASE_URL}/departments/tasks?department=${encodeURIComponent(department)}`).then(handleResponse),

  updateDepartmentTaskStatus: (taskId, status, durationHours) =>
    fetch(`${API_BASE_URL}/departments/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, duration_hours: durationHours }),
    }).then(handleResponse),

  reportDefect: (assetId, description, severity) =>
    fetch(`${API_BASE_URL}/departments/report-defect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset_id: assetId, description, severity }),
    }).then(handleResponse),

  requestMaintenance: (assetId, description, requiredSkill, durationHours) =>
    fetch(`${API_BASE_URL}/departments/request-maintenance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset_id: assetId, description, required_skill: requiredSkill, duration_hours: durationHours }),
    }).then(handleResponse),

  // Notifications API
  getNotifications: () => fetch(`${API_BASE_URL}/notifications`).then(handleResponse),
  markNotificationAsRead: (id) => fetch(`${API_BASE_URL}/notifications/${id}/read`, { method: "POST" }).then(handleResponse),
  readAllNotifications: () => fetch(`${API_BASE_URL}/notifications/read-all`, { method: "POST" }).then(handleResponse),
  approveNotificationAction: (id) => fetch(`${API_BASE_URL}/notifications/${id}/approve`, { method: "POST" }).then(handleResponse),
  rejectNotificationAction: (id) => fetch(`${API_BASE_URL}/notifications/${id}/reject`, { method: "POST" }).then(handleResponse),
  deleteNotification: (id) => fetch(`${API_BASE_URL}/notifications/${id}`, { method: "DELETE" }).then(handleResponse),
  clearAllNotifications: () => fetch(`${API_BASE_URL}/notifications/clear-all`, { method: "DELETE" }).then(handleResponse),
  manualAssignTask: (taskId, blockId, teamId, evictPlanIds = [], autoApprove = false) =>
    fetch(`${API_BASE_URL}/plans/manual-assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_id: taskId,
        block_id: blockId,
        team_id: teamId || null,
        evict_plan_ids: evictPlanIds,
        auto_approve: autoApprove
      }),
    }).then(handleResponse),
  autoSuggestBlock: (taskId) =>
    fetch(`${API_BASE_URL}/plans/auto-suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId }),
    }).then(handleResponse),

  // User Management
  getUsers: () => fetch(`${API_BASE_URL}/users`).then(handleResponse),
  createUser: (username, email, password, department) =>
    fetch(`${API_BASE_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, department }),
    }).then(handleResponse),
  updateUser: (id, username, email, password, department) =>
    fetch(`${API_BASE_URL}/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, department }),
    }).then(handleResponse),
  deleteUser: (id) =>
    fetch(`${API_BASE_URL}/users/${id}`, {
      method: "DELETE",
    }).then(handleResponse),

  forgotPassword: (email) =>
    fetch(`${API_BASE_URL}/users/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).then(handleResponse),

  verifyOtp: (email, otp, newPassword) =>
    fetch(`${API_BASE_URL}/users/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, new_password: newPassword }),
    }).then(handleResponse),

  // Departmental Requests Management
  getSubmittedRequests: (department) =>
    fetch(`${API_BASE_URL}/departments/requests?department=${encodeURIComponent(department)}`).then(handleResponse),
  updateSubmittedRequest: (taskId, payload) =>
    fetch(`${API_BASE_URL}/departments/requests/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handleResponse),
  deleteSubmittedRequest: (taskId) =>
    fetch(`${API_BASE_URL}/departments/requests/${taskId}`, {
      method: "DELETE",
    }).then(handleResponse),
};






