const BASE_URL = import.meta.env.PROD ? "/api" : import.meta.env.VITE_API_BASE_URL;

const request = async (path, options = {}) => {
  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.message || "تعذر إكمال الطلب.");
    error.status = response.status;
    error.errors = result.errors || {};
    throw error;
  }

  return result.data;
};

const projectRequestsPath = "/organization/project-requests";

export const createProjectRequest = (data) =>
  request(projectRequestsPath, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getProjectRequests = () => request(projectRequestsPath);

export const getProjectRequest = (id) => request(`${projectRequestsPath}/${id}`);

export const updateProjectRequest = (id, data) =>
  request(`${projectRequestsPath}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const getIntake = (id) =>
  request(`${projectRequestsPath}/${id}/intake`);

export const saveIntake = (id, data) =>
  request(`${projectRequestsPath}/${id}/intake`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getNextDiscoveryQuestion = (id) =>
  request(`${projectRequestsPath}/${id}/next-question`, { method: "POST" });

export const submitDiscoveryAnswer = (id, answer) =>
  request(`${projectRequestsPath}/${id}/answer`, {
    method: "POST",
    body: JSON.stringify(answer),
  });

export const analyzeProjectRequest = (id) =>
  request(`${projectRequestsPath}/${id}/analyze`, { method: "POST" });

export const approveProposal = (id) =>
  request(`${projectRequestsPath}/${id}/approve`, { method: "POST" });

export const requestRevision = (id, data) =>
  request(`${projectRequestsPath}/${id}/revision`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getOrganizationProfile = async () => {
  const token = localStorage.getItem("auth_token");

  const response = await fetch(`${BASE_URL}/organization/onboarding`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch organization profile.");
  }

  return result.data;
};

export const updateOrganizationProfile = async (profileData) => {
  const token = localStorage.getItem("auth_token");

  const response = await fetch(`${BASE_URL}/organization/onboarding`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to update organization profile.");
  }

  return result.data;
};