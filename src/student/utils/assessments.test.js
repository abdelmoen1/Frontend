import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ASSESSMENTS_PATH,
  LEVELS,
  TARGET_LEVELS,
  assessmentSettings,
  defaultExcluded,
  questionSkillsText,
  requestedSkillsText,
  answerError,
  levelRank,
  preAssessmentSkills,
  preAssessmentState,
  setSkillLevel,
  skillCategory,
  skillIconKey,
  assessmentError,
  assessmentLink,
  formatClock,
  groupSkills,
  insertIndent,
  levelNote,
  parseAssessmentQuery,
  progressView,
  questionMeta,
  questionSteps,
  remainingSeconds,
  resultsView,
  sessionPath,
  skillView,
  specializationNotice,
  startOrRecover,
} from "./assessments.js";

const skill = (overrides = {}) => ({
  id: 1,
  name: "PHP",
  selected: true,
  practical: false,
  status: "not_assessed",
  verified: false,
  verified_level: null,
  score: null,
  levels: {},
  can_assess: true,
  ...overrides,
});

describe("choosing what to assess", () => {
  it("shows the verified level and each level's status from the server", () => {
    const view = skillView(
      skill({
        status: "passed",
        verified_level: "beginner",
        levels: {
          beginner: { status: "passed", score: 90, can_assess: false, next_attempt_at: "2026-10-13T10:00:00+00:00" },
          intermediate: { status: "failed", score: 50, can_assess: true },
          advanced: { status: "not_assessed", can_assess: true },
        },
      }),
    );
    assert.equal(view.verifiedLevel, "beginner");
    assert.equal(view.verifiedLevelLabel, "مبتدئ");
    assert.deepEqual(
      view.levels.map((level) => [level.key, level.status, level.canAssess]),
      [
        ["beginner", "passed", false],
        ["intermediate", "failed", true],
        ["advanced", "not_assessed", true],
        ["expert", "not_assessed", true],
      ],
    );
    // إعادة مهارة ناجحة مسموحة (بمستوى أعلى)
    assert.equal(view.selectable, true);
    assert.match(levelNote(view, "beginner"), /بعد/);
    assert.match(levelNote(skillView(skill({ verified_level: "intermediate" })), "beginner"), /لن تخفض/);
    assert.equal(levelNote(view, "advanced"), "");
    assert.match(skillView(skill({ name: "Figma", practical: true, status: "passed" })).note, /تحققًا من إدارة المنصة/);
    assert.equal(skillView(skill({ status: "weird", verified_level: "guru" })).verifiedLevel, null);
  });

  it("puts the specialization skills first using real ids", () => {
    const groups = groupSkills(
      [skill({ id: 1, name: "PHP" }), skill({ id: 2, name: "Laravel" }), skill({ id: 3, name: "Figma" })],
      { skills: [{ id: 2, name: "Laravel" }, { id: 1, name: "PHP" }, { id: 99, name: "Missing" }] },
    );
    assert.deepEqual(groups.suggested.map((item) => item.name), ["Laravel", "PHP"]);
    assert.deepEqual(groups.others.map((item) => item.name), ["Figma"]);
  });

  it("reads a preselected skill and level from the link and summarizes the attempt", () => {
    assert.deepEqual(parseAssessmentQuery("?skill=12&level=intermediate"), { skillId: 12, level: "intermediate" });
    assert.deepEqual(parseAssessmentQuery("?skill=abc&level=guru"), { skillId: null, level: null });
    assert.equal(assessmentLink(12, "advanced"), "/student/assessment?skill=12&level=advanced");
    assert.equal(assessmentLink(undefined, undefined), "/student/assessment");
    assert.deepEqual(LEVELS.map((level) => level.label), ["مبتدئ", "متوسط", "متقدم", "خبير"]);
  });

  it("asks for a professional specialization when it is missing or unknown", () => {
    assert.equal(specializationNotice({ status: "compatible" }), null);
    assert.match(specializationNotice({ status: "missing" }).title, /مسارك المهني/);
    assert.match(specializationNotice({ status: "unrecognized" }).body, /ليس من قائمة/);
  });

  it("links to the list and to a session", () => {
    assert.equal(ASSESSMENTS_PATH, "/student/assessment");
    assert.equal(sessionPath(7), "/student/assessment/sessions/7");
  });

  it("labels practical and written questions", () => {
    assert.deepEqual(questionMeta({ category: "practical", type: "debugging" }), { category: "سؤال عملي", type: "إصلاح خطأ" });
    assert.deepEqual(questionMeta({ category: "written", type: "reasoning" }), { category: "سؤال كتابي", type: "تبرير واستدلال" });
    assert.deepEqual(questionMeta({}), { category: "", type: "" });
  });
});

describe("answering", () => {
  it("requires real content without trimming or rewriting it", () => {
    assert.equal(answerError("   \n\t"), "اكتب إجابتك قبل الإرسال.");
    assert.equal(answerError("    indented();\n"), "");
    assert.match(answerError("x".repeat(9), 8), /أطول/);
  });

  it("inserts indentation at the cursor in the code editor", () => {
    assert.deepEqual(insertIndent("if (x) {\n}", 9, 9), { value: "if (x) {\n    }", cursor: 13 });
    assert.deepEqual(insertIndent("abc", 1, 2, "\t"), { value: "a\tc", cursor: 2 });
  });

  it("tracks progress one question at a time", () => {
    assert.deepEqual(progressView({ question_count: 10, answered_count: 1 }), { answered: 1, total: 10, current: 2, percent: 10 });
    assert.deepEqual(progressView({ question_count: 10, answered_count: 10 }).current, 10);
    assert.equal(progressView(null).total, 0);
  });

  it("counts down using the server clock", () => {
    const loadedAt = Date.parse("2026-10-12T10:00:00Z");
    const timing = { expiresAt: "2026-10-12T10:42:00Z", serverTime: "2026-10-12T10:02:00Z", loadedAt };
    assert.equal(remainingSeconds(timing, loadedAt), 40 * 60);
    assert.equal(remainingSeconds(timing, loadedAt + 3_600_000), 0);
    assert.equal(formatClock(605), "10:05");
  });
});

describe("results", () => {
  it("shows the attempt's outcome, its level and the unchanged verified level", () => {
    const [php] = resultsView({
      results: [
        {
          skill: { id: 1, name: "PHP" },
          status: "passed",
          score: 90,
          reason: "passed",
          level: "intermediate",
          verified_level: "intermediate",
          counts_for_matching: true,
          questions: [
            { position: 1, category: "practical", prompt: "س", answered: true, awarded_points: 9, max_points: 10, feedback: "جيد", missing_concepts: [] },
          ],
        },
      ],
    });
    assert.equal(php.countsForMatching, true);
    assert.equal(php.levelLabel, "متوسط");
    assert.match(php.note, /مستواك المثبت في هذه المهارة الآن: متوسط/);
    assert.equal(php.questions[0].points, "9 من 10");
    assert.equal(php.questions[0].category, "سؤال عملي");

    const [laravel] = resultsView({
      results: [
        {
          skill: { name: "Laravel" },
          status: "failed",
          score: 50,
          reason: "practical_below_threshold",
          level: "advanced",
          verified_level: "intermediate",
          next_attempt_at: "2026-10-13T10:00:00+00:00",
          questions: [],
        },
      ],
    });
    assert.match(laravel.note, /الأسئلة العملية/);
    assert.match(laravel.note, /مستواك المثبت السابق \(متوسط\) لم يتغير/);
    assert.match(laravel.note, /إعادة هذا المستوى بعد/);

    const [figma] = resultsView({
      results: [{ skill: { name: "Figma" }, status: "passed", score: 80, needs_human_verification: true, counts_for_matching: false, questions: [] }],
    });
    assert.match(figma.note, /تحقق عملي/);
    assert.deepEqual(resultsView({ results: null }), []);
  });
});

describe("errors", () => {
  it("maps API failures to clear, safe messages and next steps", () => {
    assert.equal(assessmentError({ status: 503, data: { code: "ai_invalid_response", message: "تعذر إعداد أسئلة التقييم الآن. لم يُسجَّل أي شيء؛ حاول مرة أخرى بعد قليل.", retryable: true } }).retryable, true);
    assert.equal(assessmentError({ status: 503, data: { code: "ai_configuration_error", message: "خدمة إعداد التقييمات غير متاحة حاليًا.", retryable: false } }).retryable, false);
    assert.equal(assessmentError({ status: 409, data: { code: "question_out_of_order", message: "هذا ليس السؤال الحالي. حدّث الصفحة لمتابعة التقييم." } }).reload, true);
    assert.equal(assessmentError({ status: 409, data: { code: "answering_closed", message: "انتهت مرحلة الإجابة في هذا التقييم." } }).expired, true);
    assert.equal(assessmentError({ status: 422, data: { code: "specialization_required", message: "اختر مسارك المهني أولًا ليُبنى التقييم عليه." } }).specialization, true);
    const retake = assessmentError({
      status: 409,
      data: { code: "retake_not_available", message: "x", skills: [{ skill: "Laravel", level: "intermediate", next_attempt_at: "2026-10-13T10:00:00+00:00" }] },
    });
    assert.match(retake.message, /Laravel \(متوسط\) بعد/);
    assert.equal(retake.retryable, false);
    const limit = assessmentError({
      status: 429,
      data: { code: "attempt_limit_reached", message: "بلغت الحد الأقصى لعدد محاولات التقييم خلال 24 ساعة.", next_attempt_at: "2026-10-13T10:00:00+00:00" },
    });
    assert.match(limit.message, /أقرب موعد/);
    assert.equal(limit.retryable, false);
    assert.match(assessmentError({ status: 422, data: { errors: { level: ["اختر مستوى التقييم: مبتدئ أو متوسط أو متقدم."] } } }).message, /مستوى التقييم/);
    assert.match(assessmentError({ status: 422, data: { errors: { answer: ["اكتب إجابتك قبل الإرسال."] } } }).message, /اكتب إجابتك/);
    assert.equal(assessmentError({ status: 422, data: { errors: { answer: ["The answer field is required."] } } }).message, "تحقق من البيانات ثم أعد المحاولة.");
    assert.equal(assessmentError({ status: 404, data: { message: "Not Found" } }).notFound, true);
    assert.equal(assessmentError({ status: 401 }).login, true);
    assert.equal(assessmentError({ kind: "network", status: 0 }).retryable, true);
    assert.match(assessmentError({ kind: "network", status: 0 }).message, /اتصالك بالإنترنت/);
  });

  it("never shows server internals for an uncoded 500 and honours the server's retry hint", () => {
    const crash = assessmentError({
      status: 500,
      data: { message: "SQLSTATE[42S22]: Column not found: 1054 Unknown column 'skill_levels'", exception: "QueryException" },
    });
    assert.equal(crash.message, "حدث خطأ في الخادم. أعد المحاولة بعد قليل.");
    assert.equal(crash.retryable, true);
    assert.equal(crash.server, true);

    const storage = assessmentError({
      status: 503,
      data: { code: "assessment_storage_failed", message: "تعذر حفظ التقييم بسبب خطأ في الخادم.", retryable: true },
    });
    assert.equal(storage.retryable, true);
    const unavailable = assessmentError({
      status: 503,
      data: { code: "assessment_unavailable", message: "التقييم غير متاح مؤقتًا بسبب تحديث في الخادم.", retryable: false },
    });
    assert.equal(unavailable.retryable, false);
    assert.match(unavailable.message, /غير متاح مؤقتًا/);
  });
});

describe("pre-assessment screen", () => {
  const apiSkills = [
    skill({ id: 1, name: "PHP", selected: true, programming: true, verified_level: "beginner" }),
    skill({ id: 2, name: "Laravel", selected: true, programming: true }),
    skill({ id: 3, name: "Figma", selected: true, programming: false, practical: true }),
    skill({ id: 4, name: "Manual Testing", selected: false, programming: false }),
    skill({ id: 5, name: "MySQL", selected: false }),
  ];

  it("displays the session rules the server returns, with four ordered levels", () => {
    const serverSettings = {
      questions: { practical: 9, written: 1, total: 10 },
      time_limit_minutes: 30,
      max_skills_per_session: 3,
      min_practical_per_skill: 3,
    };
    assert.deepEqual(assessmentSettings(serverSettings), {
      questions: 10,
      practical: 9,
      written: 1,
      minutes: 30,
      maxSkills: 3,
      minPracticalPerSkill: 3,
    });
    // لا قيم مخترعة إن لم تصل الإعدادات
    assert.deepEqual(Object.values(assessmentSettings(undefined)), [null, null, null, null, null, null]);
    assert.deepEqual(TARGET_LEVELS.map((level) => level.label), ["مبتدئ", "متوسط", "متقدم", "خبير"]);
    assert.deepEqual(["beginner", "intermediate", "advanced", "expert", "x"].map(levelRank), [1, 2, 3, 4, 0]);
  });

  it("lists the profile's selected skills (plus a linked skill) with real categories", () => {
    const skills = preAssessmentSkills(apiSkills);
    assert.deepEqual(skills.map((item) => item.name), ["PHP", "Laravel", "Figma"]);
    assert.deepEqual(skills.map((item) => item.category), ["programming", "programming", "design"]);
    assert.match(skills[0].chip.text, /مستوى مثبت: مبتدئ/);
    assert.equal(skillCategory({ programming: false }), "applied");
    // مهارة من رابط فرصة تُعرض حتى لو لم تكن في الملف
    const linked = preAssessmentSkills(apiSkills, 4);
    assert.equal(linked.at(-1).name, "Manual Testing");
    assert.match(linked.at(-1).chip.text, /ستُضاف/);
    assert.deepEqual(preAssessmentSkills(null), []);
  });

  it("keeps an independent level per skill", () => {
    let levels = setSkillLevel({}, 1, "advanced");
    levels = setSkillLevel(levels, 2, "beginner");
    levels = setSkillLevel(levels, 1, "expert");
    assert.deepEqual(levels, { 1: "expert", 2: "beginner" });
    assert.deepEqual(setSkillLevel(levels, 2, ""), { 1: "expert" });
    assert.deepEqual(setSkillLevel(levels, 2, "guru"), { 1: "expert" });
  });

  it("requires a level for every included skill and the confirmation before starting", () => {
    const skills = preAssessmentSkills(apiSkills);
    const partial = preAssessmentState({ skills, levels: { 1: "advanced" }, excluded: [], confirmed: true });
    assert.deepEqual(partial.missing, ["Laravel", "Figma"]);
    assert.equal(partial.ready, false);
    assert.equal(partial.payload, null);

    const complete = { 1: "advanced", 2: "intermediate", 3: "beginner" };
    const unconfirmed = preAssessmentState({ skills, levels: complete, excluded: [], confirmed: false });
    assert.equal(unconfirmed.selectionsComplete, true);
    assert.equal(unconfirmed.ready, false);

    const ready = preAssessmentState({ skills, levels: complete, excluded: [], confirmed: true });
    assert.equal(ready.ready, true);
    assert.deepEqual(ready.payload, [
      { skill_id: 1, level: "advanced" },
      { skill_id: 2, level: "intermediate" },
      { skill_id: 3, level: "beginner" },
    ]);
    assert.equal(ready.canStart, true);
  });

  it("limits a session to the server's maximum and preselects at most that many skills", () => {
    const skills = preAssessmentSkills([...apiSkills, skill({ id: 6, name: "Docker", selected: true })]);
    const levels = { 1: "advanced", 2: "intermediate", 3: "beginner", 6: "expert" };
    const tooMany = preAssessmentState({ skills, levels, excluded: [], confirmed: true, maxSkills: 3 });
    assert.equal(tooMany.tooMany, true);
    assert.equal(tooMany.canStart, false);
    assert.equal(tooMany.payload, null);

    // الزائد يُستبعد مبدئيًا، ومهارة الرابط تُقدَّم
    assert.deepEqual(defaultExcluded(skills, 3), [6]);
    assert.deepEqual(defaultExcluded(skills, 3, 6), [3]);
    assert.deepEqual(defaultExcluded(skills.slice(0, 2), 3), []);
    const within = preAssessmentState({ skills, levels, excluded: defaultExcluded(skills, 3), confirmed: true, maxSkills: 3 });
    assert.equal(within.canStart, true);
    assert.deepEqual(within.payload.map((item) => item.skill_id), [1, 2, 3]);
  });

  it("describes each question's skill and level, and the session's skills", () => {
    assert.equal(questionSkillsText({ skill: { name: "Laravel", level: "expert" } }), "Laravel · خبير");
    assert.equal(questionSkillsText({ skill: null, skills: [{ name: "PHP" }, { name: "MySQL" }] }), "يغطي: PHP، MySQL");
    assert.equal(
      requestedSkillsText({ requested_skills: [{ name: "PHP", level: "intermediate" }, { name: "Laravel", level: "advanced" }] }),
      "PHP (متوسط)، Laravel (متقدم)",
    );
    // جلسات سابقة لمهارة واحدة
    assert.equal(requestedSkillsText({ skill: { name: "PHP" }, requested_level: "beginner" }), "PHP (مبتدئ)");
    assert.equal(requestedSkillsText({ title: "تقييم قديم" }), "تقييم قديم");
    assert.deepEqual(questionMeta({ category: "written", type: "essay" }), { category: "سؤال كتابي", type: "مقال" });
  });

  it("explains per-skill retake waits returned by the server", () => {
    const error = assessmentError({
      status: 409,
      data: {
        code: "retake_not_available",
        message: "x",
        skills: [{ skill: "PHP", level: "beginner", next_attempt_at: "2026-10-13T10:00:00+00:00" }],
      },
    });
    assert.match(error.message, /PHP \(مبتدئ\) بعد/);
    assert.match(resultsView({ results: [{ status: "failed", reason: "insufficient_evidence", questions: [] }] })[0].note, /أسئلة عملية كافية/);
  });

  it("drops removed skills from validation and blocks an empty assessment", () => {
    const skills = preAssessmentSkills(apiSkills);
    const removed = preAssessmentState({ skills, levels: { 1: "advanced", 2: "beginner" }, excluded: [3], confirmed: true });
    assert.deepEqual(removed.included.map((item) => item.name), ["PHP", "Laravel"]);
    assert.equal(removed.ready, true);
    const empty = preAssessmentState({ skills, levels: {}, excluded: [1, 2, 3], confirmed: true });
    assert.equal(empty.ready, false);
    assert.equal(preAssessmentState({ skills: [], levels: {}, excluded: [], confirmed: true }).ready, false);
  });

  it("uses real select controls and never shows the old 15-question values", async () => {
    const { readFile } = await import("node:fs/promises");
    const page = await readFile(new URL("../pages/StudentAssessments.jsx", import.meta.url), "utf8");
    assert.match(page, /<select/);
    assert.doesNotMatch(page, /15\s*(?:سؤال|أسئلة|دقيقة)/);
    // التعليمات والتأكيد في نافذة <dialog> تُفتح من زر "اختبار المهارات" في البانر
    assert.match(page, /<PreAssessmentDialog/);
    assert.match(page, /onClick=\{openDialog\}/);
    const dialog = await readFile(new URL("../components/PreAssessmentDialog.jsx", import.meta.url), "utf8");
    assert.match(dialog, /<dialog/);
    assert.match(dialog, /type="checkbox"/);
    assert.match(dialog, /disabled=\{!canStart \|\| starting\}/);
    assert.doesNotMatch(dialog, /\b10 أسئلة|\b30 دقيقة|\b9 \+ 1/);
    // القيم من إعدادات الخادم، والبدء يرسل الخريطة الكاملة للمهارات ومستوياتها
    assert.match(page, /rules\.questions/);
    assert.match(page, /rules\.minutes/);
    assert.match(page, /startAssessmentSession\(state\.payload\)/);
    assert.doesNotMatch(page, /\b10 أسئلة|\b30 دقيقة/);
  });
});

describe("skill icons", () => {
  it("picks an icon from the skill's name, falling back to its category", () => {
    assert.equal(skillIconKey("MySQL", "programming"), "database");
    assert.equal(skillIconKey(" github ", "programming"), "git");
    assert.equal(skillIconKey("Figma", "design"), "design");
    assert.equal(skillIconKey("Manual Testing", "applied"), "bug");
    assert.equal(skillIconKey("Power BI", "applied"), "chart");
    assert.equal(skillIconKey("Rust", "programming"), "terminal");
    assert.equal(skillIconKey("Copywriting", "applied"), "research");
    assert.equal(preAssessmentSkills([skill({ id: 9, name: "Docker" })])[0].icon, "container");
  });

  it("has a page icon for every key", async () => {
    const { readFile } = await import("node:fs/promises");
    const page = await readFile(new URL("../pages/StudentAssessments.jsx", import.meta.url), "utf8");
    const utils = await readFile(new URL("./assessments.js", import.meta.url), "utf8");
    const groups = utils.slice(utils.indexOf("SKILL_ICON_GROUPS = {"), utils.indexOf("};", utils.indexOf("SKILL_ICON_GROUPS = {")));
    const keys = [...groups.matchAll(/^\s+(\w+): \[/gm)].map((match) => match[1]);
    assert.ok(keys.length > 10);
    for (const key of [...keys, "terminal", "design", "research"]) {
      assert.match(page, new RegExp(`\\n  ${key}: [A-Z]\\w+,`), key);
    }
  });
});

describe("assessment routes survive a refresh", () => {
  it("serves index.html for nested SPA routes on Vercel and the router owns the session path", async () => {
    const { readFile } = await import("node:fs/promises");
    const vercel = JSON.parse(await readFile(new URL("../../../vercel.json", import.meta.url), "utf8"));
    assert.deepEqual(vercel.rewrites, [{ source: "/(.*)", destination: "/index.html" }]);

    const app = await readFile(new URL("../../App.jsx", import.meta.url), "utf8");
    assert.match(app, /path="\/student\/assessment"/);
    assert.match(app, /path="\/student\/assessment\/sessions\/:sessionId"/);
    assert.equal(sessionPath(42), "/student/assessment/sessions/42");
    assert.equal(ASSESSMENTS_PATH, "/student/assessment");
  });

  it("guards the start button against double submits and starts through startOrRecover", async () => {
    const { readFile } = await import("node:fs/promises");
    const page = await readFile(new URL("../pages/StudentAssessments.jsx", import.meta.url), "utf8");
    assert.match(page, /startingRef\.current\) return;/);
    assert.match(page, /startOrRecover\(\(\) => startAssessmentSession\(state\.payload\), getAssessments\)/);
  });
});

describe("startOrRecover", () => {
  const calls = () => ({ start: 0, overview: 0 });

  it("returns the created session after one request and never asks for the overview", async () => {
    const log = calls();
    const outcome = await startOrRecover(
      async () => (log.start++, { id: 7, status: "in_progress" }),
      async () => (log.overview++, { active_session: null }),
    );
    assert.deepEqual(outcome, { session: { id: 7, status: "in_progress" } });
    assert.deepEqual(log, { start: 1, overview: 0 });
  });

  it("resumes the session the server committed when the response was lost (500, network drop, no id)", async () => {
    for (const failure of [
      { status: 500, data: { message: "Server Error" } },
      { kind: "network", status: 0 },
      { status: 409, data: { code: "session_starting", message: "يجري إعداد تقييمك الآن.", retryable: true } },
    ]) {
      const log = calls();
      const outcome = await startOrRecover(
        async () => {
          log.start++;
          throw failure;
        },
        async () => (log.overview++, { active_session: { id: 42 } }),
      );
      assert.deepEqual(outcome, { resumedId: 42 });
      assert.deepEqual(log, { start: 1, overview: 1 }, "the start request is never repeated");
    }

    const lost = await startOrRecover(async () => ({}), async () => ({ active_session: { id: 43 } }));
    assert.deepEqual(lost, { resumedId: 43 });
  });

  it("shows a safe retryable error when nothing was saved, even if the overview also fails", async () => {
    const crash = { status: 500, data: { message: "SQLSTATE[42S22]: Column not found", exception: "QueryException" } };
    for (const overview of [async () => ({ active_session: null }), async () => Promise.reject(new Error("offline"))]) {
      const outcome = await startOrRecover(async () => Promise.reject(crash), overview);
      assert.equal(outcome.error.retryable, true);
      assert.equal(outcome.error.message, "حدث خطأ في الخادم. أعد المحاولة بعد قليل.");
      assert.equal(outcome.session, undefined);
      assert.equal(outcome.resumedId, undefined);
    }
  });

  it("does not look for a session after a non-retryable refusal", async () => {
    for (const failure of [
      { status: 503, data: { code: "assessment_unavailable", message: "التقييم غير متاح مؤقتًا بسبب تحديث في الخادم.", retryable: false } },
      { status: 422, data: { code: "specialization_required", message: "اختر مسارك المهني أولًا." } },
    ]) {
      const log = calls();
      const outcome = await startOrRecover(
        async () => {
          throw failure;
        },
        async () => (log.overview++, { active_session: { id: 1 } }),
      );
      assert.equal(outcome.error.retryable, false);
      assert.equal(outcome.error.message, failure.data.message);
      assert.equal(log.overview, 0);
    }
  });
});

describe("questionSteps", () => {
  it("marks answered, current and upcoming questions from the server counts", () => {
    const steps = questionSteps({ status: "in_progress", question_count: 4, answered_count: 2 });
    assert.deepEqual(
      steps.map((step) => step.status),
      ["answered", "answered", "current", "upcoming"],
    );
    assert.deepEqual(
      steps.map((step) => step.position),
      [1, 2, 3, 4],
    );
  });

  it("has no current question outside an active session and tolerates missing data", () => {
    assert.deepEqual(
      questionSteps({ status: "grading", question_count: 2, answered_count: 1 }).map((step) => step.status),
      ["answered", "upcoming"],
    );
    assert.deepEqual(questionSteps(null), []);
  });
});

describe("no multiple choice in the assessment UI", () => {
  it("collects answers in a text field and never renders answer options", async () => {
    const { readFile } = await import("node:fs/promises");
    const page = await readFile(new URL("../pages/StudentAssessmentSession.jsx", import.meta.url), "utf8");
    assert.match(page, /<textarea/);
    assert.doesNotMatch(page, /type="radio"/);
    assert.doesNotMatch(page, /\.options\b|choices/);
  });
});
