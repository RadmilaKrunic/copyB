import { HeaderUserData } from "@/api/services/header/action";
import Area from "@/components/generics/Area/GenericArea.types";
import { GenericFormContext } from "@/components/generics/Form/GenericForm.context";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@bosch/react-frok";
import { useQueryClient } from "@tanstack/react-query";
import { useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./AscLaborRulesExchangeArea.scss";
import {
  LABOR_COST_PER_UNIT_FIELD_BASE_NAMES,
  mapLaborCostPerUnitLevelFields,
  trimReasonForExchange,
  getExchangeRuleMethod,
} from "./AscLaborRulesExchangeArea.utils";
import { LaborCostConfigurationResponse } from "@/api/services/laborCost/laborCost";
import GenericField from "@/components/generics/Field/GenericField";
import { useFormikContext } from "formik";
import { useAscId } from "../AscId.context";
import {
  DraftServiceCenter,
  ServiceCenter,
} from "../../../../api/services/serviceCenters/serviceCenters.types";

function AscLaborRulesExchangeArea({ area }: Readonly<{ area: Area }>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
  const ascId = useAscId();

  const asc = queryClient.getQueryData<DraftServiceCenter | ServiceCenter | undefined>([
    "ASC",
    ascId,
  ]);
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);

  const laborCostConfig = queryClient.getQueryData<LaborCostConfigurationResponse>([
    "laborCostConfig",
    user?.countryCode,
  ])?.laborCostMethod;

  const { selectedLaborExchangeRule, exchangeLaborCostTableData } = useContext(GenericFormContext);
  let ascSourceConfig;

  if (asc) {
    if ("serviceCenter" in asc) {
      ascSourceConfig = asc.serviceCenter.laborCostMethod;
    } else {
      ascSourceConfig = asc.laborCostMethod;
    }
  } else {
    ascSourceConfig = undefined;
  }
  const laborConfigSource = (asc ?? undefined) ? ascSourceConfig : laborCostConfig;
  const laborRulesTable = exchangeLaborCostTableData;

  const laborCostPerUnit = mapLaborCostPerUnitLevelFields(
    laborConfigSource,
    selectedLaborExchangeRule,
  );
  const exchangeRuleMethod = getExchangeRuleMethod(laborConfigSource, selectedLaborExchangeRule);

  const infoExchangeLaborCostMatrixText = area.fields.find(
    (field) => field.name === "infoExchangeLaborCostMatrix",
  );

  useEffect(() => {
    if (!selectedLaborExchangeRule || !laborCostPerUnit) {
      return;
    }
    Object.entries(LABOR_COST_PER_UNIT_FIELD_BASE_NAMES).forEach(([unitKey, fieldBaseName]) => {
      const dynamicFieldName = `${fieldBaseName}_${selectedLaborExchangeRule}`;
      const targetValue = laborCostPerUnit[unitKey];

      if (values[dynamicFieldName] === undefined) {
        void setFieldValue(dynamicFieldName, targetValue);
      }
    });
  }, [selectedLaborExchangeRule, laborCostPerUnit, setFieldValue, values]);

  return (
    <>
      <div className="area-fields">
        {exchangeRuleMethod === "LABOR_UNIT_X_COST_FROM_ASC"
          ? area.fields.map(
              (field) =>
                field.name.includes("laborCostPerUnit") && (
                  <GenericField
                    key={`${field.name}_${selectedLaborExchangeRule}`}
                    field={{
                      ...field,
                      name: `${field.name}_${selectedLaborExchangeRule}`,
                    }}
                  />
                ),
            )
          : infoExchangeLaborCostMatrixText && (
              <GenericField
                field={{
                  ...infoExchangeLaborCostMatrixText,
                  infoText:
                    exchangeRuleMethod === "MATRIX"
                      ? "infoExchangeLaborCostMatrixText"
                      : "infoExchangeLaborCostERPText",
                }}
              />
            )}
      </div>
      <Table className="asc-labor-rules-exchange-table" data-area-name={area.name}>
        <TableHead>
          <TableRow>
            <TableCell header>{t("exchangeReason")}</TableCell>
            <TableCell header>{t("code")}</TableCell>
            <TableCell header>{t("sparePartLaborUnits")}</TableCell>
            <TableCell header>{t("newToolExchangeLaborUnits")}</TableCell>
            <TableCell header>{t("accessoryLaborUnits")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {laborRulesTable?.map((row) => (
            <TableRow key={row.reasonType}>
              <TableCell className="asc-labor-rules-exchange-table__cell">
                {trimReasonForExchange(t(row.reasonType))}
              </TableCell>
              <TableCell className="asc-labor-rules-exchange-table-code__cell">
                {row.reasonType}
              </TableCell>
              <TableCell>{row.sparePartLaborUnit}</TableCell>
              <TableCell>{row.newToolExchangeLaborUnit}</TableCell>
              <TableCell>{row.accessoryLaborUnit}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
export default AscLaborRulesExchangeArea;
