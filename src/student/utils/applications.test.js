import { test } from "node:test";
import assert from "node:assert/strict";

import { applicationErrorMessage, applicationView, applyPanelState } from "./applications.js";

const role = (id, matched) => ({ id, title: `دور ${id}`, matched, category_label: "مطور" });

test("an existing application always wins over eligibility and closure", () => {
  const state = applyPanelState({
    accepting_applications: false,
    application: { id: 4, status: "pending" },
    roles: [role(1, true)],
  });
  assert.equal(state.kind, "applied");
  assert.equal(state.application.label, "قيد الانتظار");
  assert.equal(state.application.canWithdraw, true);
});

test("closed, ineligible and eligible states come from server fields only", () => {
  assert.equal(applyPanelState({ accepting_applications: false, roles: [role(1, true)] }).kind, "closed");
  assert.equal(applyPanelState({ accepting_applications: true, roles: [role(1, false)] }).kind, "ineligible");

  const eligible = applyPanelState({ accepting_applications: true, roles: [role(1, false), role(2, true), role(3, true)] });
  assert.equal(eligible.kind, "eligible");
  assert.deepEqual(
    eligible.eligibleRoles.map((item) => item.id),
    [2, 3],
  );
  assert.equal(eligible.defaultRoleId, 2);
});

test("withdrawal is hidden for final statuses and confirmed teams", () => {
  assert.equal(applicationView({ id: 1, status: "withdrawn" }).canWithdraw, false);
  assert.equal(applicationView({ id: 1, status: "rejected" }).canWithdraw, false);
  assert.equal(applicationView({ id: 1, status: "accepted", team: { status: "forming" } }).canWithdraw, true);
  assert.equal(applicationView({ id: 1, status: "accepted", team: { status: "ready" } }).canWithdraw, false);
  assert.equal(applicationView({ id: 1, status: "unknown" }), null);
});

test("error messages prefer the Arabic server message", () => {
  assert.equal(applicationErrorMessage({ status: 409, data: { message: "سبق أن قدّمت على هذه الفرصة." } }), "سبق أن قدّمت على هذه الفرصة.");
  assert.match(applicationErrorMessage({ status: 409, data: { message: "Conflict" } }), /حالة الطلب/);
  assert.match(applicationErrorMessage({ status: 429 }), /دقيقة/);
  assert.match(applicationErrorMessage(new Error("offline")), /اتصالك/);
});
