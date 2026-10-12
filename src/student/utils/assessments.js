// تقييم المهارات بأسئلة مفتوحة: اختيار المسار والمهارة والمستوى، تقدم المحاولة، التحقق من الإجابة، النتائج،
// ورسائل الأخطاء. دوال نقية تُختبر عبر node --test. الأسئلة يولدها الخادم، والتصحيح والنتيجة والمستوى المثبت
// يحددها الخادم فقط؛ هنا عرض لا أكثر.

const ARABIC = /[؀-ۿ]/;

export const ASSESSMENTS_PATH = "/student/assessment";
export const sessionPath = (id) => `${ASSESSMENTS_PATH}/sessions/${id}`;

/** رابط صفحة التقييم مع مهارة ومستوى محددين مسبقًا (من أسباب عدم الأهلية في الفرص مثلًا). */
export function assessmentLink(skillId, level) {
  const params = new URLSearchParams();
  if (Number.isInteger(skillId)) params.set("skill", String(skillId));
  if (LEVELS.some((item) => item.key === level)) params.set("level", level);
  const query = params.toString();
  return query ? `${ASSESSMENTS_PATH}?${query}` : ASSESSMENTS_PATH;
}

// المستوى الذي يختاره الطالب طلب لصعوبة الأسئلة وليس إثباتًا؛ المثبت فقط ما ينجح فيه
export const LEVELS = [
  { key: "beginner", label: "مبتدئ", hint: "أساسيات المهارة ومهام قصيرة بمفهوم واحد." },
  { key: "intermediate", label: "متوسط", hint: "ميزات واقعية صغيرة تجمع عدة مفاهيم، وتصحيح أخطاء في كود متوسط." },
  { key: "advanced", label: "متقدم", hint: "قرارات تصميم وأداء وأمان وحالات حدية معقدة." },
];

export const levelLabel = (key) => LEVELS.find((item) => item.key === key)?.label || "";

export const SKILL_STATUSES = {
  not_assessed: { label: "لم تُقيَّم بعد", tone: "neutral" },
  passed: { label: "ناجح", tone: "success" },
  failed: { label: "لم تجتز التقييم", tone: "danger" },
  incomplete: { label: "تعذر إكمال التصحيح", tone: "warning" },
};

export const QUESTION_CATEGORIES = { practical: "سؤال عملي", written: "سؤال كتابي" };

export const QUESTION_TYPES = {
  coding: "كتابة كود",
  debugging: "إصلاح خطأ",
  sql: "استعلام SQL",
  implementation: "تنفيذ",
  code_analysis: "تحليل كود",
  scenario: "سيناريو عملي",
  design_task: "مهمة تصميم",
  case_study: "دراسة حالة",
  explanation: "شرح",
  reasoning: "تبرير واستدلال",
  technical_analysis: "تحليل تقني",
};

export const RESULT_REASONS = {
  passed: "بلغت إجاباتك نسبة النجاح المطلوبة.",
  below_threshold: "مجموع نقاطك في هذه المحاولة أقل من نسبة النجاح المطلوبة.",
  practical_below_threshold: "مجموعك جيد، لكن نتيجة الأسئلة العملية وحدها أقل من الحد المطلوب لها.",
  weak_answer: "عدد الإجابات الضعيفة جدًا تجاوز الحد المسموح في المحاولة.",
  unanswered_questions: "بقيت أسئلة دون إجابة عند انتهاء الوقت أكثر من المسموح.",
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

/** حالة مهارة كما أعادها الخادم: أعلى مستوى مثبت، وحالة كل مستوى وهل يمكن بدء محاولة له الآن. */
export function skillView(skill) {
  const status = SKILL_STATUSES[skill?.status] ? skill.status : "not_assessed";
  const verifiedLevel = levelLabel(skill?.verified_level) ? skill.verified_level : null;
  const levels = LEVELS.map((level) => {
    const item = skill?.levels?.[level.key] || {};
    const levelStatus = SKILL_STATUSES[item.status] ? item.status : "not_assessed";
    return {
      key: level.key,
      label: level.label,
      hint: level.hint,
      status: levelStatus,
      statusLabel: SKILL_STATUSES[levelStatus].label,
      tone: SKILL_STATUSES[levelStatus].tone,
      score: Number.isInteger(item.score) ? item.score : null,
      canAssess: item.can_assess !== false,
      nextAttemptAt: item.next_attempt_at || null,
    };
  });

  let note = "";
  if (status === "passed" && skill?.practical && !verifiedLevel) {
    note = "اجتزت الجانب المعرفي؛ هذه مهارة عملية تحتاج تحققًا من إدارة المنصة (مثل مراجعة أعمالك) لتُحتسب.";
  } else if (verifiedLevel && !skill?.selected) {
    note = "مثبتة، لكنها ليست ضمن مهارات ملفك فلا تُحتسب حتى تضيفها.";
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
    verifiedLevel,
    verifiedLevelLabel: levelLabel(verifiedLevel),
    practical: skill?.practical === true,
    selectable: skill?.can_assess !== false,
    levels,
    note,
  };
}

/** ملاحظة المستوى المختار: مهلة إعادة، أو أنه أدنى من المستوى المثبت (مسموح ولا يخفضه). */
export function levelNote(skill, levelKey) {
  const level = skill?.levels?.find((item) => item.key === levelKey);
  if (!level) return "";
  if (!level.canAssess && level.nextAttemptAt) {
    return `أكملت محاولة بهذا المستوى مؤخرًا؛ يمكنك إعادته بعد ${formatDateTime(level.nextAttemptAt)}، أو اختيار مستوى آخر.`;
  }
  const rank = (key) => LEVELS.findIndex((item) => item.key === key);
  if (skill.verifiedLevel && rank(levelKey) <= rank(skill.verifiedLevel)) {
    return `مستواك المثبت ${skill.verifiedLevelLabel}. يمكنك التدرب بهذا المستوى، ولن تخفض نتيجته مستواك المثبت.`;
  }
  return "";
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

/** مهارة ومستوى محددان مسبقًا من الرابط (?skill=12&level=intermediate)؛ القيم غير الصالحة تُهمل. */
export function parseAssessmentQuery(search) {
  const params = new URLSearchParams(typeof search === "string" ? search : "");
  const skill = Number(params.get("skill"));
  const level = params.get("level");
  return {
    skillId: Number.isInteger(skill) && skill > 0 ? skill : null,
    level: LEVELS.some((item) => item.key === level) ? level : null,
  };
}

/** ملخص المحاولة قبل البدء: عدد الأسئلة وتركيبتها ومدتها للمستوى المختار. */
export function attemptSummary(settings, level) {
  const practical = Number(settings?.questions?.practical) || 7;
  const written = Number(settings?.questions?.written) || 3;
  const minutes = Number(settings?.time_limit_minutes?.[level]) || 0;
  return { practical, written, total: practical + written, minutes };
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

/** وصف نوع السؤال للطالب (عملي/كتابي ونوعه)؛ الأسئلة القديمة بلا نوع تعرض فارغة. */
export function questionMeta(question) {
  return {
    category: QUESTION_CATEGORIES[question?.category] || "",
    type: QUESTION_TYPES[question?.type] || "",
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

/** نتيجة المحاولة كما حسبها الخادم، مع مستوى المحاولة والمستوى المثبت حاليًا. */
export function resultsView(session) {
  const results = Array.isArray(session?.results) ? session.results : [];
  return results.map((result) => {
    const status = SKILL_STATUSES[result?.status] ? result.status : "incomplete";
    const attempted = levelLabel(result?.level);
    const verified = levelLabel(result?.verified_level);
    let note = RESULT_REASONS[result?.reason] || "";
    if (status === "passed" && result.needs_human_verification) {
      note = "اجتزت الجانب المعرفي. هذه مهارة عملية، فلا تُحتسب في مطابقة المشاريع إلا بعد تحقق عملي من إدارة المنصة.";
    } else if (status === "passed" && !result.counts_for_matching) {
      note = "ناجح، لكن المهارة ليست ضمن مهارات ملفك. أضفها لتُحتسب في مطابقة المشاريع.";
    } else if (status === "passed" && verified) {
      note = `${note} مستواك المثبت في هذه المهارة الآن: ${verified}.`;
    } else if (status === "failed") {
      if (verified) note = `${note} مستواك المثبت السابق (${verified}) لم يتغير.`;
      if (result.next_attempt_at) note = `${note} يمكنك إعادة هذا المستوى بعد ${formatDateTime(result.next_attempt_at)}.`;
    }

    return {
      skill: result?.skill?.name || "",
      skillId: result?.skill?.id,
      status,
      label: SKILL_STATUSES[status].label,
      tone: SKILL_STATUSES[status].tone,
      score: Number.isInteger(result?.score) ? result.score : null,
      level: result?.level || null,
      levelLabel: attempted,
      verifiedLevelLabel: verified,
      countsForMatching: result?.counts_for_matching === true,
      note: note.trim(),
      questions: (Array.isArray(result?.questions) ? result.questions : []).map((question) => ({
        position: question.position,
        category: QUESTION_CATEGORIES[question.category] || "",
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
    const when = formatDateTime(error.data.next_attempt_at);
    const level = levelLabel(error.data.level);
    const details =
      error.data.skill && when
        ? `يمكنك إعادة تقييم ${error.data.skill}${level ? ` بمستوى ${level}` : ""} بعد ${when}، أو اختيار مستوى آخر.`
        : "";
    return { message: details || message, retryable: false };
  }
  if (code === "attempt_limit_reached") {
    const when = formatDateTime(error.data.next_attempt_at);
    return {
      message: when ? `${message || "بلغت الحد الأقصى لعدد المحاولات اليوم."} أقرب موعد: ${when}.` : message,
      retryable: false,
    };
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
