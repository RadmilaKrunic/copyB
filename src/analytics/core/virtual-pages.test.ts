import { describe, it, expect } from "vitest";
import { matchesRoutePattern, resolveVirtualPage } from "./virtual-pages";
import { VirtualUrl } from "../domain/enums";

describe("matchesRoutePattern", () => {
  it("matches exact and parameterised paths", () => {
    expect(matchesRoutePattern("/job-list", "/job-list")).toBe(true);
    expect(matchesRoutePattern("/job-overview/:jobId", "/job-overview/abc-123")).toBe(true);
    expect(matchesRoutePattern("/", "/")).toBe(true);
  });

  it("rejects mismatched segment counts and literals", () => {
    expect(matchesRoutePattern("/job-overview/:jobId", "/job-overview")).toBe(false);
    expect(matchesRoutePattern("/job-list", "/job-list/extra")).toBe(false);
    expect(matchesRoutePattern("/job-list", "/claim-list")).toBe(false);
  });

  it("tolerates a trailing slash", () => {
    expect(matchesRoutePattern("/dashboard", "/dashboard/")).toBe(true);
  });
});

describe("resolveVirtualPage", () => {
  it("resolves static routes, mapping technical paths to functional URLs", () => {
    expect(resolveVirtualPage({ pathname: "/dashboard" })?.virtualUrl).toBe(VirtualUrl.DASHBOARD);
    expect(resolveVirtualPage({ pathname: "/" })?.virtualUrl).toBe(VirtualUrl.DASHBOARD);
    expect(resolveVirtualPage({ pathname: "/edit-order/42" })?.virtualUrl).toBe(
      VirtualUrl.EDIT_JOB,
    );
    expect(resolveVirtualPage({ pathname: "/approval-list" })?.virtualUrl).toBe(
      VirtualUrl.PRE_APPROVAL_LIST,
    );
  });

  it("selects the job-overview tab from the hash", () => {
    expect(
      resolveVirtualPage({ pathname: "/job-overview/1", hash: "#diagnosticData" })?.virtualUrl,
    ).toBe(VirtualUrl.JOB_OVERVIEW_DIAGNOSTIC_DATA);
    expect(resolveVirtualPage({ pathname: "/job-overview/1", hash: "notes" })?.virtualUrl).toBe(
      VirtualUrl.JOB_OVERVIEW_NOTES,
    );
  });

  it("selects the claim-overview tab from the hash, including the claims tab", () => {
    expect(resolveVirtualPage({ pathname: "/claim-overview/9", hash: "#claims" })?.virtualUrl).toBe(
      VirtualUrl.CLAIM_OVERVIEW_CLAIMS,
    );
  });

  it("falls back to the default (first) tab for a missing/unknown hash", () => {
    expect(resolveVirtualPage({ pathname: "/job-overview/1" })?.virtualUrl).toBe(
      VirtualUrl.JOB_OVERVIEW_CUSTOMER_PAYMENT_DATA,
    );
    expect(resolveVirtualPage({ pathname: "/job-overview/1", hash: "#nope" })?.virtualUrl).toBe(
      VirtualUrl.JOB_OVERVIEW_CUSTOMER_PAYMENT_DATA,
    );
  });

  it("resolves the routes that previously had no virtual page", () => {
    expect(resolveVirtualPage({ pathname: "/system-configuration" }).virtualUrl).toBe(
      VirtualUrl.SYSTEM_CONFIGURATION,
    );
    expect(resolveVirtualPage({ pathname: "/employee-overview/7" }).virtualUrl).toBe(
      VirtualUrl.EMPLOYEE_OVERVIEW,
    );
  });

  it("separates the two routes that share one component", () => {
    expect(resolveVirtualPage({ pathname: "/reimbursements" }).virtualUrl).toBe(
      VirtualUrl.MY_REIMBURSEMENTS,
    );
    expect(resolveVirtualPage({ pathname: "/reimbursement-detail/7" }).virtualUrl).toBe(
      VirtualUrl.ASC_REIMBURSEMENTS,
    );
  });

  it("splits the client-overview tabs, which the screen writes to the hash", () => {
    expect(resolveVirtualPage({ pathname: "/client-overview/7" }).virtualUrl).toBe(
      VirtualUrl.CLIENT_OVERVIEW_CLIENT_INFO,
    );
    expect(resolveVirtualPage({ pathname: "/client-overview/7", hash: "#Jobs" }).virtualUrl).toBe(
      VirtualUrl.CLIENT_OVERVIEW_JOBS,
    );
    expect(resolveVirtualPage({ pathname: "/client-overview/7", hash: "#Assets" }).virtualUrl).toBe(
      VirtualUrl.CLIENT_OVERVIEW_ASSETS,
    );
  });

  it("splits the asc tabs and keeps own-profile separate from managing another ASC", () => {
    expect(resolveVirtualPage({ pathname: "/asc-overview/7", hash: "#banking" }).virtualUrl).toBe(
      VirtualUrl.ASC_OVERVIEW_BANKING,
    );
    expect(resolveVirtualPage({ pathname: "/asc-profile", hash: "#banking" }).virtualUrl).toBe(
      VirtualUrl.ASC_PROFILE_BANKING,
    );
    expect(resolveVirtualPage({ pathname: "/asc-overview/7" }).virtualUrl).toBe(
      VirtualUrl.ASC_OVERVIEW_GENERAL_INFO,
    );
  });

  it("falls back to the first tab for a country-specific tab that is not mapped", () => {
    expect(
      resolveVirtualPage({ pathname: "/asc-overview/7", hash: "#someCountryOnlyTab" }).virtualUrl,
    ).toBe(VirtualUrl.ASC_OVERVIEW_GENERAL_INFO);
  });

  it("selects the reimbursement tab from the hash, defaulting to the ASC list", () => {
    expect(resolveVirtualPage({ pathname: "/reimbursement" }).virtualUrl).toBe(
      VirtualUrl.REIMBURSEMENT_ASC_LIST,
    );
    expect(resolveVirtualPage({ pathname: "/reimbursement", hash: "#asc-list" }).virtualUrl).toBe(
      VirtualUrl.REIMBURSEMENT_ASC_LIST,
    );
    expect(
      resolveVirtualPage({ pathname: "/reimbursement", hash: "#reimbursement-list" }).virtualUrl,
    ).toBe(VirtualUrl.REIMBURSEMENT_LIST);
  });

  it("falls back to the page-not-found page for a path with no route", () => {
    expect(resolveVirtualPage({ pathname: "/no-such-screen" }).virtualUrl).toBe(
      VirtualUrl.PAGE_NOT_FOUND,
    );
  });

  // Mirrors Routes.tsx. A new route added there without a rule reports as a 404, which would
  // quietly poison the only signal we have for broken links, so keep both lists in step.
  it("resolves every route declared in Routes.tsx to a real page", () => {
    const appRoutes = [
      "/",
      "/dashboard",
      "/job-list",
      "/create-job",
      "/edit-order/1",
      "/job-overview/1",
      "/reports",
      "/biqic-report",
      "/clients",
      "/client-overview/1",
      "/employee-list",
      "/add-employee",
      "/employee-overview/1",
      "/asc-profiles",
      "/add-asc",
      "/edit-asc/1",
      "/asc-overview/1",
      "/asc-profile",
      "/reimbursement",
      "/reimbursement-detail/1",
      "/reimbursements",
      "/create-reimbursement",
      "/reimbursement-claims/1",
      "/system-configuration",
      "/user-management",
      "/claim-list",
      "/claim-overview/1",
      "/approval-list",
    ];
    for (const pathname of appRoutes) {
      expect(resolveVirtualPage({ pathname }).virtualUrl).not.toBe(VirtualUrl.PAGE_NOT_FOUND);
    }
  });
});
