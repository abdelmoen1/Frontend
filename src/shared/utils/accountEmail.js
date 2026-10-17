// أدوات صفحات تأكيد البريد وإعادة تعيين كلمة المرور (بلا اعتماد على React لتُختبر مباشرة)

/**
 * مسار API لتأكيد البريد من رابط الرسالة: /verify-email/:id/:hash?expires=…&signature=…
 * يعيد null إذا كان الرابط ناقصًا حتى لا نرسل طلبًا نعلم أنه سيُرفض.
 */
export function verificationApiPath(id, hash, search) {
  const params = new URLSearchParams(search || "");
  const expires = params.get("expires");
  const signature = params.get("signature");
  if (!/^\d+$/.test(String(id ?? "")) || !/^[a-f0-9]{40}$/.test(String(hash ?? "")) || !/^\d+$/.test(expires || "") || !signature) {
    return null;
  }
  // يجب الإبقاء على الترتيب نفسه للمعاملات لأن التوقيع يُحسب على المسار والاستعلام معًا
  return `/email/verify/${id}/${hash}?expires=${expires}&signature=${encodeURIComponent(signature)}`;
}

/** يخفي معظم البريد عند عرضه: sara@example.com → s***@example.com */
export function maskEmail(email) {
  const value = String(email || "");
  const at = value.indexOf("@");
  if (at < 1) return value;
  return `${value[0]}${"*".repeat(Math.min(3, Math.max(1, at - 1)))}${value.slice(at)}`;
}

/** شروط كلمة المرور نفسها التي يفرضها الخادم: 8 أحرف على الأقل، حرف ورقم */
export function passwordProblems(password, confirmation) {
  const problems = {};
  const value = String(password || "");
  if (!value) problems.password = "كلمة المرور مطلوبة.";
  else if (value.length < 8) problems.password = "كلمة المرور يجب أن تكون 8 أحرف على الأقل.";
  else if (!/\p{L}/u.test(value)) problems.password = "كلمة المرور يجب أن تحتوي على حرف واحد على الأقل.";
  else if (!/\d/.test(value)) problems.password = "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل.";
  if (value && confirmation !== value) problems.password_confirmation = "تأكيد كلمة المرور غير مطابق.";
  return problems;
}
