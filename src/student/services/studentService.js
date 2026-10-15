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
    // code يميز رفض حذف مهارة لها تقييم محفوظ (skill_has_assessment)
    const error = new Error(result.message || "Failed to remove student skill.");
    error.code = result.code;
    throw error;
  }

  return result.data;
};

// يحفظ بيانات الإكمال كلها في طلب واحد (الاسم، الدراسة، التخصص، skill_ids من مهارات التخصص)؛
// يرمي ApiError وفيه أخطاء الحقول عند 422
export const completeStudentOnboarding = async (payload) =>
  (
    await requestJson(`${BASE_URL}/student/onboarding/complete`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })
  ).data;

// فرص المشاريع المنشورة المفتوحة للتقديم مع أهلية الطالب لكل دور. params: page, filter (all|eligible), q.
// الأخطاء تحمل status (مثل 404 لفرصة لم تعد متاحة) لعرض الحالة المناسبة.
export const getOpportunities = async (params = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  ).toString();
  return (await requestJson(`${BASE_URL}/opportunities${query ? `?${query}` : ""}`, { headers: getAuthHeaders(false) }))
    .data;
};

export const getOpportunity = async (id) =>
  (await requestJson(`${BASE_URL}/opportunities/${id}`, { headers: getAuthHeaders(false) })).data;

// التقديم لنفسه فقط: الخادم يأخذ الطالب من الجلسة ويتحقق من الأهلية وحالة الفرصة وعدم التكرار
export const applyToOpportunity = async (id, { preferredRoleId = null, note = "" } = {}) =>
  (
    await requestJson(`${BASE_URL}/opportunities/${id}/applications`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ preferred_role_id: preferredRoleId, note: note.trim() || null }),
    })
  ).data;

export const getMyApplications = async () =>
  (await requestJson(`${BASE_URL}/student/applications`, { headers: getAuthHeaders(false) })).data;

export const withdrawApplication = async (id) =>
  (
    await requestJson(`${BASE_URL}/student/applications/${id}/withdraw`, {
      method: "POST",
      headers: getAuthHeaders(),
    })
  ).data;

// تقييم المهارات بأسئلة مفتوحة: الطالب يرسل نص إجابته فقط، والخادم يولد الأسئلة ويصحح ويسجل النتائج.
export const getSpecializations = async () =>
  (await requestJson(`${BASE_URL}/student/specializations`, { headers: getAuthHeaders(false) })).data;

export const getAssessments = async () =>
  (await requestJson(`${BASE_URL}/student/assessments`, { headers: getAuthHeaders(false) })).data;

// جلسة لحتى 3 مهارات بمستوى لكل مهارة: skills = [{skill_id, level}]. يولد Gemini أسئلة جديدة أو يعيد الجلسة
// المفتوحة نفسها؛ قد يستغرق عدة ثوانٍ
export const startAssessmentSession = async (skills) =>
  (
    await requestJson(`${BASE_URL}/student/assessment-sessions`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ skills }),
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
