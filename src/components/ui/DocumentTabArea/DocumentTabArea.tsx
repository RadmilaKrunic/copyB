import { useMutation, useQueryClient } from "@tanstack/react-query";
import Area from "components/generics/Area/GenericArea.types";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import GenericField from "components/generics/Field/GenericField";
import DocumentFile from "components/ui/DocumentFile/DocumentFile";
import { Attachment } from "modules/JobManagement/JobList/JobList.types";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useFormikContext } from "formik";
import { useUpdateJobAttachments, useJobById } from "api/services/jobs/hooks";
import { useClaimById } from "api/services/claims/hooks";
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
import { ClaimItem } from "../../../modules/ClaimManagement/ClaimOverview/Claims.types";
import { updateClaimAttachments } from "../../../api/services/claims/action";

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
  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
  const analytics = useAnalytics();
  const isClaim = entityType === "claim";

  const entityId = isClaim ? claimId : jobId;
  const queryKey = [isClaim ? "claim" : "job", entityId];

  // For claims, fetch both the claim and the job separately to ensure we have
  // complete attachment data. The claim may not include all job details.
  const claimQueryResult = useClaimById(isClaim ? entityId : "", {
    enabled: isClaim && !!entityId,
  });
  // Fetch the job directly for claims to get complete attachment data
  const jobQueryResult = useJobById(
    isClaim && claimQueryResult.data?.jobId ? claimQueryResult.data.jobId : "",
  );

  const saveDocumentsMutation = useUpdateJobAttachments({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      if (isClaim && claimQueryResult.data?.jobId) {
        void queryClient.invalidateQueries({ queryKey: ["job", claimQueryResult.data.jobId] });
      }
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

  const updateClaimDocumentsMutation = useMutation({
    mutationFn: ({ claimId, attachments }: { claimId: string; attachments: Attachment[] }) =>
      updateClaimAttachments(claimId, attachments),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      if (claimQueryResult.data?.jobId) {
        void queryClient.invalidateQueries({ queryKey: ["job", claimQueryResult.data.jobId] });
      }
      setMessages((prev) => [
        ...prev,
        { text: t("successSaveDocuments"), type: "success", duration: 3000 },
      ]);
      scrollToTop();
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { text: t("errorSaveDocuments"), type: "error", duration: 3000 },
      ]);
      scrollToTop();
    },
  });

  const jobData = isClaim ? null : queryClient.getQueryData<WithJobAssetAttachments>(queryKey);
  const claimData = isClaim ? claimQueryResult.data : queryClient.getQueryData<ClaimItem>(queryKey);
  // For claims, prefer job data fetched directly; fall back to claim's job data
  const jobAttachments = isClaim
    ? jobQueryResult.data?.job?.asset?.attachments
    : jobData?.job?.asset?.attachments;
  const claimJobAttachments = claimData?.job?.asset?.attachments;
  const attachments = jobAttachments || claimJobAttachments || [];
  const currentStatus = isClaim ? (claimData?.claimStatus ?? "") : (jobData?.job?.jobStatus ?? "");

  const userData = queryClient.getQueryData<HeaderUserData>(["user"]);
  const isOnHold = jobData?.job?.isOnHold ?? false;

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
  const isDeleteAllowed = isClaim ? false : !isOnHold && isUploadVisible;

  const handleDeleteSuccess = (updatedAttachments: Attachment[]) => {
    setFieldValue("upload", []);
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
    if (isClaim) {
      updateClaimDocumentsMutation.mutate({ claimId: entityId, attachments });
    } else {
      saveDocumentsMutation.mutate({ jobId: entityId, attachments });
    }
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
            existingFiles: attachments.filter(
              (attachment) => attachment.type !== "SYSTEM_GENERATED_RECEIPT",
            ),
            updateEntityAttachments,
          }}
        />
      )}
    </>
  );
}
