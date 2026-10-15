// إدارة فريق المشروع للمؤسسة: تسميات الحالات، ترتيب المرشحين لكل دور كما أعاده الخادم، وحساب التشكيلة المختارة.
// دوال نقية تُختبر عبر node --test. الدرجات والترتيب والأهلية يحسبها الخادم وحده؛ هنا العرض والتحقق المبدئي فقط.

export const PROJECT_STAGES = {
  draft: { label: "مسودة", tone: "neutral" },
  open: { label: "مفتوح للتقديم", tone: "success" },
  matching: { label: "التقديم مغلق · مراجعة المرشحين", tone: "info" },
  team_formation: { label: "تكوين الفريق", tone: "info" },
  in_progress: { label: "قيد التنفيذ", tone: "success" },
  completed: { label: "مكتمل", tone: "neutral" },
  cancelled: { label: "ملغى", tone: "danger" },
};

export const TEAM_STATUSES = {
  forming: { label: "قيد التكوين", tone: "warning" },
  ready: { label: "جاهز للتنفيذ", tone: "success" },
  active: { label: "نشط", tone: "success" },
  completed: { label: "مكتمل", tone: "neutral" },
  cancelled: { label: "ملغى", tone: "danger" },
};

export const APPLICATION_LABELS = {
  pending: { label: "جديد", tone: "info" },
  reviewed: { label: "تمت المراجعة", tone: "neutral" },
  accepted: { label: "في الفريق", tone: "success" },
  rejected: { label: "مرفوض", tone: "danger" },
  withdrawn: { label: "مسحوب", tone: "neutral" },
};

export const SCORE_BANDS = {
  high: { label: "توافق مرتفع", tone: "success" },
  good: { label: "توافق جيد", tone: "info" },
  fair: { label: "توافق مقبول", tone: "warning" },
};

export const FACTOR_TONES = {
  strong: "success",
  good: "success",
  partial: "warning",
  weak: "danger",
  // بيانات ناقصة: لون تنبيه حتى لا تبدو كنتيجة جيدة
  missing: "warning",
  not_applicable: "neutral",
};

export const ACTIVE_APPLICATION = ["pending", "reviewed", "accepted"];

const list = (value) => (Array.isArray(value) ? value : []);

/** درجة المرشح لدور معين (أو لأفضل أدواره)، و null إن لم يكن مستوفيًا له. */
export function roleScore(candidate, roleId) {
  const roles = list(candidate?.roles);
  const target = roleId === "all" || roleId == null ? candidate?.best_role_id : roleId;
  return roles.find((item) => item.role_id === target) || null;
}

/**
 * المرشحون بترتيب الخادم: لدور محدد حسب ranking[roleId]، ولكل الأدوار حسب أفضل درجة.
 * sort = "applied" يعيد الترتيب حسب أقدمية التقديم دون تغيير الدرجات.
 */
export function rankedCandidates(data, { roleId = "all", sort = "score", showRejected = false } = {}) {
  const candidates = list(data?.candidates);
  let ordered;
  if (roleId === "all") {
    ordered = candidates;
  } else {
    const byId = new Map(candidates.map((candidate) => [candidate.application?.id, candidate]));
    ordered = list(data?.ranking?.[roleId]).map((id) => byId.get(id)).filter(Boolean);
  }

  const visible = ordered.filter((candidate) => showRejected || candidate.application?.status !== "rejected");
  const withScores = visible.map((candidate, index) => ({
    candidate,
    rank: index + 1,
    score: roleScore(candidate, roleId),
  }));

  if (sort === "applied") {
    return [...withScores].sort((a, b) =>
      String(a.candidate.application?.applied_at || "").localeCompare(String(b.candidate.application?.applied_at || "")),
    );
  }
  return withScores;
}

/** التشكيلة الحالية المحفوظة في الخادم: application_id => role_id */
export function selectionFromTeam(team) {
  const selection = {};
  for (const member of list(team?.members)) {
    if (member.application_id != null && member.role?.id != null) selection[member.application_id] = member.role.id;
  }
  return selection;
}

export function sameSelection(a, b) {
  const keysA = Object.keys(a || {});
  const keysB = Object.keys(b || {});
  return keysA.length === keysB.length && keysA.every((key) => String(a[key]) === String(b?.[key]));
}

/** الدور الافتراضي عند إضافة مرشح: الدور المعروض إن كان يستوفيه، ثم الدور المفضل، ثم أعلى درجة. */
export function defaultRoleFor(candidate, roleFilter) {
  const eligible = list(candidate?.roles).map((item) => item.role_id);
  if (roleFilter !== "all" && eligible.includes(roleFilter)) return roleFilter;
  const preferred = candidate?.application?.preferred_role_id;
  if (eligible.includes(preferred)) return preferred;
  return candidate?.best_role_id ?? eligible[0] ?? null;
}

/** ملخص التشكيلة: الأعضاء لكل دور مقابل العدد المطلوب، وأي تجاوز يمنع الحفظ. */
export function selectionSummary(selection, roles) {
  const counts = {};
  for (const roleId of Object.values(selection || {})) counts[roleId] = (counts[roleId] || 0) + 1;
  const perRole = list(roles).map((role) => ({
    id: role.id,
    title: role.title,
    headcount: role.headcount || 1,
    filled: counts[role.id] || 0,
    over: (counts[role.id] || 0) > (role.headcount || 1),
  }));
  const total = Object.keys(selection || {}).length;
  const required = perRole.reduce((sum, role) => sum + role.headcount, 0);
  const errors = perRole
    .filter((role) => role.over)
    .map((role) => `دور ${role.title} يحتاج ${role.headcount} فقط، واخترت ${role.filled}.`);
  return { perRole, total, required, complete: total === required && errors.length === 0, errors, valid: total > 0 && errors.length === 0 };
}

export function roleIsFull(selection, roles, roleId, applicationId) {
  const role = list(roles).find((item) => item.id === roleId);
  if (!role) return true;
  const filled = Object.entries(selection || {}).filter(
    ([id, selectedRole]) => selectedRole === roleId && String(id) !== String(applicationId),
  ).length;
  return filled >= (role.headcount || 1);
}

export const membersPayload = (selection) =>
  Object.entries(selection || {}).map(([applicationId, roleId]) => ({
    application_id: Number(applicationId),
    role_id: Number(roleId),
  }));

export function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "؟";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
