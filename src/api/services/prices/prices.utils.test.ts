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

  it.each([
    "countryCode",
    "ascId",
    "jobId",
    "actionType",
    "jobType",
    "faultCode",
    "faultCodeLabourQuantity",
  ])("returns null while %s is missing, so no request is sent", (key) => {
    expect(buildDefaultParameterRequest({ ...base, [key]: "" })).toBeNull();
    expect(buildDefaultParameterRequest({ ...base, [key]: undefined })).toBeNull();
  });

  it("returns null before a fault code is selected", () => {
    expect(
      buildDefaultParameterRequest({ ...base, faultCode: "", faultCodeLabourQuantity: 0 }),
    ).toBeNull();
  });

  it("parses a string labour quantity and keeps zero", () => {
    expect(buildDefaultParameterRequest({ ...base, faultCodeLabourQuantity: "4" })).toEqual({
      ...base,
      faultCodeLabourQuantity: 4,
    });
    expect(buildDefaultParameterRequest({ ...base, faultCodeLabourQuantity: 0 })).toEqual({
      ...base,
      faultCodeLabourQuantity: 0,
    });
  });
});

describe("toDefaultQuantities", () => {
  it("uses value, and serviceUnits only when value is missing", () => {
    expect(
      toDefaultQuantities({
        byPosition: [
          { position: "LA", value: 1, serviceUnits: 5 },
          { position: "FR", value: 1, serviceUnits: null },
          { position: "PC", value: null, serviceUnits: 3 },
        ],
      }),
    ).toEqual({ LA: 1, FR: 1, PC: 3 });
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
