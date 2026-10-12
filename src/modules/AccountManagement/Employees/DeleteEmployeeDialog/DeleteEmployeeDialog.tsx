import { Dialog } from "@bosch/react-frok";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAnalytics, toFailureReason, AnalyticsEventName, EmployeeAction } from "@/analytics";
import { useNavigate } from "react-router-dom";
import axiosClient from "api/axios-client/axiosClient";
import { useContext } from "react";
import { MessagesContext } from "contexts/messagescontext";

function DeleteEmployeeDialog({
  employeeId,
  showDeleteDialog,
  setShowDeleteDialog,
  setPagination,
}: Readonly<{
  employeeId: string;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (value: boolean) => void;
  setPagination?: React.Dispatch<
    React.SetStateAction<{
      page: number;
      pageSize: number;
    }>
  >;
}>) {
  const { setMessages } = useContext(MessagesContext);
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const analytics = useAnalytics();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return (
    <Dialog
      className="confirm-delete"
      cancelLabel={t("cancel")}
      confirmLabel={t("confirm")}
      headline={t("confirmDelete")}
      onCancel={() => setShowDeleteDialog(false)}
      onClose={() => setShowDeleteDialog(false)}
      onConfirm={() => {
        axiosClient
          .delete(`/v1/users/${employeeId}`)
          .then(() => {
            void queryClient.invalidateQueries({ queryKey: ["employees"] });
            setShowDeleteDialog(false);
            sessionStorage.removeItem("employeeList-currentPage");
            sessionStorage.removeItem("employeeList-pageSize");
            if (setPagination) {
              setPagination({ page: 1, pageSize: 10 });
            }
            analytics.trackEmployeeStatusChanged({ employeeAction: EmployeeAction.DELETED });
            navigate("/employee-list");
          })
          .catch((error: unknown) => {
            setMessages([{ type: "error", duration: 5000, text: t("failedToDeleteEmployee") }]);
            setShowDeleteDialog(false);
            analytics.trackActionFailed({
              failedAction: AnalyticsEventName.EMPLOYEE_STATUS_CHANGED,
              failureReason: toFailureReason(error),
              employeeAction: EmployeeAction.DELETED,
            });
          });
      }}
      open={showDeleteDialog}
    ></Dialog>
  );
}

export default DeleteEmployeeDialog;
