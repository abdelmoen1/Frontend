import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AUTH_MESSAGES, ApiError } from "../../shared/utils/apiErrors.js";
import { DISCOVERY_FAILURE_MESSAGES, describeDiscoveryFailure } from "./discoveryErrors.js";

const conversation = {
  status: "pending",
  question: null,
  history: [{ sequence: 1, question: { id: "q1" }, selected_answer: "دفتر ورقي", answered_at: "2026-10-12T10:00:00Z" }],
};

const aiFailure = (code, extra = {}) =>
  new ApiError({
    kind: "http",
    status: 503,
    data: {
      success: false,
      message: "تعذر التواصل مع خدمة الذكاء الاصطناعي حاليًا. أعد المحاولة بعد قليل؛ إجاباتك محفوظة.",
      error: { code, retryable: true, retry_after: 5 },
      request_id: "3f6c2a1e-9b7d-4c1a-8e2f-0a1b2c3d4e5f",
      data: conversation,
      ...extra,
    },
  });

describe("describeDiscoveryFailure — AI failures from the API", () => {
  it("keeps the saved answer and conversation so retry continues instead of resending", () => {
    const info = describeDiscoveryFailure(aiFailure("ai_temporarily_unavailable", { answer_saved: true }));
    assert.equal(info.code, "ai_temporarily_unavailable");
    assert.equal(info.action, "retry");
    assert.equal(info.answerSaved, true);
    assert.equal(info.snapshot, conversation);
    assert.equal(info.retryAfter, 5);
    assert.equal(info.persistent, false);
    assert.equal(info.requestId, "3f6c2a1e-9b7d-4c1a-8e2f-0a1b2c3d4e5f");
    assert.match(info.message, /إجاباتك محفوظة/);
  });

  it("uses the provider wait for rate limits and caps absurd values", () => {
    const failure = aiFailure("ai_rate_limited");
    failure.data.error.retry_after = 37;
    assert.equal(describeDiscoveryFailure(failure).retryAfter, 37);
    failure.data.error.retry_after = 86400;
    assert.equal(describeDiscoveryFailure(failure).retryAfter, 300);
  });

  it("marks quota and configuration problems as persistent", () => {
    for (const code of ["ai_quota_exhausted", "ai_configuration_error"]) {
      const failure = aiFailure(code);
      failure.data.error = { code, retryable: false, retry_after: null };
      const info = describeDiscoveryFailure(failure);
      assert.equal(info.persistent, true, code);
      assert.equal(info.retryAfter, null, code);
      assert.equal(info.action, "retry", code);
    }
  });

  it("never shows English or internal server text", () => {
    const failure = aiFailure("ai_configuration_error");
    failure.data.message = "SQLSTATE[HY000] connection refused";
    failure.data.debug = { provider_message: "API key not valid" };
    const info = describeDiscoveryFailure(failure);
    assert.doesNotMatch(info.message, /[A-Za-z]/);
  });

  it("ignores a malformed conversation payload", () => {
    const info = describeDiscoveryFailure(aiFailure("ai_timeout", { data: { status: "pending" } }));
    assert.equal(info.snapshot, null);
  });
});

describe("describeDiscoveryFailure — transport and gateway failures", () => {
  it("treats a blocked or dropped request as retryable without blaming the user's connection", () => {
    const info = describeDiscoveryFailure(new ApiError({ kind: "network" }));
    assert.equal(info.message, DISCOVERY_FAILURE_MESSAGES.network);
    assert.equal(info.action, "retry");
    assert.equal(info.answerSaved, false);
  });

  it("explains client timeouts and says the request may have been saved", () => {
    assert.equal(describeDiscoveryFailure(new ApiError({ kind: "timeout" })).message, AUTH_MESSAGES.timeout);
  });

  it("recognizes a hosting gateway 502/503/504 without an application error code", () => {
    for (const status of [502, 503, 504]) {
      const info = describeDiscoveryFailure(new ApiError({ kind: "http", status, data: null }));
      assert.equal(info.message, DISCOVERY_FAILURE_MESSAGES.gateway, String(status));
      assert.equal(info.code, null);
      assert.equal(info.snapshot, null);
    }
  });

  it("keeps an Arabic message from an older backend that has no error code", () => {
    const message = "تعذر إنشاء سؤال جديد للاكتشاف حاليًا. إجاباتك محفوظة، ويمكنك المحاولة مرة أخرى.";
    const info = describeDiscoveryFailure(new ApiError({ kind: "http", status: 503, data: { message } }));
    assert.equal(info.message, message);
  });

  it("asks for a new login on 401 and handles unknown errors", () => {
    const info = describeDiscoveryFailure(new ApiError({ kind: "http", status: 401, data: { message: "Unauthenticated." } }));
    assert.equal(info.action, "login");
    assert.equal(info.message, AUTH_MESSAGES.unauthenticated);
    assert.equal(describeDiscoveryFailure(new Error("boom")).message, AUTH_MESSAGES.unexpected);
  });
});
