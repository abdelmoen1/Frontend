import { test } from "node:test";
import assert from "node:assert/strict";

import {
  defaultRoleFor,
  membersPayload,
  rankedCandidates,
  roleIsFull,
  sameSelection,
  selectionFromTeam,
  selectionSummary,
} from "./projectTeam.js";

const candidate = (id, roles, extra = {}) => ({
  application: { id, status: "pending", applied_at: `2026-10-0${id}T10:00:00Z`, preferred_role_id: null, ...extra },
  best_role_id: roles[0]?.role_id ?? null,
  roles,
});

const data = {
  candidates: [
    candidate(1, [{ role_id: 10, score: 90 }, { role_id: 20, score: 40 }]),
    candidate(2, [{ role_id: 20, score: 85 }]),
    candidate(3, [{ role_id: 10, score: 70 }], { status: "rejected" }),
  ],
  // الترتيب لكل دور يأتي من الخادم كما هو
  ranking: { 10: [1, 3], 20: [2, 1] },
};

test("candidates follow the server ranking for the chosen role", () => {
  const forRole = rankedCandidates(data, { roleId: 20 });
  assert.deepEqual(
    forRole.map((item) => [item.candidate.application.id, item.rank, item.score.score]),
    [
      [2, 1, 85],
      [1, 2, 40],
    ],
  );
});

test("rejected applicants are hidden unless requested and sorting by date keeps scores", () => {
  assert.deepEqual(
    rankedCandidates(data, { roleId: 10 }).map((item) => item.candidate.application.id),
    [1],
  );
  assert.equal(rankedCandidates(data, { roleId: 10, showRejected: true }).length, 2);
  const byDate = rankedCandidates(data, { sort: "applied" });
  assert.deepEqual(
    byDate.map((item) => [item.candidate.application.id, item.score.score]),
    [
      [1, 90],
      [2, 85],
    ],
  );
});

test("default role prefers the visible role, then the preferred role, then the best score", () => {
  const multi = candidate(5, [{ role_id: 10 }, { role_id: 20 }], { preferred_role_id: 20 });
  assert.equal(defaultRoleFor(multi, 10), 10);
  assert.equal(defaultRoleFor(multi, "all"), 20);
  assert.equal(defaultRoleFor(candidate(6, [{ role_id: 10 }]), 99), 10);
});

test("selection summary flags roles over headcount and the team size", () => {
  const roles = [
    { id: 10, title: "جوال", headcount: 1 },
    { id: 20, title: "خلفية", headcount: 2 },
  ];
  const ok = selectionSummary({ 1: 10, 2: 20 }, roles);
  assert.equal(ok.valid, true);
  assert.equal(ok.complete, false);
  assert.equal(ok.required, 3);

  const over = selectionSummary({ 1: 10, 3: 10 }, roles);
  assert.equal(over.valid, false);
  assert.match(over.errors[0], /جوال/);
  assert.equal(selectionSummary({}, roles).valid, false);

  assert.equal(roleIsFull({ 1: 10 }, roles, 10, 3), true);
  assert.equal(roleIsFull({ 1: 10 }, roles, 10, 1), false);
  assert.equal(roleIsFull({ 1: 20 }, roles, 20, 3), false);
});

test("selection round-trips with the saved team and the API payload", () => {
  const team = { members: [{ application_id: 1, role: { id: 10 } }, { application_id: 2, role: { id: 20 } }] };
  const selection = selectionFromTeam(team);
  assert.equal(sameSelection(selection, { 2: 20, 1: 10 }), true);
  assert.equal(sameSelection(selection, { 1: 10 }), false);
  assert.deepEqual(membersPayload(selection), [
    { application_id: 1, role_id: 10 },
    { application_id: 2, role_id: 20 },
  ]);
});
