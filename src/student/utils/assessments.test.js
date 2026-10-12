import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ASSESSMENTS_PATH,
  answerError,
  assessmentError,
  formatClock,
  groupSkills,
  insertIndent,
  progressView,
  remainingSeconds,
  resultsView,
  sessionPath,
  skillView,
  specializationNotice,
  toggleSkill,
} from "./assessments.js";

const skill = (overrides = {}) => ({
  id: 1,
  name: "PHP",
  selected: true,
  practical: false,
  status: "not_assessed",
  verified: false,
  score: null,
  next_attempt_at: null,
  can_assess: true,
  ...overrides,
});

describe("choosing what to assess", () => {
  it("shows the server's status for each skill and whether it can be chosen", () => {
    assert.equal(skillView(skill()).selectable, true);
    assert.equal(skillView(skill({ status: "passed", verified: true, can_assess: false })).selectable, false);
    assert.match(skillView(skill({ status: "failed", can_assess: false, next_attempt_at: "2026-10-13T10:00:00+00:00" })).note, /إعادة تقييمها بعد/);
    assert.match(skillView(skill({ name: "Figma", practical: true, status: "passed", can_assess: false })).note, /تحققًا من إدارة المنصة/);
    assert.equal(skillView(skill({ status: "weird" })).status, "not_assessed");
  });

  it("puts the specialization skills first using real ids", () => {
    const groups = groupSkills(
      [skill({ id: 1, name: "PHP" }), skill({ id: 2, name: "Laravel" }), skill({ id: 3, name: "Figma" })],
      { skills: [{ id: 2, name: "Laravel" }, { id: 1, name: "PHP" }, { id: 99, name: "Missing" }] },
    );
    assert.deepEqual(groups.suggested.map((item) => item.name), ["Laravel", "PHP"]);
    assert.deepEqual(groups.others.map((item) => item.name), ["Figma"]);
  });

  it("limits the number of skills per session", () => {
    assert.deepEqual(toggleSkill([1, 2], 3, 3), [1, 2, 3]);
    assert.deepEqual(toggleSkill([1, 2, 3], 4, 3), [1, 2, 3]);
    assert.deepEqual(toggleSkill([1, 2, 3], 2, 3), [1, 3]);
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
    assert.deepEqual(progressView({ question_count: 4, answered_count: 1 }), { answered: 1, total: 4, current: 2, percent: 25 });
    assert.deepEqual(progressView({ question_count: 4, answered_count: 4 }).current, 4);
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
  it("shows per-skill outcomes computed by the server", () => {
    const [php, laravel, figma] = resultsView({
      results: [
        {
          skill: { name: "PHP" },
          status: "passed",
          score: 90,
          reason: "passed",
          counts_for_matching: true,
          questions: [{ position: 1, prompt: "س", answered: true, awarded_points: 9, max_points: 10, feedback: "جيد", missing_concepts: [] }],
        },
        { skill: { name: "Laravel" }, status: "failed", score: 50, reason: "below_threshold", next_attempt_at: "2026-10-13T10:00:00+00:00", questions: [] },
        { skill: { name: "Figma" }, status: "passed", score: 80, needs_human_verification: true, counts_for_matching: false, questions: [] },
      ],
    });
    assert.equal(php.countsForMatching, true);
    assert.equal(php.questions[0].points, "9 من 10");
    assert.match(laravel.note, /أقل من نسبة النجاح/);
    assert.match(laravel.note, /إعادة التقييم بعد/);
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
    assert.match(
      assessmentError({ status: 409, data: { code: "retake_not_available", message: "x", skills: [{ skill: "Laravel", next_attempt_at: "2026-10-13T10:00:00+00:00" }] } }).message,
      /Laravel/,
    );
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
