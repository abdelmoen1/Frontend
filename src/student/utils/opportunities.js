// عرض فرص المشاريع للطالب: بطاقة الفرصة، رسائل الحالة الفارغة، وأخطاء التحميل.
// دوال نقية تُختبر عبر node --test.

import { specializationNotice } from "./assessments.js";

const ARABIC = /[؀-ۿ]/;

const names = (list) =>
  Array.isArray(list) ? list.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()) : [];

export function opportunityCard(item) {
  const roles = Array.isArray(item?.roles) ? item.roles : [];
  return {
    id: item?.id,
    title: item?.title || "مشروع",
    summary: item?.summary || "",
    organization: item?.organization?.name || "",
    industry: item?.organization?.industry || "",
    duration: item?.estimated_duration || "",
    // سبب الظهور: أدوار طابقها الطالب ومهارات متحقق منها فعلًا
    matchedRoles: names(item?.match?.roles),
    verifiedSkills: names(item?.match?.verified_skills),
    roles: roles
      .filter((role) => role && role.title)
      .map((role) => ({
        id: role.id,
        title: role.title,
        label: role.category_label || "",
        responsibilities: role.responsibilities || "",
        headcount: role.headcount || 1,
        mandatory: names(role.mandatory_skills),
        desirable: names(role.desirable_skills),
        matched: role.matched === true,
        // مهارات إلزامية غير متحقق منها لدى الطالب (للأدوار التي لا يطابقها)
        missing: names(role.missing_skills),
        specializationCompatible: role.specialization_compatible !== false,
      })),
  };
}

/**
 * رسالة القائمة الفارغة دون لوم الطالب: غياب مسار مهني صالح أولًا، ثم غياب المهارات
 * المتحقق منها، ثم عدم وجود مشروع منشور يطابقه. action يحدد الرابط المفيد التالي.
 */
export function emptyOpportunitiesMessage(verifiedSkills, specialization) {
  const notice = specializationNotice(specialization);
  if (notice) {
    return { title: notice.title, body: notice.body, action: "specialization" };
  }
  const verified = names(verifiedSkills);
  if (verified.length === 0) {
    return {
      title: "لا توجد فرص مطابقة حاليًا",
      body:
        "تظهر هنا المشاريع التي يتوافق أحد أدوارها مع مسارك المهني ومهاراتك المتحقق منها. لا توجد لديك مهارات متحقق منها بعد؛ اجتز تقييم مهاراتك لتُحتسب.",
      action: "assessment",
    };
  }
  return {
    title: "لا توجد فرص مطابقة حاليًا",
    body: `مهاراتك المتحقق منها: ${verified.join("، ")}. لا يوجد الآن مشروع منشور يطلب دورًا متوافقًا مع مسارك المهني تكتمل مهاراته الإلزامية لديك. ستظهر المشاريع الجديدة هنا تلقائيًا عند نشرها.`,
    action: "assessment",
  };
}

/** خطأ تحميل فرصة أو قائمة: 404 يعني أن الفرصة لم تعد متاحة لهذا الطالب (أُوقفت أو لم يعد مؤهلًا). */
export function opportunityLoadError(error) {
  const status = error?.status;
  if (status === 404) {
    return {
      message: "هذه الفرصة غير متاحة لك حاليًا. ربما أُوقف نشرها أو تغيّرت متطلباتها.",
      retryable: false,
    };
  }
  if (status === 403) {
    // الخادم يرفض برسالة عربية الطالب الذي لم يكمل ملفه
    const serverMessage = typeof error?.data?.message === "string" && ARABIC.test(error.data.message) ? error.data.message : "";
    return {
      message: serverMessage || "لا يمكنك عرض فرص المشاريع حاليًا.",
      retryable: false,
      completeProfile: Boolean(serverMessage),
    };
  }
  if (status === 401) {
    return { message: "انتهت جلستك. سجّل الدخول مرة أخرى.", retryable: false, login: true };
  }
  return { message: "تعذر تحميل الفرص حاليًا. تحقق من اتصالك وأعد المحاولة.", retryable: true };
}
