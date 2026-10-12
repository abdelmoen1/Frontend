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

// مستويات الخادم بالترتيب (مبتدئ < متوسط < متقدم < خبير). المستوى الذي يختاره الطالب طلب لصعوبة الأسئلة وليس
// إثباتًا؛ المثبت فقط ما ينجح فيه
export const LEVELS = [
  { key: "beginner", label: "مبتدئ", hint: "أساسيات المهارة ومهام قصيرة بمفهوم واحد." },
  { key: "intermediate", label: "متوسط", hint: "ميزات واقعية صغيرة تجمع عدة مفاهيم، وتصحيح أخطاء في كود متوسط." },
  { key: "advanced", label: "متقدم", hint: "قرارات تصميم وأداء وأمان وحالات حدية معقدة." },
  { key: "expert", label: "خبير", hint: "مشكلات مفتوحة على مستوى الإنتاج تتطلب خبرة عميقة." },
];

// المستويات المعروضة في اختيار صعوبة كل مهارة (هي مستويات الخادم نفسها)
export const TARGET_LEVELS = LEVELS;

/**
 * قواعد الجلسة كما يعيدها الخادم (GET /student/assessments → settings)، فما يُعرض هو ما يُفرض فعلًا. لا قيم
 * افتراضية: قيمة مفقودة تبقى null وتُعرض "—".
 */
export function assessmentSettings(settings) {
  const number = (value) => (Number.isInteger(value) && value > 0 ? value : null);
  return {
    questions: number(settings?.questions?.total),
    practical: number(settings?.questions?.practical),
    written: number(settings?.questions?.written),
    minutes: number(settings?.time_limit_minutes),
    maxSkills: number(settings?.max_skills_per_session),
    minPracticalPerSkill: number(settings?.min_practical_per_skill),
  };
}

export const levelLabel = (key) => TARGET_LEVELS.find((item) => item.key === key)?.label || "";

/** ترتيب المستوى (1 مبتدئ … 4 خبير)؛ 0 لقيمة غير معروفة. يُستخدم لمؤشر النقاط. */
export const levelRank = (key) => TARGET_LEVELS.findIndex((item) => item.key === key) + 1;

export const SKILL_CATEGORIES = {
  programming: "برمجة وتطوير",
  design: "تصميم وتجربة مستخدم",
  applied: "مهارات تطبيقية",
};

// أيقونة كل مهارة حسب اسمها في كتالوج المنصة (SkillSeeder)؛ مفاتيح تربطها الصفحة بأيقونات lucide
const SKILL_ICON_GROUPS = {
  database: ["MySQL", "PostgreSQL", "MongoDB", "Redis", "SQL"],
  firebase: ["Firebase"],
  markup: ["HTML"],
  styling: ["CSS", "Sass", "Tailwind CSS", "Bootstrap"],
  responsive: ["Responsive Design"],
  script: ["JavaScript", "TypeScript"],
  frontend: ["React", "Vue.js", "Angular", "Next.js", "Redux"],
  language: ["PHP", "Python", "Java", "C#", "C++"],
  server: ["Laravel", "Django", "Flask", "Spring Boot", "ASP.NET Core", "Node.js", "Express.js"],
  api: ["REST API", "GraphQL"],
  apiTesting: ["API Testing", "Postman"],
  git: ["Git", "GitHub"],
  container: ["Docker"],
  mobile: ["Flutter", "Dart", "Kotlin", "Swift", "React Native"],
  design: ["Figma", "Adobe XD", "UI/UX Design", "Prototyping"],
  wireframe: ["Wireframing"],
  designSystem: ["Design Systems"],
  research: ["User Research", "Usability Testing"],
  bug: ["Manual Testing"],
  testing: ["Test Automation", "Selenium", "Cypress", "Jest"],
  table: ["Pandas", "NumPy"],
  chart: ["Data Visualization", "Power BI"],
  ai: ["Machine Learning", "Deep Learning", "Scikit-learn", "TensorFlow", "PyTorch"],
};

const SKILL_ICON_BY_NAME = Object.fromEntries(
  Object.entries(SKILL_ICON_GROUPS).flatMap(([key, names]) => names.map((name) => [name.toLowerCase(), key])),
);

// أيقونة احتياطية لمهارة غير معروفة حسب فئتها
const CATEGORY_ICON = { programming: "terminal", design: "design", applied: "research" };

/** مفتاح أيقونة المهارة: من اسمها، وإلا من فئتها. */
export function skillIconKey(name, category) {
  return SKILL_ICON_BY_NAME[String(name || "").trim().toLowerCase()] || CATEGORY_ICON[category] || "terminal";
}

/** فئة المهارة من بيانات الخادم: عملية (أدوات التصميم)، أو غير برمجية، أو برمجية. */
export function skillCategory(skill) {
  if (skill?.practical) return "design";
  return skill?.programming === false ? "applied" : "programming";
}

/**
 * مهارات التقييم: المهارات المختارة في ملف الطالب، ومعها مهارة محددة من رابط (مثل سبب عدم الأهلية في فرصة)
 * حتى لو لم تكن في الملف بعد.
 */
export function preAssessmentSkills(skills, presetSkillId = null) {
  return (Array.isArray(skills) ? skills : [])
    .filter((skill) => skill && skill.id && (skill.selected === true || skill.id === presetSkillId))
    .map((skill) => {
      const view = skillView(skill);
      let chip = { tone: "neutral", text: "لم تُقيَّم بعد" };
      if (view.verifiedLevel) chip = { tone: "success", text: `مستوى مثبت: ${view.verifiedLevelLabel}` };
      else if (view.practical && view.status === "passed") chip = { tone: "warning", text: "تحتاج تحققًا عمليًا من إدارة المنصة" };
      else if (view.status === "failed") chip = { tone: "neutral", text: "لم تجتز تقييمها بعد" };
      if (skill.selected !== true) chip = { tone: "info", text: "ستُضاف إلى مهارات ملفك" };
      const category = skillCategory(skill);
      return { ...view, category, categoryLabel: SKILL_CATEGORIES[category], icon: skillIconKey(view.name, category), chip };
    });
}

/** يغيّر مستوى مهارة واحدة فقط؛ قيمة غير معروفة تُلغي اختيار تلك المهارة وحدها. */
export function setSkillLevel(levels, skillId, level) {
  const next = { ...(levels || {}) };
  if (levelRank(level) > 0) next[skillId] = level;
  else delete next[skillId];
  return next;
}

/**
 * المهارات المستبعدة مبدئيًا عندما يزيد عدد مهارات الملف عن حد الجلسة: تبقى أول maxSkills (مع تقديم مهارة
 * الرابط إن وُجدت)، ويستطيع الطالب تبديلها من قائمة "المحذوفة من هذا التقييم".
 */
export function defaultExcluded(skills, maxSkills, presetSkillId = null) {
  const list = Array.isArray(skills) ? skills : [];
  if (!maxSkills || list.length <= maxSkills) return [];
  const ordered = [...list.filter((skill) => skill.id === presetSkillId), ...list.filter((skill) => skill.id !== presetSkillId)];
  return ordered.slice(maxSkills).map((skill) => skill.id);
}

/**
 * جاهزية البدء: من مهارة واحدة إلى maxSkills، ومستوى لكل مهارة مشمولة، وتأكيد القراءة. الخادم يعيد التحقق من
 * كل ذلك. payload هو ما يُرسل للخادم بترتيب العرض: [{skill_id, level}].
 */
export function preAssessmentState({ skills, levels, excluded, confirmed, maxSkills }) {
  const removed = new Set(Array.isArray(excluded) ? excluded : []);
  const included = (Array.isArray(skills) ? skills : []).filter((skill) => !removed.has(skill.id));
  const missing = included.filter((skill) => levelRank(levels?.[skill.id]) === 0).map((skill) => skill.name);
  const tooMany = Boolean(maxSkills) && included.length > maxSkills;
  const selectionsComplete = included.length > 0 && missing.length === 0 && !tooMany;
  const ready = selectionsComplete && confirmed === true;
  return {
    included,
    missing,
    tooMany,
    selectionsComplete,
    ready,
    canStart: ready,
    payload: selectionsComplete ? included.map((skill) => ({ skill_id: skill.id, level: levels[skill.id] })) : null,
  };
}

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
  essay: "مقال",
  explanation: "شرح",
  reasoning: "تبرير واستدلال",
  technical_analysis: "تحليل تقني",
};

export const RESULT_REASONS = {
  passed: "بلغت إجاباتك نسبة النجاح المطلوبة.",
  below_threshold: "مجموع نقاطك في هذه المحاولة أقل من نسبة النجاح المطلوبة.",
  practical_below_threshold: "مجموعك جيد، لكن نتيجة الأسئلة العملية لهذه المهارة وحدها أقل من الحد المطلوب لها؛ المقال لا يعوّضها.",
  weak_answer: "عدد الإجابات العملية الضعيفة جدًا لهذه المهارة تجاوز الحد المسموح.",
  unanswered_questions: "بقيت أسئلة عملية لهذه المهارة دون إجابة عند انتهاء الوقت أكثر من المسموح.",
  insufficient_evidence: "لم تتوفر أسئلة عملية كافية لهذه المهارة للحكم عليها، فلا تُحتسب ناجحة.",
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
  // المستوى المثبت يأتي من الخادم ولا يكون إلا أحد مستوياته (LEVELS)
  const verifiedLevel = LEVELS.some((item) => item.key === skill?.verified_level) ? skill.verified_level : null;
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

/** مهارات الجلسة بمستوياتها كما خزنها الخادم: "PHP (متوسط)، Laravel (متقدم)"؛ الجلسات القديمة: اسم المهارة أو العنوان. */
export function requestedSkillsText(session) {
  const skills = Array.isArray(session?.requested_skills) ? session.requested_skills : [];
  const text = skills
    .filter((skill) => skill && typeof skill.name === "string")
    .map((skill) => (levelLabel(skill.level) ? `${skill.name} (${levelLabel(skill.level)})` : skill.name))
    .join("، ");
  if (text) return text;
  if (session?.skill?.name) {
    return levelLabel(session.requested_level) ? `${session.skill.name} (${levelLabel(session.requested_level)})` : session.skill.name;
  }
  return session?.title || "";
}

/** مهارة السؤال الحالي ومستواه المطلوب، أو مهارات المقال: "Laravel · متقدم" أو "يغطي: PHP، Laravel". */
export function questionSkillsText(question) {
  if (question?.skill?.name) {
    return levelLabel(question.skill.level) ? `${question.skill.name} · ${levelLabel(question.skill.level)}` : question.skill.name;
  }
  const names = (Array.isArray(question?.skills) ? question.skills : [])
    .map((skill) => skill?.name)
    .filter((name) => typeof name === "string" && name);
  return names.length ? `يغطي: ${names.join("، ")}` : "";
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
    // الخادم يعيد كل مهارة ومستوى في فترة الانتظار
    const details = (Array.isArray(error.data.skills) ? error.data.skills : [])
      .filter((item) => item && typeof item.skill === "string" && formatDateTime(item.next_attempt_at))
      .map((item) => `${item.skill}${levelLabel(item.level) ? ` (${levelLabel(item.level)})` : ""} بعد ${formatDateTime(item.next_attempt_at)}`)
      .join("، ");
    return {
      message: details ? `لا يمكن إعادة تقييم: ${details}. اختر مستوى آخر لها أو احذفها من هذا التقييم.` : message,
      retryable: false,
    };
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
