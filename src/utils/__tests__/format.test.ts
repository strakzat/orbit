import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LABELS } from "../../labels";
import { relativeTime } from "../format";

describe("relativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-27T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("speaks the language of its labels", () => {
    expect(relativeTime("2026-10-27T11:59:50Z", LABELS.nl)).toBe("nu");
    expect(relativeTime("2026-10-27T11:59:50Z", LABELS.en)).toBe("now");
    expect(relativeTime("2026-10-27T09:00:00Z", LABELS.nl)).toBe("3u");
    expect(relativeTime("2026-10-27T09:00:00Z", LABELS.en)).toBe("3h");
    expect(relativeTime("2026-10-25T12:00:00Z", LABELS.en)).toBe("2d");
  });

  it("falls back to a date after a week", () => {
    expect(relativeTime("2026-10-01T12:00:00Z", LABELS.en)).toBe("1 Oct 2026");
  });
});
