// تحويل فشل طلبات محادثة الاكتشاف إلى ما تحتاجه الواجهة: رسالة آمنة، وإجراء، ومدة انتظار،
// وهل حُفظت الإجابة، والمحادثة المحفوظة إن أرسلها الخادم. دالة نقية تُختبر عبر node --test.
import { AUTH_MESSAGES, ApiError, statusMessage, userMessage } from "../../shared/utils/apiErrors.js";

export const DISCOVERY_FAILURE_MESSAGES = {
  network:
    "تعذر الوصول إلى الخادم أو انقطع الاتصال قبل اكتمال الرد. أعد المحاولة؛ لن تتكرر رسالتك إن كانت قد حُفظت.",
  gateway:
    "الخادم غير متاح مؤقتًا أو لم يُكمل الطلب في الوقت المتوقع. أعد المحاولة بعد قليل؛ إجاباتك المحفوظة لن تضيع.",
};

// أخطاء لا تُحل بإعادة المحاولة الفورية (حصة مستنفدة أو إعدادات الخادم)
const PERSISTENT_CODES = new Set(["ai_quota_exhausted", "ai_configuration_error"]);
const MAX_WAIT_SECONDS = 300;

const isConversation = (value) =>
  Boolean(value) && typeof value === "object" && typeof value.status === "string" && Array.isArray(value.history);

/**
 * @returns {{
 *   message: string, action: "retry" | "login", code: string | null, retryAfter: number | null,
 *   persistent: boolean, answerSaved: boolean, snapshot: object | null, requestId: string | null
 * }}
 */
export function describeDiscoveryFailure(failure) {
  const result = {
    message: AUTH_MESSAGES.unexpected,
    action: "retry",
    code: null,
    retryAfter: null,
    persistent: false,
    answerSaved: false,
    snapshot: null,
    requestId: null,
  };
  if (!(failure instanceof ApiError)) return result;

  if (failure.status === 401) return { ...result, message: userMessage(failure), action: "login" };
  // بوابة تعيد 503 بلا ترويسات CORS تظهر للمتصفح كفشل شبكة، لذا لا نلوم اتصال المستخدم
  if (failure.kind === "network") return { ...result, message: DISCOVERY_FAILURE_MESSAGES.network };
  if (failure.kind !== "http") return { ...result, message: statusMessage(failure) };

  const body = failure.data && typeof failure.data === "object" ? failure.data : {};
  const serverMessage = userMessage(failure);
  const fromServer = serverMessage !== statusMessage(failure);
  const details = {
    ...result,
    message: serverMessage,
    requestId: typeof body.request_id === "string" ? body.request_id : null,
    answerSaved: body.answer_saved === true,
    snapshot: isConversation(body.data) ? body.data : null,
  };

  const error = body.error && typeof body.error === "object" ? body.error : null;
  if (typeof error?.code === "string") {
    const wait = Number(error.retry_after);
    return {
      ...details,
      code: error.code,
      retryAfter: Number.isFinite(wait) && wait > 0 ? Math.min(Math.ceil(wait), MAX_WAIT_SECONDS) : null,
      persistent: error.retryable === false || PERSISTENT_CODES.has(error.code),
    };
  }

  // 502/503/504 بلا رمز من التطبيق: غالبًا من بوابة الاستضافة وليست من Laravel
  if ([502, 503, 504].includes(failure.status) && !fromServer) {
    return { ...details, message: DISCOVERY_FAILURE_MESSAGES.gateway };
  }
  return details;
}
