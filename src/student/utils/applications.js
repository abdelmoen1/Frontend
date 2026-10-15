// طلبات الانضمام للطالب: تسميات الحالات، وحالة زر التقديم في صفحة الفرصة، ورسائل الأخطاء.
// دوال نقية تُختبر عبر node --test. الأهلية وقبول التقديم يقررهما الخادم؛ هنا العرض فقط.

const ARABIC = /[؀-ۿ]/;

// رموز الحالات ثابتة في الخادم (ProjectApplication)
export const APPLICATION_STATUSES = {
  pending: {
    label: "قيد الانتظار",
    tone: "info",
    hint: "وصل طلبك إلى المؤسسة وينتظر المراجعة.",
  },
  reviewed: {
    label: "تمت المراجعة",
    tone: "info",
    hint: "راجعت المؤسسة طلبك، وما زالت تكوّن الفريق.",
  },
  accepted: {
    label: "ضمن الفريق",
    tone: "success",
    hint: "اختارتك المؤسسة عضوًا في فريق المشروع.",
  },
  rejected: {
    label: "لم يتم اختيارك",
    tone: "neutral",
    hint: "لم تختر المؤسسة طلبك لهذا المشروع. يمكنك التقديم على فرص أخرى.",
  },
  withdrawn: {
    label: "مسحوب",
    tone: "neutral",
    hint: "سحبت طلبك من هذه الفرصة.",
  },
};

export const PROJECT_STAGE_LABELS = {
  draft: "مسودة",
  open: "مفتوح للتقديم",
  matching: "التقديم مغلق · قيد المطابقة",
  team_formation: "قيد تكوين الفريق",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغى",
};

export function applicationView(application) {
  if (!application || !APPLICATION_STATUSES[application.status]) return null;
  const meta = APPLICATION_STATUSES[application.status];
  return {
    id: application.id,
    status: application.status,
    label: meta.label,
    tone: meta.tone,
    hint: meta.hint,
    // الخادم يرفض السحب من فريق مؤكد، فلا نعرض الزر حينها
    canWithdraw:
      ["pending", "reviewed", "accepted"].includes(application.status) &&
      !(application.team && application.team.status !== "forming"),
  };
}

/**
 * حالة لوحة التقديم في صفحة الفرصة:
 * applied (قدّم سابقًا) ← closed (التقديم مغلق) ← ineligible (لا يستوفي أي دور) ← eligible (يمكنه التقديم).
 */
export function applyPanelState(item) {
  const application = applicationView(item?.application);
  if (application) return { kind: "applied", application };
  if (item?.accepting_applications === false) return { kind: "closed" };

  const roles = Array.isArray(item?.roles) ? item.roles : [];
  const eligibleRoles = roles
    .filter((role) => role && role.matched === true && role.id != null)
    .map((role) => ({ id: role.id, title: role.title || "دور", label: role.category_label || "" }));

  if (eligibleRoles.length === 0) return { kind: "ineligible" };
  return { kind: "eligible", eligibleRoles, defaultRoleId: eligibleRoles[0].id };
}

/** رسالة خطأ التقديم أو السحب: رسالة الخادم العربية إن وجدت، وإلا رسالة حسب الحالة. */
export function applicationErrorMessage(error) {
  const server = typeof error?.data?.message === "string" && ARABIC.test(error.data.message) ? error.data.message : "";
  if (server) return server;
  if (error?.status === 409) return "تعذر إكمال العملية لأن حالة الطلب أو الفرصة تغيرت. حدّث الصفحة.";
  if (error?.status === 422) return "لا تستوفي متطلبات هذه الفرصة حاليًا.";
  if (error?.status === 404) return "هذه الفرصة غير متاحة حاليًا.";
  if (error?.status === 429) return "محاولات كثيرة. انتظر دقيقة ثم حاول مرة أخرى.";
  return "تعذر إكمال العملية. تحقق من اتصالك وحاول مرة أخرى.";
}

export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar", { day: "numeric", month: "long", year: "numeric" }).format(date);
}
