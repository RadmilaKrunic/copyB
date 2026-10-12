import {
  AnalyticsEventName,
  DocumentAction,
  FailureReason,
  type Analytics,
  type DocumentType,
} from "@/analytics";

export const trackDocumentDownload = (
  analytics: Analytics,
  documentType: DocumentType,
  file: Blob | null | undefined,
): void => {
  const documentAction = DocumentAction.DOWNLOADED;
  if (file) {
    analytics.trackDocumentAction({ documentAction, documentType });
    return;
  }
  analytics.trackActionFailed({
    failedAction: AnalyticsEventName.DOCUMENT_ACTION,
    failureReason: FailureReason.SYSTEM_PROBLEM,
    documentAction,
    documentType,
  });
};
