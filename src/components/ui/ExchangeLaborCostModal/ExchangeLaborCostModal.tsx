import { Button, Dialog } from "@bosch/react-frok";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useFormikContext } from "formik";
import "./ExchangeLaborCostModal.scss";
import { useTranslation } from "react-i18next";

import {
  trimReasonForExchange,
  type LaborExchangeRow,
  getExchangeRuleMethod,
} from "modules/AccountManagement/ASC/AscLaborRulesExchangeArea/AscLaborRulesExchangeArea.utils";
import GenericField from "@/components/generics/Field/GenericField";
import { HeaderUserData } from "@/api/services/header/action";
import GenericForm from "@/components/generics/Form/GenericForm.types";
import { LaborCostMethod } from "../../../api/services/laborCost/laborCost";
import { LaborCostMethod as ServiceCenterLaborCostMethod } from "../../../api/services/serviceCenters/serviceCenters.types";

interface ExchangeLaborCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableData: LaborExchangeRow[];
  onSave: (tableData: LaborExchangeRow[]) => void;
  currentExchangeLaborRule: string;
  currentExchangeMethod: LaborCostMethod | ServiceCenterLaborCostMethod | undefined;
}

function ExchangeLaborCostModal({
  isOpen,
  onClose,
  tableData,
  onSave,
  currentExchangeLaborRule,
  currentExchangeMethod,
}: Readonly<ExchangeLaborCostModalProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();

  const queryClient = useQueryClient();
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const uiConfigurationForms = queryClient.getQueryData<{ forms: GenericForm[] }>([
    "UIConfiguration",
    user?.countryCode,
  ]);
  const laborExchangeArea =
    uiConfigurationForms?.forms
      .find((form) => form.name === "AddASC")
      ?.sections.find((section) => section.name === "internalLaborConfiguration")
      ?.areas.find((area) => area.name === "laborRulesExchange") || null;

  const infoField =
    laborExchangeArea?.fields.find((field) => field.name === "infoExchangeLaborCost") || null;

  const exchangeRuleMethod = getExchangeRuleMethod(currentExchangeMethod, currentExchangeLaborRule);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    tableData.forEach((row, rowIndex) => {
      void setFieldValue(
        `exchangeReason_${currentExchangeLaborRule}_${rowIndex}`,
        trimReasonForExchange(t(row.reasonType)),
      );
      void setFieldValue(`exchangeCode_${currentExchangeLaborRule}_${rowIndex}`, row.reasonType);
      void setFieldValue(
        `sparePartLaborUnits_${currentExchangeLaborRule}_${rowIndex}`,
        row.sparePartLaborUnit,
      );
      void setFieldValue(
        `newToolExchangeLaborUnits_${currentExchangeLaborRule}_${rowIndex}`,
        row.newToolExchangeLaborUnit,
      );
      void setFieldValue(
        `accessoryLaborUnits_${currentExchangeLaborRule}_${rowIndex}`,
        row.accessoryLaborUnit,
      );
    });
  }, [isOpen, setFieldValue, tableData, t, currentExchangeLaborRule]);

  const handleSave = () => {
    const updatedTableData = tableData.map((row, rowIndex) => {
      const sparePartLaborUnit =
        values[`sparePartLaborUnits_${currentExchangeLaborRule}_${rowIndex}`];
      const newToolExchangeLaborUnit =
        values[`newToolExchangeLaborUnits_${currentExchangeLaborRule}_${rowIndex}`];
      const accessoryLaborUnit =
        values[`accessoryLaborUnits_${currentExchangeLaborRule}_${rowIndex}`];

      return {
        reasonType: row.reasonType,
        sparePartLaborUnit: Number(sparePartLaborUnit),
        newToolExchangeLaborUnit: Number(newToolExchangeLaborUnit),
        accessoryLaborUnit: Number(accessoryLaborUnit),
      };
    });

    onSave(updatedTableData);
    onClose();
  };

  return (
    <Dialog
      modal
      open={isOpen}
      title={t("editLaborExchangeRule")}
      className="exchange-labor-cost-modal"
      data-testid="exchange-labor-cost-modal"
      onClose={onClose}
    >
      <p>{t("infoLaborCostRuleChange")}</p>

      <div className="area-fields labor-cost-per-unit-popup--wrapper">
        {laborExchangeArea?.fields.map(
          (field) =>
            field.name.includes("laborCostPerUnit") &&
            exchangeRuleMethod === "LABOR_UNIT_X_COST_FROM_ASC" && (
              <GenericField
                key={`${field.name}_${currentExchangeLaborRule}`}
                field={{
                  ...field,
                  name: `${field.name}_${currentExchangeLaborRule}`,
                  isDisabled: false,
                }}
              />
            ),
        )}
      </div>

      {tableData.map((row, rowIndex) => (
        <div key={row.reasonType} className="exchange-labor-cost-modal__row">
          {laborExchangeArea?.fields.map(
            (field) =>
              !field.name.includes("info") &&
              !field.name.includes("edit") &&
              !field.name.includes("laborCostPerUnit") && (
                <div
                  className="exchange-labor-cost-modal__field"
                  key={`${field.name}_${currentExchangeLaborRule}_${rowIndex}`}
                >
                  <GenericField
                    key={`${field.name}_${rowIndex}`}
                    field={{
                      ...field,
                      name: `${field.name}_${currentExchangeLaborRule}_${rowIndex}`,
                    }}
                  />
                </div>
              ),
          )}
        </div>
      ))}
      {infoField && (
        <div className="exchange-labor-cost-modal__info-field">
          <GenericField key={`infoField`} field={infoField} />
        </div>
      )}
      <div className="exchange-labor-cost-modal__actions">
        <Button
          onClick={onClose}
          mode="secondary"
          data-testid="cancel-button-exchange-labor-cost-modal"
          className="exchange-labor-cost-modal__button"
        >
          {t("cancel")}
        </Button>
        <Button
          onClick={handleSave}
          mode="primary"
          data-testid="save-button-exchange-labor-cost-modal"
          className="exchange-labor-cost-modal__button"
        >
          {t("save")}
        </Button>
      </div>
    </Dialog>
  );
}

export default ExchangeLaborCostModal;
