import { ActivityIndicator, Dialog } from "@bosch/react-frok";
import { Formik, Form } from "formik";
import GenericField from "../../../../components/generics/Field/GenericField";
import axiosClient from "../../../../api/axios-client/axiosClient";
import { API_TIMEOUTS } from "../../../../api/axios-client/timeouts";
import { useContext, useEffect, useRef, useState } from "react";
import { MessagesContext } from "../../../../contexts/messagescontext";
import { useTranslation } from "react-i18next";
import { useAnalytics, toFailureReason, AnalyticsEventName } from "@/analytics";
import "./ClaimListExportDialog.scss";
import { dateRangeField } from "./ClaimListExportDialog.data";
interface ClaimExportFormValues {
  dateRange: string | null;
}

function ClaimListExportDialog({
  setIsExportOpen,
}: {
  readonly setIsExportOpen: (isOpen: boolean) => void;
}) {
  const { setMessages } = useContext(MessagesContext);
  const analytics = useAnalytics();
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const [isExporting, setIsExporting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const exportClaimsCsv = async (
    dateRange: ClaimExportFormValues["dateRange"],
    setFieldError: (field: string, message: string | undefined) => void,
    setFieldTouched: (
      field: string,
      touched?: boolean,
      shouldValidate?: boolean,
    ) => Promise<void | object>,
  ) => {
    if (isExporting) {
      return;
    }

    const [fromDate = "", toDate = ""] = (dateRange ?? "").split(",");
    if (!fromDate || !toDate) {
      await setFieldTouched("dateRange", true, false);
      setFieldError("dateRange", t("dateRangeNotSet"));
      return;
    }

    setFieldError("dateRange", undefined);
    setIsExporting(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await axiosClient.post(
        "/v1/claims/csv-export",
        { fromDate: fromDate.split("T")[0], toDate: toDate.split("T")[0] },
        {
          responseType: "blob",
          timeout: API_TIMEOUTS.LONG,
          headers: { Accept: "text/csv" },
          signal: controller.signal,
        },
      );

      const blob = response.data as Blob;

      const filename =
        (response.headers["content-disposition"] as string)
          ?.split("filename=")[1]
          ?.replaceAll('"', "") ?? `claims_${fromDate?.split("T")[0]}-${toDate?.split("T")[0]}.csv`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      anchor.remove();

      setTimeout(() => URL.revokeObjectURL(url), 10000);

      analytics.trackListExported();
    } catch (error) {
      if (controller.signal.aborted || !isMountedRef.current) {
        return;
      }

      setMessages((prev) => [...prev, { type: "error", text: t("errorExportClaims") }]);
      analytics.trackActionFailed({
        failedAction: AnalyticsEventName.LIST_EXPORTED,
        failureReason: toFailureReason(error),
      });
    } finally {
      if (isMountedRef.current) {
        setIsExporting(false);
        setIsExportOpen(false);
      }
    }
  };
  return (
    <Formik<ClaimExportFormValues> initialValues={{ dateRange: null }} onSubmit={() => undefined}>
      {({ values, setFieldError, setFieldTouched }) => (
        <Dialog
          className="claim-list-export-dialog"
          cancelLabel={t("cancel")}
          cancelButton={{ disabled: isExporting }}
          confirmLabel={t("export")}
          confirmButton={{ disabled: isExporting }}
          title={t("exportClaims")}
          onCancel={() => {
            if (isExporting) {
              return;
            }

            setIsExportOpen(false);
          }}
          onClose={() => {
            if (isExporting) {
              abortControllerRef.current?.abort();
              return;
            }

            setIsExportOpen(false);
          }}
          modal
          onConfirm={() => {
            if (isExporting) {
              return;
            }

            void exportClaimsCsv(values.dateRange, setFieldError, setFieldTouched);
          }}
          open={true}
        >
          <div className="dialog-description">
            {t(isExporting ? "exportingClaimsLoader" : "claimExportDescription")}
          </div>
          <div className="dialog-instruction">
            {isExporting ? <ActivityIndicator size="small" /> : <b>{t("selectDateRange")}</b>}
          </div>
          {!isExporting && (
            <Form>
              <GenericField field={dateRangeField} />
            </Form>
          )}
        </Dialog>
      )}
    </Formik>
  );
}

export default ClaimListExportDialog;
