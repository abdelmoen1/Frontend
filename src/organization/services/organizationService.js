const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/+$/,
  "",
);

const request = async (path, options = {}) => {
  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.message || "تعذر إكمال الطلب.");
    error.status = response.status;
    error.errors = result.errors || {};
    throw error;
  }

  return result.data;
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
export const getNextDiscoveryQuestion = (id) =>
  request(`${projectRequestsPath}/${id}/next-question`, { method: "POST" });
export const submitDiscoveryAnswer = (id, answer) =>
  request(`${projectRequestsPath}/${id}/answer`, json("POST", answer));
export const analyzeProjectRequest = (id) =>
  request(`${projectRequestsPath}/${id}/analyze`, { method: "POST" });
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
