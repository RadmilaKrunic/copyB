import { describe, it, expect } from "vitest";
import {
  formatDateToDisplay,
  formatTime,
  getEarliestJobCreationDate,
  getEarliestJobCreationDay,
  isBeforeEarliestJobCreationDate,
} from "./dateFormatter";

describe("formatDateToDisplay", () => {
  it("formats ISO date string to dd.MM.yyyy", () => {
    expect(formatDateToDisplay("2024-03-15")).toBe("15.03.2024");
  });

  it("formats ISO datetime string to dd.MM.yyyy", () => {
    expect(formatDateToDisplay("2024-12-01T10:30:00.000Z")).toBe("01.12.2024");
  });

  it("formats dd-MM-yyyy string (fallback path) to dd.MM.yyyy", () => {
    // "31-01-2023" is invalid as ISO so triggers the fallback dd-MM-yyyy parse
    // day=31, month=01, year=2023 → 31.01.2023
    expect(formatDateToDisplay("31-01-2023")).toBe("31.01.2023");
  });

  it("returns empty string for empty input", () => {
    expect(formatDateToDisplay("")).toBe("");
  });

  it("returns empty string for invalid date string", () => {
    expect(formatDateToDisplay("not-a-date")).toBe("");
  });

  it("formats year boundary date correctly", () => {
    expect(formatDateToDisplay("2000-01-01")).toBe("01.01.2000");
  });
});

describe("formatTime", () => {
  it("formats ISO datetime string to HH:mm", () => {
    expect(formatTime("2024-03-15T14:30:00.000Z")).toMatch(/^\d{2}:\d{2}$/);
  });

  it("returns empty string for empty input", () => {
    expect(formatTime("")).toBe("");
  });

  it("returns empty string for invalid date string", () => {
    expect(formatTime("not-a-date")).toBe("");
  });

  it("formats time correctly for midnight UTC", () => {
    // Just verify format shape — exact value depends on local timezone
    const result = formatTime("2024-01-01T00:00:00.000Z");
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("job creation date window", () => {
  const now = new Date("2026-09-24T10:00:00.000Z");

  it("allows today", () => {
    expect(isBeforeEarliestJobCreationDate("2026-09-24T00:00:00.000Z", now)).toBe(false);
  });

  it("allows the fifteenth day in the past", () => {
    expect(isBeforeEarliestJobCreationDate("2026-09-09T00:00:00.000Z", now)).toBe(false);
  });

  it("rejects the sixteenth day in the past", () => {
    expect(isBeforeEarliestJobCreationDate("2026-09-08T23:59:59.999Z", now)).toBe(true);
  });

  it("ignores empty and invalid values", () => {
    expect(isBeforeEarliestJobCreationDate("", now)).toBe(false);
    expect(isBeforeEarliestJobCreationDate("not-a-date", now)).toBe(false);
    expect(isBeforeEarliestJobCreationDate(null, now)).toBe(false);
  });

  it("is not affected by the local timezone of the caller", () => {
    const lateInUtc = new Date("2026-09-24T23:30:00.000Z");
    const earlyInUtc = new Date("2026-09-24T00:30:00.000Z");
    expect(getEarliestJobCreationDay(lateInUtc)).toBe("2026-09-09");
    expect(getEarliestJobCreationDay(earlyInUtc)).toBe("2026-09-09");
  });

  it("returns the earliest selectable day as a UTC date", () => {
    expect(getEarliestJobCreationDate(now).toISOString()).toBe("2026-09-09T00:00:00.000Z");
    expect(getEarliestJobCreationDay(now)).toBe("2026-09-09");
  });
});
