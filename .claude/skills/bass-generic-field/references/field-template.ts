// Template for adding a new field type to GenericField
// Replace [FIELD_TYPE], [COMPONENT_NAME], [IMPORT_PATH] with actual values

// 1. Add import at top of GenericField.tsx
import { [COMPONENT_NAME] } from "[IMPORT_PATH]";

// 2. Add case to the type switch in GenericField.tsx
case "[FIELD_TYPE]":
  return (
    <span
      className={`${fullWidth} generic-field-[FIELD_TYPE] ${className || ""}`}
      {...restProps}
    >
      <[COMPONENT_NAME]
        name={field.name}
        label={field.label}
        value={values[field.name] as FieldValueType}
        onChange={(newValue: FieldValueType) => handleChange(field.name, newValue)}
        disabled={effectiveIsDisabled}
        // Add field-specific props here:
        // multiSelect={field.multiSelect}
        // maxFilesAllowed={field.maxFilesAllowed}
      />
      <FieldError name={field.name} />
    </span>
  );

// 3. Example: multiselect dropdown
case "multiselect":
  return (
    <span
      className={`${fullWidth} generic-field-multiselect ${className || ""}`}
      {...restProps}
    >
      <DynamicDropdown
        name={field.name}
        label={field.label}
        optionsEndpoint={field.optionsEndpoint}
        multiSelect={field.multiSelect || false}
        disabled={effectiveIsDisabled}
      />
      <FieldError name={field.name} />
    </span>
  );

// 4. Example: slider input
case "slider":
  return (
    <span
      className={`${fullWidth} generic-field-slider ${className || ""}`}
      {...restProps}
    >
      <Slider
        name={field.name}
        label={field.label}
        min={field.minValue || 0}
        max={field.maxValue || 100}
        value={Number(values[field.name]) || 0}
        onChange={(newValue: number) => handleChange(field.name, newValue)}
        disabled={effectiveIsDisabled}
      />
      <FieldError name={field.name} />
    </span>
  );
