import { useContext } from "react";
import { useFormikContext, type FormikErrors, type FormikTouched } from "formik";
import { useQueryClient } from "@tanstack/react-query";
import {
  GenericFormContext,
  type ActionCallbackHelpers,
} from "@/components/generics/Form/GenericForm.context";
import GenericField from "@/components/generics/Field/GenericField";
import Area from "@/components/generics/Area/GenericArea.types";
import { useTranslation } from "react-i18next";
import {
  getCostFieldsForSelectedLevel,
  getCostInputFieldsForSelectedLevel,
  getCostInfoFieldsForSelectedLevel,
  isFreightPackagingAllowed,
  isCostConfigurationEnabled,
} from "./FreightPackagingFields.utils";
import "./FreightPackagingCostConfigurationArea.scss";
import { Button } from "@bosch/react-frok";
import { CountryConfig } from "@/api/services/countryConfiguration/countryConfiguration";
import { HeaderUserData } from "@/api/services/header/action";

function FreightPackagingFields({ area }: Readonly<{ area: Area }>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();

  const { values, setFieldValue, setErrors, setTouched } =
    useFormikContext<Record<string, unknown>>();
  const {
    selectedFreightRule,
    selectedPackagingRule,
    freightPackagingEditState,
    setFreightPackagingEditState,
    actionCallbacks,
  } = useContext(GenericFormContext);
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const countryConfiguration = queryClient.getQueryData<CountryConfig>([
    "countryConfiguration",
    user?.countryCode,
  ]);

  const costType = area.name.includes("packagingCostType") ? "Packaging" : "Freight";
  const editKey = costType === "Freight" ? "freight" : "packaging";
  const isEditing = freightPackagingEditState ? freightPackagingEditState[editKey] : true;
  if (!isCostConfigurationEnabled(values, costType)) return null;

  const selectedRule = costType === "Packaging" ? selectedPackagingRule : selectedFreightRule;
  const fields = getCostFieldsForSelectedLevel(area.fields, selectedRule, costType);

  const radioFields = fields.filter((field) => field.type === "radiogroup");
  const radioFieldName = radioFields[0]?.name;
  const selectedRadioValue = radioFieldName
    ? (values[radioFieldName] ?? radioFields[0]?.defaultValue)
    : undefined;

  const costFields = getCostInputFieldsForSelectedLevel(
    fields,
    radioFieldName,
    selectedRadioValue,
    costType,
  );

  const infoFields = getCostInfoFieldsForSelectedLevel(area.fields, selectedRule, costType, values);

  const cancelEditing = () => {
    Object.entries(freightPackagingEditState?.editValues?.[editKey] ?? {}).forEach(
      ([fieldName, value]) => {
        void setFieldValue(fieldName, value, false);
      },
    );
    setFreightPackagingEditState?.((previous) => ({
      ...previous,
      [editKey]: false,
      editValues: { ...previous.editValues, [editKey]: undefined },
    }));
  };

  const saveEditing = () => {
    setFreightPackagingEditState?.((previous) => ({
      ...previous,
      [editKey]: false,
      editValues: { ...previous.editValues, [editKey]: undefined },
    }));
    const helpers: ActionCallbackHelpers = {
      setFieldValue: (field, value) => setFieldValue(field, value),
      setErrors: (errors) => setErrors(errors as FormikErrors<Record<string, unknown>>),
      setTouched: async (touched) => {
        await setTouched(touched as FormikTouched<Record<string, unknown>>);
      },
    };
    actionCallbacks.onSaveUpdate?.(values, helpers);
  };

  return (
    isFreightPackagingAllowed(countryConfiguration, costType) && (
      <div className="generic-area">
        {area.label && <div className="area-title">{t(area.label)}</div>}
        <div className="area-fields">
          {radioFields.map((field) => (
            <GenericField field={{ ...field, isDisabled: !isEditing }} key={field.name} />
          ))}
        </div>
        <div className="area-fields">
          {costFields.map((field) => (
            <GenericField field={{ ...field, isDisabled: !isEditing }} key={field.name} />
          ))}
        </div>
        <div className="area-fields">
          {infoFields.map((field) => (
            <GenericField field={field} key={field.name} />
          ))}
        </div>
        {isEditing && freightPackagingEditState && (
          <div className="freight-packaging-cost-configuration-actions">
            <Button
              type="button"
              mode="secondary"
              data-testid={`cancel-button-${editKey}-cost-configuration`}
              className="freight-packaging-action-button"
              onClick={cancelEditing}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              mode="primary"
              data-testid={`save-button-${editKey}-cost-configuration`}
              className="freight-packaging-action-button"
              onClick={saveEditing}
            >
              {t("save")}
            </Button>
          </div>
        )}
      </div>
    )
  );
}
export default FreightPackagingFields;
