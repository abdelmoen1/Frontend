import { requestJson } from "../../shared/utils/apiErrors";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getAuthHeaders = (json = true) => {
  const token = localStorage.getItem("auth_token");

  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  if (json) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
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

export const updateStudentProfile = async (profileData, image) => {
  let response;

  if (image) {
    const body = new FormData();
    body.append("_method", "PATCH");

    const appendFormValue = (key, value) => {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          body.append(`${key}[]`, "");
          return;
        }
        value.forEach((item, index) =>
          appendFormValue(`${key}[${index}]`, item),
        );
      } else if (value && typeof value === "object") {
        Object.entries(value).forEach(([nestedKey, nestedValue]) =>
          appendFormValue(`${key}[${nestedKey}]`, nestedValue),
        );
      } else {
        body.append(key, value ?? "");
      }
    };

    Object.entries(profileData).forEach(([key, value]) =>
      appendFormValue(key, value),
    );
    body.append("image", image);

    response = await fetch(`${BASE_URL}/student/profile`, {
      method: "POST",
      headers: getAuthHeaders(false),
      body,
    });
  } else {
    response = await fetch(`${BASE_URL}/student/profile`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData),
    });
  }

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

export const addStudentSkill = async (skill_id, proficiency = "intermediate") => {
  const response = await fetch(`${BASE_URL}/student/skills`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      skill_id,
      proficiency,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to add skill.");
  }

  return result.data;
};

export const updateStudentSkill = async (skill_id, proficiency) => {
  const response = await fetch(`${BASE_URL}/student/skills/${skill_id}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ proficiency }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to update skill proficiency.");
  }

  return result.data;
};

export const deleteStudentSkill = async (skill_id) => {
  const response = await fetch(`${BASE_URL}/student/skills/${skill_id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to remove student skill.");
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

// فرص المشاريع: الخادم يعيد فقط المشاريع المنشورة التي يطابق الطالب أحد أدوارها.
// الأخطاء تحمل status (مثل 404 لفرصة لم تعد متاحة) لعرض الحالة المناسبة.
export const getOpportunities = async () =>
  (await requestJson(`${BASE_URL}/student/opportunities`, { headers: getAuthHeaders(false) })).data;

export const getOpportunity = async (id) =>
  (await requestJson(`${BASE_URL}/student/opportunities/${id}`, { headers: getAuthHeaders(false) })).data;

// تقييم المهارات بأسئلة مفتوحة: الطالب يرسل نص إجابته فقط، والخادم يولد الأسئلة ويصحح ويسجل النتائج.
export const getSpecializations = async () =>
  (await requestJson(`${BASE_URL}/student/specializations`, { headers: getAuthHeaders(false) })).data;

export const getAssessments = async () =>
  (await requestJson(`${BASE_URL}/student/assessments`, { headers: getAuthHeaders(false) })).data;

// يولد Gemini الأسئلة أو يعيد الجلسة المفتوحة نفسها؛ قد يستغرق عدة ثوانٍ
export const startAssessmentSession = async (skillIds) =>
  (
    await requestJson(`${BASE_URL}/student/assessment-sessions`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ skill_ids: skillIds }),
    })
  ).data;

export const getAssessmentSession = async (sessionId) =>
  (await requestJson(`${BASE_URL}/student/assessment-sessions/${sessionId}`, { headers: getAuthHeaders(false) })).data;

// الإجابة تُرسل كما كتبها الطالب دون قص المسافات
export const submitAssessmentAnswer = async (sessionId, questionId, answer) =>
  (
    await requestJson(`${BASE_URL}/student/assessment-sessions/${sessionId}/answers`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ question_id: questionId, answer }),
    })
  ).data;

// يصحح الإجابات المعلقة؛ grading_error يصف فشل التصحيح في هذا الطلب دون خسارة الإجابات
export const finalizeAssessmentSession = async (sessionId) => {
  const result = await requestJson(`${BASE_URL}/student/assessment-sessions/${sessionId}/finalize`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return { session: result.data, gradingError: result.grading_error || null };
};
