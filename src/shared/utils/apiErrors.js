// أدوات موحّدة لتحويل أخطاء الـ API إلى رسائل عربية آمنة للمستخدم.
// لا تعتمد على المتصفح أو Vite حتى يمكن اختبارها مباشرة عبر node --test.

export const AUTH_MESSAGES = {
  invalidCredentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  network: "تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.",
  unexpected: "حدث خطأ غير متوقع. حاول مرة أخرى لاحقًا.",
  unavailable: "الخدمة غير متاحة مؤقتًا. حاول مرة أخرى بعد قليل.",
  validation: "تحقق من البيانات المدخلة وحاول مرة أخرى.",
  forbidden: "ليس لديك صلاحية لتنفيذ هذا الإجراء.",
  sessionExpired: "انتهت صلاحية الجلسة. حدّث الصفحة وحاول مرة أخرى.",
  unauthenticated: "انتهت جلستك. سجّل الدخول مرة أخرى.",
  conflict: "تعذر إكمال الطلب لوجود تعارض مع بيانات موجودة.",
  timeout: "استغرق الرد وقتًا أطول من المتوقع. قد يكون طلبك قد حُفظ؛ أعد المحاولة.",
};

// رسالة عربية آمنة حسب نوع الخطأ وحالته، دون الاعتماد على نص الخادم
export function statusMessage({ kind, status, retryAfter }, operation) {
  if (kind === "network") return AUTH_MESSAGES.network;
  if (kind === "timeout") return AUTH_MESSAGES.timeout;
  if (kind !== "http") return AUTH_MESSAGES.unexpected;
  if (status === 422) return AUTH_MESSAGES.validation;
  if (status === 401) {
    return operation === "login" ? AUTH_MESSAGES.invalidCredentials : AUTH_MESSAGES.unauthenticated;
  }
  if (status === 403) return AUTH_MESSAGES.forbidden;
  if (status === 409) return AUTH_MESSAGES.conflict;
  if (status === 419) return AUTH_MESSAGES.sessionExpired;
  if (status === 429) {
    return retryAfter
      ? `محاولات كثيرة. انتظر ${retryAfter} ثانية ثم حاول مرة أخرى.`
      : "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.";
  }
  if (status === 502 || status === 503 || status === 504) return AUTH_MESSAGES.unavailable;
  return AUTH_MESSAGES.unexpected;
}

export class ApiError extends Error {
  constructor({ kind, status = 0, data = null, retryAfter = null }) {
    // message آمن للعرض مباشرة في الصفحات التي تعرض error.message
    super(statusMessage({ kind, status, retryAfter }));
    this.name = "ApiError";
    this.kind = kind; // "network" | "timeout" | "http" | "invalid_response"
    this.status = status;
    this.data = data;
    this.retryAfter = retryAfter;
  }
}

/**
 * fetch يعيد JSON أو يرمي ApiError واضح النوع.
 * fetch يرفض فقط عند فشل الشبكة/CORS/DNS، وهذه لا يمكن التمييز بينها في المتصفح.
 */
export async function requestJson(url, options = {}, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(url, options);
  } catch (error) {
    // AbortController يُستخدم كمهلة انتظار؛ نميّزها عن انقطاع الشبكة
    throw new ApiError({ kind: error?.name === "AbortError" ? "timeout" : "network" });
  }

  const text = await response.text().catch(() => "");
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const retryAfter = Number.parseInt(response.headers?.get?.("Retry-After") ?? "", 10);
    throw new ApiError({
      kind: "http",
      status: response.status,
      data,
      retryAfter: Number.isFinite(retryAfter) ? retryAfter : null,
    });
  }

  if (data === null || typeof data !== "object") {
    throw new ApiError({ kind: "invalid_response", status: response.status });
  }

  return data;
}

const hasArabic = (text) => /[\u0600-\u06FF]/.test(text);

/**
 * رسالة آمنة للعرض: رسائل الخادم العربية (التي نكتبها نحن) تُعرض كما هي، وما عداها
 * يُستبدل برسالة عامة حسب الحالة حتى لا تظهر تفاصيل داخلية.
 */
export function userMessage(error) {
  if (!(error instanceof ApiError)) return AUTH_MESSAGES.unexpected;
  const serverMessage = error.data?.message;
  if (error.kind === "http" && typeof serverMessage === "string" && hasArabic(serverMessage)) {
    return serverMessage.trim();
  }
  return error.message;
}

// احتياطي لرسائل Laravel الإنجليزية (مثلًا خادم لم يُحدَّث بعد)
const ENGLISH_RULES = [
  [/already been taken/i, () => "هذا البريد الإلكتروني مسجّل مسبقًا."],
  [/valid email/i, () => "صيغة البريد الإلكتروني غير صحيحة."],
  [/confirmation|must match|same as/i, () => "تأكيد كلمة المرور غير مطابق."],
  [/at least (\d+) characters/i, (m) => `يجب أن يكون ${m[1]} أحرف على الأقل.`],
  [/at least one letter/i, () => "كلمة المرور يجب أن تحتوي على حرف واحد على الأقل."],
  [/at least one number/i, () => "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل."],
  [/greater than (\d+) characters|not be greater/i, () => "النص أطول من المسموح."],
  [/is required/i, () => "هذا الحقل مطلوب."],
  [/is invalid|must be/i, () => "قيمة هذا الحقل غير صالحة."],
];

export function translateFieldMessage(message) {
  const text = String(message || "").trim();
  if (!text) return "قيمة هذا الحقل غير صالحة.";
  if (hasArabic(text)) return text;

  for (const [pattern, toArabic] of ENGLISH_RULES) {
    const match = text.match(pattern);
    if (match) return toArabic(match);
  }
  return "قيمة هذا الحقل غير صالحة.";
}

const isCredentialsMessage = (message) =>
  /كلمة المرور غير صحيحة|بيانات الدخول|credentials/i.test(String(message || ""));

/**
 * يحوّل أي خطأ إلى { general, fields } للعرض في النموذج.
 * operation: "login" | "register"
 * fieldMap: يربط حقل الخادم بحقل النموذج، مثل { name: "orgName" }
 */
export function normalizeAuthError(error, { operation = "login", fieldMap = {} } = {}) {
  const result = { general: "", fields: {} };

  if (!(error instanceof ApiError) || error.kind === "network") {
    result.general =
      error instanceof ApiError || error instanceof TypeError
        ? AUTH_MESSAGES.network
        : AUTH_MESSAGES.unexpected;
    return result;
  }

  if (error.kind === "invalid_response") {
    result.general = AUTH_MESSAGES.unexpected;
    return result;
  }

  const { status, data } = error;

  if (status === 422) {
    const serverErrors =
      data && typeof data.errors === "object" && data.errors !== null ? data.errors : {};
    const generalMessages = [];

    for (const [serverField, messages] of Object.entries(serverErrors)) {
      const first = Array.isArray(messages) ? messages[0] : messages;

      if (operation === "login" && isCredentialsMessage(first)) {
        result.general = AUTH_MESSAGES.invalidCredentials;
        result.fields = {};
        return result;
      }

      // null في fieldMap يعني أن الخطأ لا يخص حقلًا ظاهرًا فيُعرض كرسالة عامة
      const formField = serverField in fieldMap ? fieldMap[serverField] : serverField;
      if (formField) {
        result.fields[formField] = translateFieldMessage(first);
      } else {
        generalMessages.push(translateFieldMessage(first));
      }
    }

    result.general =
      generalMessages[0] ||
      (Object.keys(result.fields).length ? "" : AUTH_MESSAGES.validation);
    return result;
  }

  result.general = statusMessage(error, operation);
  return result;
}

// رموز أخطاء Google التي يعيدها الخادم في ?oauth_error= (قائمة مغلقة، لا نعرض نصًا من الرابط)
export const OAUTH_ERROR_MESSAGES = {
  cancelled: "تم إلغاء تسجيل الدخول عبر Google.",
  provider_error: "تعذر إكمال تسجيل الدخول عبر Google. حاول مرة أخرى.",
  invalid_state: "انتهت صلاحية محاولة تسجيل الدخول عبر Google. حاول مرة أخرى.",
  unverified_email: "البريد الإلكتروني لحساب Google غير مؤكد، لذلك لا يمكن استخدامه.",
  account_conflict:
    "هذا البريد مسجّل بحساب آخر ولا يمكن ربطه تلقائيًا. سجّل الدخول بالبريد وكلمة المرور.",
  no_account: "لا يوجد حساب مرتبط بحساب Google هذا. أنشئ حسابًا جديدًا أولًا.",
  invalid_request: "اختر نوع الحساب ثم حاول مرة أخرى.",
  exchange_failed: "انتهت صلاحية تسجيل الدخول عبر Google. حاول مرة أخرى.",
  network: AUTH_MESSAGES.network,
};

export const oauthErrorMessage = (code) =>
  code ? OAUTH_ERROR_MESSAGES[code] || OAUTH_ERROR_MESSAGES.provider_error : "";
