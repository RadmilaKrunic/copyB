import { TFunction } from "i18next";

interface ApiErrorBody {
  detail?: string;
  params?: Record<string, ApiErrorParam>;
}

type ApiErrorParam = string | string[] | Record<string, unknown>;

function parseParamValue(value: ApiErrorParam): string {
  // Arrays first: they are objects too, so the object branch would swallow them
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "object" && value !== null) {
    const [key, entry] = Object.entries(value)[0] ?? [];
    return key === undefined ? "" : `${key}:${String(entry)}`;
  }
  // Try valid JSON first (e.g. '["06010000","06010001"]')
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.join(", ");
    }
    return value;
  } catch {
    // Fall through
  }
  // Handle Java List.toString() format: [item1, item2] (no quotes around items)
  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");
  }
  return value;
}

export function getApiErrorMessage(error: unknown, t: TFunction, fallbackKey: string): string {
  const body = (error as { response?: { data?: ApiErrorBody } })?.response?.data;
  const detail = body?.detail;

  if (!detail) return t(fallbackKey);

  if (
    detail === "errorDiagnosticProServiceItemsNotEligibleForValidation" &&
    Array.isArray(body?.params?.violatedPartNumbers) &&
    body.params.violatedPartNumbers.length > 0
  ) {
    return t("errorProServiceItemsNotEligible") + body.params.violatedPartNumbers?.join(", ");
  }

  const params = body?.params;
  const interpolation: Record<string, string> | undefined = params
    ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, parseParamValue(v)]))
    : undefined;
  const translated = interpolation ? t(detail, interpolation) : t(detail);

  if (translated === detail) return t(fallbackKey);

  return translated;
}
