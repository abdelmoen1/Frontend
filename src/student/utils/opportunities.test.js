import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { actionLink, eligibilityView, emptyOpportunitiesMessage, opportunityCard, opportunityLoadError } from "./opportunities.js";

const apiItem = {
  id: 7,
  title: "نظام المواصلات",
  summary: "عرض المسارات والأجرة.",
  estimated_duration: "8-10 أسابيع",
  organization: { name: "بلدية", industry: "نقل" },
  eligibility: {
    status: "level_insufficient",
    message: "مستواك المثبت في Laravel هو مبتدئ، بينما يتطلب هذا الدور مستوى متوسطًا.",
    role_id: 2,
    role_title: "مطوّر الخدمات الخلفية",
    action: { type: "assessment", skill_id: 12, level: "intermediate", label: "ابدأ اختبار Laravel (متوسط)" },
    eligible_roles: [],
  },
  match: { roles: [], verified_skills: [] },
  roles: [
    {
      id: 1,
      title: "مطوّر تطبيق الجوال",
      category_label: "مطوّر تطبيقات جوال",
      mandatory_skills: ["Flutter"],
      desirable_skills: [],
      matched: false,
      requirements: [{ id: 3, name: "Flutter", min_level: "beginner", verified_level: null, met: false }],
      eligibility: {
        status: "specialization_mismatch",
        message: "هذا الدور (مطوّر تطبيقات جوال) لا يتوافق مع مسارك المهني الحالي (تطوير الخدمات الخلفية (Backend)).",
        reasons: [{ code: "specialization_mismatch", message: "هذا الدور لا يتوافق مع مسارك.", action: null }],
        action: null,
      },
    },
    {
      id: 2,
      title: "مطوّر الخدمات الخلفية",
      category_label: "مطوّر الخدمات الخلفية (Backend)",
      mandatory_skills: ["Laravel", "REST API"],
      desirable_skills: ["MySQL"],
      matched: false,
      requirements: [
        { id: 12, name: "Laravel", min_level: "intermediate", verified_level: "beginner", met: false },
        { id: 13, name: "REST API", min_level: null, verified_level: "beginner", met: true },
      ],
      eligibility: {
        status: "level_insufficient",
        message: "مستواك المثبت في Laravel هو مبتدئ، بينما يتطلب هذا الدور مستوى متوسطًا.",
        reasons: [
          {
            code: "level_insufficient",
            message: "مستواك المثبت في Laravel هو مبتدئ، بينما يتطلب هذا الدور مستوى متوسطًا.",
            action: { type: "assessment", skill_id: 12, level: "intermediate", label: "ابدأ اختبار Laravel (متوسط)" },
          },
        ],
        action: { type: "assessment", skill_id: 12, level: "intermediate", label: "ابدأ اختبار Laravel (متوسط)" },
      },
    },
  ],
};

describe("opportunityCard", () => {
  it("shows the server's eligibility, its reason and the next step", () => {
    const card = opportunityCard(apiItem);
    assert.equal(card.eligibility.status, "level_insufficient");
    assert.equal(card.eligibility.eligible, false);
    assert.match(card.eligibility.message, /مستواك المثبت في Laravel هو مبتدئ/);
    assert.equal(card.closestRole, "مطوّر الخدمات الخلفية");
    assert.deepEqual(card.eligibility.action, { to: "/student/assessment?skill=12&level=intermediate", label: "ابدأ اختبار Laravel (متوسط)" });
    assert.equal(card.organization, "بلدية");
  });

  it("lists each role's requirement levels and reasons", () => {
    const [mobile, backend] = opportunityCard(apiItem).roles;
    assert.equal(mobile.eligibility.label, "لا يتوافق مع مسارك");
    assert.equal(mobile.eligibility.action, null);
    assert.deepEqual(backend.requirements, [
      { name: "Laravel", requiredLabel: "متوسط", verifiedLabel: "مبتدئ", met: false },
      // نسخة قديمة بلا مستوى مؤكد
      { name: "REST API", requiredLabel: "أي مستوى مثبت", verifiedLabel: "مبتدئ", met: true },
    ]);
    assert.equal(backend.reasons[0].action.to, "/student/assessment?skill=12&level=intermediate");
    assert.deepEqual(backend.desirable, ["MySQL"]);
  });

  it("tolerates missing optional fields without claiming eligibility", () => {
    const card = opportunityCard({ id: 1, title: "x" });
    assert.deepEqual(card.roles, []);
    assert.equal(card.eligibility.eligible, false);
    assert.equal(card.duration, "");
  });
});

describe("eligibility helpers", () => {
  it("maps stable status codes and ignores unknown or non-Arabic text", () => {
    assert.equal(eligibilityView({ status: "eligible", message: "أنت تستوفي متطلبات المهارات والمستوى لهذا الدور." }).eligible, true);
    assert.equal(eligibilityView({ status: "assessment_required" }).tone, "info");
    assert.equal(eligibilityView({ status: "made_up" }).status, "requirements_unavailable");
    assert.equal(eligibilityView({ status: "eligible", message: "<b>hi</b>" }).message, "");
  });

  it("builds safe navigation actions", () => {
    assert.deepEqual(actionLink({ type: "profile", label: "تحديد المسار المهني" }), { to: "/student/profile", label: "تحديد المسار المهني" });
    assert.equal(actionLink({ type: "assessment", skill_id: "1; drop", level: "guru" }).to, "/student/assessment");
    assert.equal(actionLink({ type: "javascript:alert(1)" }), null);
    assert.equal(actionLink(null), null);
  });
});

describe("empty and error states", () => {
  it("is empty only when nothing is published", () => {
    const none = emptyOpportunitiesMessage({ status: "compatible" });
    assert.match(none.title, /لا توجد فرص منشورة/);
    assert.equal(none.action, "assessment");
    const missing = emptyOpportunitiesMessage({ status: "missing" });
    assert.match(missing.body, /مسارك المهني/);
    assert.equal(missing.action, "specialization");
  });

  it("treats an unpublished opportunity as unavailable", () => {
    assert.equal(opportunityLoadError({ status: 404 }).retryable, false);
    assert.match(opportunityLoadError({ status: 404 }).message, /غير متاحة/);
    assert.equal(opportunityLoadError({ status: 401 }).login, true);
    assert.equal(opportunityLoadError({ status: 403, data: { message: "أكمل ملفك الشخصي أولًا لعرض فرص المشاريع." } }).message, "أكمل ملفك الشخصي أولًا لعرض فرص المشاريع.");
    assert.equal(opportunityLoadError({ status: 403, data: { message: "Forbidden" } }).message, "لا يمكنك عرض فرص المشاريع حاليًا.");
    assert.equal(opportunityLoadError({ status: 0 }).retryable, true);
  });
});
