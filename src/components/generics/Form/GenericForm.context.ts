import Field, {
  FieldValueType,
  WarrantyInfoPayload,
} from "components/generics/Field/GenericField.types";
import { createContext } from "react";
import { ActionMandatoryFields } from "./GenericForm.types";
import type { ResolveDefaultQuantities } from "api/services/prices/prices.types";
import type { AllowedPosition } from "api/services/countryConfiguration/countryConfiguration";

export interface ActionCallbackHelpers {
  setFieldValue: (field: string, value: unknown) => void | Promise<unknown>;
  setErrors: (errors: Record<string, unknown>) => void;
  setTouched: (touched: Record<string, boolean>) => Promise<void | Record<string, unknown>>;
}

export type ActionCallback =
  | ((
      formValues?: Record<string, unknown>,
      helpers?: ActionCallbackHelpers,
    ) => void | boolean | Promise<void>)
  | ((...args: unknown[]) => void | boolean | Promise<void>);
export type RadioButtonOption = {
  label: string;
  value: FieldValueType;
  disabled?: boolean;
  infoText?: string;
};
export type RadioSourceCallback = () => RadioButtonOption[];

export interface WarrantyPanelInfo {
  supportedWarrantyType: string;
  isIneligible?: boolean;
  validityExpirationDate?: string;
  unavailableMessage?: string;
  infoPayload?: WarrantyInfoPayload;
  hasPurchaseDate?: boolean;
}

export interface GenericFormContextType {
  allFields: Field[];
  setAllFields: React.Dispatch<React.SetStateAction<Field[]>>;
  mandatoryFields: Record<string, ActionMandatoryFields> | null;
  setMandatoryFields: React.Dispatch<
    React.SetStateAction<Record<string, ActionMandatoryFields> | null>
  >;
  actionCallbacks: Record<string, ActionCallback>;
  radioSourceCallbacks?: Record<string, RadioSourceCallback>;
  onDeleteStart?: () => void;
  onDeleteEnd?: () => void;
  onAreaValueChange?: (areaName: string, formValues?: Record<string, unknown>) => void;
  autocompleteValidation?: React.RefObject<Record<string, boolean>>;
  sparePartNotBelongsToTool?: React.RefObject<Record<string, boolean>>;
  /**
   * Shown disabled state per field name. GenericField writes it; the form's validator reads it
   * so a disabled field gets no pattern / length / min-max errors.
   */
  disabledFields?: React.RefObject<Record<string, boolean>>;
  warrantyPanelInfo?: WarrantyPanelInfo;
  isRepairAnswerLocked?: boolean;
  /** Default quantity of protected spare-parts rows from the backend (job & claim). */
  resolveDefaultQuantities?: ResolveDefaultQuantities;
  /**
   * Allowed positions of this form's own spare-parts rows. Set by forms that are not the job
   * diagnostics (claim); when unset, fields use the DiagnosticsContext positions.
   */
  allowedPositions?: AllowedPosition[];
}

export const GenericFormContext = createContext<GenericFormContextType>({
  allFields: [],
  setAllFields: () => {},
  mandatoryFields: null,
  setMandatoryFields: () => {},
  actionCallbacks: {},
  onDeleteStart: undefined,
  onDeleteEnd: undefined,
  onAreaValueChange: undefined,
  autocompleteValidation: undefined,
  sparePartNotBelongsToTool: undefined,
  disabledFields: undefined,
  warrantyPanelInfo: undefined,
  isRepairAnswerLocked: undefined,
  resolveDefaultQuantities: undefined,
  allowedPositions: undefined,
});
