import { describe, expect, it } from "vitest";
import { LABELS } from "../labels";
import { SUPPORT_EMAIL } from "../limits";
import { SendFailureError, canRetry, failureFrom, failureFromResponse, failureLabel, hasPin } from "../utils/send-failure";

describe("failureFromResponse", () => {
  it("reads the status", () => {
    expect(failureFromResponse(413)).toBe("tooLarge");
    expect(failureFromResponse(429)).toBe("busy");
    expect(failureFromResponse(404)).toBe("setup");
    expect(failureFromResponse(403)).toBe("setup");
    expect(failureFromResponse(500)).toBe("server");
    expect(failureFromResponse(503)).toBe("server");
  });

  it("reads Notion's code behind a 502", () => {
    expect(failureFromResponse(502, "rate_limited")).toBe("busy");
    expect(failureFromResponse(502, "unauthorized")).toBe("setup");
    expect(failureFromResponse(502, "validation_error")).toBe("setup");
    expect(failureFromResponse(500, "not_configured")).toBe("setup");
    expect(failureFromResponse(502, "internal_server_error")).toBe("server");
  });
});

describe("failureFrom", () => {
  it("tells a refusal, a timeout and no connection apart", () => {
    expect(failureFrom(new SendFailureError("busy", "HTTP 429"), true)).toBe("busy");
    expect(failureFrom(Object.assign(new Error(), { name: "AbortError" }), true)).toBe("timeout");
    expect(failureFrom(new TypeError("Failed to fetch"), false)).toBe("offline");
    expect(failureFrom(new TypeError("Failed to fetch"), true)).toBe("network");
  });
});

describe("canRetry", () => {
  it("is off where sending again can't help", () => {
    expect(canRetry("setup")).toBe(false);
    expect(canRetry("tooLarge")).toBe(false);
    expect(canRetry("server")).toBe(true);
    expect(canRetry("offline")).toBe(true);
  });
});

describe("hasPin", () => {
  it("keeps the pin of a comment that is fine, or still on its way", () => {
    expect(hasPin({})).toBe(true);
    expect(hasPin({ delivery: "sending" })).toBe(true);
    expect(hasPin({ delivery: "sent" })).toBe(true);
  });

  it("takes it away when the toast has gone, if sending again can help", () => {
    expect(hasPin({ delivery: "failed", deliveryFailure: "server" })).toBe(true);
    expect(hasPin({ delivery: "failed", deliveryFailure: "server", deliveryToastGone: true })).toBe(false);
  });

  it("takes it away at once if it can't", () => {
    expect(hasPin({ delivery: "failed", deliveryFailure: "setup" })).toBe(false);
    expect(hasPin({ delivery: "failed", deliveryFailure: "tooLarge" })).toBe(false);
  });
});

describe("failureLabel", () => {
  it("gives our address where a retry won't help", () => {
    expect(failureLabel(LABELS.nl, "setup")).toContain(SUPPORT_EMAIL);
    expect(failureLabel(LABELS.en, "setup")).toContain(SUPPORT_EMAIL);
  });

  it("always has a sentence, in both languages", () => {
    const failures = ["offline", "network", "timeout", "setup", "tooLarge", "busy", "server", undefined] as const;
    for (const language of ["nl", "en"] as const) {
      for (const failure of failures) expect(failureLabel(LABELS[language], failure)).toBeTruthy();
    }
  });
});
