import "./GenericArea.scss";
import Area from "./GenericArea.types";
import GenericField from "../Field/GenericField";
import GenericAction from "../Action/GenericAction";
import { useTranslation } from "react-i18next";
import { useFormikContext } from "formik";
import { isDependedAndVisible } from "../utils";
import { getCustomArea } from "./CustomAreasMapper";
import { type FocusEvent, useCallback, useContext, useEffect, useRef, useState } from "react";
import { GenericFormContext } from "../Form/GenericForm.context";
import { useHasPermission } from "hooks/useHasPermission";

function GenericArea({
  area,
  readOnly,
  currentMode,
  currentStatus,
  isGloballyDisabled,
}: Readonly<{
  area: Area;
  readOnly?: boolean;
  currentMode?: "view" | "edit" | "create";
  currentStatus?: string;
  isGloballyDisabled?: boolean;
}>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const title = area.label.trim();
  const { dependFieldCondition, dependentFields, isSubArea } = area;
  const {
    values: formValues,
    setFieldValue,
    setErrors,
    setTouched,
  } = useFormikContext<Record<string, unknown>>();
  const { allFields, actionCallbacks, onAreaValueChange } = useContext(GenericFormContext);
  const [isEditing, setIsEditing] = useState(false);
  const hasPermission = useHasPermission(area.permissions);

  useEffect(() => {
    setIsEditing(false);
  }, [readOnly]);

  const hasTextareaField = area.fields.some((field) => field.type === "textarea");
  const hasActions = area.actions && area.actions.length > 0;
  const shouldShowActionsOnEdit = hasTextareaField && hasActions;

  const handleActionClick = useCallback(
    (actionName: string | undefined) => {
      if (!actionName) return;
      const callback = actionCallbacks[actionName];
      if (callback) {
        const wrappedSetFieldValue = (field: string, value: unknown) => {
          void setFieldValue(field, value, false);
        };

        const wrappedSetTouched = async (touched: Record<string, boolean>) => {
          await setTouched(touched, false);
          return undefined as void | Record<string, string>;
        };

        const result = callback(formValues, {
          setFieldValue: wrappedSetFieldValue,
          setErrors: (errors: Record<string, unknown>) =>
            setErrors(errors as Record<string, string>),
          setTouched: wrappedSetTouched,
        });
        if (result instanceof Promise) {
          result.catch((error: unknown) => {
            console.error(`Action ${actionName} failed:`, error);
          });
        }
        if (shouldShowActionsOnEdit) {
          setIsEditing(false);
        }
      }
    },
    [actionCallbacks, formValues, setFieldValue, setErrors, setTouched, shouldShowActionsOnEdit],
  );

  // onAreaValueChange fires for user edits only, after Formik holds the new value. Inputs,
  // date pickers and autocompletes all write through setFieldValue, some without a DOM change
  // event, so a user interaction inside the area arms the notification until focus leaves the
  // area. Values written by code while the user is elsewhere (API prices, reloads) are ignored.
  const areaValuesKey = JSON.stringify(area.fields.map((field) => formValues[field.name] ?? null));
  const prevAreaValuesKeyRef = useRef(areaValuesKey);
  const userInteractionRef = useRef(false);

  useEffect(() => {
    if (prevAreaValuesKeyRef.current === areaValuesKey) return;
    prevAreaValuesKeyRef.current = areaValuesKey;
    if (!userInteractionRef.current) return;
    onAreaValueChange?.(area.name, formValues);
  }, [area.name, areaValuesKey, formValues, onAreaValueChange]);

  if (
    isSubArea &&
    !isDependedAndVisible(formValues, allFields ?? [], dependentFields, dependFieldCondition)
  ) {
    return null;
  }

  if (!hasPermission) return null;

  const customArea = getCustomArea(area);
  if (customArea) return customArea;

  const shouldShowActions = !readOnly && (!shouldShowActionsOnEdit || isEditing);

  const handleFieldInteraction = () => {
    if (shouldShowActionsOnEdit && !isEditing) {
      setIsEditing(true);
    }
  };

  const markUserInteraction = () => {
    userInteractionRef.current = true;
  };

  const handleAreaChange = () => {
    handleFieldInteraction();
    markUserInteraction();
  };

  // Focus leaving the area disarms it; deferred so a value committed on blur (typed date)
  // still counts as the user's.
  const handleAreaBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setTimeout(() => {
      userInteractionRef.current = false;
    });
  };

  return (
    <div className="generic-area">
      {title && <div className="area-title">{t(title)}</div>}
      <div
        className="area-fields"
        onFocusCapture={handleFieldInteraction}
        onChangeCapture={handleAreaChange}
        onClickCapture={markUserInteraction}
        onKeyDownCapture={markUserInteraction}
        onBlurCapture={handleAreaBlur}
      >
        {area.fields
          .toSorted((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((field) => (
            <GenericField field={field} key={field.name} />
          ))}
      </div>
      {shouldShowActions && (
        <GenericAction
          actions={area.actions ?? []}
          onActionClick={handleActionClick}
          currentMode={currentMode}
          currentStatus={currentStatus}
          isGloballyDisabled={isGloballyDisabled}
        />
      )}
    </div>
  );
}

export default GenericArea;
