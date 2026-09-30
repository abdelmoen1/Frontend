const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getOrganizationProfile = async () => {
  try {
    const token = localStorage.getItem("auth_token");

    const response = await fetch(`${BASE_URL}/organization/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch organization profile.");
    }

    return result.data;
  } catch (error) {
    throw error;
  }
};

export const updateOrganizationProfile = async (profileData) => {
  try {
    const token = localStorage.getItem("auth_token");

    const response = await fetch(`${BASE_URL}/organization/profile`, {
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

    return result.organization_profile;
  } catch (error) {
    throw error;
  }
};