import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ASSESSMENTS_PATH,
  LEVELS,
  answerError,
  assessmentError,
  assessmentLink,
  attemptSummary,
  formatClock,
  groupSkills,
  insertIndent,
  levelNote,
  parseAssessmentQuery,
  progressView,
  questionMeta,
  remainingSeconds,
  resultsView,
  sessionPath,
  skillView,
  specializationNotice,
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
      ],
    );
    // إعادة مهارة ناجحة مسموحة (بمستوى أعلى)
    assert.equal(view.selectable, true);
    assert.match(levelNote(view, "beginner"), /بعد/);
    assert.match(levelNote(skillView(skill({ verified_level: "intermediate" })), "beginner"), /لن تخفض/);
    assert.equal(levelNote(view, "advanced"), "");
    assert.match(skillView(skill({ name: "Figma", practical: true, status: "passed" })).note, /تحققًا من إدارة المنصة/);
    assert.equal(skillView(skill({ status: "weird", verified_level: "expert" })).verifiedLevel, null);
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
    assert.deepEqual(parseAssessmentQuery("?skill=abc&level=expert"), { skillId: null, level: null });
    assert.equal(assessmentLink(12, "advanced"), "/student/assessment?skill=12&level=advanced");
    assert.equal(assessmentLink(undefined, undefined), "/student/assessment");
    assert.deepEqual(
      attemptSummary({ questions: { practical: 7, written: 3 }, time_limit_minutes: { beginner: 35, intermediate: 45 } }, "intermediate"),
      { practical: 7, written: 3, total: 10, minutes: 45 },
    );
    assert.deepEqual(LEVELS.map((level) => level.label), ["مبتدئ", "متوسط", "متقدم"]);
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
      data: { code: "retake_not_available", message: "x", skill: "Laravel", level: "intermediate", next_attempt_at: "2026-10-13T10:00:00+00:00" },
    });
    assert.match(retake.message, /Laravel بمستوى متوسط بعد/);
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
