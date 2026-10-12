import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyRecommendedLevels,
  keyRequirements,
  levelRequirements,
  levelsPayload,
  matchingSummary,
  reviewState,
  staffingRoles,
  stripListNumbering,
} from "./proposalReview.js";

const staffing = {
  matchable_roles: 1,
  unmapped_skills: ["Kotlin"],
  roles: [
    {
      category: "mobile_developer",
      category_label: "مطوّر تطبيقات جوال",
      title: "مطوّر تطبيق الجوال",
      responsibilities: "بناء التطبيق",
      rationale: "عرض المسارات للركاب",
      headcount: 1,
      mandatory_skills: [{ id: 1, name: "Flutter", recommended_level: "intermediate" }, { id: null, name: "Kotlin", recommended_level: null }, { id: 2, name: "Dart", recommended_level: null }],
      desirable_skills: [{ id: 3, name: "Git" }],
      matchable: true,
    },
  ],
};

const record = (overrides = {}) => ({
  status: "proposal_ready",
  proposal: { project_overview: { project_name: "x" } },
  staffing,
  publication: null,
  ...overrides,
});

describe("reviewState — approve and edit actions", () => {
  it("offers approval for a ready draft with matchable roles", () => {
    const state = reviewState(record());
    assert.equal(state.mode, "draft");
    assert.equal(state.canApprove, true);
    assert.equal(state.canEdit, true);
  });

  it("blocks approval when roles are missing or not matchable", () => {
    assert.match(reviewState(record({ staffing: { roles: [], matchable_roles: 0 } })).blockedReason, /أدوار الفريق/);
    const unmatched = reviewState(record({ staffing: { ...staffing, matchable_roles: 0 } }));
    assert.equal(unmatched.canApprove, false);
    assert.match(unmatched.blockedReason, /مهارة إلزامية/);
  });

  it("shows the published state and allows editing after publication", () => {
    const state = reviewState(
      record({ status: "converted_to_opportunity", publication: { status: "published", version: 1, has_pending_changes: false } }),
    );
    assert.equal(state.mode, "published");
    assert.equal(state.canApprove, false);
    assert.equal(state.canEdit, true);
  });

  it("asks to reconfirm a revised draft while the approved version stays published", () => {
    const state = reviewState(
      record({ status: "proposal_ready", publication: { status: "published", version: 1, has_pending_changes: true } }),
    );
    assert.equal(state.mode, "pending_changes");
    assert.equal(state.canApprove, true);
  });

  it("hides approval while the conversation is still processing a change", () => {
    for (const status of ["revision_requested", "intake_in_progress", "analyzing"]) {
      assert.equal(reviewState(record({ status })).canApprove, false, status);
    }
    assert.equal(reviewState(record({ status: "rejected" })).canEdit, false);
  });
});

describe("proposal presentation helpers", () => {
  it("flags skills that are not in the platform list", () => {
    const [role] = staffingRoles(staffing);
    assert.deepEqual(role.mandatory, [
      { name: "Flutter", matchable: true },
      { name: "Kotlin", matchable: false },
      { name: "Dart", matchable: true },
    ]);
    assert.equal(role.categoryLabel, "مطوّر تطبيقات جوال");
    assert.deepEqual(role.untested, []);
    assert.deepEqual(staffingRoles(null), []);
  });

  it("flags mandatory practical skills that need human verification", () => {
    const [role] = staffingRoles({
      roles: [
        {
          ...staffing.roles[0],
          mandatory_skills: [
            { id: 1, name: "Flutter", assessable: true },
            { id: 2, name: "Figma", assessable: false },
            { id: null, name: "Kotlin", assessable: false },
          ],
        },
      ],
    });
    assert.deepEqual(role.untested, ["Figma"]);
  });

  it("labels the basis of each key requirement and drops unknown bases", () => {
    const items = keyRequirements({
      key_requirements: [
        { requirement: "1. عرض الأجرة", basis: "confirmed", note: "" },
        { requirement: "خفض التكلفة 50%", basis: "guaranteed", note: "" },
        { requirement: "تطبيق جوال", basis: "recommendation", note: "بانتظار التأكيد" },
      ],
    });
    assert.deepEqual(
      items.map((item) => [item.requirement, item.basisLabel]),
      [
        ["عرض الأجرة", "مؤكد من المؤسسة"],
        ["تطبيق جوال", "توصية بانتظار تأكيدك"],
      ],
    );
  });

  it("removes manual numbering from list items", () => {
    assert.equal(stripListNumbering("1. إدارة المسارات"), "إدارة المسارات");
    assert.equal(stripListNumbering("٢- تحديث الأسعار"), "تحديث الأسعار");
    assert.equal(stripListNumbering("• بند"), "بند");
    assert.equal(stripListNumbering("2025 سنة الإطلاق"), "2025 سنة الإطلاق");
  });

  it("summarizes eligible students per role without identities", () => {
    const summary = matchingSummary({
      roles: [
        { title: "Backend", eligible_students: 2, mandatory_skills: ["Laravel"] },
        { title: "Mobile", eligible_students: 0, mandatory_skills: ["Flutter"] },
      ],
    });
    assert.equal(summary.hasEligible, true);
    assert.deepEqual(summary.roles.map((role) => role.eligible), [2, 0]);
    assert.equal(matchingSummary({ roles: [] }).hasEligible, false);
  });
});

describe("confirming skill levels before approval", () => {
  it("lists every platform-mapped mandatory skill with the AI recommendation kept separate", () => {
    const requirements = levelRequirements(staffing);
    assert.deepEqual(
      requirements.map((item) => [item.key, item.name, item.recommended]),
      [
        ["0:1", "Flutter", "intermediate"],
        ["0:2", "Dart", null],
      ],
    );
    // لا شيء مختار تلقائيًا: لا اعتماد قبل أن تحدد المؤسسة كل مستوى
    assert.equal(levelsPayload(requirements, {}), null);
    const withRecommendations = applyRecommendedLevels(requirements, { "0:2": "beginner" });
    assert.deepEqual(withRecommendations, { "0:1": "intermediate", "0:2": "beginner" });
    assert.deepEqual(applyRecommendedLevels(requirements, { "0:1": "advanced" })["0:1"], "advanced");
    assert.deepEqual(levelsPayload(requirements, withRecommendations), [
      { role: 0, skill_id: 1, level: "intermediate" },
      { role: 0, skill_id: 2, level: "beginner" },
    ]);
    assert.equal(levelsPayload(requirements, { "0:1": "expert", "0:2": "beginner" }), null);
  });

  it("asks to confirm levels for a version published before levels existed", () => {
    const state = reviewState({
      proposal: { project_overview: {} },
      status: "converted_to_opportunity",
      staffing,
      publication: { status: "published", version: 1, has_pending_changes: false, levels_confirmed: false },
    });
    assert.equal(state.mode, "needs_levels");
    assert.equal(state.canApprove, true);
  });

  it("shows the confirmed level next to each mandatory skill in the publication summary", () => {
    const summary = matchingSummary({
      roles: [
        {
          title: "Backend",
          eligible_students: 1,
          mandatory_skills: ["Laravel", "REST API"],
          mandatory_requirements: [
            { name: "Laravel", min_level: "intermediate" },
            { name: "REST API", min_level: null },
          ],
        },
      ],
    });
    assert.deepEqual(summary.roles[0].requirements, ["Laravel (متوسط)", "REST API (أي مستوى مثبت)"]);
  });
});
