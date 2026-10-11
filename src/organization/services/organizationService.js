import { ApiError, requestJson, userMessage } from "../../shared/utils/apiErrors";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/+$/,
  "",
);

const DEFAULT_TIMEOUT_MS = 30000;
// طلبات الذكاء الاصطناعي قد تتضمن استدعاءين لـ Gemini مع إعادة المحاولة في الخادم
const AI_TIMEOUT_MS = 150000;

const request = async (path, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const token = localStorage.getItem("auth_token");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await requestJson(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    return result.data;
  } catch (error) {
    if (error instanceof ApiError) {
      // نحافظ على شكل الخطأ الذي تعتمد عليه الصفحات: status و errors و message آمنة
      error.errors = error.data?.errors || {};
      error.message = userMessage(error);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const json = (method, data) => ({ method, body: JSON.stringify(data) });
const projectRequestsPath = "/organization/project-requests";

export const createProjectRequest = (data) =>
  request(projectRequestsPath, json("POST", data));
export const getProjectRequests = () => request(projectRequestsPath);
export const getProjectRequest = (id) =>
  request(`${projectRequestsPath}/${id}`);
export const updateProjectRequest = (id, data) =>
  request(`${projectRequestsPath}/${id}`, json("PATCH", data));
export const deleteProjectRequest = (id) =>
  request(`${projectRequestsPath}/${id}`, { method: "DELETE" });
export const getNextDiscoveryQuestion = (id) =>
  request(`${projectRequestsPath}/${id}/next-question`, { method: "POST" }, AI_TIMEOUT_MS);
export const submitDiscoveryAnswer = (id, answer) =>
  request(`${projectRequestsPath}/${id}/answer`, json("POST", answer), AI_TIMEOUT_MS);
export const analyzeProjectRequest = (id) =>
  request(`${projectRequestsPath}/${id}/analyze`, { method: "POST" }, AI_TIMEOUT_MS);
export const approveProposal = (id) =>
  request(`${projectRequestsPath}/${id}/approve`, { method: "POST" });
export const requestRevision = (id, data) =>
  request(`${projectRequestsPath}/${id}/revision`, json("POST", data));

export const getOrganizationProfile = () => request("/organization/onboarding");
export const updateOrganizationProfile = (data) =>
  request("/organization/onboarding", json("PATCH", data));

// يجلب بيانات اللوحة دفعة واحدة، وأي فشل جزئي يُرجَع كرسالة بدل أن يكسر الصفحة
export const getDashboardData = async () => {
  const [profileRes, requestsRes] = await Promise.allSettled([
    getOrganizationProfile(),
    getProjectRequests(),
  ]);
  const errors = [];
  let profile = null;
  let requests = [];

  if (profileRes.status === "fulfilled") profile = profileRes.value;
  else errors.push("تعذر تحميل بيانات المؤسسة.");

  if (requestsRes.status === "fulfilled" && Array.isArray(requestsRes.value))
    requests = requestsRes.value;
  else errors.push("تعذر تحميل طلبات المشاريع.");

  return { profile, requests, errors };
};
