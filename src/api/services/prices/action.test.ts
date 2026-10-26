import { describe, it, expect, vi, beforeEach } from "vitest";
import { postDefaultParameter } from "./action";

vi.mock("api/axios-client/axiosClient", () => ({
  default: { post: vi.fn() },
}));

import axiosClient from "api/axios-client/axiosClient";
const mockPost = vi.mocked(axiosClient.post);

beforeEach(() => vi.clearAllMocks());

describe("postDefaultParameter", () => {
  const request = {
    countryCode: "IN",
    ascId: "ASC1",
    jobId: "J1",
    actionType: "REPAIR",
    jobType: "WARRANTY",
    faultCode: "C1",
    faultCodeLabourQuantity: 6,
  };

  it("posts the request and returns the response data", async () => {
    const data = { byPosition: [{ position: "LA", value: 1, serviceUnits: 5 }] };
    mockPost.mockResolvedValueOnce({ data });
    expect(await postDefaultParameter(request)).toEqual(data);
    expect(mockPost).toHaveBeenCalledWith("/v1/job/prices/default-parameter", request);
  });

  it("throws on error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockPost.mockRejectedValueOnce(new Error("fail"));
    await expect(postDefaultParameter(request)).rejects.toThrow("fail");
  });
});
