import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { emptyOpportunitiesMessage, opportunityCard, opportunityLoadError } from "./opportunities.js";

const apiItem = {
  id: 7,
  title: "نظام المواصلات",
  summary: "عرض المسارات والأجرة.",
  estimated_duration: "8-10 أسابيع",
  organization: { name: "بلدية", industry: "نقل" },
  match: { roles: ["مطوّر الخدمات الخلفية"], verified_skills: ["Laravel", "REST API"] },
  roles: [
    { id: 1, title: "مطوّر تطبيق الجوال", category_label: "مطوّر تطبيقات جوال", mandatory_skills: ["Flutter"], desirable_skills: [], matched: false },
    { id: 2, title: "مطوّر الخدمات الخلفية", category_label: "مطوّر الخدمات الخلفية (Backend)", mandatory_skills: ["Laravel", "REST API"], desirable_skills: ["MySQL"], matched: true },
  ],
};

describe("opportunityCard", () => {
  it("explains why the project is shown using only verified data", () => {
    const card = opportunityCard(apiItem);
    assert.deepEqual(card.matchedRoles, ["مطوّر الخدمات الخلفية"]);
    assert.deepEqual(card.verifiedSkills, ["Laravel", "REST API"]);
    assert.deepEqual(card.roles.map((role) => role.matched), [false, true]);
    assert.deepEqual(card.roles[1].desirable, ["MySQL"]);
    assert.equal(card.organization, "بلدية");
  });

  it("tolerates missing optional fields", () => {
    const card = opportunityCard({ id: 1, title: "x" });
    assert.deepEqual(card.roles, []);
    assert.deepEqual(card.matchedRoles, []);
    assert.equal(card.duration, "");
  });
});

describe("empty and error states", () => {
  it("explains verification without blaming the student", () => {
    const none = emptyOpportunitiesMessage([], { status: "compatible" });
    assert.match(none.body, /تقييم/);
    assert.equal(none.action, "assessment");
    const some = emptyOpportunitiesMessage(["Laravel"], { status: "compatible" });
    assert.match(some.body, /Laravel/);
    assert.doesNotMatch(some.body, /خطأ/);
  });

  it("asks for a professional specialization before anything else", () => {
    const message = emptyOpportunitiesMessage(["Flutter", "Dart"], { status: "missing" });
    assert.match(message.title, /مسارك المهني/);
    assert.equal(message.action, "specialization");
    assert.equal(emptyOpportunitiesMessage([], { status: "unrecognized" }).action, "specialization");
  });

  it("lists the missing mandatory skills of roles the student does not match", () => {
    const card = opportunityCard({
      ...apiItem,
      roles: [
        { ...apiItem.roles[0], missing_skills: ["Flutter"], specialization_compatible: true },
        { ...apiItem.roles[1], missing_skills: [], specialization_compatible: true },
      ],
    });
    assert.deepEqual(card.roles[0].missing, ["Flutter"]);
    assert.equal(card.roles[0].specializationCompatible, true);
    assert.deepEqual(card.roles[1].missing, []);
    assert.equal(opportunityCard({ id: 1, roles: [{ id: 2, title: "دور", specialization_compatible: false }] }).roles[0].specializationCompatible, false);
  });

  it("treats a stale or unauthorized opportunity as unavailable", () => {
    assert.equal(opportunityLoadError({ status: 404 }).retryable, false);
    assert.match(opportunityLoadError({ status: 404 }).message, /غير متاحة/);
    assert.equal(opportunityLoadError({ status: 401 }).login, true);
    assert.equal(opportunityLoadError({ status: 403, data: { message: "أكمل ملفك الشخصي أولًا لعرض فرص المشاريع." } }).message, "أكمل ملفك الشخصي أولًا لعرض فرص المشاريع.");
    assert.equal(opportunityLoadError({ status: 403, data: { message: "Forbidden" } }).message, "لا يمكنك عرض فرص المشاريع حاليًا.");
    assert.equal(opportunityLoadError({ status: 0 }).retryable, true);
  });
});
