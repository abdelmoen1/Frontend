import test from "node:test";
import assert from "node:assert/strict";
import { maskEmail, passwordProblems, verificationApiPath } from "./accountEmail.js";

const hash = "a".repeat(40);

test("verification path keeps the signed query in order and rejects incomplete links", () => {
  assert.equal(
    verificationApiPath("12", hash, "?expires=1800000000&signature=abc%2Bdef"),
    `/email/verify/12/${hash}?expires=1800000000&signature=abc%2Bdef`,
  );
  assert.equal(verificationApiPath("12", hash, "?signature=abc"), null);
  assert.equal(verificationApiPath("12", hash, "?expires=1"), null);
  assert.equal(verificationApiPath("x", hash, "?expires=1&signature=s"), null);
  assert.equal(verificationApiPath("12", "not-a-hash", "?expires=1&signature=s"), null);
});

test("emails are masked for display", () => {
  assert.equal(maskEmail("sara@example.com"), "s***@example.com");
  assert.equal(maskEmail("ab@x.io"), "a*@x.io");
  assert.equal(maskEmail("invalid"), "invalid");
});

test("password rules mirror the server", () => {
  assert.deepEqual(passwordProblems("", ""), { password: "كلمة المرور مطلوبة." });
  assert.ok(passwordProblems("abc12", "abc12").password.includes("8"));
  assert.ok(passwordProblems("12345678", "12345678").password.includes("حرف"));
  assert.ok(passwordProblems("abcdefgh", "abcdefgh").password.includes("رقم"));
  assert.deepEqual(passwordProblems("كلمةسر123", "كلمةسر123"), {});
  assert.deepEqual(passwordProblems("Secure123", "Secure124"), { password_confirmation: "تأكيد كلمة المرور غير مطابق." });
});
