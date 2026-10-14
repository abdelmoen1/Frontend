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

// مهارة في ملف الطالب يقبل الخادم تقييمها بمهام برمجية (assessable؛ الخوادم الأقدم: programming)
const isAssessable = (skill) =>
  skill?.selected === true && (typeof skill.assessable === "boolean" ? skill.assessable : skill.programming !== false);

/**
 * مهارات التقييم: كل مهارة في ملف الطالب يمكن تقييمها بمهام برمجية. الخادم يرفض أي مهارة خارج الملف، فمهارة
 * الرابط (من فرصة مثلًا) تظهر فقط إن كانت في الملف، وتُقدَّم في الترتيب.
 */
export function preAssessmentSkills(skills, presetSkillId = null) {
  // مهارة في فترة الانتظار لا تُعرض للاختيار (الخادم يرفضها)؛ تظهر في coolingDownSkills مع نتيجتها
  const list = (Array.isArray(skills) ? skills : []).filter(
    (skill) => skill && skill.id && isAssessable(skill) && skill.can_assess !== false,
  );
  return [...list.filter((skill) => skill.id === presetSkillId), ...list.filter((skill) => skill.id !== presetSkillId)]
    .map((skill) => {
      const view = skillView(skill);
      let chip = { tone: "neutral", text: "لم تُقيَّم بعد" };
      if (view.verifiedLevel) chip = { tone: "success", text: `مستوى مثبت: ${view.verifiedLevelLabel}` };
      else if (view.practical && view.status === "passed") chip = { tone: "warning", text: "تحتاج تحققًا عمليًا من إدارة المنصة" };
      else if (view.status === "failed") chip = { tone: "neutral", text: "لم تجتز تقييمها بعد" };
      const category = skillCategory(skill);
      return { ...view, category, categoryLabel: SKILL_CATEGORIES[category], icon: skillIconKey(view.name, category), chip };
    });
}

export const COOLDOWN_MESSAGE = "طوّر مهاراتك واستفد من ملاحظات التقييم، ويمكنك إعادة الاختبار بعد انتهاء فترة الانتظار.";

// "3 أيام" أو "ساعتين" حتى موعد محدد؛ فارغ إن مضى الموعد أو لم يكن صالحًا
export function timeUntil(value, now = Date.now()) {
  const ms = new Date(value).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const hours = Math.ceil(ms / 3600000);
  if (hours < 24) {
    if (hours === 1) return "ساعة واحدة";
    if (hours === 2) return "ساعتين";
    return `${hours} ${hours <= 10 ? "ساعات" : "ساعة"}`;
  }
  const days = Math.ceil(ms / 86400000);
  if (days === 1) return "يوم واحد";
  if (days === 2) return "يومين";
  return `${days} ${days <= 10 ? "أيام" : "يومًا"}`;
}

/** آخر تقييم مكتمل محفوظ للمهارة كما أعاده الخادم (المستوى المطلوب والدرجة منفصلان)، أو null. */
export function latestAssessmentView(latest) {
  if (!latest || !SKILL_STATUSES[latest.status]) return null;
  return {
    status: latest.status,
    label: SKILL_STATUSES[latest.status].label,
    tone: SKILL_STATUSES[latest.status].tone,
    levelLabel: levelLabel(latest.level),
    score: Number.isInteger(latest.score) ? latest.score : null,
    reason: RESULT_REASONS[latest.reason] || "",
    assessedAt: formatDateTime(latest.assessed_at),
    sessionId: Number.isInteger(latest.assessment_session_id) ? latest.assessment_session_id : null,
  };
}

/**
 * مهارات الملف في فترة الانتظار بعد تقييم مكتمل: نتيجتها المحفوظة وموعد إتاحتها. كل مهارة وحدها، فبقية المهارات
 * تبقى متاحة للاختيار.
 */
export function coolingDownSkills(skills, now = Date.now()) {
  return (Array.isArray(skills) ? skills : [])
    .filter((skill) => skill && skill.id && isAssessable(skill) && skill.can_assess === false)
    .map((skill) => ({
      id: skill.id,
      name: skill.name || "",
      latest: latestAssessmentView(skill.latest_assessment),
      nextAttemptAt: skill.next_attempt_at || null,
      availableAt: formatDateTime(skill.next_attempt_at),
      remaining: timeUntil(skill.next_attempt_at, now),
    }));
}

/**
 * مهارات ملف الطالب (GET /student/skills) مع حالة تقييم كل منها من نظرة التقييم (GET /student/assessments) بمعرّف
 * المهارة، دون أي طلب إلى الذكاء الاصطناعي. ثلاثة مستويات منفصلة لا يُخلط بينها:
 * - selfLevel: تقدير الطالب لنفسه في ملفه (proficiency)، ليس نتيجة تقييم.
 * - verifiedLevel: أعلى مستوى نجح فيه (المثبت فعلًا).
 * - latest.levelLabel: صعوبة آخر اختبار كما اختارها الطالب، ليست مستوى محققًا.
 * overview غائب (يُحمَّل أو تعذر تحميله): تُعرض المهارات بلا حالة تقييم (availability.state = "unknown").
 */
export function profileSkillsView(studentSkills, overviewSkills, now = Date.now()) {
  const byId = new Map(
    (Array.isArray(overviewSkills) ? overviewSkills : []).filter((item) => item && item.id).map((item) => [item.id, item]),
  );
  return (Array.isArray(studentSkills) ? studentSkills : [])
    .filter((item) => item && item.skill_id)
    .map((item) => {
      const status = byId.get(item.skill_id) || null;
      const latest = latestAssessmentView(status?.latest_assessment);
      const verifiedLevel = LEVELS.some((level) => level.key === status?.verified_level) ? status.verified_level : null;
      let availability = { state: "unknown" };
      if (status && status.programming === false) {
        availability = { state: "unavailable", text: "لا تُقيَّم بمهام برمجية حاليًا" };
      } else if (status && status.can_assess === false && status.next_attempt_at) {
        availability = {
          state: "cooldown",
          availableAt: formatDateTime(status.next_attempt_at),
          remaining: timeUntil(status.next_attempt_at, now),
        };
      } else if (status) {
        availability = { state: "ready", link: assessmentLink(item.skill_id), label: latest ? "إعادة التقييم" : "تقييم المهارة" };
      }
      return {
        id: item.skill_id,
        name: item.skill?.name || status?.name || "مهارة",
        selfLevelLabel: levelLabel(item.proficiency),
        verifiedLevel,
        verifiedLevelLabel: levelLabel(verifiedLevel),
        latest,
        // ناجحة معرفيًا لكنها عملية: تحتاج تحققًا من إدارة المنصة قبل أن تُثبت
        practicalPending: status?.practical === true && latest?.status === "passed" && !verifiedLevel,
        availability,
        // الحذف مقفل بما يقوله الخادم (has_assessment) أو بنتيجة مكتملة في نظرة التقييم؛ الخادم يرفض الحذف في الحالتين
        locked: item.has_assessment === true || latest !== null,
      };
    });
}
/** يقفل حذف مهارة في قائمة مهارات الملف بعد أن رفض الخادم حذفها (skill_has_assessment) لأن قائمة الصفحة قديمة. */
export function markSkillAssessed(studentSkills, skillId) {
  return (Array.isArray(studentSkills) ? studentSkills : []).map((item) =>
    item?.skill_id === skillId ? { ...item, has_assessment: true } : item,
  );
}

/** أسماء مهارات الملف التي لا تُقيَّم بمهام برمجية (تصميم وغيرها)؛ تُذكر للطالب ولا تُعرض للاختيار. */
export function unassessableProfileSkills(skills) {
  return (Array.isArray(skills) ? skills : [])
    .filter((skill) => skill?.selected === true && !isAssessable(skill))
    .map((skill) => skill.name)
    .filter((name) => typeof name === "string" && name);
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

export const QUESTION_CATEGORIES = { practical: "مهمة برمجية", written: "سؤال كتابي" };

// حكم المصحح على حل المهمة (يحدده الخادم بعد التحقق من رد الذكاء الاصطناعي)
export const VERDICTS = {
  correct: { label: "حل صحيح", tone: "success" },
  partially_correct: { label: "صحيح جزئيًا", tone: "warning" },
  incorrect: { label: "حل غير صحيح", tone: "danger" },
  no_solution: { label: "لا يوجد حل", tone: "neutral" },
};

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
  practical_below_threshold: "مجموعك جيد، لكن نتيجة المهام العملية لهذه المهارة وحدها أقل من الحد المطلوب لها.",
  weak_answer: "عدد الحلول الضعيفة جدًا لمهام هذه المهارة تجاوز الحد المسموح.",
  unanswered_questions: "بقيت مهام لهذه المهارة دون حل عند انتهاء الوقت أكثر من المسموح.",
  insufficient_evidence: "لم تتوفر مهام كافية لهذه المهارة للحكم عليها، فلا تُحتسب ناجحة.",
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
    return `قُيّمت هذه المهارة مؤخرًا؛ يمكنك إعادة تقييمها بعد ${formatDateTime(level.nextAttemptAt)}.`;
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

const texts = (value, limit) =>
  (Array.isArray(value) ? value : []).filter((item) => typeof item === "string" && /\S/u.test(item)).slice(0, limit);

/**
 * نص المهمة البرمجية كما يعرضه الخادم: العنوان، المتطلبات، الأمثلة، والكود المبدئي. الجلسات القديمة بلا هذه
 * الحقول تعرض نص السؤال وكوده فقط.
 */
export function taskView(question) {
  const examples = (Array.isArray(question?.examples) ? question.examples : [])
    .filter((item) => item && (typeof item.input === "string" || typeof item.output === "string"))
    .slice(0, 3)
    .map((item) => ({ input: typeof item.input === "string" ? item.input : "", output: typeof item.output === "string" ? item.output : "" }));
  // الكود المبدئي يُملأ في محرر الحل؛ code_context للجلسات القديمة يبقى معروضًا للقراءة كما هو
  return {
    title: typeof question?.title === "string" ? question.title.trim() : "",
    prompt: typeof question?.prompt === "string" ? question.prompt : "",
    language: typeof question?.language === "string" ? question.language : "",
    requirements: texts(question?.requirements, 8),
    examples,
    starterCode: typeof question?.starter_code === "string" && /\S/u.test(question.starter_code) ? question.starter_code : "",
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

/** حالة كل سؤال في قائمة الأسئلة: مُجاب أو الحالي أو لم يُجب بعد. الأسئلة تُعرض بالترتيب فلا تنقّل بينها. */
export function questionSteps(session) {
  const { answered, total } = progressView(session);
  const current = session?.status === "in_progress" && answered < total ? answered + 1 : null;
  return Array.from({ length: total }, (_, index) => {
    const position = index + 1;
    const status = position <= answered ? "answered" : position === current ? "current" : "upcoming";
    return { position, status };
  });
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
      if (result.next_attempt_at) note = `${note} يمكنك إعادة تقييم هذه المهارة بعد ${formatDateTime(result.next_attempt_at)}.`;
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
        title: typeof question.title === "string" ? question.title : "",
        category: QUESTION_CATEGORIES[question.category] || "",
        verdict: VERDICTS[question.verdict]?.label || "",
        verdictTone: VERDICTS[question.verdict]?.tone || "neutral",
        prompt: question.prompt || "",
        answered: question.answered === true,
        points:
          Number.isInteger(question.awarded_points) && Number.isInteger(question.max_points)
            ? `${question.awarded_points} من ${question.max_points}`
            : "",
        feedback: question.feedback || "",
        // الحلول الجديدة تعيد issues؛ الجلسات القديمة missing_concepts
        missing: texts(Array.isArray(question.issues) ? question.issues : question.missing_concepts, 6),
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
    // الخادم يعيد كل مهارة في فترة الانتظار وموعد إتاحتها
    const details = (Array.isArray(error.data.skills) ? error.data.skills : [])
      .filter((item) => item && typeof item.skill === "string" && formatDateTime(item.next_attempt_at))
      .map((item) => `${item.skill} بعد ${formatDateTime(item.next_attempt_at)}`)
      .join("، ");
    return {
      message: details ? `لا يمكن إعادة تقييم: ${details}. احذفها من هذا التقييم أو قيّم مهارات أخرى.` : message,
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
  // مثل assessment_storage_failed (يمكن إعادته) أو assessment_unavailable (لا يفيد تكراره الآن)
  if (code && message) return { message, retryable: error.data.retryable === true };
  if (status === 422) {
    const errors = error?.data?.errors && typeof error.data.errors === "object" ? Object.values(error.data.errors).flat() : [];
    const first = errors.find((item) => typeof item === "string" && ARABIC.test(item));
    return { message: first || "تحقق من البيانات ثم أعد المحاولة.", retryable: false, validation: true };
  }
  if (status === 404) return { message: message || "جلسة التقييم غير موجودة.", retryable: false, notFound: true };
  if (status === 403) return { message: message || "هذه الصفحة مخصصة للطلاب.", retryable: false };
  if (status === 401) return { message: "انتهت جلستك. سجّل الدخول مرة أخرى.", retryable: false, login: true };
  if (status === 429) return { message: "محاولات كثيرة. انتظر دقيقة ثم أعد المحاولة.", retryable: true };
  // خطأ خادم بلا رمز (استثناء غير متوقع): لا نعرض نص الخادم، وتفاصيله في سجلاته
  if (status >= 500) return { message: "حدث خطأ في الخادم. أعد المحاولة بعد قليل.", retryable: true, server: true };
  return { message: "تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت ثم أعد المحاولة.", retryable: true };
}

/**
 * يبدأ التقييم مرة واحدة. عند فشل يمكن إعادته ربما حفظ الخادم الجلسة وضاع الرد، فيُسأل الخادم عن جلسة مفتوحة
 * لمتابعتها بدل إنشاء أخرى. يعيد { session } أو { resumedId } أو { error } (من assessmentError).
 */
export async function startOrRecover(start, overview) {
  try {
    const session = await start();
    // رد بلا معرّف جلسة لا يُنتقل به؛ يُعامل كرد ضائع
    if (session?.id) return { session };
    throw { kind: "invalid_response", status: 0 };
  } catch (failure) {
    const error = assessmentError(failure);
    if (error.retryable) {
      const committed = await Promise.resolve()
        .then(overview)
        .then((data) => data?.active_session)
        .catch(() => null);
      if (committed?.id) return { resumedId: committed.id };
    }
    return { error };
  }
}
