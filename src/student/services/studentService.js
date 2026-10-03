const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("auth_token");

  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const getStudentProfile = async () => {
  const response = await fetch(`${BASE_URL}/student/profile`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch profile.");
  }

  return result.data;
};

export const getStudentSkills = async () => {
  const response = await fetch(`${BASE_URL}/student/skills`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch student skills.");
  }

  return result.data;
};

export const updateStudentProfile = async (profileData) => {
  const response = await fetch(`${BASE_URL}/student/profile`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(profileData),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to update profile.");
  }

  return result.data;
};

export const getStudentOnboarding = async () => {
  const response = await fetch(`${BASE_URL}/student/onboarding`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch onboarding data.");
  }

  return result.data;
};

export const updateStudentOnboarding = async (profileData) => {
  const response = await fetch(`${BASE_URL}/student/onboarding`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(profileData),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to update onboarding data.");
  }

  return result.data;
};

export const getAvailableSkills = async () => {
  const response = await fetch(`${BASE_URL}/skills`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch skills.");
  }

  return result.data;
};

export const addStudentSkill = async (skill_id) => {
  const response = await fetch(`${BASE_URL}/student/skills`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      skill_id,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to add skill.");
  }

  return result.data;
};

export const completeStudentOnboarding = async () => {
  const response = await fetch(
    `${BASE_URL}/student/onboarding/complete`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to complete onboarding.");
  }

  return result.data;
};
