import Area from "@/components/generics/Area/GenericArea.types";
import { GenericFormContext } from "@/components/generics/Form/GenericForm.context";
import { useContext, useEffect, useRef, useState, type ReactElement } from "react";
import { useFormikContext } from "formik";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Table, TableBody, TableCell, TableHead, TableRow } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import "./AscLaborRulesRepairArea.scss";
import GenericField from "@/components/generics/Field/GenericField";
import { CountryConfig } from "@/api/services/countryConfiguration/countryConfiguration";
import { HeaderUserData } from "@/api/services/header/action";
import { formatRangesAndValues, fillLaborRateField } from "./AscLaborRulesRepairArea.utils";
import { useLocation } from "react-router-dom";

function AscLaborRulesRepairArea({ area }: Readonly<{ area: Area }>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const location = useLocation();

  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const countryConfig = queryClient.getQueryData<CountryConfig>([
    "countryConfiguration",
    user?.countryCode,
  ]);
  const { repairLaborCostMatrixData, actionCallbacks } = useContext(GenericFormContext);

  const [isEditing, setIsEditing] = useState(false);

  const laborCostERPField = area.fields.find((field) => field.name === "laborCostERP");
  const infoLaborCostASCField = area.fields.find((field) => field.name === "infoLaborCostASC");
  const { values, setFieldValue, setErrors, setTouched } =
    useFormikContext<Record<string, unknown>>();

  const laborRulesTable = repairLaborCostMatrixData;
  const laborRateField = fillLaborRateField(laborRulesTable, area);
  const seededFieldsRef = useRef<Set<string>>(new Set());
  let laborFieldContent: ReactElement | null = null;

  useEffect(() => {
    seededFieldsRef.current.clear();
    if (!laborRateField) return;
    const currentValue = values[laborRateField.name];
    const hasExistingValue =
      currentValue !== undefined && currentValue !== null && currentValue !== "";
    const seedValue = laborRulesTable?.value;

    if (
      !hasExistingValue &&
      seedValue !== undefined &&
      seedValue !== null &&
      !seededFieldsRef.current.has(laborRateField.name)
    ) {
      setFieldValue(laborRateField.name, seedValue);
      seededFieldsRef.current.add(laborRateField.name);
    }
  }, [laborRateField, laborRulesTable, values, setFieldValue]);
  if (laborRulesTable?.method === "MATRIX") {
    laborFieldContent = (
      <Table className="asc-labor-rules-repair-table">
        <TableHead>
          <TableRow>
            <TableCell header>{t("laborUnitRange")}</TableCell>
            <TableCell header>{`${countryConfig?.currencySymbol} ${t("laborCost")}`}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {laborRulesTable.ranges?.map((range) => {
            const { labourUnitRange, laborValue } = formatRangesAndValues(range);
            return (
              <TableRow key={labourUnitRange}>
                <TableCell>{labourUnitRange}</TableCell>
                <TableCell>{laborValue}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  } else if (laborRulesTable?.method === "LABOR_UNIT_X_COST_FROM_ASC") {
    if (laborRateField) {
      laborFieldContent = (
        <>
          <div className="asc-labor-rate-filed" key={laborRateField.name}>
            <GenericField
              field={{ ...laborRateField, isDisabled: location.hash ? !isEditing : false }}
            />
          </div>
          {infoLaborCostASCField && <GenericField field={infoLaborCostASCField} />}
          {location.hash && !isEditing && (
            <div className="overview-container-wrapper">
              <button
                type="button"
                className="a-icon boschicon-bosch-ic-edit custom-pencil-button custom-pencil-button-position"
                data-testid="edit-button-repair-labor-rate-field"
                onClick={() => setIsEditing((prev) => !prev)}
              />
            </div>
          )}
          {isEditing && (
            <div className="repair-labor-rate-field__actions">
              <Button
                onClick={() => {
                  setIsEditing(false);
                }}
                mode="secondary"
                data-testid="cancel-button-repair-labor-rate-field"
                className="repair-labor-rate-field__button"
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  if (actionCallbacks?.onSaveUpdate) {
                    actionCallbacks.onSaveUpdate(values, {
                      setErrors: setErrors as any,
                      setTouched: setTouched as any,
                      setFieldValue: setFieldValue as any,
                    });
                  }
                }}
                mode="primary"
                data-testid="save-button-repair-labor-rate-field"
                className="repair-labor-rate-field__button"
              >
                {t("save")}
              </Button>
            </div>
          )}
        </>
      );
    }
  } else if (laborCostERPField) {
    laborFieldContent = (
      <div className="asc-labor-cost-erp-field">
        <GenericField field={laborCostERPField} />
      </div>
    );
  }

  return <>{laborFieldContent}</>;
}
export default AscLaborRulesRepairArea;
