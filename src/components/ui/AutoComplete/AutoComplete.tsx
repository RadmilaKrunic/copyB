import { useEffect, useRef, useState } from "react";
import { TextField } from "@bosch/react-frok";
import "./AutoComplete.scss";
import {
  customerAutocompleteFields,
  getAutocompleteOptions,
  getAutoCompleteValue,
} from "./AutoComplete.helper";
import OptionItem, { AutoCompleteOption } from "./OptionItem/OptionItem";
import { useDebouncedValue } from "hooks/useDebouncedValue";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { DEFAULT_GC_TIME_MS, DEFAULT_STALE_TIME_MS } from "utils/queryConstants";
import { useTranslation } from "react-i18next";
import InfoIconWithTooltip from "../TooltipContent/InfoIconWithTooltip";
import { HeaderUserData } from "api/services/header/action";
import { BareToolOption } from "api/services/orders/orders.types";

interface AutoCompleteProps {
  readonly name: string;
  readonly label: string;
  readonly value?: string;
  readonly onChange?: (value: string) => void;
  readonly onSelect?: (option: AutoCompleteOption) => void;
  readonly onSetFieldError?: (fieldName: string, message: string) => void;
  readonly onSetFieldTouched?: (fieldName: string, touched: boolean) => void;
  readonly onClearFieldError?: (fieldName: string) => void;
  readonly onValidation?: (isValid: boolean) => void;
  readonly minLength?: number;
  readonly debounceMs?: number;
  readonly isInfoIcon?: boolean;
  readonly infoText?: string;
  readonly disabled?: boolean;
  readonly brand?: string;
  readonly position?: string;
  readonly isExchange?: boolean;
  readonly bareTool?: string;
  readonly size?: number;
  readonly pageNumber?: number;
  readonly incompatibleSelectionMessage?: string;
  readonly onBlur?: () => void;
}

export default function AutoComplete({
  name,
  label,
  value = "",
  onChange,
  onSelect,
  onSetFieldError,
  onSetFieldTouched,
  onClearFieldError,
  onValidation,
  onBlur,
  minLength = 1,
  debounceMs = 300,
  isInfoIcon = false,
  infoText = "",
  disabled = false,
  brand = "",
  position = "",
  isExchange = false,
  bareTool = "",
  size = 10,
  pageNumber = 1,
  incompatibleSelectionMessage = "",
}: Readonly<AutoCompleteProps>) {
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const [input, setInput] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isSelectionRef = useRef(false);
  const isExternalUpdateRef = useRef(!!value);
  const isUserEditingRef = useRef(false);
  const lastValidValueRef = useRef<string>(value);
  const latestInputRef = useRef(input);
  latestInputRef.current = input;

  const isToolLookupField =
    name?.toLowerCase().includes("baretoolnumber") ||
    name?.toLowerCase().includes("toolmodelname") ||
    name?.toLowerCase().includes("sparepartnumber");
  const isSparePartLookupField = name?.toLowerCase().includes("sparepartnumber");

  useEffect(() => {
    if (
      ((lastValidValueRef.current && lastValidValueRef.current !== input) || value !== input) &&
      !isUserEditingRef.current
    ) {
      isExternalUpdateRef.current = true;
      setInput(value);
      if (value && isToolLookupField) {
        lastValidValueRef.current = value;
        onValidation?.(true);
      }
    }
  }, [value, input, isToolLookupField, onValidation]);

  // A spare part number that arrives with the row (loaded from the API, imported, or shifted
  // into this row after a delete) counts as resolved until the user edits it.
  useEffect(() => {
    if (isSparePartLookupField && value) onValidation?.(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const debouncedInput = useDebouncedValue(input, debounceMs);
  const query = debouncedInput.trim();

  const enabled =
    query.length >= minLength &&
    !isSelectionRef.current &&
    !isExternalUpdateRef.current &&
    !disabled &&
    !!value;

  const getOptionsQuery = (searchValue: string) => ({
    queryKey: ["autocomplete", name, searchValue, brand, position, isExchange, bareTool],
    queryFn: () =>
      getAutocompleteOptions(name, searchValue, user?.ascId || "", {
        countryCode: user?.countryCode,
        languageCode: user?.language || "en",
        brand,
        position,
        isExchange,
        bareTool,
        size,
        pageNumber,
      }),
    staleTime: DEFAULT_STALE_TIME_MS,
    gcTime: DEFAULT_GC_TIME_MS,
  });

  const { data: options = [], isFetching } = useQuery({
    ...getOptionsQuery(query),
    enabled,
    refetchOnWindowFocus: false,
  });

  const typedOptions = options as AutoCompleteOption[];

  useEffect(() => {
    if (!enabled) {
      setOpen(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (open && typedOptions.length > 0) {
      setHighlightedIndex(0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [open, typedOptions.length]);

  useEffect(() => {
    if (highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [highlightedIndex]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    isSelectionRef.current = false;
    isExternalUpdateRef.current = false;
    isUserEditingRef.current = true;
    setInput(newValue);
    onChange?.(newValue);

    if (isToolLookupField) {
      onClearFieldError?.(name);
    }

    if (!newValue.trim()) {
      isUserEditingRef.current = false;
      lastValidValueRef.current = "";
      if (isToolLookupField) {
        onValidation?.(true);
      }
    } else if (isToolLookupField) {
      onValidation?.(false);
    }

    if (newValue.trim().length >= minLength) setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || typedOptions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < typedOptions.length - 1 ? prev + 1 : prev));
        break;

      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;

      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < typedOptions.length) {
          handleOptionSelect(typedOptions[highlightedIndex]);
        }
        break;

      case "Escape":
        e.preventDefault();
        setOpen(false);
        setHighlightedIndex(-1);
        break;

      default:
        break;
    }
  };

  const handleOptionSelect = (option: AutoCompleteOption) => {
    if (customerAutocompleteFields.includes(name)) {
      queryClient.setQueryData(["selectedCustomer"], option);
    }

    const newValue = isSparePartLookupField
      ? ((option as BareToolOption)?.partNumber ?? "")
      : getAutoCompleteValue(option, name);
    isSelectionRef.current = true;
    isUserEditingRef.current = false;
    lastValidValueRef.current = newValue;
    setInput(newValue);
    setOpen(false);

    onChange?.(newValue);
    onSelect?.(option);

    if (isToolLookupField) {
      onValidation?.(true);
    }
  };

  const handleClick = () => {
    if (typedOptions.length > 0 && input.trim().length >= minLength) {
      setOpen(true);
    }
  };

  /**
   * Spare part number on blur: an unchanged value is kept as is; otherwise the first
   * autocomplete match for the typed text is selected (the same path as picking it from the
   * list), and when there is no match the field gets a not-found error.
   */
  const resolveSparePartOnBlur = async () => {
    const typedValue = input.trim();
    if (!typedValue) return;
    if (typedValue === lastValidValueRef.current.trim()) {
      onClearFieldError?.(name);
      onValidation?.(true);
      return;
    }

    let matches: AutoCompleteOption[] = [];
    try {
      matches = (await queryClient.fetchQuery(
        getOptionsQuery(typedValue),
      )) as AutoCompleteOption[];
    } catch {
      matches = [];
    }
    // The user went back into the field and kept typing while the search ran.
    if (latestInputRef.current.trim() !== typedValue) return;

    if (matches.length > 0) {
      handleOptionSelect(matches[0]);
      return;
    }
    if (isExchange) {
      onValidation?.(true);
      return;
    }
    onValidation?.(false);
    onSetFieldError?.(name, t("sparePartNumberNotFound", { id: typedValue }));
    onSetFieldTouched?.(name, true);
  };

  const handleBlur = () => {
    setIsInputFocused(false);
    isUserEditingRef.current = false;

    if (isSparePartLookupField) {
      setOpen(false);
      void resolveSparePartOnBlur().finally(() => onBlur?.());
      return;
    }

    // Auto-select on blur: if the user leaves the field without explicitly picking an
    // option, and exactly one search result is available (fresh or from the query
    // cache), select it automatically rather than leaving the field unresolved. This is
    // a single-shot trigger fired once on blur — not per-keystroke — so there's no
    // re-triggering risk mid-edit.
    if (isToolLookupField && !isSelectionRef.current && typedOptions.length === 1) {
      handleOptionSelect(typedOptions[0]);
      return;
    }

    const isBareToolNumber = name?.toLowerCase().includes("baretoolnumber");
    const isToolModelName = name?.toLowerCase().includes("toolmodelname");
    const isLookupField = isBareToolNumber || isToolModelName;
    if (
      isLookupField &&
      input.trim().length > 0 &&
      input.trim() === lastValidValueRef.current.trim()
    ) {
      onClearFieldError?.(name);
      onValidation?.(true);
      return;
    }

    if (isLookupField && input.trim().length >= minLength && !isSelectionRef.current) {
      const currentValue = input.trim();

      let errorMessage: string;
      if (!isExchange) {
        errorMessage = isBareToolNumber
          ? t("bareToolNumberNotFound", { id: currentValue })
          : t("toolModelNameNotFound", { name: currentValue });
        onSetFieldError?.(name, errorMessage);
        onSetFieldTouched?.(name, true);
      }
    }
    onBlur?.();
  };

  return (
    <div ref={wrapperRef} className="auto-complete-wrapper">
      <TextField
        as="div"
        id={name}
        name={name}
        label={label}
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => {
          setIsInputFocused(true);
        }}
        onClick={handleClick}
        ref={inputRef}
        disabled={disabled}
      />
      {isInfoIcon && <InfoIconWithTooltip name={name} infoText={infoText || ""} />}

      {open && enabled && typedOptions.length > 0 && (
        // Keep focus in the input while an option is clicked, so the click is the only
        // selection (blur would otherwise resolve a match of its own first).
        <div className="auto-complete-dropdown" onMouseDown={(e) => e.preventDefault()}>
          {typedOptions.map((opt, i) => (
            <div
              key={`${name}-${i}`}
              ref={(el) => {
                optionRefs.current[i] = el;
              }}
            >
              <OptionItem
                type={name}
                option={opt}
                onSelect={handleOptionSelect}
                isHighlighted={i === highlightedIndex}
              />
            </div>
          ))}
        </div>
      )}

      {isSparePartLookupField &&
        incompatibleSelectionMessage &&
        !isInputFocused &&
        !isFetching &&
        !open &&
        !(enabled && typedOptions.length === 0) && (
          <div className="auto-complete-dropdown auto-complete-empty-state">
            {t(incompatibleSelectionMessage)}
          </div>
        )}
    </div>
  );
}
