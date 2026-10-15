import { useQueryClient } from "@tanstack/react-query";
import Area from "components/generics/Area/GenericArea.types";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import GenericField from "components/generics/Field/GenericField";
import DocumentFile from "components/ui/DocumentFile/DocumentFile";
import { Attachment } from "modules/JobManagement/JobList/JobList.types";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useFormikContext } from "formik";
import { useUpdateJobAttachments } from "api/services/jobs/hooks";
import { HeaderUserData } from "api/services/header/action";
import {
  checkActionCondition,
  ActionDependencyContext,
} from "components/generics/Action/actionDependency";
import { MessagesContext } from "contexts/messagescontext";
import "./DocumentTabArea.scss";
import { scrollToTop } from "utils/scrollToError";
import { useAnalytics, toFailureReason, AnalyticsEventName, JobSection } from "@/analytics";
import { getCachedJobContext } from "modules/JobManagement/jobAnalyticsContext";

type WithJobAssetAttachments = {
  job: { asset: { attachments: Attachment[] }; isOnHold?: boolean; jobStatus?: string };
};

type DocumentTabAreaProps = {
  entityType?: "job" | "claim";
  area?: Area;
};

export default function DocumentTabArea({
  entityType = "job",
  area,
}: Readonly<DocumentTabAreaProps>) {
  const { jobId, claimId } = useParams<{ jobId: string; claimId: string }>();
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const { onDeleteStart, onDeleteEnd, actionCallbacks } = useContext(GenericFormContext);
  const { setMessages } = useContext(MessagesContext);
  const { values } = useFormikContext<Record<string, unknown>>();
  const analytics = useAnalytics();

  const entityId = entityType === "claim" ? claimId : jobId;
  const queryKey = [entityType === "claim" ? "claim" : "job", entityId];

  const saveDocumentsMutation = useUpdateJobAttachments({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setMessages((prev) => [
        ...prev,
        { text: t("successSaveDocuments"), type: "success", duration: 3000 },
      ]);
      scrollToTop();
      analytics.trackJobSectionSaved({
        ...getCachedJobContext(queryClient, entityId),
        jobSection: JobSection.DOCUMENTS,
      });
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        { text: t("errorSaveDocuments"), type: "error", duration: 3000 },
      ]);
      scrollToTop();
      analytics.trackActionFailed({
        ...getCachedJobContext(queryClient, entityId),
        failedAction: AnalyticsEventName.JOB_SECTION_SAVED,
        failureReason: toFailureReason(error),
        jobSection: JobSection.DOCUMENTS,
      });
    },
  });

  const data = queryClient.getQueryData<WithJobAssetAttachments>(queryKey);
  const currentStatus = data?.job?.jobStatus ?? "";

  const userData = queryClient.getQueryData<HeaderUserData>(["user"]);
  const isOnHold = data?.job?.isOnHold ?? false;

  const uploadField = area?.fields?.find((f) => f.type === "upload");
  const areaActions = area?.actions ?? [];

  const saveAction = areaActions.find((a) => a.onAction === "onSaveDocuments");
  const ctx: ActionDependencyContext = {
    currentStatus,
    formValues: values,
    user: userData,
    actionCallbacks,
  };
  const uploadVisibilityCondition = saveAction?.dependency?.showAction
    ? { ...saveAction.dependency.showAction, nonEmpty: undefined, method: undefined }
    : undefined;
  const isUploadVisible = checkActionCondition(uploadVisibilityCondition, ctx);
  const isSaveDocumentsEnabled = saveAction
    ? checkActionCondition(saveAction.dependency?.enableAction, ctx)
    : true;
  const isDeleteAllowed = entityType === "claim" ? false : !isOnHold && isUploadVisible;

  const attachments = data?.job?.asset?.attachments || [];

  const handleDeleteSuccess = (updatedAttachments: Attachment[]) => {
    if (updatedAttachments !== undefined) {
      queryClient.setQueryData<WithJobAssetAttachments>(queryKey, (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          job: {
            ...oldData.job,
            asset: {
              ...oldData.job.asset,
              attachments: updatedAttachments,
            },
          },
        };
      });
    }
  };

  const updateEntityAttachments = (attachments: Attachment[]) => {
    if (!entityId || !isSaveDocumentsEnabled) return;
    saveDocumentsMutation.mutate({ jobId: entityId, attachments });
  };

  return (
    <>
      <div className="document-tab-area__attachments_list">
        {attachments.length > 0 ? (
          attachments.map((attachment) => (
            <DocumentFile
              className="modal-document-block"
              key={attachment.attachmentId}
              name={attachment.name}
              type={attachment.type}
              fileId={attachment.attachmentId}
              sourceReferenceId={attachment.sourceReferenceId}
              jobId={entityId}
              dataTestid={attachment.attachmentId}
              enableDownload={true}
              onDeleteSuccess={handleDeleteSuccess}
              onDeleteStart={onDeleteStart}
              onDeleteEnd={onDeleteEnd}
              hideDelete={!isDeleteAllowed}
            />
          ))
        ) : (
          <p>{t("NoDocumentsFound")}</p>
        )}
      </div>
      {uploadField && isUploadVisible && (
        <GenericField
          field={{
            ...uploadField,
            isDisabled: isOnHold,
            existingFiles: attachments,
            updateEntityAttachments,
          }}
        />
      )}
    </>
  );
}
