import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ApiError,
  AUTH_MESSAGES,
  normalizeAuthError,
  oauthErrorMessage,
  requestJson,
  translateFieldMessage,
} from "./apiErrors.js";

const fakeResponse = (status, body, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => headers[name] ?? null },
  text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
});

describe("requestJson", () => {
  it("returns parsed JSON for successful responses", async () => {
    const data = await requestJson("/x", {}, async () => fakeResponse(200, { ok: 1 }));
    assert.deepEqual(data, { ok: 1 });
  });

  it("classifies a rejected fetch as a network error", async () => {
    await assert.rejects(
      requestJson("/x", {}, async () => {
        throw new TypeError("Failed to fetch");
      }),
      (error) => error instanceof ApiError && error.kind === "network" && error.status === 0,
    );
  });

  it("keeps status, body and Retry-After for HTTP errors", async () => {
    await assert.rejects(
      requestJson("/x", {}, async () => fakeResponse(429, { message: "Too Many" }, { "Retry-After": "42" })),
      (error) => error.kind === "http" && error.status === 429 && error.retryAfter === 42,
    );
  });

  it("treats an HTML success page as an invalid response", async () => {
    await assert.rejects(
      requestJson("/x", {}, async () => fakeResponse(200, "<html>proxy</html>")),
      (error) => error.kind === "invalid_response",
    );
  });

  it("does not crash on non-JSON error bodies (e.g. 500 HTML)", async () => {
    await assert.rejects(
      requestJson("/x", {}, async () => fakeResponse(500, "<html>Whoops</html>")),
      (error) => error.kind === "http" && error.status === 500 && error.data === null,
    );
  });
});

const httpError = (status, data = null, retryAfter = null) =>
  new ApiError({ kind: "http", status, data, retryAfter });

describe("normalizeAuthError — login", () => {
  it("maps the backend credentials error to a generic general message, not the email field", () => {
    for (const message of [
      "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      "بيانات الدخول غير صحيحة.",
      "These credentials do not match our records.",
    ]) {
      const result = normalizeAuthError(httpError(422, { errors: { email: [message] } }), {
        operation: "login",
      });
      assert.equal(result.general, AUTH_MESSAGES.invalidCredentials);
      assert.deepEqual(result.fields, {});
    }
  });

  it("keeps real field validation errors inline", () => {
    const result = normalizeAuthError(
      httpError(422, { errors: { email: ["صيغة البريد الإلكتروني غير صحيحة."] } }),
      { operation: "login" },
    );
    assert.equal(result.fields.email, "صيغة البريد الإلكتروني غير صحيحة.");
    assert.equal(result.general, "");
  });

  it("uses the operation to interpret 401", () => {
    assert.equal(normalizeAuthError(httpError(401), { operation: "login" }).general, AUTH_MESSAGES.invalidCredentials);
    assert.equal(normalizeAuthError(httpError(401), { operation: "register" }).general, AUTH_MESSAGES.unauthenticated);
  });

  it("reports rate limiting with the wait time when available", () => {
    assert.match(normalizeAuthError(httpError(429, null, 30)).general, /30 ثانية/);
    assert.match(normalizeAuthError(httpError(429)).general, /محاولات كثيرة/);
  });
});

describe("normalizeAuthError — register", () => {
  it("maps server fields to form fields and unmapped ones to the general message", () => {
    const result = normalizeAuthError(
      httpError(422, {
        message: "The given data was invalid.",
        errors: {
          name: ["الاسم مطلوب."],
          email: ["The email has already been taken."],
          password: ["The password field must contain at least one number."],
          role: ["The selected role is invalid."],
        },
      }),
      { operation: "register", fieldMap: { name: "orgName", role: null } },
    );

    assert.equal(result.fields.orgName, "الاسم مطلوب.");
    assert.equal(result.fields.email, "هذا البريد الإلكتروني مسجّل مسبقًا.");
    assert.equal(result.fields.password, "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل.");
    assert.equal(result.fields.name, undefined);
    assert.equal(result.general, "قيمة هذا الحقل غير صالحة.");
  });

  it("falls back to a generic validation message when 422 has no field errors", () => {
    const result = normalizeAuthError(httpError(422, { message: "Invalid." }), { operation: "register" });
    assert.equal(result.general, AUTH_MESSAGES.validation);
  });
});

describe("normalizeAuthError — failures never leak server details", () => {
  it("maps statuses to safe Arabic messages", () => {
    const leaky = { message: "SQLSTATE[HY000] connection refused at /var/www/app.php", trace: [] };
    assert.equal(normalizeAuthError(httpError(500, leaky)).general, AUTH_MESSAGES.unexpected);
    assert.equal(normalizeAuthError(httpError(503, leaky)).general, AUTH_MESSAGES.unavailable);
    assert.equal(normalizeAuthError(httpError(403, leaky)).general, AUTH_MESSAGES.forbidden);
    assert.equal(normalizeAuthError(httpError(419, leaky)).general, AUTH_MESSAGES.sessionExpired);
    assert.equal(normalizeAuthError(httpError(409, leaky)).general, AUTH_MESSAGES.conflict);
    assert.equal(normalizeAuthError(httpError(418, leaky)).general, AUTH_MESSAGES.unexpected);
  });

  it("handles network, invalid responses and unknown errors", () => {
    assert.equal(normalizeAuthError(new ApiError({ kind: "network" })).general, AUTH_MESSAGES.network);
    assert.equal(normalizeAuthError(new ApiError({ kind: "invalid_response" })).general, AUTH_MESSAGES.unexpected);
    assert.equal(normalizeAuthError(new Error("boom")).general, AUTH_MESSAGES.unexpected);
    assert.equal(normalizeAuthError(undefined).general, AUTH_MESSAGES.unexpected);
  });
});

describe("translateFieldMessage", () => {
  it("keeps Arabic messages and never returns raw English", () => {
    assert.equal(translateFieldMessage("هذا البريد الإلكتروني مسجّل مسبقًا."), "هذا البريد الإلكتروني مسجّل مسبقًا.");
    assert.equal(translateFieldMessage("Something internal happened"), "قيمة هذا الحقل غير صالحة.");
  });
});

describe("oauthErrorMessage", () => {
  it("only shows whitelisted messages for OAuth error codes", () => {
    assert.equal(oauthErrorMessage(""), "");
    assert.match(oauthErrorMessage("cancelled"), /إلغاء/);
    assert.equal(oauthErrorMessage("<script>"), oauthErrorMessage("provider_error"));
  });
});
