import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ApiError } from "../../shared/utils/apiErrors.js";
import {
  MAX_SKILLS,
  filterSkills,
  findSpecialization,
  highlightParts,
  joinPhone,
  keepSkillsWithin,
  serverFieldErrors,
  splitPhone,
  stepOfErrors,
  validateStep,
} from "./onboarding.js";

const skills = [
  { id: 1, name: "React" },
  { id: 2, name: "Node.js" },
  { id: 3, name: "Next.js" },
  { id: 4, name: "C#" },
  { id: 5, name: "Redux" },
];

describe("phone", () => {
  it("splits the saved number and joins a normalized one", () => {
    assert.deepEqual(splitPhone("+970599123456", ["+970", "+972"]), { phone_code: "+970", phone: "599123456" });
    assert.deepEqual(splitPhone(null, ["+970"]), { phone_code: "+970", phone: "" });
    assert.equal(joinPhone("+970", "0599 123-456"), "+970599123456");
    assert.equal(joinPhone("+970", "  "), null);
  });
});

describe("validating each step", () => {
  it("reports every problem of the step at once", () => {
    assert.deepEqual(Object.keys(validateStep(0, { name: " ", phone: "12" })), ["name", "phone"]);
    assert.deepEqual(validateStep(0, { name: "أحمد", phone: "" }), {});
    assert.deepEqual(validateStep(0, { name: "أحمد", phone: "0599 123 456" }), {});
    assert.deepEqual(Object.keys(validateStep(1, {})), ["university", "graduation_year"]);
  });

  it("requires a specialization before skills, and a bounded list of skills", () => {
    assert.deepEqual(Object.keys(validateStep(2, { skills: [] })), ["professional_specialization"]);
    assert.match(validateStep(2, { professional_specialization: "backend_development", skills: [] }).skills, /مهارة واحدة/);
    const many = Array.from({ length: MAX_SKILLS + 1 }, (_, id) => ({ id, name: `S${id}` }));
    assert.match(validateStep(2, { professional_specialization: "x", skills: many }).skills, /كحد أقصى/);
  });

  it("sends the student back to the step that holds the first error", () => {
    assert.equal(stepOfErrors({ skills: "x", university: "y" }), 1);
    assert.equal(stepOfErrors({ skills: "x" }), 2);
    assert.equal(stepOfErrors({}), -1);
  });

  it("maps server validation errors to form fields", () => {
    const error = new ApiError({
      kind: "http",
      status: 422,
      data: { errors: { "skill_ids.0": ["اختر مهاراتك من مهارات تخصصك فقط."], name: ["The name field is required."] } },
    });
    assert.deepEqual(serverFieldErrors(error), { skills: "اختر مهاراتك من مهارات تخصصك فقط.", name: "هذا الحقل مطلوب." });
    assert.deepEqual(serverFieldErrors(new ApiError({ kind: "network" })), {});
  });
});

describe("specialization skills", () => {
  it("keeps only skills that belong to the newly chosen specialization", () => {
    const catalog = [{ key: "frontend_development", skills: skills.slice(0, 3) }];
    const frontend = findSpecialization(catalog, "frontend_development");
    assert.deepEqual(keepSkillsWithin([skills[0], skills[3]], frontend.skills), [skills[0]]);
    assert.equal(findSpecialization(catalog, "missing"), null);
  });

  it("autocompletes by prefix first, ignores punctuation and hides chosen skills", () => {
    assert.deepEqual(filterSkills(skills, [], "re").map((skill) => skill.name), ["React", "Redux"]);
    assert.deepEqual(filterSkills(skills, [], "nodejs").map((skill) => skill.name), ["Node.js"]);
    assert.deepEqual(filterSkills(skills, [], ".js").map((skill) => skill.name), ["Node.js", "Next.js"]);
    assert.deepEqual(filterSkills(skills, [], "c#").map((skill) => skill.name), ["C#"]);
    assert.deepEqual(filterSkills(skills, [skills[0]], "").map((skill) => skill.id), [2, 3, 4, 5]);
    assert.deepEqual(filterSkills(skills, [], "python"), []);
  });

  it("highlights the typed text inside a suggestion", () => {
    assert.deepEqual(highlightParts("Node.js", "de"), [
      { text: "No", match: false },
      { text: "de", match: true },
      { text: ".js", match: false },
    ]);
    assert.deepEqual(highlightParts("React", ""), [{ text: "React", match: false }]);
  });
});
