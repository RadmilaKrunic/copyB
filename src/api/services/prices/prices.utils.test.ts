import { describe, it, expect } from "vitest";
import { buildDefaultParameterRequest, toDefaultQuantities } from "./prices.utils";

describe("buildDefaultParameterRequest", () => {
  const base = {
    countryCode: "IN",
    ascId: "ASC1",
    jobId: "J1",
    actionType: "REPAIR",
    jobType: "WARRANTY",
    faultCode: "C1",
    faultCodeLabourQuantity: 6,
  };

  it("builds a REPAIR request without exchangeReason", () => {
    expect(buildDefaultParameterRequest({ ...base, exchangeReason: "XCH" })).toEqual(base);
  });

  it("sends exchangeReason when actionType is not REPAIR", () => {
    expect(
      buildDefaultParameterRequest({
        ...base,
        actionType: "NEW_TOOL_EXCHANGE",
        exchangeReason: "XCH",
      }),
    ).toEqual({ ...base, actionType: "NEW_TOOL_EXCHANGE", exchangeReason: "XCH" });
  });

  it("returns null when a non-REPAIR request has no exchangeReason", () => {
    expect(buildDefaultParameterRequest({ ...base, actionType: "NEW_TOOL_EXCHANGE" })).toBeNull();
  });

  it.each(["countryCode", "jobId", "actionType", "jobType"])(
    "returns null when %s is missing",
    (key) => {
      expect(buildDefaultParameterRequest({ ...base, [key]: "" })).toBeNull();
    },
  );

  it("leaves out empty optional values and parses a string labour quantity", () => {
    expect(
      buildDefaultParameterRequest({
        countryCode: "IN",
        jobId: "J1",
        actionType: "REPAIR",
        jobType: "WARRANTY",
        ascId: "",
        faultCode: undefined,
        faultCodeLabourQuantity: "4",
      }),
    ).toEqual({
      countryCode: "IN",
      jobId: "J1",
      actionType: "REPAIR",
      jobType: "WARRANTY",
      faultCodeLabourQuantity: 4,
    });
  });

  it("leaves out a zero labour quantity", () => {
    expect(
      buildDefaultParameterRequest({ ...base, faultCodeLabourQuantity: 0 }),
    ).not.toHaveProperty("faultCodeLabourQuantity");
  });
});

describe("toDefaultQuantities", () => {
  it("uses serviceUnits when present, otherwise value", () => {
    expect(
      toDefaultQuantities({
        byPosition: [
          { position: "LA", value: 1, serviceUnits: 5 },
          { position: "FR", value: 1, serviceUnits: null },
        ],
      }),
    ).toEqual({ LA: 5, FR: 1 });
  });

  it("skips entries without a usable quantity", () => {
    expect(
      toDefaultQuantities({
        byPosition: [
          { position: "PC", value: null, serviceUnits: null },
          { position: "", value: 2, serviceUnits: null },
        ],
      }),
    ).toEqual({});
  });

  it("returns an empty map for a missing response", () => {
    expect(toDefaultQuantities(undefined)).toEqual({});
  });
});
