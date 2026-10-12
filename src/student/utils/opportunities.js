// عرض فرص المشاريع للطالب: بطاقة الفرصة وأهليته لكل دور كما حسبها الخادم، رسائل الحالة الفارغة، وأخطاء التحميل.
// دوال نقية تُختبر عبر node --test. الأهلية يحسبها الخادم وحده؛ هنا عرضها وروابط الإجراء التالي فقط.

import { assessmentLink, levelLabel, specializationNotice } from "./assessments.js";

const ARABIC = /[؀-ۿ]/;

export const PROFILE_PATH = "/student/profile";

// رموز الحالة ثابتة في الخادم (OpportunityMatcher)
export const ELIGIBILITY_STATUSES = {
  eligible: { label: "تستوفي المتطلبات", tone: "success" },
  level_insufficient: { label: "يتطلب مستوى أعلى", tone: "warning" },
  assessment_required: { label: "يتطلب اختبار مهارة", tone: "info" },
  skill_not_selected: { label: "مهارة غير مضافة لملفك", tone: "info" },
  specialization_mismatch: { label: "لا يتوافق مع مسارك", tone: "neutral" },
  profile_incomplete: { label: "أكمل ملفك", tone: "warning" },
  requirements_unavailable: { label: "متطلبات غير قابلة للتحقق", tone: "neutral" },
};

const names = (list) =>
  Array.isArray(list) ? list.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()) : [];

const arabicText = (value) => (typeof value === "string" && ARABIC.test(value) ? value : "");

/** رابط الإجراء التالي الذي اقترحه الخادم: اختبار مهارة بمستوى محدد، أو تعديل الملف. */
export function actionLink(action) {
  if (action?.type === "assessment") {
    return {
      to: assessmentLink(action.skill_id, action.level),
      label: arabicText(action.label) || "ابدأ اختبار المهارة",
    };
  }
  if (action?.type === "profile") {
    return { to: PROFILE_PATH, label: arabicText(action.label) || "تعديل ملفي الشخصي" };
  }
  return null;
}

export function eligibilityView(eligibility) {
  const status = ELIGIBILITY_STATUSES[eligibility?.status] ? eligibility.status : "requirements_unavailable";
  return {
    status,
    eligible: status === "eligible",
    label: ELIGIBILITY_STATUSES[status].label,
    tone: ELIGIBILITY_STATUSES[status].tone,
    message: arabicText(eligibility?.message),
    action: actionLink(eligibility?.action),
  };
}

export function opportunityCard(item) {
  const roles = Array.isArray(item?.roles) ? item.roles : [];
  return {
    id: item?.id,
    title: item?.title || "مشروع",
    summary: item?.summary || "",
    organization: item?.organization?.name || "",
    industry: item?.organization?.industry || "",
    duration: item?.estimated_duration || "",
    // أهلية الطالب على مستوى الفرصة = الدور الأقرب للأهلية
    eligibility: eligibilityView(item?.eligibility),
    closestRole: typeof item?.eligibility?.role_title === "string" ? item.eligibility.role_title : "",
    eligibleRoles: names(item?.eligibility?.eligible_roles),
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
        eligibility: eligibilityView(role.eligibility),
        reasons: (Array.isArray(role.eligibility?.reasons) ? role.eligibility.reasons : [])
          .filter((reason) => reason && arabicText(reason.message))
          .map((reason) => ({ code: reason.code, message: reason.message, action: actionLink(reason.action) })),
        // المهارات الإلزامية بالمستوى المطلوب ومستوى الطالب المثبت
        requirements: (Array.isArray(role.requirements) ? role.requirements : [])
          .filter((skill) => skill && typeof skill.name === "string")
          .map((skill) => ({
            name: skill.name,
            // null = نسخة منشورة قبل إضافة المستويات: أي مستوى مثبت
            requiredLabel: levelLabel(skill.min_level) || "أي مستوى مثبت",
            verifiedLabel: levelLabel(skill.verified_level),
            met: skill.met === true,
          })),
      })),
  };
}

/** القائمة فارغة فقط عند عدم وجود فرص منشورة؛ عدم الأهلية لا يخفي الفرص. */
export function emptyOpportunitiesMessage(specialization) {
  const notice = specializationNotice(specialization);
  return {
    title: "لا توجد فرص منشورة حاليًا",
    body: notice
      ? `ستظهر هنا المشاريع فور نشرها. ${notice.body}`
      : "ستظهر هنا المشاريع فور نشرها، مع مدى توافقك مع كل دور. يمكنك الآن إثبات مستوى مهاراتك عبر التقييم.",
    action: notice ? "specialization" : "assessment",
  };
}

/** خطأ تحميل فرصة أو قائمة: 404 يعني أن الفرصة لم تعد منشورة (أُوقفت أو سُحبت أو غير موجودة). */
export function opportunityLoadError(error) {
  const status = error?.status;
  if (status === 404) {
    return {
      message: "هذه الفرصة غير متاحة حاليًا. ربما أُوقف نشرها أو لم تعد موجودة.",
      retryable: false,
    };
  }
  if (status === 403) {
    // الخادم يرفض برسالة عربية الطالب الذي لم يكمل ملفه
    const serverMessage = arabicText(error?.data?.message);
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
