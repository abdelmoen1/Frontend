import { ApiError, requestJson } from "../utils/apiErrors";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
// مسارات Google OAuth على جذر الخادم (مجموعة web)، وليست تحت /api
const BACKEND_ORIGIN = BASE_URL.replace(/\/api$/, "");

const jsonPost = (body) => ({
  method: "POST",
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const authHeaders = () => ({
  Accept: "application/json",
  Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
});

// يحفظ الجلسة فقط عند استجابة نجاح مكتملة؛ أي شكل آخر يُعامل كخطأ غير متوقع
const persistSession = (data) => {
  if (typeof data?.token !== "string" || !data.token || typeof data.user !== "object" || !data.user) {
    throw new ApiError({ kind: "invalid_response", status: 200 });
  }

  localStorage.setItem("auth_token", data.token);
  localStorage.setItem("auth_user", JSON.stringify(data.user));
  return data;
};

/**
  دالة تسجيل الدخول وإرسال البيانات للـ API
  @param {Object} credentials
  @returns {Promise<Object>}
 */
export const login = async (credentials) =>
  persistSession(
    await requestJson(
      `${BASE_URL}/login`,
      jsonPost({ email: credentials.email, password: credentials.password }),
    ),
  );

/**
 * دالة تسجيل حساب جديد (طالب أو مؤسسة) وإرسال البيانات للـ API
  @param {Object} formData
  @returns {Promise<Object>}
 */
export const register = async (formData) =>
  persistSession(
    await requestJson(
      `${BASE_URL}/register`,
      jsonPost({
        name: formData.role === "student" ? formData.name : formData.orgName,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
        role: formData.role,
      }),
    ),
  );

// رابط بدء Google OAuth؛ الخادم يتحقق من intent/role ولا يقبل غير student/organization
export const googleAuthUrl = (intent, role) => {
  const query = new URLSearchParams({ intent });
  if (intent === "register" && role) query.set("role", role);
  return `${BACKEND_ORIGIN}/auth/google/redirect?${query}`;
};

// يستبدل رمز التبادل قصير العمر بجلسة Sanctum (نفس استجابة تسجيل الدخول)
export const exchangeGoogleCode = async (code) =>
  persistSession(await requestJson(`${BASE_URL}/auth/google/exchange`, jsonPost({ code })));

export const getCurrentUser = async () => {
  try {
    const data = await requestJson(`${BASE_URL}/me`, { headers: authHeaders() });
    localStorage.setItem("auth_user", JSON.stringify(data.user));
    return data.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    }
    throw error;
  }
};

// إعادة تعيين كلمة المرور (FR-ACC-05): الرد واحد سواء كان البريد مسجلًا أم لا
export const requestPasswordReset = (email) => requestJson(`${BASE_URL}/forgot-password`, jsonPost({ email }));

export const resetPassword = ({ token, email, password, passwordConfirmation }) =>
  requestJson(
    `${BASE_URL}/reset-password`,
    jsonPost({ token, email, password, password_confirmation: passwordConfirmation }),
  );

// تأكيد البريد (FR-ACC-08): الرابط الموقّع نفسه هو الإثبات، فلا يلزم تسجيل الدخول
export const verifyEmail = (apiPath) => requestJson(`${BASE_URL}${apiPath}`, { headers: { Accept: "application/json" } });

export const resendVerificationEmail = () =>
  requestJson(`${BASE_URL}/email/verification-notification`, { method: "POST", headers: authHeaders() });

export const logoutUser = async () => {
  await requestJson(`${BASE_URL}/logout`, { method: "POST", headers: authHeaders() });
};
