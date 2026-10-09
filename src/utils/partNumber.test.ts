import { describe, expect, it } from "vitest";
import { sanitizePartNumber } from "./partNumber";

describe("sanitizePartNumber", () => {
  it("drops dots, spaces and symbols and upper-cases the rest", () => {
    expect(sanitizePartNumber(" 1600.a0000-1 ")).toBe("1600A00001");
  });

  it("returns an empty string for an empty value", () => {
    expect(sanitizePartNumber("")).toBe("");
  });
});
