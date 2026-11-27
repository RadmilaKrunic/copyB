import { Icon } from "@bosch/react-frok";
import { useEffect, useRef, useContext } from "react";
import { useFormikContext } from "formik";
import { useQueryClient } from "@tanstack/react-query";
import { GenericFormContext } from "@/components/generics/Form/GenericForm.context";
import "./FreightPackagingCostConfigurationArea.scss";
import { useTranslation } from "react-i18next";
import type Area from "@/components/generics/Area/GenericArea.types";
import GenericField from "@/components/generics/Field/GenericField";
import type { HeaderUserData } from "@/api/services/header/action";
import type { LaborCostConfigurationResponse } from "@/api/services/laborCost/laborCost";
import type {
  DraftServiceCenter,
  ServiceCenter,
} from "../../../../api/services/serviceCenters/serviceCenters.types";
import { useAscId } from "../AscId.context";
import {
  getCostInputValuesFromLimits,
  getCostRadioValuesFromLimits,
  isFreightPackagingAllowed,
} from "./FreightPackagingFields.utils";
import { CountryConfig } from "@/api/services/countryConfiguration/countryConfiguration";

function FreightPackagingCostConfigurationArea({ area }: Readonly<{ area: Area }>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();

  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
  const { freightPackagingEditState, setFreightPackagingEditState } =
    useContext(GenericFormContext);
  const initializedCostFields = useRef(new Set<string>());

  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const countryConfiguration = queryClient.getQueryData<CountryConfig>([
    "countryConfiguration",
    user?.countryCode,
  ]);

  const laborCostConfig = queryClient.getQueryData<LaborCostConfigurationResponse>([
    "laborCostConfig",
    user?.countryCode,
  ]);

  const ascId = useAscId();
  const asc = ascId
    ? queryClient.getQueryData<DraftServiceCenter | ServiceCenter>(["ASC", ascId])
    : undefined;

  const isFreight = area.name === "freightCostConfiguration";
  const costType = isFreight ? "Freight" : "Packaging";
  const editKey = isFreight ? "freight" : "packaging";
  const isEditing = freightPackagingEditState ? freightPackagingEditState[editKey] : true;

  let savedCostDetails: ServiceCenter["freightCostDetails"] | undefined;
  if (asc) {
    const savedServiceCenter = "serviceCenter" in asc ? asc.serviceCenter : asc;
    if (isFreight) {
      savedCostDetails = savedServiceCenter.freightCostDetails;
    } else {
      savedCostDetails = savedServiceCenter.packagingCostDetails;
    }
  }

  const configuredCostDetails = isFreight
    ? laborCostConfig?.freightCostDetails
    : laborCostConfig?.packagingCostDetails;

  const toggleField = area.fields.find((field) => field.name.includes("toggle"));
  const toggleName = `toggle${costType}Cost`;
  const toggleValue = savedCostDetails?.isAllowed ?? configuredCostDetails?.isAllowed ?? false;

  const radioPrefix = `typeOfCost${costType}Level`;
  const valuePrefix = `${costType.toLowerCase()}CostType_`;

  const startEditing = () => {
    const editValues = Object.fromEntries(
      Object.entries(values).filter(
        ([fieldName]) =>
          fieldName === toggleName ||
          fieldName.startsWith(radioPrefix) ||
          fieldName.startsWith(valuePrefix),
      ),
    );
    setFreightPackagingEditState?.((previous) => ({
      ...previous,
      [editKey]: true,
      editValues: { ...previous.editValues, [editKey]: editValues },
    }));
  };

  useEffect(() => {
    if (!toggleField || typeof values[toggleField.name] === "boolean") {
      return;
    }
    void setFieldValue(toggleField.name, toggleValue);

    const configuredValues = {
      ...getCostRadioValuesFromLimits(configuredCostDetails?.limits, costType),
    };
    const savedValues = {
      ...getCostRadioValuesFromLimits(savedCostDetails?.limits, costType),
    };
    const inputValues = getCostInputValuesFromLimits(
      savedCostDetails?.limits,
      configuredCostDetails?.limits,
      costType,
    );

    Object.entries({ ...configuredValues, ...savedValues, ...inputValues }).forEach(
      ([fieldName, value]) => {
        if (initializedCostFields.current.has(fieldName)) return;
        initializedCostFields.current.add(fieldName);
        void setFieldValue(fieldName, value, false);
      },
    );
  }, [
    setFieldValue,
    toggleField,
    toggleValue,
    values,
    costType,
    savedCostDetails,
    configuredCostDetails,
  ]);

  return (
    isFreightPackagingAllowed(countryConfiguration, costType) && (
      <>
        <div className="freight-packaging-overview-header">
          <p className="area-title">{t(area.name)}</p>
          {freightPackagingEditState && setFreightPackagingEditState && !isEditing && (
            <button
              type="button"
              className="a-icon boschicon-bosch-ic-edit custom-pencil-button"
              data-testid={`edit-button-${editKey}-cost-configuration`}
              onClick={startEditing}
            />
          )}
        </div>

        <div className="freight-packaging-cost-configuration-area">
          <Icon
            iconName={area.name === "freightCostConfiguration" ? "van-delivery" : "box-closed"}
            className="freight-packaging-icon"
          />
          <div>
            <p className="description-title-freight-packaging">
              {area.name === "freightCostConfiguration"
                ? t("freightInfoTitle")
                : t("packagingInfoTitle")}
            </p>
            <p className="description-text-freight-packaging">
              {t("freightPackagingInfoSubtitle")}
            </p>
          </div>
          {toggleField && (
            <div className="toggle-field-container-freight-packaging">
              <GenericField field={{ ...toggleField, isDisabled: !isEditing }} />
            </div>
          )}
        </div>
      </>
    )
  );
}

export default FreightPackagingCostConfigurationArea;
