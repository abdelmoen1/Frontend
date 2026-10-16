// تسميات وحالات سير العمل ودوال خطة التنفيذ (بلا اعتماد على React لتُختبر مباشرة)

export const PUBLICATION_STATUSES = {
  pending_review: { label: "بانتظار مراجعة الإدارة", tone: "warning" },
  changes_requested: { label: "مطلوب تعديل", tone: "warning" },
  rejected: { label: "مرفوض", tone: "danger" },
  published: { label: "منشور", tone: "success" },
  suspended: { label: "معلّق", tone: "danger" },
  withdrawn: { label: "مسحوب", tone: "danger" },
};

export const PROJECT_STAGES = {
  draft: "مسودة",
  open: "مفتوح للتقديم",
  matching: "مراجعة المتقدمين",
  team_formation: "تكوين الفريق",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغى",
};

export const PLAN_STATUSES = {
  draft: { label: "مسودة", tone: "neutral" },
  submitted: { label: "بانتظار موافقة المؤسسة", tone: "warning" },
  changes_requested: { label: "مطلوب تعديل", tone: "danger" },
  approved: { label: "متفق عليها", tone: "success" },
  superseded: { label: "مستبدلة", tone: "neutral" },
};

export const TEAM_STATUSES = {
  forming: "قيد التكوين",
  ready: "مؤكد",
  active: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغى",
};

/** القرارات المتاحة لمدير المنصة حسب حالة النشر (مطابقة لقواعد الخادم) */
export function reviewActions(status) {
  switch (status) {
    case "pending_review":
      return ["approve", "request_changes", "reject"];
    case "changes_requested":
      return ["reject"];
    case "published":
      return ["suspend", "withdraw"];
    case "suspended":
      return ["republish", "withdraw"];
    default:
      return [];
  }
}

export const REVIEW_ACTION_LABELS = {
  approve: "قبول ونشر للطلاب",
  request_changes: "طلب تعديل",
  reject: "رفض",
  suspend: "تعليق",
  withdraw: "سحب",
  republish: "إعادة النشر",
};

export const NOTE_REQUIRED = ["request_changes", "reject", "suspend", "withdraw"];

export function emptyPlan(currency = "USD") {
  return {
    scope: "",
    deliverables: [{ title: "", description: "" }],
    acceptance_criteria: [""],
    execution_budget: "",
    currency,
    payment_schedule: [
      { label: "دفعة البداية", percentage: 30, due_date: "" },
      { label: "التسليم النهائي", percentage: 70, due_date: "" },
    ],
    timeline: { start_date: "", end_date: "" },
    milestones: [{ title: "", due_date: "", description: "" }],
    sprints: [],
  };
}

/** يحوّل محتوى نسخة محفوظة إلى قيم نموذج قابلة للتعديل (بدون الحقول المحسوبة في الخادم) */
export function planFormFrom(content, currency = "USD") {
  if (!content || typeof content !== "object") return emptyPlan(currency);
  const base = emptyPlan(content.currency || currency);
  return {
    scope: content.scope || "",
    deliverables: (content.deliverables || []).map((d) => ({ title: d.title || "", description: d.description || "" })),
    acceptance_criteria: [...(content.acceptance_criteria || [])],
    execution_budget: content.execution_budget ?? "",
    currency: content.currency || base.currency,
    payment_schedule: (content.payment_schedule || []).map((p) => ({ label: p.label || "", percentage: p.percentage ?? "", due_date: p.due_date || "" })),
    timeline: { start_date: content.timeline?.start_date || "", end_date: content.timeline?.end_date || "" },
    milestones: (content.milestones || []).map((m) => ({ title: m.title || "", due_date: m.due_date || "", description: m.description || "" })),
    sprints: (content.sprints || []).map((s) => ({ name: s.name || "", start_date: s.start_date || "", end_date: s.end_date || "", goal: s.goal || "" })),
  };
}

/** الحمولة المرسلة للخادم: تُحذف الصفوف الفارغة وتُحوّل الأرقام؛ الحسابات المالية يجريها الخادم */
export function planPayload(form) {
  const text = (value) => (typeof value === "string" ? value.trim() : value);
  const blankToNull = (value) => (text(value) ? text(value) : null);
  return {
    scope: text(form.scope),
    deliverables: form.deliverables.filter((d) => text(d.title)).map((d) => ({ title: text(d.title), description: blankToNull(d.description) })),
    acceptance_criteria: form.acceptance_criteria.map(text).filter(Boolean),
    execution_budget: form.execution_budget === "" ? null : Number(form.execution_budget),
    currency: form.currency,
    payment_schedule: form.payment_schedule
      .filter((p) => text(p.label))
      .map((p) => ({ label: text(p.label), percentage: Number(p.percentage), due_date: blankToNull(p.due_date) })),
    timeline: { start_date: form.timeline.start_date, end_date: form.timeline.end_date },
    milestones: form.milestones.filter((m) => text(m.title)).map((m) => ({ title: text(m.title), due_date: m.due_date, description: blankToNull(m.description) })),
    sprints: form.sprints.filter((s) => text(s.name)).map((s) => ({ name: text(s.name), start_date: s.start_date, end_date: s.end_date, goal: blankToNull(s.goal) })),
  };
}

export function paymentTotal(schedule) {
  return Math.round((schedule || []).reduce((sum, row) => sum + (Number(row.percentage) || 0), 0) * 100) / 100;
}

/** معاينة البنود المالية في الواجهة بالمعادلة نفسها التي يطبقها الخادم (الخادم هو المرجع) */
export function financialPreview(budget, rate, fee) {
  const execution = Math.round((Number(budget) || 0) * 100) / 100;
  const commission = Math.round(execution * (Number(rate) || 0) * 100) / 100;
  const gathering = Math.round((Number(fee) || 0) * 100) / 100;
  return { execution, commission, gathering, total: Math.round((execution + commission + gathering) * 100) / 100 };
}

export function formatMoney(amount, currency = "USD") {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("ar", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
}

export function formatDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium" }).format(date);
}

/** أخطاء التحقق من الخادم بمفاتيح مثل "content.milestones.0.due_date" أو "milestones.0.due_date" */
export function fieldErrors(errors) {
  const out = {};
  Object.entries(errors || {}).forEach(([key, messages]) => {
    out[key.replace(/^content\./, "")] = Array.isArray(messages) ? messages[0] : String(messages);
  });
  return out;
}
