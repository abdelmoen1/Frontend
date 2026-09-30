const BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const getStudentProfile = async () => {
  try {
    const token = localStorage.getItem("auth_token");

    const response = await fetch(`${BASE_URL}/student/profile`, {
      method: "GET", 
         headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch profile.");
    }

    return result.data;
  } catch (error) {
    throw error;
  }
};

export const updateStudentProfile = async (profileData) => {
  try {
    const token = localStorage.getItem("auth_token");

    const response = await fetch(`${BASE_URL}/student/profile`, {
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
      throw new Error(result.message || "Failed to update profile.");
    }

    return result.data;
  } catch (error) {
    throw error;
  }
};
export const getAvailableSkills = async () => {
  try {
    const token = localStorage.getItem("auth_token");

    const response = await fetch(`${BASE_URL}/skills`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch skills.");
    }

    return result.data;
  } catch (error) {
    throw error;
  }
};

export const addStudentSkill = async ({ skill_id, proficiency }) => {
  try {
    const token = localStorage.getItem("auth_token");

    const response = await fetch(`${BASE_URL}/student/skills`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ skill_id, proficiency }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to add skill.");
    }

    return result.data;
  } catch (error) {
    throw error;
  }
};