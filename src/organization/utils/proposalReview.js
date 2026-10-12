// منطق صفحة مراجعة المقترح: متى يظهر الاعتماد، وكيف تُعرض الأدوار والمهارات وأساس المتطلبات.
// دوال نقية تُختبر عبر node --test.

export const BASIS_LABELS = {
  confirmed: "مؤكد من المؤسسة",
  recommendation: "توصية بانتظار تأكيدك",
  assumption: "افتراض",
  unknown: "غير محدد بعد",
};

export const PUBLICATION_STATUS_LABELS = {
  published: "منشور للطلاب المؤهلين",
  suspended: "معلّق من إدارة المنصة",
  withdrawn: "مسحوب من إدارة المنصة",
};

// حالات يعني فيها المقترح أن المحادثة ما زالت تعالج تعديلًا
const REVISION_IN_PROGRESS = ["revision_requested", "intake_in_progress", "analyzing"];

// يزيل الترقيم اليدوي الذي يكتبه النموذج أحيانًا داخل عناصر القوائم ("1. " أو "١- " أو "• ")
export function stripListNumbering(value) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/^(?:[0-9٠-٩]{1,3}\s*[.)\-–:]|[-•*●])\s+/, "")
    .trim();
}

/**
 * حالة المراجعة والاعتماد لطلب المشروع.
 * mode: "draft" | "published" | "pending_changes" | "revising" | "closed"
 */
export function reviewState(record) {
  const proposal = record?.proposal && typeof record.proposal === "object" ? record.proposal : null;
  const publication = record?.publication || null;
  const status = record?.status;
  const matchableRoles = record?.staffing?.matchable_roles ?? 0;

  let mode = "draft";
  if (status === "rejected") mode = "closed";
  else if (REVISION_IN_PROGRESS.includes(status)) mode = "revising";
  else if (publication && publication.has_pending_changes) mode = "pending_changes";
  else if (publication) mode = "published";

  const approvable = Boolean(proposal) && ["draft", "pending_changes"].includes(mode);
  let blockedReason = "";
  if (approvable && !record?.staffing?.roles?.length) {
    blockedReason =
      "لا يحدد هذا المقترح أدوار الفريق والمهارات بشكل منظم. اطلب تحديث المقترح من المحادثة قبل اعتماده.";
  } else if (approvable && matchableRoles === 0) {
    blockedReason =
      "لا يحتوي أي دور على مهارة إلزامية من مهارات المنصة، لذلك لا يمكن مطابقة الطلاب. وضّح الأدوار في المحادثة ثم حدّث المقترح.";
  }

  return {
    mode,
    publication,
    canApprove: approvable && !blockedReason,
    blockedReason,
    canEdit: Boolean(proposal) && mode !== "closed",
  };
}

/** أدوار الفريق للعرض: كل مهارة مع حالة ربطها بقائمة مهارات المنصة. */
export function staffingRoles(staffing) {
  if (!Array.isArray(staffing?.roles)) return [];
  const skills = (list) =>
    (Array.isArray(list) ? list : [])
      .filter((skill) => skill && typeof skill.name === "string" && skill.name.trim())
      .map((skill) => ({ name: skill.name.trim(), matchable: skill.id !== null && skill.id !== undefined }));

  return staffing.roles
    .filter((role) => role && typeof role.title === "string" && role.title.trim())
    .map((role) => ({
      title: role.title.trim(),
      categoryLabel: role.category_label || "",
      responsibilities: role.responsibilities || "",
      rationale: role.rationale || "",
      headcount: Number.isInteger(role.headcount) && role.headcount > 0 ? role.headcount : 1,
      mandatory: skills(role.mandatory_skills),
      desirable: skills(role.desirable_skills),
      matchable: Boolean(role.matchable),
      // مهارات إلزامية عملية لا يكفي التقييم المكتوب لإثباتها: تحتاج تحققًا بشريًا من إدارة المنصة
      untested: (Array.isArray(role.mandatory_skills) ? role.mandatory_skills : [])
        .filter((skill) => skill && skill.id !== null && skill.id !== undefined && skill.assessable === false)
        .map((skill) => skill.name),
    }));
}

/** المتطلبات الحرجة مع أساسها؛ أي أساس غير معروف لا يُعرض كحقيقة. */
export function keyRequirements(proposal) {
  if (!Array.isArray(proposal?.key_requirements)) return [];
  return proposal.key_requirements
    .filter((item) => item && typeof item.requirement === "string" && item.requirement.trim() && BASIS_LABELS[item.basis])
    .map((item) => ({
      requirement: stripListNumbering(item.requirement),
      basis: item.basis,
      basisLabel: BASIS_LABELS[item.basis],
      note: typeof item.note === "string" ? item.note.trim() : "",
    }));
}

/** ملخص المطابقة للمؤسسة: لا هويات طلاب، فقط أعداد لكل دور. */
export function matchingSummary(publication) {
  const roles = Array.isArray(publication?.roles) ? publication.roles : [];
  const total = roles.reduce((sum, role) => sum + (Number(role.eligible_students) || 0), 0);
  return {
    roles: roles.map((role) => ({
      title: role.title,
      eligible: Number(role.eligible_students) || 0,
      mandatory: Array.isArray(role.mandatory_skills) ? role.mandatory_skills : [],
    })),
    hasEligible: total > 0,
  };
}
