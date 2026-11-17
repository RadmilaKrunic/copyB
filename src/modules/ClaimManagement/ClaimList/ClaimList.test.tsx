import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Attachment } from "modules/JobManagement/JobList/JobList.types";
import { Claim } from "./ClaimList.types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("hooks/useListFilterHandlers", () => ({
  useListFilterHandlers: () => ({
    handleToggleFilter: vi.fn(),
    applyAdvancedFilters: vi.fn(),
    resetAdvancedFilters: vi.fn(),
  }),
}));
vi.mock("hooks/useHasPermission", () => ({
  useHasPermission: vi.fn(),
}));
const { bulkApproveMutate, setMessagesMock } = vi.hoisted(() => ({
  bulkApproveMutate: vi.fn(),
  setMessagesMock: vi.fn(),
}));
let claimsState: { data: unknown[]; isLoading: boolean } = { data: [], isLoading: false };
interface DocumentDetail {
  jobId?: string;
  job?: { asset: { attachments: Attachment[] } };
}
let claimDetail: DocumentDetail | undefined;
let documentJob: DocumentDetail | undefined;
let bulkApproveOptions: {
  onSuccess?: (data: unknown, variables: { decision: string; claimIds: string[] }) => void;
  onError?: (error: unknown, variables: { decision: string; claimIds: string[] }) => void;
} = {};

const analyticsMock = vi.hoisted(() => ({
  trackClaimReviewed: vi.fn(),
  trackActionFailed: vi.fn(),
}));
vi.mock("@/analytics", async () => ({
  ...(await vi.importActual<Record<string, unknown>>("@/analytics")),
  useAnalytics: () => analyticsMock,
}));

vi.mock("api/services/claims/hooks", () => ({
  useClaims: () => claimsState,
  useClaimById: vi.fn((claimId: string) => ({ data: claimId ? claimDetail : undefined })),
  useBulkApproveClaims: (options: typeof bulkApproveOptions) => {
    bulkApproveOptions = options;
    return { mutate: bulkApproveMutate, isPending: false };
  },
}));
vi.mock("api/services/jobs/hooks", () => ({
  useJobById: vi.fn((jobId: string) => ({ data: jobId ? documentJob : undefined })),
}));
vi.mock("contexts/messagescontext", () => ({
  MessagesContext: React.createContext({ setMessages: setMessagesMock }),
}));
vi.mock("@bosch/react-frok", () => ({
  ActivityIndicator: () => React.createElement("div", { "data-testid": "loading" }),
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement("button", props, children),
}));
vi.mock("components/ui/List/Filters/Filters", () => ({
  default: ({
    splitActionButton,
    optionsContent,
  }: {
    splitActionButton?: {
      primaryLabel: string;
      primaryAction?: () => void;
      primaryDisabled?: boolean;
      options: Array<{ label: string; onClick: () => void; disabled?: boolean }>;
    };
    optionsContent?: React.ReactNode;
  }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return React.createElement(
      "div",
      { "data-testid": "filters" },
      splitActionButton &&
        React.createElement(
          "div",
          { "data-testid": "split-action-button" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: splitActionButton.primaryAction,
              disabled: splitActionButton.primaryDisabled,
            },
            splitActionButton.primaryLabel,
          ),
          React.createElement(
            "button",
            {
              type: "button",
              "aria-label": "moreOptions",
              onClick: () => setIsOpen((open) => !open),
            },
            "moreOptions",
          ),
          isOpen &&
            React.createElement(
              "div",
              { "data-testid": "split-action-menu" },
              splitActionButton.options.map((option) =>
                React.createElement(
                  "button",
                  {
                    key: option.label,
                    type: "button",
                    disabled: option.disabled,
                    onClick: option.onClick,
                  },
                  option.label,
                ),
              ),
            ),
        ),
      optionsContent,
    );
  },
}));
vi.mock("components/ui/List/Table/Table", () => ({
  default: ({
    onSelectionChange,
    data,
    renderRowActions,
  }: {
    onSelectionChange?: (rows: string[]) => void;
    data: Claim[];
    renderRowActions: (claim: Claim) => React.ReactNode;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "table" },
      React.createElement(
        "button",
        { type: "button", onClick: () => onSelectionChange?.(["claim-1"]) },
        "select-row",
      ),
      data.map((claim) =>
        React.createElement("div", { key: claim.claimId }, renderRowActions(claim)),
      ),
    ),
}));
vi.mock("components/ui/Pagination/Pagination", () => ({
  default: () => React.createElement("div", { "data-testid": "pagination" }),
}));
vi.mock("components/ui/DocumentsModal/DocumentsModal", () => ({
  default: ({
    attachments,
    hideDelete,
    onClose,
  }: {
    attachments: Attachment[];
    hideDelete: boolean;
    onClose: () => void;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "docs-modal", "data-hide-delete": String(hideDelete) },
      attachments.map((attachment) =>
        React.createElement("div", { key: attachment.attachmentId }, attachment.name),
      ),
      React.createElement("button", { onClick: onClose }, "close-documents"),
    ),
}));
vi.mock("components/ui/MessagesModal/MessagesModal", () => ({
  default: () => React.createElement("div", { "data-testid": "messages-modal" }),
}));
vi.mock("./ClaimListTable/ClaimActionsFlyout/ClaimActionsFlyout", () => ({
  default: ({
    claim,
    setSelectedClaimId,
    setShowDocumentModal,
  }: {
    claim: Claim;
    setSelectedClaimId: (id: string) => void;
    setShowDocumentModal: (show: boolean) => void;
  }) =>
    React.createElement(
      "button",
      {
        onClick: () => {
          setSelectedClaimId(claim.claimId);
          setShowDocumentModal(true);
        },
      },
      `documents-${claim.claimId}`,
    ),
}));
vi.mock(
  "components/ui/List/Filters/FiltersOptionsPopup/CustomizeColumnsPopup/CustomizeColumnsPopup",
  () => ({ default: () => React.createElement("div") }),
);
vi.mock("./ClaimListExportDialog/ClaimListExportDialog", () => ({
  default: () => React.createElement("div", { "data-testid": "export-dialog" }),
}));

import ClaimList from "./ClaimList";
import { useHasPermission } from "hooks/useHasPermission";
import { useClaimById } from "api/services/claims/hooks";
import { useJobById } from "api/services/jobs/hooks";

const mockedUseHasPermission = vi.mocked(useHasPermission);
const invoice: Attachment = { attachmentId: "invoice", name: "Invoice.jpeg", type: "INVOICE" };
const receipt: Attachment = {
  attachmentId: "receipt",
  name: "JobReceipt.pdf",
  type: "SYSTEM_GENERATED_RECEIPT",
};
const deliveryNote: Attachment = {
  attachmentId: "delivery-note",
  name: "DeliveryNote.pdf",
  type: "SYSTEM_GENERATED_RECEIPT",
};
const documentClaim: Claim = {
  claimId: "CA0000181",
  jobId: "JA0001251",
  createdOn: "2026-09-25",
  countryCode: "TR",
  ascId: "ASC1",
  ascName: "ASC",
  toolModelName: "GBH 2600",
  baretoolNumber: "0611254803",
  jobAction: "REPAIR",
  jobType: "WARRANTY",
  totalCost: 0,
  status: "PENDING",
};

function renderClaimList() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(MemoryRouter, null, React.createElement(ClaimList)),
    ),
  );
}

describe("ClaimList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    claimsState = { data: [], isLoading: false };
    claimDetail = undefined;
    documentJob = undefined;
    mockedUseHasPermission.mockReturnValue(true);
  });

  it("shows all linked job documents in the read-only claim documents modal", () => {
    claimsState.data = [documentClaim];
    claimDetail = { jobId: documentClaim.jobId, job: { asset: { attachments: [invoice] } } };
    documentJob = { job: { asset: { attachments: [invoice, receipt, deliveryNote] } } };

    renderClaimList();

    expect(useClaimById).toHaveBeenLastCalledWith("");
    expect(useJobById).toHaveBeenLastCalledWith("");
    expect(screen.queryByTestId("docs-modal")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "documents-CA0000181" }));

    expect(useClaimById).toHaveBeenLastCalledWith(documentClaim.claimId);
    expect(useJobById).toHaveBeenLastCalledWith(documentClaim.jobId);
    expect(screen.getByText("Invoice.jpeg")).toBeInTheDocument();
    expect(screen.getByText("JobReceipt.pdf")).toBeInTheDocument();
    expect(screen.getByText("DeliveryNote.pdf")).toBeInTheDocument();
    expect(screen.getByTestId("docs-modal")).toHaveAttribute("data-hide-delete", "true");

    fireEvent.click(screen.getByRole("button", { name: "close-documents" }));

    expect(screen.queryByTestId("docs-modal")).not.toBeInTheDocument();
    expect(useClaimById).toHaveBeenLastCalledWith("");
    expect(useJobById).toHaveBeenLastCalledWith("");
  });

  it("falls back to claim documents while linked job data is unavailable", () => {
    claimsState.data = [documentClaim];
    claimDetail = { jobId: documentClaim.jobId, job: { asset: { attachments: [invoice] } } };

    renderClaimList();
    fireEvent.click(screen.getByRole("button", { name: "documents-CA0000181" }));

    expect(screen.getByText("Invoice.jpeg")).toBeInTheDocument();
    expect(useJobById).toHaveBeenLastCalledWith(documentClaim.jobId);
  });

  it("uses an empty linked job document list rather than stale claim attachments", () => {
    claimsState.data = [documentClaim];
    claimDetail = { jobId: documentClaim.jobId, job: { asset: { attachments: [invoice] } } };
    documentJob = { job: { asset: { attachments: [] } } };

    renderClaimList();
    fireEvent.click(screen.getByRole("button", { name: "documents-CA0000181" }));

    expect(screen.getByTestId("docs-modal")).toBeInTheDocument();
    expect(screen.queryByText("Invoice.jpeg")).not.toBeInTheDocument();
  });

  it("does not fetch a job before claim details are available", () => {
    claimsState.data = [documentClaim];

    renderClaimList();
    fireEvent.click(screen.getByRole("button", { name: "documents-CA0000181" }));

    expect(useClaimById).toHaveBeenLastCalledWith(documentClaim.claimId);
    expect(useJobById).toHaveBeenLastCalledWith("");
    expect(screen.getByTestId("docs-modal")).toBeInTheDocument();
  });

  it("renders export button when user can download claim list", () => {
    mockedUseHasPermission.mockReturnValue(true);

    renderClaimList();

    expect(screen.getByRole("button", { name: "exportClaimList" })).toBeInTheDocument();
  });

  it("hides export button when user cannot download claim list", () => {
    mockedUseHasPermission.mockReturnValue(false);

    renderClaimList();

    expect(screen.queryByRole("button", { name: "exportClaimList" })).not.toBeInTheDocument();
  });

  it.each([
    ["filters", "filters"],
    ["table", "table"],
    ["pagination", "pagination"],
  ])("renders %s", (_, testId) => {
    renderClaimList();
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it("renders split bulk decision action with reject and revise options only in the dropdown", () => {
    mockedUseHasPermission.mockReturnValue(true);
    renderClaimList();

    expect(screen.getByRole("button", { name: "approve" })).toBeInTheDocument();
    expect(screen.getByLabelText("moreOptions")).toBeInTheDocument();

    const moreOptionsButton = screen.getByLabelText("moreOptions");

    fireEvent.click(moreOptionsButton);

    expect(screen.getByTestId("split-action-menu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "reject" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "revise" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "approve" })).toBeInTheDocument();
  });

  it("shows loading indicator while claims load", () => {
    claimsState = { data: [], isLoading: true };

    renderClaimList();

    expect(screen.getByTestId("loading")).toBeInTheDocument();
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
  });

  it("hides split action button when user cannot perform claim decision", () => {
    mockedUseHasPermission.mockReturnValue(false);

    renderClaimList();

    expect(screen.queryByTestId("split-action-button")).not.toBeInTheDocument();
  });

  it("disables bulk actions while no row is selected", () => {
    renderClaimList();

    expect(screen.getByRole("button", { name: "approve" })).toBeDisabled();

    fireEvent.click(screen.getByLabelText("moreOptions"));

    expect(screen.getByRole("button", { name: "reject" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "revise" })).toBeDisabled();
  });

  it.each([
    ["approve", "APPROVED", "Approved after bulk review"],
    ["reject", "REJECTED", "Rejected after bulk review"],
    ["revise", "REVISED", "Revision requested after bulk review"],
  ])("triggers %s bulk decision for selected claims", (label, decision, message) => {
    renderClaimList();

    fireEvent.click(screen.getByRole("button", { name: "select-row" }));
    fireEvent.click(screen.getByLabelText("moreOptions"));
    fireEvent.click(screen.getByRole("button", { name: label }));

    expect(bulkApproveMutate).toHaveBeenCalledWith({
      claimIds: ["claim-1"],
      decision,
      message,
    });
  });

  it.each([
    ["APPROVED", "successfulClaimsBulkApprove"],
    ["REJECTED", "successfulClaimsBulkReject"],
    ["REVISED", "successfulClaimsBulkRevise"],
  ])("pushes success message for %s decision", (decision, expectedText) => {
    renderClaimList();

    act(() => {
      bulkApproveOptions.onSuccess?.(undefined, { decision, claimIds: ["C1", "C2"] });
    });

    const updater = setMessagesMock.mock.calls[0][0] as (prev: unknown[]) => unknown[];
    expect(updater([])).toEqual([{ type: "success", text: expectedText, duration: 3000 }]);
  });

  it.each([
    ["APPROVED", "errorClaimsBulkApprove"],
    ["REJECTED", "errorClaimsBulkReject"],
    ["REVISED", "errorClaimsBulkRevise"],
  ])("pushes error message for %s decision", (decision, expectedText) => {
    renderClaimList();

    bulkApproveOptions.onError?.(new Error("failed"), { decision, claimIds: ["C1", "C2"] });

    const updater = setMessagesMock.mock.calls[0][0] as (prev: unknown[]) => unknown[];
    expect(updater([])).toEqual([{ type: "error", text: expectedText, duration: 3000 }]);
    expect(analyticsMock.trackActionFailed).toHaveBeenCalledTimes(2);
    expect(analyticsMock.trackActionFailed).toHaveBeenCalledWith(
      expect.objectContaining({ failedAction: "claim_reviewed", failureReason: "system_problem" }),
    );
  });

  it("sends one claim_reviewed per claim in a bulk decision", () => {
    renderClaimList();

    act(() => {
      bulkApproveOptions.onSuccess?.(undefined, { decision: "REJECTED", claimIds: ["C1", "C2"] });
    });

    expect(analyticsMock.trackClaimReviewed).toHaveBeenCalledTimes(2);
    expect(analyticsMock.trackClaimReviewed).toHaveBeenCalledWith(
      expect.objectContaining({ claimStatus: "rejected", claimAction: "rejected" }),
    );
  });
});
