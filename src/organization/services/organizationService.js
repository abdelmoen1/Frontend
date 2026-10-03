const BASE_URL = import.meta.env.PROD ? "/api" : import.meta.env.VITE_API_BASE_URL;

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