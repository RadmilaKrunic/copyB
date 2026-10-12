import { Button, Dialog, TextArea } from "@bosch/react-frok";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./DeleteClientDialog.scss";

interface DeleteClientDialogProps {
  isOpen: boolean;
  isPending: boolean;
  isError: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteClientDialog({
  isOpen,
  isPending,
  isError,
  onCancel,
  onConfirm,
}: Readonly<DeleteClientDialogProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const [note, setNote] = useState("");

  return (
    <Dialog
      modal
      open={isOpen}
      title={t("deleteClientConfirmationTitle")}
      className="delete-client-dialog"
      data-testid="delete-client-dialog"
      aria-describedby="delete-client-dialog-description"
      onClose={(event) => {
        event?.preventDefault();
        event?.stopPropagation();
        onCancel();
      }}
    >
      <div className="delete-client-dialog__body">
        <p id="delete-client-dialog-description" className="delete-client-dialog__description">
          {t("deleteClientConfirmationText")}
        </p>
        <TextArea
          id="delete-client-notes"
          className="delete-client-dialog__notes"
          label={t("deleteClientNotesLabel")}
          title={t("notes")}
          placeholder={t("deleteClientNotesPlaceholder")}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          disabled={isPending}
          data-testid="delete-client-notes"
        />
        {isError && <p role="alert">{t("errorDeleteClient")}</p>}
      </div>
      <div className="delete-client-dialog__actions modal-actions">
        <Button type="button" mode="secondary" disabled={isPending} onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="button" mode="primary" disabled={isPending} onClick={onConfirm}>
          {t("delete")}
        </Button>
      </div>
    </Dialog>
  );
}

export default DeleteClientDialog;
