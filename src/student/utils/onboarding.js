// منطق إكمال ملف الطالب: خطوات النموذج والتحقق وفلترة المهارات. بلا React حتى يُختبر عبر node --test.
import { ApiError, translateFieldMessage } from "../../shared/utils/apiErrors.js";

// يطابق CompleteStudentOnboardingRequest::MAX_SKILLS في الخادم
export const MAX_SKILLS = 15;

export const ONBOARDING_STEPS = [
  {
    title: "البيانات الشخصية",
    heading: "لنتعرّف عليك",
    hint: "يظهر اسمك ورقمك في ملفك للمؤسسات التي تشارك في مشاريعها.",
    fields: ["name", "phone"],
  },
  {
    title: "الدراسة",
    heading: "أين تدرس؟",
    hint: "اختر جامعتك وسنة تخرجك أو السنة المتوقعة.",
    fields: ["university", "graduation_year"],
  },
  {
    title: "التخصص والمهارات",
    heading: "تخصصك ومهاراتك",
    hint: "على تخصصك تُبنى ترشيحات المشاريع وأسئلة تقييم المهارات.",
    fields: ["professional_specialization", "skills"],
  },
];

/** يفصل الرقم المحفوظ (+970599123456) إلى مفتاح الدولة والرقم المحلي. */
export function splitPhone(fullPhone, codes, fallback = "+970") {
  const phone = typeof fullPhone === "string" ? fullPhone.trim() : "";
  if (!phone) return { phone_code: fallback, phone: "" };
  const code = (Array.isArray(codes) ? codes : []).find((item) => phone.startsWith(item));
  return code ? { phone_code: code, phone: phone.slice(code.length) } : { phone_code: fallback, phone };
}

/** أرقام فقط وبلا صفر البداية المحلي: "0599 123-456" تصبح "599123456". */
export function normalizePhone(value) {
  return String(value ?? "").replace(/\D/g, "").replace(/^0+/, "");
}

export function joinPhone(code, value) {
  const digits = normalizePhone(value);
  return digits ? `${code}${digits}` : null;
}

/** أخطاء خطوة واحدة دفعة واحدة؛ مفاتيحها أسماء الحقول. */
export function validateStep(index, form) {
  const errors = {};
  if (index === 0) {
    if (!String(form.name ?? "").trim()) errors.name = "اكتب اسمك الكامل.";
    const digits = normalizePhone(form.phone);
    if (String(form.phone ?? "").trim() && (digits.length < 7 || digits.length > 12)) {
      errors.phone = "رقم الجوال غير صحيح. اكتبه بدون مفتاح الدولة، مثل 599123456.";
    }
  }
  if (index === 1) {
    if (!form.university) errors.university = "اختر جامعتك أو كليتك.";
    if (!form.graduation_year) errors.graduation_year = "اختر سنة التخرج.";
  }
  if (index === 2) {
    const skills = Array.isArray(form.skills) ? form.skills : [];
    if (!form.professional_specialization) errors.professional_specialization = "اختر تخصصك.";
    else if (skills.length === 0) errors.skills = "أضف مهارة واحدة على الأقل من مهارات تخصصك.";
    else if (skills.length > MAX_SKILLS) errors.skills = `يمكنك اختيار ${MAX_SKILLS} مهارة كحد أقصى.`;
  }
  return errors;
}

/** أول خطوة فيها خطأ، أو -1. */
export function stepOfErrors(errors) {
  const fields = Object.keys(errors ?? {});
  return ONBOARDING_STEPS.findIndex((step) => step.fields.some((field) => fields.includes(field)));
}

const SERVER_FIELDS = {
  name: "name",
  phone: "phone",
  university: "university",
  graduation_year: "graduation_year",
  professional_specialization: "professional_specialization",
  skill_ids: "skills",
};

/** أخطاء التحقق من الخادم (422) بأسماء حقول النموذج. */
export function serverFieldErrors(error) {
  if (!(error instanceof ApiError) || error.status !== 422) return {};
  const fields = {};
  for (const [key, messages] of Object.entries(error.data?.errors ?? {})) {
    const field = SERVER_FIELDS[key.split(".")[0]];
    if (field && !fields[field]) fields[field] = translateFieldMessage(Array.isArray(messages) ? messages[0] : messages);
  }
  return fields;
}

export function findSpecialization(specializations, key) {
  return (Array.isArray(specializations) ? specializations : []).find((item) => item?.key === key) ?? null;
}

/** المهارات المختارة التي تتبع قائمة مهارات التخصص فقط. */
export function keepSkillsWithin(selected, skills) {
  const allowed = new Set((Array.isArray(skills) ? skills : []).map((skill) => skill.id));
  return (Array.isArray(selected) ? selected : []).filter((skill) => allowed.has(skill.id));
}

// "Node.js" و "node js" و "NODEJS" متطابقة عند البحث
const searchKey = (text) => String(text ?? "").toLowerCase().replace(/[^\p{L}\p{N}+#]/gu, "");

/** خيارات القائمة: غير المختارة، وما يبدأ بالنص المكتوب أولًا ثم ما يحتويه. */
export function filterSkills(options, selected, query) {
  const taken = new Set((Array.isArray(selected) ? selected : []).map((skill) => skill.id));
  const available = (Array.isArray(options) ? options : []).filter((skill) => skill && !taken.has(skill.id));
  const needle = searchKey(query);
  if (!needle) return available;

  const starts = [];
  const contains = [];
  for (const skill of available) {
    const key = searchKey(skill.name);
    if (key.startsWith(needle)) starts.push(skill);
    else if (key.includes(needle)) contains.push(skill);
  }
  return [...starts, ...contains];
}

/** أجزاء الاسم مع تمييز النص المكتوب داخله (إن وُجد كما هو). */
export function highlightParts(name, query) {
  const text = String(name ?? "");
  const needle = String(query ?? "").trim();
  const at = needle ? text.toLowerCase().indexOf(needle.toLowerCase()) : -1;
  if (at < 0) return [{ text, match: false }];
  return [
    { text: text.slice(0, at), match: false },
    { text: text.slice(at, at + needle.length), match: true },
    { text: text.slice(at + needle.length), match: false },
  ].filter((part) => part.text);
}
