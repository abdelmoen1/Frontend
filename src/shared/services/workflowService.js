import { ApiError, requestJson, userMessage } from "../utils/apiErrors";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
const TIMEOUT_MS = 30000;

// يعيد الرد كاملًا (data و meta و unread_count) لأن بعض الشاشات تحتاج أكثر من data
const request = async (path, options = {}) => {
  const token = localStorage.getItem("auth_token");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await requestJson(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      error.errors = error.data?.errors || {};
      error.reason = error.data?.reason;
      error.eligibility = error.data?.eligibility;
      error.message = userMessage(error);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const send = (method, data) => ({ method, body: data === undefined ? undefined : JSON.stringify(data) });
const query = (params) => {
  const text = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")).toString();
  return text ? `?${text}` : "";
};

// مدير المنصة
export const getAdminOverview = () => request("/admin/overview").then((r) => r.data);
export const getAdminProjects = (params = {}) => request(`/admin/projects${query(params)}`);
export const getAdminProject = (id) => request(`/admin/projects/${id}`).then((r) => r.data);
export const reviewProject = (id, decision, note) => request(`/admin/projects/${id}/review`, send("POST", { decision, note: note || null })).then((r) => r.data);
export const getLeaderCandidates = (id, search) => request(`/admin/projects/${id}/leader-candidates${query({ search })}`).then((r) => r.data);
export const assignProjectLeader = (id, userId, justification) =>
  request(`/admin/projects/${id}/leader`, send("POST", { user_id: userId, justification: justification || null }));
export const revokeProjectLeader = (id, reason) => request(`/admin/projects/${id}/leader`, send("DELETE", { reason }));
export const getAdminUsers = (params = {}) => request(`/admin/users${query(params)}`);
export const setUserActive = (id, isActive) => request(`/admin/users/${id}`, send("PATCH", { is_active: isActive })).then((r) => r.data);

// قائد الفريق
export const getLeadingProjects = () => request("/leader/projects").then((r) => r.data);
export const startProjectExecution = (id) => request(`/projects/${id}/start`, send("POST", {}));

// مساحة الخطة والاتفاق (القائد والمؤسسة)
export const getPlanWorkspace = (id) => request(`/projects/${id}/plan`).then((r) => r.data);
export const savePlanDraft = (id, content) => request(`/projects/${id}/plan/draft`, send("PUT", { content })).then((r) => r.data);
export const submitPlanVersion = (id, versionId) => request(`/projects/${id}/plan/versions/${versionId}/submit`, send("POST", {})).then((r) => r.data);
export const decidePlanVersion = (id, versionId, decision, contentHash, note) =>
  request(`/projects/${id}/plan/versions/${versionId}/decision`, send("POST", { decision, content_hash: contentHash, note: note || null })).then((r) => r.data);
export const commentOnPlanVersion = (id, versionId, body) =>
  request(`/projects/${id}/plan/versions/${versionId}/comments`, send("POST", { body })).then((r) => r.data);

// المؤسسة: عرض المشروع للقراءة
export const getOrganizationProject = (id) => request(`/organization/projects/${id}`).then((r) => r.data);

// الإشعارات
export const getNotifications = () => request("/notifications");
export const markAllNotificationsRead = () => request("/notifications/read-all", send("POST", {}));
