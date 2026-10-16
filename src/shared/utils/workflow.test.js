import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyPlan,
  fieldErrors,
  financialPreview,
  paymentTotal,
  planFormFrom,
  planPayload,
  reviewActions,
} from "./workflow.js";

test("admin review actions mirror the server transitions", () => {
  assert.deepEqual(reviewActions("pending_review"), ["approve", "request_changes", "reject"]);
  assert.deepEqual(reviewActions("changes_requested"), ["reject"]);
  assert.deepEqual(reviewActions("published"), ["suspend", "withdraw"]);
  assert.deepEqual(reviewActions("rejected"), []);
});

test("plan payload drops empty rows, trims text and never sends computed financials", () => {
  const form = emptyPlan();
  form.scope = "  نطاق المشروع  ";
  form.deliverables = [{ title: "تطبيق", description: "" }, { title: "  ", description: "x" }];
  form.acceptance_criteria = ["معيار", " "];
  form.execution_budget = "1500";
  form.milestones = [{ title: "نموذج", due_date: "2027-01-20", description: "" }];
  const payload = planPayload(form);
  assert.equal(payload.scope, "نطاق المشروع");
  assert.deepEqual(payload.deliverables, [{ title: "تطبيق", description: null }]);
  assert.deepEqual(payload.acceptance_criteria, ["معيار"]);
  assert.equal(payload.execution_budget, 1500);
  assert.equal(payload.financials, undefined);
  assert.equal(payload.payment_schedule[0].due_date, null);
});

test("saved versions round-trip into the editable form", () => {
  const content = {
    scope: "s", deliverables: [{ title: "d", description: null }], acceptance_criteria: ["a"], execution_budget: 2000, currency: "ILS",
    payment_schedule: [{ label: "p", percentage: 100, amount: 2000, due_date: null }],
    timeline: { start_date: "2027-01-01", end_date: "2027-02-01", duration_days: 31 },
    milestones: [{ title: "m", due_date: "2027-01-15", description: null }], sprints: [],
    financials: { organization_total: 2200 },
  };
  const form = planFormFrom(content);
  assert.equal(form.currency, "ILS");
  assert.equal(form.payment_schedule[0].amount, undefined);
  assert.equal(form.timeline.duration_days, undefined);
  assert.equal(planPayload(form).execution_budget, 2000);
});

test("payment totals and financial preview follow the server formula", () => {
  assert.equal(paymentTotal([{ percentage: 33.33 }, { percentage: "66.67" }]), 100);
  assert.deepEqual(financialPreview(1500, 0.1, 150), { execution: 1500, commission: 150, gathering: 150, total: 1800 });
});

test("server validation keys map to form fields", () => {
  assert.deepEqual(fieldErrors({ "content.milestones.0.due_date": ["خطأ"], payment_schedule: ["المجموع"] }), {
    "milestones.0.due_date": "خطأ",
    payment_schedule: "المجموع",
  });
});
