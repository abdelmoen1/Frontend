import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAnswer,
  composerPlaceholder,
  formatAnswer,
  parseNumber,
  validateRevision,
} from "./discoveryAnswers.js";

const choice = (type, withOther = true) => ({
  id: "channel",
  type,
  text_ar: "كيف تديرون المواعيد؟",
  options: [
    { label_ar: "دفتر ورقي", value: "paper", allows_custom_text: false },
    { label_ar: "واتساب", value: "whatsapp", allows_custom_text: false },
    ...(withOther ? [{ label_ar: "أخرى", value: "other", allows_custom_text: true }] : []),
  ],
});

describe("buildAnswer — typing and suggestions", () => {
  it("sends free text for text questions and rejects empty input", () => {
    const question = { id: "q", type: "long_text", options: [] };
    assert.deepEqual(buildAnswer(question, null, "  نسجل يدويًا  ").payload, {
      question_id: "q",
      selected_answer: "نسجل يدويًا",
    });
    assert.ok(buildAnswer(question, null, "   ").error);
  });

  it("sends a selected suggestion and keeps typed text as an extra note", () => {
    const result = buildAnswer(choice("single_choice"), "whatsapp", "وأحيانًا بالهاتف");
    assert.deepEqual(result.payload, {
      question_id: "channel",
      selected_answer: "whatsapp",
      custom_answer: "وأحيانًا بالهاتف",
    });
    assert.equal(result.display, "واتساب — وأحيانًا بالهاتف");
  });

  it("turns typed text without a selection into the Other option", () => {
    assert.deepEqual(buildAnswer(choice("multi_choice"), [], "جدول Excel").payload, {
      question_id: "channel",
      selected_answer: ["other"],
      custom_answer: "جدول Excel",
    });
  });

  it("accepts a pure free-text answer when no Other option exists", () => {
    const result = buildAnswer(choice("single_choice", false), null, "مزيج من الطرق");
    assert.deepEqual(result.payload, {
      question_id: "channel",
      selected_answer: null,
      custom_answer: "مزيج من الطرق",
    });
    assert.equal(result.display, "مزيج من الطرق");
  });

  it("requires a description when Other is selected", () => {
    assert.match(buildAnswer(choice("single_choice"), "other", "").error, /أخرى/);
    assert.ok(buildAnswer(choice("multi_choice"), [], "").error);
  });

  it("parses numbers including Arabic digits, otherwise sends free text", () => {
    const question = { id: "n", type: "number", options: [] };
    assert.equal(buildAnswer(question, null, "٣٥").payload.selected_answer, 35);
    assert.deepEqual(buildAnswer(question, null, "يختلف حسب الموسم").payload, {
      question_id: "n",
      selected_answer: null,
      custom_answer: "يختلف حسب الموسم",
    });
    assert.equal(parseNumber("12٫5"), 12.5);
    assert.equal(parseNumber("abc"), null);
  });

  it("supports yes/no and date answers with or without free text", () => {
    assert.equal(buildAnswer({ id: "y", type: "yes_no", options: [] }, false, "").payload.selected_answer, false);
    assert.deepEqual(buildAnswer({ id: "d", type: "date", options: [] }, null, "بعد رمضان").payload, {
      question_id: "d",
      selected_answer: null,
      custom_answer: "بعد رمضان",
    });
    assert.equal(buildAnswer({ id: "d", type: "date", options: [] }, "2027-01-15", "").payload.selected_answer, "2027-01-15");
  });
});

describe("formatAnswer — restoring a saved conversation", () => {
  it("shows labels, yes/no and free text without stray separators", () => {
    const question = choice("multi_choice");
    assert.equal(formatAnswer({ question, selected_answer: ["paper", "whatsapp"], custom_answer: null }), "دفتر ورقي، واتساب");
    assert.equal(formatAnswer({ question: { type: "yes_no" }, selected_answer: true }), "نعم");
    assert.equal(formatAnswer({ question, selected_answer: null, custom_answer: "نص حر" }), "نص حر");
  });
});

describe("revision input", () => {
  it("validates length and trims", () => {
    assert.ok(validateRevision("لا").error);
    assert.equal(validateRevision("  لا نحتاج الحجز الذاتي  ").note, "لا نحتاج الحجز الذاتي");
    assert.match(composerPlaceholder("revision"), /تعديله/);
  });
});
