// تقييم المهارات بأسئلة مفتوحة: اختيار المسار والمهارات، تقدم الجلسة، التحقق من الإجابة، النتائج،
// ورسائل الأخطاء. دوال نقية تُختبر عبر node --test. الأسئلة يولدها الخادم والتصحيح والنتيجة يحددهما
// الخادم فقط؛ هنا عرض لا أكثر.

const ARABIC = /[؀-ۿ]/;

export const ASSESSMENTS_PATH = "/student/assessment";
export const sessionPath = (id) => `${ASSESSMENTS_PATH}/sessions/${id}`;

export const SKILL_STATUSES = {
  not_assessed: { label: "لم تُقيَّم بعد", tone: "neutral" },
  passed: { label: "ناجح", tone: "success" },
  failed: { label: "لم تجتز التقييم", tone: "danger" },
  incomplete: { label: "تعذر إكمال التصحيح", tone: "warning" },
};

export const RESULT_REASONS = {
  passed: "بلغت إجاباتك نسبة النجاح المطلوبة.",
  below_threshold: "مجموع نقاطك في هذه المهارة أقل من نسبة النجاح المطلوبة.",
  weak_answer: "إحدى إجاباتك في هذه المهارة كانت أضعف من الحد الأدنى المطلوب لكل سؤال.",
  unanswered_questions: "لم تُجب عن كل أسئلة هذه المهارة قبل انتهاء الوقت.",
  grading_unavailable: "تعذر تصحيح إحدى إجاباتك آليًا بعد عدة محاولات. لا يُحتسب ذلك رسوبًا، ويمكنك إعادة التقييم مباشرة.",
};

const serverMessage = (error) =>
  typeof error?.data?.message === "string" && ARABIC.test(error.data.message) ? error.data.message : "";

/** تاريخ ووقت بالعربية؛ نص فارغ لقيمة غير صالحة. */
export function formatDateTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** حالة مهارة في قائمة الاختيار كما أعادها الخادم، وهل يمكن اختيارها لجلسة جديدة. */
export function skillView(skill) {
  const status = SKILL_STATUSES[skill?.status] ? skill.status : "not_assessed";
  let note = "";
  if (status === "passed" && skill.practical && !skill.verified) {
    note = "اجتزت الجانب المعرفي؛ هذه مهارة عملية تحتاج تحققًا من إدارة المنصة (مثل مراجعة أعمالك) لتُحتسب.";
  } else if (status === "passed" && !skill.selected) {
    note = "ناجح، لكنها ليست ضمن مهارات ملفك فلا تُحتسب حتى تضيفها.";
  } else if (status === "failed" && skill.next_attempt_at) {
    note = `يمكنك إعادة تقييمها بعد ${formatDateTime(skill.next_attempt_at)}.`;
  } else if (skill?.practical && status === "not_assessed") {
    note = "مهارة عملية: الأسئلة سيناريوهات مكتوبة، والتحقق العملي يتم لاحقًا من إدارة المنصة.";
  }

  return {
    id: skill?.id,
    name: skill?.name || "",
    status,
    label: SKILL_STATUSES[status].label,
    tone: SKILL_STATUSES[status].tone,
    score: Number.isInteger(skill?.score) ? skill.score : null,
    selectable: skill?.can_assess === true,
    verified: skill?.verified === true,
    note,
  };
}

/** مهارات التخصص المختار أولًا، ثم بقية مهارات المنصة. */
export function groupSkills(skills, specialization) {
  const list = (Array.isArray(skills) ? skills : []).filter((skill) => skill && skill.id).map(skillView);
  const suggestedIds = (Array.isArray(specialization?.skills) ? specialization.skills : []).map(
    (skill) => skill.id,
  );
  const byId = new Map(list.map((skill) => [skill.id, skill]));
  return {
    suggested: suggestedIds.map((id) => byId.get(id)).filter(Boolean),
    others: list.filter((skill) => !suggestedIds.includes(skill.id)),
  };
}

/** اختيار مهارة أو إلغاؤه ضمن الحد الأقصى للجلسة. */
export function toggleSkill(selected, id, max) {
  const current = Array.isArray(selected) ? selected : [];
  if (current.includes(id)) return current.filter((item) => item !== id);
  if (current.length >= max) return current;
  return [...current, id];
}

/** رسالة عند غياب مسار مهني صالح؛ null إذا كان المسار متوافقًا. */
export function specializationNotice(specialization) {
  const status = specialization?.status;
  if (!status || status === "compatible") return null;
  if (status === "unrecognized") {
    return {
      title: "مسارك المهني المسجل غير معروف",
      body: "المسار المحفوظ في ملفك ليس من قائمة المسارات الحالية، لذلك لا يمكن ربطه بأدوار المشاريع. اختر مسارك المهني من القائمة.",
    };
  }
  return {
    title: "اختر مسارك المهني",
    body: "تُبنى أسئلة التقييم ومطابقة أدوار المشاريع على مسارك المهني (مثل تطوير الخدمات الخلفية أو تطبيقات الجوال). اختره أولًا.",
  };
}

/** الثواني المتبقية حسب ساعة الخادم: يُصحَّح فرق ساعة الجهاز بمقارنة وقت الخادم بوقت التحميل. */
export function remainingSeconds({ expiresAt, serverTime, loadedAt }, now) {
  const expires = Date.parse(expiresAt);
  if (Number.isNaN(expires)) return 0;
  const server = Date.parse(serverTime);
  const skew = Number.isNaN(server) || !loadedAt ? 0 : server - loadedAt;
  return Math.max(0, Math.floor((expires - (now + skew)) / 1000));
}

export function formatClock(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

/** خطأ الإجابة قبل الإرسال؛ النص يُرسل كما هو دون قص أو تعديل للمسافات. */
export function answerError(answer, maxLength = 8000) {
  const text = typeof answer === "string" ? answer : "";
  if (!/\S/u.test(text)) return "اكتب إجابتك قبل الإرسال.";
  if (text.length > maxLength) return `الإجابة أطول من الحد المسموح (${maxLength} حرف).`;
  return "";
}

/** يُدرج مسافة بادئة عند Tab في محرر الكود ويعيد النص الجديد وموضع المؤشر. */
export function insertIndent(value, selectionStart, selectionEnd, indent = "    ") {
  const text = typeof value === "string" ? value : "";
  return {
    value: text.slice(0, selectionStart) + indent + text.slice(selectionEnd),
    cursor: selectionStart + indent.length,
  };
}

export function progressView(session) {
  const total = Number(session?.question_count) || 0;
  const answered = Math.min(total, Number(session?.answered_count) || 0);
  return {
    answered,
    total,
    current: Math.min(total, answered + 1),
    percent: total ? Math.round((answered / total) * 100) : 0,
  };
}

/** نتائج الجلسة لكل مهارة كما حسبها الخادم. */
export function resultsView(session) {
  const results = Array.isArray(session?.results) ? session.results : [];
  return results.map((result) => {
    const status = SKILL_STATUSES[result?.status] ? result.status : "incomplete";
    let note = RESULT_REASONS[result?.reason] || "";
    if (status === "passed" && result.needs_human_verification) {
      note = "اجتزت الجانب المعرفي. هذه مهارة عملية، فلا تُحتسب في مطابقة المشاريع إلا بعد تحقق عملي من إدارة المنصة.";
    } else if (status === "passed" && !result.counts_for_matching) {
      note = "ناجح، لكن المهارة ليست ضمن مهارات ملفك. أضفها لتُحتسب في مطابقة المشاريع.";
    } else if (status === "failed" && result.next_attempt_at) {
      note = `${note} يمكنك إعادة التقييم بعد ${formatDateTime(result.next_attempt_at)}.`.trim();
    }

    return {
      skill: result?.skill?.name || "",
      status,
      label: SKILL_STATUSES[status].label,
      tone: SKILL_STATUSES[status].tone,
      score: Number.isInteger(result?.score) ? result.score : null,
      countsForMatching: result?.counts_for_matching === true,
      note,
      questions: (Array.isArray(result?.questions) ? result.questions : []).map((question) => ({
        position: question.position,
        prompt: question.prompt || "",
        answered: question.answered === true,
        points:
          Number.isInteger(question.awarded_points) && Number.isInteger(question.max_points)
            ? `${question.awarded_points} من ${question.max_points}`
            : "",
        feedback: question.feedback || "",
        missing: Array.isArray(question.missing_concepts) ? question.missing_concepts : [],
      })),
    };
  });
}

/** خطأ بدء أو تحميل أو إرسال أو تصحيح → رسالة عربية وما يمكن للطالب فعله. */
export function assessmentError(error) {
  const status = error?.status;
  const code = error?.data?.code;
  const message = serverMessage(error);

  if (code === "retake_not_available") {
    const skills = Array.isArray(error.data.skills) ? error.data.skills : [];
    const details = skills
      .map((item) => `${item.skill} (بعد ${formatDateTime(item.next_attempt_at)})`)
      .join("، ");
    return { message: details ? `لا يمكن إعادة تقييم: ${details}.` : message, retryable: false };
  }
  if (code === "question_out_of_order" || code === "answer_already_submitted") {
    return { message, retryable: false, reload: true };
  }
  if (code === "answering_closed" || code === "session_expired") {
    return { message, retryable: false, reload: true, expired: true };
  }
  if (code === "specialization_required") return { message, retryable: false, specialization: true };
  if (code === "session_starting") return { message, retryable: true };
  if (typeof code === "string" && code.startsWith("ai_")) {
    return { message: message || "خدمة الذكاء الاصطناعي غير متاحة الآن. حاول بعد قليل.", retryable: error.data.retryable !== false, ai: true };
  }
  if (code && message) return { message, retryable: false };
  if (status === 422) {
    const errors = error?.data?.errors && typeof error.data.errors === "object" ? Object.values(error.data.errors).flat() : [];
    const first = errors.find((item) => typeof item === "string" && ARABIC.test(item));
    return { message: first || "تحقق من البيانات ثم أعد المحاولة.", retryable: false, validation: true };
  }
  if (status === 404) return { message: message || "جلسة التقييم غير موجودة.", retryable: false, notFound: true };
  if (status === 403) return { message: message || "هذه الصفحة مخصصة للطلاب.", retryable: false };
  if (status === 401) return { message: "انتهت جلستك. سجّل الدخول مرة أخرى.", retryable: false, login: true };
  if (status === 429) return { message: "محاولات كثيرة. انتظر دقيقة ثم أعد المحاولة.", retryable: true };
  return { message: "تعذر الاتصال بالخادم. إجابتك ما زالت في الصفحة؛ أعد المحاولة.", retryable: true };
}
