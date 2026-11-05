import { Dialog, Button, Icon, Notification } from "@bosch/react-frok";
import "./RepairLaborCostMatrixModal.scss";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import GenericForm from "@/components/generics/Form/GenericForm.types";
import { HeaderUserData } from "@/api/services/header/action";
import { useQueryClient } from "@tanstack/react-query";
import GenericField from "@/components/generics/Field/GenericField";
import { Ranges } from "@/api/services/laborCost/laborCost";
import {
  RepairCosts,
  Ranges as ServiceCenterRanges,
} from "../../../api/services/serviceCenters/serviceCenters.types";
import { useFormikContext } from "formik";
import {
  hasUnmappedUnits,
  MAX_LABOR_UNIT,
  useValidateRanges,
} from "./RepairLaborCostMatrixModal.validation";

interface RepairLaborCostMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedMatrixData: Ranges[] | ServiceCenterRanges[]) => void;
  matrixData: RepairCosts | null;
}
function RepairLaborCostMatrixModal({
  isOpen,
  onClose,
  matrixData,
  onSave,
}: Readonly<RepairLaborCostMatrixModalProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
  const [localMatrixData, setLocalMatrixData] = useState<Ranges[] | ServiceCenterRanges[] | null>(
    null,
  );
  const [hasAttemptedSave, setHasAttemptedSave] = useState<boolean>(false);
  const validation = useValidateRanges(localMatrixData, values);

  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const uiConfigurationForms = queryClient.getQueryData<{ forms: GenericForm[] }>([
    "UIConfiguration",
    user?.countryCode,
  ]);
  const laborRepairArea =
    uiConfigurationForms?.forms
      .find((form) => form.name === "AddASC")
      ?.sections.find((section) => section.name === "internalLaborConfiguration")
      ?.areas.find((area) => area.name === "laborRulesRepair") || null;

  const infoField =
    laborRepairArea?.fields.find((field) => field.name === "infoRepairLaborCost") || null;

  const deleteRow = (rowIndex: number) => {
    if (!localMatrixData) return;

    for (let i = rowIndex; i < localMatrixData.length - 1; i++) {
      const nextMin = values[`minimumLaborUnitMatrix_${i + 1}`];
      const nextMax = values[`maximumLaborUnitMatrix_${i + 1}`];
      const nextPrice = values[`laborPriceMatrix_${i + 1}`];

      void setFieldValue(`minimumLaborUnitMatrix_${i}`, nextMin);
      void setFieldValue(`maximumLaborUnitMatrix_${i}`, nextMax);
      void setFieldValue(`laborPriceMatrix_${i}`, nextPrice);
    }

    const lastIndex = localMatrixData.length - 1;
    void setFieldValue(`minimumLaborUnitMatrix_${lastIndex}`, undefined);
    void setFieldValue(`maximumLaborUnitMatrix_${lastIndex}`, undefined);
    void setFieldValue(`laborPriceMatrix_${lastIndex}`, undefined);

    setLocalMatrixData(localMatrixData.filter((_, idx) => idx !== rowIndex));
  };

  const handleSave = () => {
    setHasAttemptedSave(true);
    if (!validation.isValid) {
      return;
    }
    const updatedMatrixData = localMatrixData?.map((_row, rowIndex) => {
      const minUnit = Number(values[`minimumLaborUnitMatrix_${rowIndex}`] || 0);
      const maxUnit = Number(values[`maximumLaborUnitMatrix_${rowIndex}`] || 0);
      const laborPrice = Number(values[`laborPriceMatrix_${rowIndex}`] || 0);

      const labourUnitRange: number[] = [];
      for (let i = minUnit; i <= maxUnit; i++) {
        labourUnitRange.push(i);
      }
      return {
        labourUnitRange,
        value: laborPrice,
      };
    });
    updatedMatrixData?.sort((a, b) => a.labourUnitRange[0] - b.labourUnitRange[0]);
    onSave(updatedMatrixData as Ranges[] | ServiceCenterRanges[]);
    onClose();
  };

  const addNewRow = () => {
    let highestUnit = 0;
    localMatrixData?.forEach((_, rowIndex) => {
      const maxUnit = Number(values[`maximumLaborUnitMatrix_${rowIndex}`] || 0);
      if (maxUnit > highestUnit) {
        highestUnit = maxUnit;
      }
    });

    const nextMin = highestUnit >= MAX_LABOR_UNIT ? 1 : highestUnit + 1;
    const nextMax = MAX_LABOR_UNIT;

    const nextRowIndex = localMatrixData?.length ?? 0;

    void setFieldValue(`minimumLaborUnitMatrix_${nextRowIndex}`, nextMin);
    void setFieldValue(`maximumLaborUnitMatrix_${nextRowIndex}`, nextMax);
    void setFieldValue(`laborPriceMatrix_${nextRowIndex}`, 0);

    const newRow: ServiceCenterRanges = {
      labourUnitRange: [nextMin, nextMax],
      value: 0,
    };

    setLocalMatrixData([...(localMatrixData ?? []), newRow]);
  };

  useEffect(() => {
    if (!isOpen) {
      setLocalMatrixData(matrixData?.ranges ?? null);
      setHasAttemptedSave(false);
      return;
    }

    const initialRanges = matrixData?.ranges ?? null;
    setLocalMatrixData(initialRanges);
    initialRanges?.forEach((range, rowIndex) => {
      void setFieldValue(`minimumLaborUnitMatrix_${rowIndex}`, range.labourUnitRange[0]);
      void setFieldValue(`maximumLaborUnitMatrix_${rowIndex}`, range.labourUnitRange.at(-1));
      void setFieldValue(`laborPriceMatrix_${rowIndex}`, range.value);
    });
  }, [matrixData, setFieldValue, isOpen]);

  return (
    <Dialog
      modal
      open={isOpen}
      title={t("editLaborRepairRule")}
      className="repair-labor-cost-modal"
      data-testid="repair-labor-cost-modal"
      onClose={() => {
        setLocalMatrixData([]);
        onClose();
      }}
    >
      {hasAttemptedSave && !validation.isValid && (
        <Notification type="error">{validation.errorMessage}</Notification>
      )}

      <p>{t("infoLaborCostRuleChange")}</p>

      {localMatrixData?.map((range, rowIndex) => (
        <div
          className="repair-labor-cost-modal__row"
          key={`rowRange-${range.labourUnitRange[0]}-${range.labourUnitRange.at(-1)}`}
        >
          {laborRepairArea?.fields.map(
            (field) =>
              field.name.includes("Matrix") && (
                <div
                  className="repair-labor-cost-modal__field"
                  key={`field-${field.name}_${rowIndex}`}
                >
                  <GenericField
                    key={`${field.name}_${rowIndex}`}
                    field={{
                      ...field,
                      name: `${field.name}_${rowIndex}`,
                    }}
                  />
                </div>
              ),
          )}
          <button
            className="delete-btn"
            onClick={() => deleteRow(rowIndex)}
            aria-label={`Delete ${rowIndex} row`}
            data-testid={`delete-row-${rowIndex}`}
            type="button"
          >
            <Icon iconName="delete" aria-hidden="true" />
          </button>
        </div>
      ))}

      {hasUnmappedUnits(localMatrixData, values) && (
        <Button
          type="button"
          mode="tertiary"
          icon="add"
          onClick={addNewRow}
          data-testid="add-new-row-button"
        >
          {t("addNewRow")}
        </Button>
      )}

      {infoField && (
        <div className="repair-labor-cost-modal__info-field">
          <GenericField key={`infoField`} field={infoField} />
        </div>
      )}

      <div className="repair-labor-cost-modal__actions">
        <Button
          onClick={() => {
            setLocalMatrixData([]);
            onClose();
          }}
          mode="secondary"
          data-testid="cancel-button-repair-labor-cost-modal"
          className="repair-labor-cost-modal__button"
        >
          {t("cancel")}
        </Button>
        <Button
          onClick={handleSave}
          mode="primary"
          data-testid="save-button-repair-labor-cost-modal"
          className="repair-labor-cost-modal__button"
        >
          {t("save")}
        </Button>
      </div>
    </Dialog>
  );
}

export default RepairLaborCostMatrixModal;
