import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Formik } from "formik";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const analyticsMock = vi.hoisted(() => ({
  trackJobSectionSaved: vi.fn(),
  trackActionFailed: vi.fn(),
}));

const documentFileMock = vi.hoisted(() => vi.fn());
const genericFieldMock = vi.hoisted(() => vi.fn());
const checkActionConditionMock = vi.hoisted(() => vi.fn(() => true));
const mutateMock = vi.hoisted(() => vi.fn());
const getCachedJobContextMock = vi.hoisted(() => vi.fn(() => ({ cached: "context" })));
const scrollToTopMock = vi.hoisted(() => vi.fn());

let mutationOptions: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
} = {};
let nextDeleteAttachments:
  | Array<{ attachmentId: string; name: string; type: string; sourceReferenceId?: string }>
  | undefined;

vi.mock("@/analytics", async () => ({
  ...(await vi.importActual<Record<string, unknown>>("@/analytics")),
  useAnalytics: () => analyticsMock,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("components/ui/DocumentFile/DocumentFile", () => ({
  default: (props: {
    fileId: string;
    hideDelete: boolean;
    onDeleteSuccess?: (
      attachments: Array<{
        attachmentId: string;
        name: string;
        type: string;
        sourceReferenceId?: string;
      }>,
    ) => void;
  }) => {
    documentFileMock(props);

    return React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        { "data-testid": `doc-${props.fileId}`, "data-hide-delete": String(props.hideDelete) },
        props.fileId,
      ),
      React.createElement(
        "button",
        {
          "data-testid": `delete-success-${props.fileId}`,
          onClick: () => {
            if (nextDeleteAttachments) {
              props.onDeleteSuccess?.(nextDeleteAttachments);
            }
          },
        },
        "delete-success",
      ),
    );
  },
}));

vi.mock("components/generics/Field/GenericField", () => ({
  default: ({
    field,
  }: {
    field: {
      name: string;
      isDisabled?: boolean;
      existingFiles?: unknown[];
      updateEntityAttachments?: (attachments: unknown[]) => void;
    };
  }) => {
    genericFieldMock(field);

    return React.createElement(
      "div",
      null,
      React.createElement("div", { "data-testid": "upload-field" }, field.name),
      React.createElement(
        "div",
        { "data-testid": "upload-field-disabled" },
        String(Boolean(field.isDisabled)),
      ),
      React.createElement(
        "button",
        {
          "data-testid": "trigger-upload-update",
          onClick: () =>
            field.updateEntityAttachments?.([
              { attachmentId: "UP-1", name: "upload.pdf", type: "pdf" },
            ]),
        },
        "update-attachments",
      ),
    );
  },
}));

vi.mock("components/generics/Action/actionDependency", () => ({
  checkActionCondition: checkActionConditionMock,
}));

vi.mock("api/services/jobs/hooks", () => ({
  useUpdateJobAttachments: vi.fn((cfg: typeof mutationOptions) => {
    mutationOptions = cfg;
    return { mutate: mutateMock };
  }),
}));

vi.mock("modules/JobManagement/jobAnalyticsContext", () => ({
  getCachedJobContext: getCachedJobContextMock,
}));

vi.mock("utils/scrollToError", () => ({
  scrollToTop: scrollToTopMock,
}));

import DocumentTabArea from "./DocumentTabArea";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { MessagesContext } from "contexts/messagescontext";
import { toFailureReason, AnalyticsEventName, JobSection } from "@/analytics";

type JobData = {
  job: {
    asset: {
      attachments: Array<{
        attachmentId: string;
        name: string;
        type: string;
        sourceReferenceId?: string;
      }>;
    };
    jobStatus?: string;
    isOnHold?: boolean;
  };
};

const area = {
  name: "documentList",
  label: "Documents",
  fields: [{ name: "uploadedDocs", label: "upload", type: "upload" }],
  actions: [
    {
      label: "save",
      onAction: "onSaveDocuments",
      dependency: {
        showAction: {
          fieldName: "uploadedDocs",
          operator: "equals",
          value: true,
          nonEmpty: true,
          method: "some",
        },
      },
    },
  ],
};

function renderArea({
  entityType = "job",
  values = { uploadedDocs: [] },
  jobData,
  route,
  areaOverride = area,
}: {
  entityType?: "job" | "claim";
  values?: Record<string, unknown>;
  jobData: JobData;
  route?: string;
  areaOverride?: typeof area | undefined;
}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
  const entityRoute = route ?? (entityType === "claim" ? "/claim-overview/C1" : "/job-overview/J1");
  const entityPath = entityType === "claim" ? "/claim-overview/:claimId" : "/job-overview/:jobId";

  queryClient.setQueryData(["job", "J1"], jobData);
  queryClient.setQueryData(["claim", "C1"], jobData);
  queryClient.setQueryData(["user"], { permissions: [] });

  const setMessages = vi.fn();

  render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        MessagesContext.Provider,
        { value: { messages: [], setMessages } },
        React.createElement(
          GenericFormContext.Provider,
          {
            value: {
              allFields: [],
              setAllFields: vi.fn(),
              mandatoryFields: null,
              setMandatoryFields: vi.fn(),
              actionCallbacks: {},
              onDeleteStart: vi.fn(),
              onDeleteEnd: vi.fn(),
            },
          },
          React.createElement(
            MemoryRouter,
            { initialEntries: [entityRoute] },
            React.createElement(
              Routes,
              null,
              React.createElement(Route, {
                path: entityPath,
                element: React.createElement(
                  Formik,
                  { initialValues: values, onSubmit: vi.fn() },
                  React.createElement(DocumentTabArea, {
                    entityType,
                    area: areaOverride as never,
                  }),
                ),
              }),
            ),
          ),
        ),
      ),
    ),
  );

  return { queryClient, invalidateQueriesSpy, setMessages };
}

describe("DocumentTabArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationOptions = {};
    nextDeleteAttachments = undefined;
    checkActionConditionMock.mockReturnValue(true);
    getCachedJobContextMock.mockReturnValue({ cached: "context" });
  });

  it("renders no-documents text when attachments empty", () => {
    renderArea({
      jobData: { job: { asset: { attachments: [] }, jobStatus: "DRAFT", isOnHold: false } },
    });

    expect(screen.getByText("NoDocumentsFound")).toBeInTheDocument();
    expect(screen.getByTestId("upload-field")).toBeInTheDocument();
  });

  it("renders document rows when attachments exist", () => {
    renderArea({
      jobData: {
        job: {
          asset: { attachments: [{ attachmentId: "A1", name: "n", type: "pdf" }] },
          jobStatus: "IN_PROGRESS",
          isOnHold: false,
        },
      },
    });

    expect(screen.getByTestId("doc-A1")).toBeInTheDocument();
  });

  it("hides delete action for claim entity", () => {
    renderArea({
      entityType: "claim",
      jobData: {
        job: {
          asset: { attachments: [{ attachmentId: "A2", name: "n", type: "pdf" }] },
          jobStatus: "IN_PROGRESS",
          isOnHold: false,
        },
      },
    });

    expect(screen.getByTestId("doc-A2")).toHaveAttribute("data-hide-delete", "true");
  });

  it("hides delete action when job is on hold", () => {
    renderArea({
      jobData: {
        job: {
          asset: { attachments: [{ attachmentId: "A3", name: "hold.pdf", type: "pdf" }] },
          jobStatus: "IN_PROGRESS",
          isOnHold: true,
        },
      },
    });

    expect(screen.getByTestId("doc-A3")).toHaveAttribute("data-hide-delete", "true");
    expect(screen.getByTestId("upload-field-disabled")).toHaveTextContent("true");
  });

  it("hides upload field and delete action when upload visibility condition fails", () => {
    checkActionConditionMock.mockReturnValue(false);

    renderArea({
      jobData: {
        job: {
          asset: { attachments: [{ attachmentId: "A4", name: "hidden.pdf", type: "pdf" }] },
          jobStatus: "IN_PROGRESS",
          isOnHold: false,
        },
      },
    });

    expect(screen.queryByTestId("upload-field")).not.toBeInTheDocument();
    expect(screen.getByTestId("doc-A4")).toHaveAttribute("data-hide-delete", "true");
  });

  it("passes a sanitized visibility dependency into checkActionCondition", () => {
    renderArea({
      jobData: { job: { asset: { attachments: [] }, jobStatus: "DRAFT", isOnHold: false } },
    });

    expect(checkActionConditionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldName: "uploadedDocs",
        operator: "equals",
        value: true,
        nonEmpty: undefined,
        method: undefined,
      }),
      expect.objectContaining({
        currentStatus: "DRAFT",
        formValues: { uploadedDocs: [] },
        user: { permissions: [] },
      }),
    );
  });

  it("mutates attachments for a job when upload field updates them", () => {
    renderArea({
      jobData: { job: { asset: { attachments: [] }, jobStatus: "DRAFT", isOnHold: false } },
    });

    fireEvent.click(screen.getByTestId("trigger-upload-update"));

    expect(mutateMock).toHaveBeenCalledWith({
      jobId: "J1",
      attachments: [{ attachmentId: "UP-1", name: "upload.pdf", type: "pdf" }],
    });
  });

  it("mutates attachments for a claim using the claim id", () => {
    renderArea({
      entityType: "claim",
      jobData: { job: { asset: { attachments: [] }, jobStatus: "DRAFT", isOnHold: false } },
    });

    fireEvent.click(screen.getByTestId("trigger-upload-update"));

    expect(mutateMock).toHaveBeenCalledWith({
      jobId: "C1",
      attachments: [{ attachmentId: "UP-1", name: "upload.pdf", type: "pdf" }],
    });
  });

  it("updates the cached attachments after delete success", () => {
    const { queryClient } = renderArea({
      jobData: {
        job: {
          asset: {
            attachments: [
              { attachmentId: "A1", name: "first.pdf", type: "pdf" },
              { attachmentId: "A2", name: "second.pdf", type: "pdf" },
            ],
          },
          jobStatus: "IN_PROGRESS",
          isOnHold: false,
        },
      },
    });

    nextDeleteAttachments = [{ attachmentId: "A2", name: "second.pdf", type: "pdf" }];

    fireEvent.click(screen.getByTestId("delete-success-A1"));

    expect(queryClient.getQueryData<JobData>(["job", "J1"])?.job.asset.attachments).toEqual(
      nextDeleteAttachments,
    );
  });

  it("handles mutation success by invalidating cache, showing a message, scrolling, and tracking analytics", () => {
    const { invalidateQueriesSpy, setMessages } = renderArea({
      jobData: { job: { asset: { attachments: [] }, jobStatus: "DRAFT", isOnHold: false } },
    });

    act(() => {
      mutationOptions.onSuccess?.();
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["job", "J1"] });
    expect(setMessages).toHaveBeenCalledWith(expect.any(Function));
    expect(scrollToTopMock).toHaveBeenCalled();
    expect(getCachedJobContextMock).toHaveBeenCalledWith(expect.any(Object), "J1");
    expect(analyticsMock.trackJobSectionSaved).toHaveBeenCalledWith({
      cached: "context",
      jobSection: JobSection.DOCUMENTS,
    });

    const updater = setMessages.mock.calls[0]?.[0] as (
      prev: Array<{ text: string; type: string; duration: number }>,
    ) => Array<{ text: string; type: string; duration: number }>;

    expect(updater([])).toEqual([
      { text: "successSaveDocuments", type: "success", duration: 3000 },
    ]);
  });

  it("handles mutation error by showing an error message, scrolling, and tracking analytics", () => {
    const { setMessages } = renderArea({
      jobData: { job: { asset: { attachments: [] }, jobStatus: "DRAFT", isOnHold: false } },
    });
    const error = new Error("boom");

    act(() => {
      mutationOptions.onError?.(error);
    });

    expect(setMessages).toHaveBeenCalledWith(expect.any(Function));
    expect(scrollToTopMock).toHaveBeenCalled();
    expect(analyticsMock.trackActionFailed).toHaveBeenCalledWith({
      cached: "context",
      failedAction: AnalyticsEventName.JOB_SECTION_SAVED,
      failureReason: toFailureReason(error),
      jobSection: JobSection.DOCUMENTS,
    });

    const updater = setMessages.mock.calls[0]?.[0] as (
      prev: Array<{ text: string; type: string; duration: number }>,
    ) => Array<{ text: string; type: string; duration: number }>;

    expect(updater([])).toEqual([{ text: "errorSaveDocuments", type: "error", duration: 3000 }]);
  });

  it("does not render the upload field when no upload field exists in the area", () => {
    renderArea({
      jobData: { job: { asset: { attachments: [] }, jobStatus: "DRAFT", isOnHold: false } },
      areaOverride: {
        ...area,
        fields: [{ name: "description", label: "Description", type: "text" }],
      },
    });

    expect(screen.queryByTestId("upload-field")).not.toBeInTheDocument();
  });
});
