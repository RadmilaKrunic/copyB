import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getValueByPath,
  getAutoCompleteValue,
  getAutocompleteOptions,
  setAutocompleteFieldValue,
  getAutofillFieldName,
  handleAutoCompleteSelect,
  handleResetAutoCompleteFields,
  getSparePartCompatibilityMessage,
  customerAutocompleteFields,
} from "./AutoComplete.helper";
import type Field from "../../generics/Field/GenericField.types";

// Mock API dependencies to prevent actual network calls
vi.mock("../../../api/services/customers/customers", () => ({
  getCustomerByCompanyName: vi.fn(),
  getCustomerByDealershipName: vi.fn(),
  getCustomerByFirstName: vi.fn(),
  getCustomerByLastName: vi.fn(),
  getCustomerByMobileNumber: vi.fn(),
  getCustomerByEmail: vi.fn(),
}));
vi.mock("../../../api/services/orders/orders", () => ({
  getSparePartsSearch: vi.fn(),
}));

import {
  getCustomerByCompanyName,
  getCustomerByDealershipName,
  getCustomerByFirstName,
  getCustomerByLastName,
  getCustomerByMobileNumber,
  getCustomerByEmail,
} from "../../../api/services/customers/customers";
import { getSparePartsSearch } from "../../../api/services/orders/orders";
import type { AutoCompleteOption } from "./OptionItem/OptionItem";
import type { Customer } from "../../../api/services/customers/customers.types";
import type { BareToolOption } from "../../../api/services/orders/orders.types";

const makeBareToolOption = (overrides: Partial<BareToolOption> = {}): BareToolOption => ({
  applicationScope: "GLOBAL",
  brand: "BOSCH",
  businessSegment: "TOOLS",
  businessSegmentId: "1",
  country: "ZA",
  description: "Spare part",
  group: "SPARE_PARTS",
  groupId: "SP",
  partNumber: "SP-1",
  tradeName: "Trade",
  voltage: "230V",
  ...overrides,
});

const makeCustomer = (overrides: Partial<Customer> = {}): Customer => ({
  customerId: "C1",
  customerTitle: "Mr",
  ascId: "ASC",
  customerType: "PRIVATE",
  firstName: "John",
  lastName: "Doe",
  primaryEmail: "john@example.com",
  phoneNumber: "1",
  mobileNumber: "2",
  companyName: "Acme",
  dealershipName: "Dealer",
  typeOfIndustry: "Tools",
  boschCustomerNumber: "B1",
  vatNumber: "V1",
  communicationMedium: "EMAIL",
  deliveryAddress: {
    street: "s",
    houseNumber: "1",
    additionalDetails: "",
    neighborhood: "",
    district: "",
    city: "c",
    stateProvinceRegion: "sp",
    postalCode: "1",
    countryCode: "ZA",
  },
  billingAddress: {
    street: "s",
    houseNumber: "1",
    additionalDetails: "",
    neighborhood: "",
    district: "",
    city: "c",
    stateProvinceRegion: "sp",
    postalCode: "1",
    countryCode: "ZA",
  },
  useBillingAddressForDelivery: true,
  ...overrides,
});

const makeField = (name: string, overrides: Partial<Field> = {}): Field => ({
  name,
  label: name,
  type: "autocomplete",
  isDisabled: false,
  fieldMapping: {
    originalName: name,
    map: name,
    parentMap: [],
    prefixes: [],
    nameStartsWith: "",
  },
  ...overrides,
});

const asOption = (value: unknown) => value as unknown as AutoCompleteOption;

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getValueByPath", () => {
  it("returns top-level value when map key exists directly on obj", () => {
    const obj = { partNumber: "BT-001" };
    expect(getValueByPath(obj, [], "partNumber")).toBe("BT-001");
  });

  it("returns empty string when map key not found and parentMap is empty", () => {
    expect(getValueByPath({ other: "val" }, [], "missing")).toBe("");
  });

  it("traverses parentMap to find value", () => {
    const obj = { asset: { baretoolNumber: "BT-999" } };
    expect(getValueByPath(obj, ["asset"], "baretoolNumber")).toBe("BT-999");
  });

  it("returns empty string for null/undefined obj", () => {
    expect(getValueByPath(null, [], "key")).toBe("");
    expect(getValueByPath(undefined, [], "key")).toBe("");
  });

  it("returns empty string when map is empty", () => {
    expect(getValueByPath({ key: "val" }, [], "")).toBe("");
  });

  it("prefers a direct top-level match over parentMap traversal", () => {
    const obj = { email: "top@example.com", customer: { email: "nested@example.com" } };
    expect(getValueByPath(obj, ["customer"], "email")).toBe("top@example.com");
  });

  it("checks parentMap segments from last to first", () => {
    const obj = {
      order: { email: "order@example.com" },
      customer: { email: "customer@example.com" },
    };
    expect(getValueByPath(obj, ["order", "customer"], "email")).toBe("customer@example.com");
  });

  it("falls back to an earlier parentMap segment when the later one has no match", () => {
    const obj = { order: { email: "order@example.com" }, customer: { other: "x" } };
    expect(getValueByPath(obj, ["order", "customer"], "email")).toBe("order@example.com");
  });

  it("returns empty string when none of the parentMap segments exist on obj", () => {
    expect(getValueByPath({ unrelated: {} }, ["order", "customer"], "email")).toBe("");
  });
});

describe("getAutoCompleteValue", () => {
  it("returns empty string when allFields is undefined", () => {
    expect(getAutoCompleteValue({ partNumber: "BT-001" }, "baretoolNumber")).toBe("");
  });

  it("returns partNumber for baretoolNumber field", () => {
    const fields = [makeField("baretoolNumber")];
    const option = { partNumber: "BT-001" };
    expect(getAutoCompleteValue(option, "baretoolNumber", fields)).toBe("BT-001");
  });

  it("falls back to the field default for baretoolNumber when partNumber is missing", () => {
    const fields = [makeField("baretoolNumber", { defaultValue: "BT-DEFAULT" })];
    expect(getAutoCompleteValue({}, "baretoolNumber", fields)).toBe("BT-DEFAULT");
  });

  it("returns partNumber for field name containing sparePartNumber", () => {
    const fields = [
      makeField("row0_sparePartNumber", {
        fieldMapping: {
          originalName: "sparePartNumber",
          map: "partNumber",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "row0_",
        },
      }),
    ];
    const option = { partNumber: "SP-100" };
    expect(getAutoCompleteValue(option, "sparePartNumber", fields)).toBe("SP-100");
  });

  it("falls back to the field default for sparePartNumber when partNumber is missing", () => {
    const fields = [makeField("sparePartNumber", { defaultValue: "SP-DEFAULT" })];
    expect(getAutoCompleteValue({}, "sparePartNumber", fields)).toBe("SP-DEFAULT");
  });

  it("returns description for sparePartDescription field", () => {
    const fields = [makeField("sparePartDescription")];
    const option = { description: "Bearing" };
    expect(getAutoCompleteValue(option, "sparePartDescription", fields)).toBe("Bearing");
  });

  it("falls back to the field default for sparePartDescription", () => {
    const fields = [makeField("sparePartDescription", { defaultValue: "No description" })];
    expect(getAutoCompleteValue({}, "sparePartDescription", fields)).toBe("No description");
  });

  it("returns price for sparePartsUnitPrice field", () => {
    const fields = [makeField("sparePartsUnitPrice")];
    const option = { price: 49.99 };
    expect(getAutoCompleteValue(option, "sparePartsUnitPrice", fields)).toBe("49.99");
  });

  it("falls back to the field default for sparePartsUnitPrice when price is missing", () => {
    const fields = [makeField("sparePartsUnitPrice", { defaultValue: "5" })];
    expect(getAutoCompleteValue({}, "sparePartsUnitPrice", fields)).toBe("5");
  });

  it("returns tradeName for toolModelName field", () => {
    const fields = [makeField("toolModelName")];
    const option = { tradeName: "DrillPro X", description: "Cordless Drill" };
    expect(getAutoCompleteValue(option, "toolModelName", fields)).toBe("DrillPro X");
  });

  it("falls back to description when tradeName is absent for toolModelName", () => {
    const fields = [makeField("toolModelName")];
    const option = { description: "Cordless Drill" };
    expect(getAutoCompleteValue(option, "toolModelName", fields)).toBe("Cordless Drill");
  });

  it("falls back to the field default when toolModelName has neither tradeName nor description", () => {
    const fields = [makeField("toolModelName", { defaultValue: "UNKNOWN MODEL" })];
    expect(getAutoCompleteValue({}, "toolModelName", fields)).toBe("UNKNOWN MODEL");
  });

  it("returns groupId for categoryId field, defaulting to 000", () => {
    const fields = [makeField("categoryId")];
    expect(getAutoCompleteValue({ groupId: "PT" }, "categoryId", fields)).toBe("PT");
    expect(getAutoCompleteValue({}, "categoryId", fields)).toBe("000");
  });

  it("returns group for category field, defaulting to OTHERS", () => {
    const fields = [makeField("category")];
    const option = { group: "POWER_TOOLS" };
    expect(getAutoCompleteValue(option, "category", fields)).toBe("POWER_TOOLS");
  });

  it("returns OTHERS when group is absent for category field", () => {
    const fields = [makeField("category")];
    const option = {};
    expect(getAutoCompleteValue(option, "category", fields)).toBe("OTHERS");
  });

  it("returns uppercase brand for brand field", () => {
    const fields = [makeField("brand")];
    const option = { brand: "bosch" };
    expect(getAutoCompleteValue(option, "brand", fields)).toBe("BOSCH");
  });

  it("falls back to the field default when brand is absent", () => {
    const fields = [makeField("brand", { defaultValue: "GENERIC" })];
    expect(getAutoCompleteValue({}, "brand", fields)).toBe("GENERIC");
  });

  it("returns description for generic description field", () => {
    const fields = [makeField("description")];
    const option = { description: "Some description" };
    expect(getAutoCompleteValue(option, "description", fields)).toBe("Some description");
  });

  it("falls back to the field default when description is absent", () => {
    const fields = [makeField("description", { defaultValue: "N/A" })];
    expect(getAutoCompleteValue({}, "description", fields)).toBe("N/A");
  });

  it("matches field names case-insensitively for the special-cased names", () => {
    const fields = [makeField("SPAREPARTNUMBER")];
    expect(getAutoCompleteValue({ partNumber: "SP-9" }, "SPAREPARTNUMBER", fields)).toBe("SP-9");
  });

  it("falls back to fieldMapping map path when no specific match", () => {
    const fields = [
      makeField("customField", {
        fieldMapping: {
          originalName: "customField",
          map: "customValue",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "",
        },
      }),
    ];
    const option = { customValue: "MY_VALUE" };
    expect(getAutoCompleteValue(option, "customField", fields)).toBe("MY_VALUE");
  });

  it("resolves the fieldMapping map path through parentMap", () => {
    const fields = [
      makeField("customField", {
        fieldMapping: {
          originalName: "customField",
          map: "customValue",
          parentMap: ["order"],
          prefixes: [],
          nameStartsWith: "",
        },
      }),
    ];
    const option = { order: { customValue: "NESTED" } };
    expect(getAutoCompleteValue(option, "customField", fields)).toBe("NESTED");
  });

  it("returns empty string when the matched field has no map", () => {
    const fields = [
      makeField("customField", {
        fieldMapping: {
          originalName: "customField",
          map: "",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "",
        },
      }),
    ];
    expect(getAutoCompleteValue({ customValue: "x" }, "customField", fields)).toBe("");
  });

  it("returns empty string when field not found in allFields", () => {
    const fields = [makeField("otherField")];
    expect(getAutoCompleteValue({}, "notFound", fields)).toBe("");
  });
});

describe("getAutocompleteOptions", () => {
  it("returns spare parts for baretoolNumber with language normalization", async () => {
    const bareToolOptions = [makeBareToolOption({ partNumber: "BT-1" })];
    vi.mocked(getSparePartsSearch).mockResolvedValueOnce(bareToolOptions);
    const result = await getAutocompleteOptions("baretoolNumber", "12345", "ASC", {
      countryCode: "ZA",
      languageCode: "en-US",
    });

    expect(getSparePartsSearch).toHaveBeenCalledWith({
      bareToolNumber: "12345",
      tradeName: "",
      countryCode: "ZA",
      languageCode: "en",
      brand: undefined,
      size: 10,
      pageNumber: 1,
      isExchange: undefined,
      bareTool: undefined,
      position: undefined,
    });
    expect(result).toEqual(bareToolOptions);
  });

  it("keeps a language code without a region unchanged for baretoolNumber", async () => {
    vi.mocked(getSparePartsSearch).mockResolvedValueOnce([]);
    await getAutocompleteOptions("baretoolNumber", "12345", "ASC", { languageCode: "de" });
    expect(getSparePartsSearch).toHaveBeenCalledWith(
      expect.objectContaining({ languageCode: "de" }),
    );
  });

  it("passes an undefined language code through for baretoolNumber", async () => {
    vi.mocked(getSparePartsSearch).mockResolvedValueOnce([]);
    await getAutocompleteOptions("baretoolNumber", "12345", "ASC");
    expect(getSparePartsSearch).toHaveBeenCalledWith(
      expect.objectContaining({ languageCode: undefined }),
    );
  });

  it("strips non-alphanumeric characters from baretoolNumber before searching", async () => {
    vi.mocked(getSparePartsSearch).mockResolvedValueOnce([]);
    await getAutocompleteOptions("baretoolNumber", "1-234 5.6", "ASC");
    expect(getSparePartsSearch).toHaveBeenCalledWith(
      expect.objectContaining({ bareToolNumber: "123456" }),
    );
  });

  it("does not search baretoolNumber when fewer than 5 alphanumeric characters remain", async () => {
    const result = await getAutocompleteOptions("baretoolNumber", "1-2-3-4", "ASC");
    expect(result).toEqual([]);
    expect(getSparePartsSearch).not.toHaveBeenCalled();
  });

  it("matches the baretoolNumber field name case-insensitively and as a substring", async () => {
    vi.mocked(getSparePartsSearch).mockResolvedValueOnce([]);
    await getAutocompleteOptions("assetData#0_baretoolNumber", "12345", "ASC");
    expect(getSparePartsSearch).toHaveBeenCalledTimes(1);
  });

  it("returns spare parts for sparePartNumber and toolModelName", async () => {
    const sparePartOptions = [makeBareToolOption({ partNumber: "SP-1" })];
    vi.mocked(getSparePartsSearch).mockClear();
    vi.mocked(getSparePartsSearch).mockResolvedValue(sparePartOptions);

    const byPart = await getAutocompleteOptions("sparePartNumber", "99999", "ASC", {
      countryCode: "ZA",
      languageCode: "en-US",
    });
    expect(getSparePartsSearch).toHaveBeenNthCalledWith(1, {
      bareToolNumber: "99999",
      tradeName: "",
      countryCode: "ZA",
      languageCode: "en-US",
      brand: undefined,
      size: 10,
      pageNumber: 1,
      isExchange: undefined,
      bareTool: undefined,
      position: undefined,
    });
    expect(byPart).toEqual(sparePartOptions);

    const byModel = await getAutocompleteOptions("toolModelName", "A B C D E", "ASC", {
      countryCode: "ZA",
      languageCode: "en-US",
    });
    expect(getSparePartsSearch).toHaveBeenNthCalledWith(2, {
      bareToolNumber: "",
      tradeName: "ABCDE",
      countryCode: "ZA",
      languageCode: "en-US",
      brand: undefined,
      size: 10,
      pageNumber: 1,
      isExchange: undefined,
      bareTool: undefined,
      position: undefined,
    });
    expect(byModel).toEqual(sparePartOptions);
  });

  it("does not normalize the language code for sparePartNumber", async () => {
    vi.mocked(getSparePartsSearch).mockResolvedValueOnce([]);
    await getAutocompleteOptions("sparePartNumber", "99999", "ASC", { languageCode: "en-US" });
    expect(getSparePartsSearch).toHaveBeenCalledWith(
      expect.objectContaining({ languageCode: "en-US" }),
    );
  });

  it("strips non-alphanumeric characters from sparePartNumber before searching", async () => {
    vi.mocked(getSparePartsSearch).mockResolvedValueOnce([]);
    await getAutocompleteOptions("sparePartNumber", "SP/123 45", "ASC");
    expect(getSparePartsSearch).toHaveBeenCalledWith(
      expect.objectContaining({ bareToolNumber: "SP12345" }),
    );
  });

  it("does not search sparePartNumber when fewer than 5 alphanumeric characters remain", async () => {
    const result = await getAutocompleteOptions("sparePartNumber", "ab-1", "ASC");
    expect(result).toEqual([]);
    expect(getSparePartsSearch).not.toHaveBeenCalled();
  });

  it("does not search toolModelName for values shorter than 5 characters", async () => {
    const result = await getAutocompleteOptions("toolModelName", "abcd", "ASC");
    expect(result).toEqual([]);
    expect(getSparePartsSearch).not.toHaveBeenCalled();
  });

  it("forwards custom search options to the spare-parts search", async () => {
    vi.mocked(getSparePartsSearch).mockResolvedValueOnce([]);
    await getAutocompleteOptions("sparePartNumber", "99999", "ASC", {
      countryCode: "DE",
      languageCode: "de",
      brand: "BOSCH",
      position: "SP",
      isExchange: true,
      bareTool: "BT-1",
      size: 25,
      pageNumber: 3,
    });
    expect(getSparePartsSearch).toHaveBeenCalledWith({
      bareToolNumber: "99999",
      tradeName: "",
      countryCode: "DE",
      languageCode: "de",
      brand: "BOSCH",
      size: 25,
      pageNumber: 3,
      isExchange: true,
      bareTool: "BT-1",
      position: "SP",
    });
  });

  it("returns no options when the spare-parts search answers with a non-list body", async () => {
    for (const body of [{}, "", null, { content: [] }]) {
      vi.mocked(getSparePartsSearch).mockResolvedValueOnce(body as never);
      await expect(getAutocompleteOptions("sparePartNumber", "99999", "ASC")).resolves.toEqual([]);
    }
  });

  it("returns no options for baretoolNumber and toolModelName when the body is not a list", async () => {
    for (const body of [{}, "", null]) {
      vi.mocked(getSparePartsSearch).mockResolvedValueOnce(body as never);
      await expect(getAutocompleteOptions("baretoolNumber", "12345", "ASC")).resolves.toEqual([]);
      vi.mocked(getSparePartsSearch).mockResolvedValueOnce(body as never);
      await expect(getAutocompleteOptions("toolModelName", "Drill Pro", "ASC")).resolves.toEqual(
        [],
      );
    }
  });

  it("returns customer options by field name and empty array for unknown", async () => {
    vi.mocked(getCustomerByFirstName).mockResolvedValueOnce([makeCustomer({ firstName: "John" })]);
    vi.mocked(getCustomerByLastName).mockResolvedValueOnce([makeCustomer({ lastName: "Doe" })]);
    vi.mocked(getCustomerByDealershipName).mockResolvedValueOnce([
      makeCustomer({ dealershipName: "Dealer" }),
    ]);
    vi.mocked(getCustomerByCompanyName).mockResolvedValueOnce([
      makeCustomer({ companyName: "Acme" }),
    ]);

    expect(await getAutocompleteOptions("firstName", "Jo", "ASC")).toEqual([
      makeCustomer({ firstName: "John" }),
    ]);
    expect(await getAutocompleteOptions("lastName", "Do", "ASC")).toEqual([
      makeCustomer({ lastName: "Doe" }),
    ]);
    expect(await getAutocompleteOptions("dealershipName", "De", "ASC")).toEqual([
      makeCustomer({ dealershipName: "Dealer" }),
    ]);
    expect(await getAutocompleteOptions("companyName", "Ac", "ASC")).toEqual([
      makeCustomer({ companyName: "Acme" }),
    ]);

    expect(await getAutocompleteOptions("unknown", "value", "ASC")).toEqual([]);
  });

  it("calls the customer lookup with the asc id and the typed value", async () => {
    vi.mocked(getCustomerByFirstName).mockResolvedValueOnce([]);
    await getAutocompleteOptions("firstName", "Jo", "ASC-42");
    expect(getCustomerByFirstName).toHaveBeenCalledWith("ASC-42", "Jo");
    expect(getSparePartsSearch).not.toHaveBeenCalled();
  });

  it("returns customer options for mobile and email fields", async () => {
    vi.mocked(getCustomerByMobileNumber).mockResolvedValueOnce([
      makeCustomer({ mobileNumber: "456" }),
    ]);
    vi.mocked(getCustomerByEmail).mockResolvedValueOnce([
      makeCustomer({ primaryEmail: "john@example.com" }),
    ]);

    expect(await getAutocompleteOptions("mobileNumber", "456", "ASC")).toEqual([
      makeCustomer({ mobileNumber: "456" }),
    ]);
    expect(await getAutocompleteOptions("email", "john@example.com", "ASC")).toEqual([
      makeCustomer({ primaryEmail: "john@example.com" }),
    ]);
  });

  it("maps the *InPri field names to the same customer lookups", async () => {
    vi.mocked(getCustomerByFirstName).mockResolvedValueOnce([]);
    vi.mocked(getCustomerByLastName).mockResolvedValueOnce([]);
    vi.mocked(getCustomerByMobileNumber).mockResolvedValueOnce([]);
    vi.mocked(getCustomerByEmail).mockResolvedValueOnce([]);

    await getAutocompleteOptions("firstNameInPri", "Jo", "ASC");
    await getAutocompleteOptions("lastNameInPri", "Do", "ASC");
    await getAutocompleteOptions("mobileNumberInPri", "45", "ASC");
    await getAutocompleteOptions("emailInPri", "jo", "ASC");

    expect(getCustomerByFirstName).toHaveBeenCalledWith("ASC", "Jo");
    expect(getCustomerByLastName).toHaveBeenCalledWith("ASC", "Do");
    expect(getCustomerByMobileNumber).toHaveBeenCalledWith("ASC", "45");
    expect(getCustomerByEmail).toHaveBeenCalledWith("ASC", "jo");
  });

  it("returns no options for phoneNumber because it has no customer lookup", async () => {
    expect(await getAutocompleteOptions("phoneNumber", "123", "ASC")).toEqual([]);
    expect(getCustomerByMobileNumber).not.toHaveBeenCalled();
    expect(getSparePartsSearch).not.toHaveBeenCalled();
  });

  it("returns an empty array when the customer lookup resolves to null", async () => {
    vi.mocked(getCustomerByCompanyName).mockResolvedValueOnce(null as never);
    expect(await getAutocompleteOptions("companyName", "Ac", "ASC")).toEqual([]);
  });
});

describe("setAutocompleteFieldValue", () => {
  it("sets values for baretool/toolmodel/sparepart and customer fields", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);

    await setAutocompleteFieldValue(
      "baretoolNumber",
      asOption({ partNumber: "BT" }),
      setFieldValue,
    );
    await setAutocompleteFieldValue(
      "toolModelName",
      asOption({ tradeName: "MODEL" }),
      setFieldValue,
    );
    await setAutocompleteFieldValue(
      "sparePartNumber",
      asOption({ partNumber: "SP" }),
      setFieldValue,
    );
    await setAutocompleteFieldValue(
      "companyName",
      asOption({ companyName: "ACME" }),
      setFieldValue,
    );
    await setAutocompleteFieldValue(
      "dealershipName",
      asOption({ dealershipName: "Dealer" }),
      setFieldValue,
    );
    await setAutocompleteFieldValue("firstName", asOption({ firstName: "John" }), setFieldValue);
    await setAutocompleteFieldValue("lastName", asOption({ lastName: "Doe" }), setFieldValue);
    await setAutocompleteFieldValue(
      "mobileNumber",
      asOption({ mobileNumber: "456" }),
      setFieldValue,
    );
    await setAutocompleteFieldValue(
      "email",
      asOption({ primaryEmail: "john@example.com" }),
      setFieldValue,
    );
    await setAutocompleteFieldValue("unknown", asOption({}), setFieldValue);

    expect(setFieldValue).toHaveBeenCalledWith("baretoolNumber", "BT");
    expect(setFieldValue).toHaveBeenCalledWith("toolModelName", "MODEL");
    expect(setFieldValue).toHaveBeenCalledWith("sparePartNumber", "SP");
    expect(setFieldValue).toHaveBeenCalledWith("companyName", "ACME");
    expect(setFieldValue).toHaveBeenCalledWith("dealershipName", "Dealer");
    expect(setFieldValue).toHaveBeenCalledWith("firstName", "John");
    expect(setFieldValue).toHaveBeenCalledWith("lastName", "Doe");
    expect(setFieldValue).toHaveBeenCalledWith("mobileNumber", "456");
    expect(setFieldValue).toHaveBeenCalledWith("email", "john@example.com");
    expect(setFieldValue).toHaveBeenCalledWith("unknown", "");
  });

  it("sets the *InPri customer fields from the same option properties", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const customer = asOption(makeCustomer());

    await setAutocompleteFieldValue("firstNameInPri", customer, setFieldValue);
    await setAutocompleteFieldValue("lastNameInPri", customer, setFieldValue);
    await setAutocompleteFieldValue("mobileNumberInPri", customer, setFieldValue);
    await setAutocompleteFieldValue("emailInPri", customer, setFieldValue);

    expect(setFieldValue).toHaveBeenCalledWith("firstNameInPri", "John");
    expect(setFieldValue).toHaveBeenCalledWith("lastNameInPri", "Doe");
    expect(setFieldValue).toHaveBeenCalledWith("mobileNumberInPri", "2");
    expect(setFieldValue).toHaveBeenCalledWith("emailInPri", "john@example.com");
  });

  it("clears phoneNumber because it is not a handled autocomplete field", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    await setAutocompleteFieldValue("phoneNumber", asOption({ phoneNumber: "123" }), setFieldValue);
    expect(setFieldValue).toHaveBeenCalledTimes(1);
    expect(setFieldValue).toHaveBeenCalledWith("phoneNumber", "");
  });

  it("falls back to the description when toolModelName has no tradeName", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    await setAutocompleteFieldValue(
      "toolModelName",
      asOption({ description: "Cordless Drill" }),
      setFieldValue,
    );
    expect(setFieldValue).toHaveBeenCalledWith("toolModelName", "Cordless Drill");
  });

  it("sets an empty string when toolModelName has neither tradeName nor description", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    await setAutocompleteFieldValue("toolModelName", asOption({}), setFieldValue);
    expect(setFieldValue).toHaveBeenCalledWith("toolModelName", "");
  });

  it("sets an empty string when the option lacks the expected property", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    await setAutocompleteFieldValue("baretoolNumber", asOption({}), setFieldValue);
    await setAutocompleteFieldValue("sparePartNumber", asOption({}), setFieldValue);
    await setAutocompleteFieldValue("email", asOption({}), setFieldValue);
    expect(setFieldValue).toHaveBeenCalledWith("baretoolNumber", "");
    expect(setFieldValue).toHaveBeenCalledWith("sparePartNumber", "");
    expect(setFieldValue).toHaveBeenCalledWith("email", "");
  });

  it("handles prefixed baretool and spare part field names by substring match", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    await setAutocompleteFieldValue(
      "assetData#0_baretoolNumber",
      asOption({ partNumber: "BT-7" }),
      setFieldValue,
    );
    await setAutocompleteFieldValue(
      "diagnosticData_diagnosticsSpareParts#1_sparePartNumber",
      asOption({ partNumber: "SP-7" }),
      setFieldValue,
    );
    expect(setFieldValue).toHaveBeenCalledWith("assetData#0_baretoolNumber", "BT-7");
    expect(setFieldValue).toHaveBeenCalledWith(
      "diagnosticData_diagnosticsSpareParts#1_sparePartNumber",
      "SP-7",
    );
  });
});

describe("customerAutocompleteFields", () => {
  it("lists every customer field that has a lookup", () => {
    expect(customerAutocompleteFields).toEqual([
      "firstNameInPri",
      "lastNameInPri",
      "firstName",
      "lastName",
      "dealershipName",
      "companyName",
      "mobileNumberInPri",
      "mobileNumber",
      "emailInPri",
      "email",
    ]);
  });

  it("does not include phoneNumber", () => {
    expect(customerAutocompleteFields).not.toContain("phoneNumber");
  });

  it("only lists fields that return customer options", async () => {
    vi.mocked(getCustomerByFirstName).mockResolvedValue([makeCustomer()]);
    vi.mocked(getCustomerByLastName).mockResolvedValue([makeCustomer()]);
    vi.mocked(getCustomerByDealershipName).mockResolvedValue([makeCustomer()]);
    vi.mocked(getCustomerByCompanyName).mockResolvedValue([makeCustomer()]);
    vi.mocked(getCustomerByMobileNumber).mockResolvedValue([makeCustomer()]);
    vi.mocked(getCustomerByEmail).mockResolvedValue([makeCustomer()]);

    for (const fieldName of customerAutocompleteFields) {
      const options = await getAutocompleteOptions(fieldName, "abc", "ASC");
      expect(options, fieldName).toHaveLength(1);
    }
  });
});

describe("getAutofillFieldName", () => {
  it("maps assetData baretoolNumber and indexed names", () => {
    expect(getAutofillFieldName("assetData#0_baretoolNumber", "toolModelName")).toBe(
      "assetData#0_toolModelName",
    );
    expect(
      getAutofillFieldName("diagnosticData_diagnosticsSpareParts#2_sparePartNumber", "description"),
    ).toBe("diagnosticData_diagnosticsSpareParts#2_description");
    expect(getAutofillFieldName("position#3", "partNumber")).toBe("partNumber#3");
    expect(getAutofillFieldName("plainName", "fallback")).toBe("fallback");
  });

  it("replaces baretoolNumber for assetData names without an index", () => {
    expect(getAutofillFieldName("assetData_baretoolNumber", "brand")).toBe("assetData_brand");
  });

  it("uses the index-prefix rule for assetData names that do not end with baretoolNumber", () => {
    expect(getAutofillFieldName("assetData#1_toolModelName", "brand")).toBe("assetData#1_brand");
  });

  it("keeps everything up to and including the first #<n>_ marker", () => {
    expect(getAutofillFieldName("a_b#12_c_d", "x")).toBe("a_b#12_x");
  });

  it("returns the field name unchanged when the name has no index", () => {
    expect(getAutofillFieldName("order_customer_email", "firstName")).toBe("firstName");
  });
});

describe("handleAutoCompleteSelect", () => {
  it("sets primary field and autofill fields on select", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const mainField = makeField("row0_sparePartNumber", {
      autoFillFields: ["sparePartDescription", "sparePartsUnitPrice"],
      fieldMapping: {
        originalName: "sparePartNumber",
        map: "partNumber",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "row0_",
      },
    });

    const allFields = [
      mainField,
      makeField("row0_sparePartDescription", {
        fieldMapping: {
          originalName: "sparePartDescription",
          map: "description",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "row0_",
        },
      }),
      makeField("row0_sparePartsUnitPrice", {
        fieldMapping: {
          originalName: "sparePartsUnitPrice",
          map: "price",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "row0_",
        },
      }),
    ];

    await handleAutoCompleteSelect(
      asOption({ partNumber: "SP-1", description: "Bearing", price: 10 }),
      mainField,
      setFieldValue,
      allFields,
    );

    expect(setFieldValue).toHaveBeenCalledWith("row0_sparePartNumber", "SP-1");
    expect(setFieldValue).toHaveBeenCalledWith("row0_sparePartDescription", "Bearing");
    expect(setFieldValue).toHaveBeenCalledWith("row0_sparePartsUnitPrice", "10");
  });

  it("fills diagnostic description on spare part select even without autofill metadata", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const mainField = makeField("diagnosticData_diagnosticsSpareParts#0_sparePartNumber", {
      fieldMapping: {
        originalName: "sparePartNumber",
        map: "partNumber",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "diagnosticData_diagnosticsSpareParts#0_",
      },
    });

    const allFields = [
      mainField,
      makeField("diagnosticData_diagnosticsSpareParts#0_description", {
        fieldMapping: {
          originalName: "description",
          map: "description",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "diagnosticData_diagnosticsSpareParts#0_",
        },
      }),
    ];

    await handleAutoCompleteSelect(
      asOption({ partNumber: "SP-1", description: "Bearing" }),
      mainField,
      setFieldValue,
      allFields,
    );

    expect(setFieldValue).toHaveBeenCalledWith(
      "diagnosticData_diagnosticsSpareParts#0_sparePartNumber",
      "SP-1",
    );
    expect(setFieldValue).toHaveBeenCalledWith(
      "diagnosticData_diagnosticsSpareParts#0_description",
      "Bearing",
    );
  });

  it("sets the description to an empty string when the selected spare part has none", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const mainField = makeField("row0_sparePartNumber", {
      fieldMapping: {
        originalName: "sparePartNumber",
        map: "partNumber",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "row0_",
      },
    });
    const allFields = [
      mainField,
      makeField("row0_description", {
        fieldMapping: {
          originalName: "description",
          map: "description",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "row0_",
        },
      }),
    ];

    await handleAutoCompleteSelect(
      asOption({ partNumber: "SP-1" }),
      mainField,
      setFieldValue,
      allFields,
    );

    expect(setFieldValue).toHaveBeenCalledWith("row0_description", "");
  });

  it("does not touch the description field of another row", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const mainField = makeField("row0_sparePartNumber", {
      fieldMapping: {
        originalName: "sparePartNumber",
        map: "partNumber",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "row0_",
      },
    });
    const allFields = [
      mainField,
      makeField("row1_description", {
        fieldMapping: {
          originalName: "description",
          map: "description",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "row1_",
        },
      }),
    ];

    await handleAutoCompleteSelect(
      asOption({ partNumber: "SP-1", description: "Bearing" }),
      mainField,
      setFieldValue,
      allFields,
    );

    expect(setFieldValue).toHaveBeenCalledTimes(1);
    expect(setFieldValue).toHaveBeenCalledWith("row0_sparePartNumber", "SP-1");
  });

  it("only sets the primary field when allFields is not provided", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const mainField = makeField("row0_sparePartNumber", {
      autoFillFields: ["sparePartDescription"],
    });

    await handleAutoCompleteSelect(
      asOption({ partNumber: "SP-1", description: "Bearing" }),
      mainField,
      setFieldValue,
    );

    expect(setFieldValue).toHaveBeenCalledTimes(1);
    expect(setFieldValue).toHaveBeenCalledWith("row0_sparePartNumber", "SP-1");
  });

  it("sets a customer field on select without autofill metadata", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const field = makeField("companyName");

    await handleAutoCompleteSelect(asOption(makeCustomer()), field, setFieldValue, [field]);

    expect(setFieldValue).toHaveBeenCalledTimes(1);
    expect(setFieldValue).toHaveBeenCalledWith("companyName", "Acme");
  });

  it("autofills related customer fields from the selected customer", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const mainField = makeField("firstName", {
      autoFillFields: ["lastName", "email"],
      isPrimaryAutoComplete: true,
    });
    const allFields = [
      mainField,
      makeField("lastName", {
        fieldMapping: {
          originalName: "lastName",
          map: "lastName",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "",
        },
      }),
      makeField("email", {
        fieldMapping: {
          originalName: "email",
          map: "primaryEmail",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "",
        },
      }),
    ];

    await handleAutoCompleteSelect(asOption(makeCustomer()), mainField, setFieldValue, allFields);

    expect(setFieldValue).toHaveBeenCalledWith("firstName", "John");
    expect(setFieldValue).toHaveBeenCalledWith("lastName", "Doe");
    expect(setFieldValue).toHaveBeenCalledWith("email", "john@example.com");
  });

  it("sets an empty string for an autofill field whose value cannot be resolved", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const mainField = makeField("row0_sparePartNumber", {
      autoFillFields: ["extra"],
      fieldMapping: {
        originalName: "sparePartNumber",
        map: "partNumber",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "row0_",
      },
    });
    const allFields = [
      mainField,
      makeField("row0_extra", {
        fieldMapping: {
          originalName: "extra",
          map: "doesNotExist",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "row0_",
        },
      }),
    ];

    await handleAutoCompleteSelect(
      asOption({ partNumber: "SP-1" }),
      mainField,
      setFieldValue,
      allFields,
    );

    expect(setFieldValue).toHaveBeenCalledWith("row0_extra", "");
  });

  it("ignores autofill fields that belong to another row", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const mainField = makeField("row0_sparePartNumber", {
      autoFillFields: ["sparePartDescription"],
      fieldMapping: {
        originalName: "sparePartNumber",
        map: "partNumber",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "row0_",
      },
    });
    const allFields = [
      mainField,
      makeField("row1_sparePartDescription", {
        fieldMapping: {
          originalName: "sparePartDescription",
          map: "description",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "row1_",
        },
      }),
    ];

    await handleAutoCompleteSelect(
      asOption({ partNumber: "SP-1", description: "Bearing" }),
      mainField,
      setFieldValue,
      allFields,
    );

    expect(setFieldValue).not.toHaveBeenCalledWith("row1_sparePartDescription", expect.anything());
  });
});

describe("handleResetAutoCompleteFields", () => {
  const makeResetFields = () => {
    const field = makeField("row0_primary", {
      defaultValue: "DEF",
      isPrimaryAutoComplete: true,
      autoFillFields: ["a1", "a2"],
      fieldMapping: {
        originalName: "primary",
        map: "primary",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "row0_",
      },
    });
    const allFields = [
      field,
      makeField("row0_a1", {
        defaultValue: "D1",
        fieldMapping: {
          originalName: "a1",
          map: "a1",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "row0_",
        },
      }),
      makeField("row0_a2", {
        defaultValue: "D2",
        fieldMapping: {
          originalName: "a2",
          map: "a2",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "row0_",
        },
      }),
    ];
    return { field, allFields };
  };

  it("resets primary field and autofill fields", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const handleFieldChange = vi.fn().mockResolvedValue(undefined);
    const { field, allFields } = makeResetFields();

    await handleResetAutoCompleteFields(field, setFieldValue, allFields, handleFieldChange);
    expect(handleFieldChange).toHaveBeenCalledWith("row0_primary", "DEF");
    expect(handleFieldChange).toHaveBeenCalledWith("row0_a1", "D1");
    expect(handleFieldChange).toHaveBeenCalledWith("row0_a2", "D2");
    expect(setFieldValue).not.toHaveBeenCalled();
  });

  it("uses setFieldValue for the primary field when handleFieldChange is not provided", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const { field, allFields } = makeResetFields();

    await handleResetAutoCompleteFields(field, setFieldValue, allFields);

    expect(setFieldValue).toHaveBeenCalledTimes(1);
    expect(setFieldValue).toHaveBeenCalledWith("row0_primary", "DEF");
  });

  it("resets to an empty string when the field has no default value", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const field = makeField("plain");

    await handleResetAutoCompleteFields(field, setFieldValue);

    expect(setFieldValue).toHaveBeenCalledWith("plain", "");
  });

  it("resets autofill fields without a default value to an empty string", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const handleFieldChange = vi.fn().mockResolvedValue(undefined);
    const { field, allFields } = makeResetFields();
    const noDefaults = allFields.map((f) => ({ ...f, defaultValue: undefined }));

    await handleResetAutoCompleteFields(field, setFieldValue, noDefaults, handleFieldChange);

    expect(handleFieldChange).toHaveBeenCalledWith("row0_a1", "");
    expect(handleFieldChange).toHaveBeenCalledWith("row0_a2", "");
  });

  it("does not reset autofill fields when the field is not a primary autocomplete", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const handleFieldChange = vi.fn().mockResolvedValue(undefined);
    const { field, allFields } = makeResetFields();

    await handleResetAutoCompleteFields(
      { ...field, isPrimaryAutoComplete: false },
      setFieldValue,
      allFields,
      handleFieldChange,
    );

    expect(handleFieldChange).toHaveBeenCalledTimes(1);
    expect(handleFieldChange).toHaveBeenCalledWith("row0_primary", "DEF");
  });

  it("does not reset autofill fields of another row", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const handleFieldChange = vi.fn().mockResolvedValue(undefined);
    const { field } = makeResetFields();
    const otherRowFields = [
      makeField("row1_a1", {
        defaultValue: "D1",
        fieldMapping: {
          originalName: "a1",
          map: "a1",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "row1_",
        },
      }),
    ];

    await handleResetAutoCompleteFields(field, setFieldValue, otherRowFields, handleFieldChange);

    expect(handleFieldChange).toHaveBeenCalledTimes(1);
    expect(handleFieldChange).toHaveBeenCalledWith("row0_primary", "DEF");
  });

  it("does not throw when a primary field is reset without allFields", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const handleFieldChange = vi.fn().mockResolvedValue(undefined);
    const { field } = makeResetFields();

    await expect(
      handleResetAutoCompleteFields(field, setFieldValue, undefined, handleFieldChange),
    ).resolves.toBeUndefined();
    expect(handleFieldChange).toHaveBeenCalledTimes(1);
  });
});

describe("getSparePartCompatibilityMessage", () => {
  const sparePartField = makeField("row1_sparePartNumber", {
    fieldMapping: {
      originalName: "sparePartNumber",
      map: "sparePartNumber",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "row1_",
    },
  });

  const rowTypeField = (prefix = "row1_") =>
    makeField(`${prefix}rowType`, {
      subtype: "diagnosticType",
      fieldMapping: {
        originalName: "rowType",
        map: "rowType",
        parentMap: [],
        prefixes: [],
        nameStartsWith: prefix,
      },
    });

  const positionField = () =>
    makeField("row1_position", {
      subtype: "diagnosticPosition",
      fieldMapping: {
        originalName: "position",
        map: "position",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "row1_",
      },
    });

  it("returns empty string when field name is not a sparePartNumber field", () => {
    const result = getSparePartCompatibilityMessage(
      makeField("row1_bareToolNumber"),
      "row1_bareToolNumber",
      { row1_rowType: "WARRANTY" },
      [rowTypeField()],
      { row1_bareToolNumber: true },
    );
    expect(result).toBe("");
  });

  it("returns empty string when sparePartNotBelongsToTool is undefined", () => {
    const result = getSparePartCompatibilityMessage(
      sparePartField,
      "row1_sparePartNumber",
      { row1_rowType: "WARRANTY" },
      [rowTypeField()],
    );
    expect(result).toBe("");
  });

  it("returns empty string when the field has no entry in sparePartNotBelongsToTool", () => {
    const result = getSparePartCompatibilityMessage(
      sparePartField,
      "row1_sparePartNumber",
      { row1_rowType: "WARRANTY" },
      [rowTypeField()],
      {},
    );
    expect(result).toBe("");
  });

  it("returns empty string when the flagged value is explicitly false", () => {
    const result = getSparePartCompatibilityMessage(
      sparePartField,
      "row1_sparePartNumber",
      { row1_rowType: "WARRANTY" },
      [rowTypeField()],
      { row1_sparePartNumber: false },
    );
    expect(result).toBe("");
  });

  it("returns incompatibleWarrantyType for a WARRANTY row with no position field present (defaults to material)", () => {
    // Regression test: a row config without a diagnosticPosition field must still be
    // treated as material for a sparePartNumber field, not silently skipped.
    const result = getSparePartCompatibilityMessage(
      sparePartField,
      "row1_sparePartNumber",
      { row1_rowType: "WARRANTY", actionType: "REPAIR" },
      [sparePartField, rowTypeField()],
      { row1_sparePartNumber: true },
    );
    expect(result).toBe("incompatibleWarrantyType");
  });

  it("returns incompatibleServiceOfferingType for a SERVICE_OFFERING row with no position field present", () => {
    const result = getSparePartCompatibilityMessage(
      sparePartField,
      "row1_sparePartNumber",
      { row1_rowType: "SERVICE_OFFERING", actionType: "REPAIR" },
      [sparePartField, rowTypeField()],
      { row1_sparePartNumber: true },
    );
    expect(result).toBe("incompatibleServiceOfferingType");
  });

  it("returns incompatibleWarrantyType when a position field is present with a material value (SP)", () => {
    const result = getSparePartCompatibilityMessage(
      sparePartField,
      "row1_sparePartNumber",
      { row1_rowType: "WARRANTY", row1_position: "SP", actionType: "REPAIR" },
      [sparePartField, rowTypeField(), positionField()],
      { row1_sparePartNumber: true },
    );
    expect(result).toBe("incompatibleWarrantyType");
  });

  it.each(["SP", "PN", "AC"])("treats position %s as material", (position) => {
    const result = getSparePartCompatibilityMessage(
      sparePartField,
      "row1_sparePartNumber",
      { row1_rowType: "SERVICE_OFFERING", row1_position: position, actionType: "REPAIR" },
      [sparePartField, rowTypeField(), positionField()],
      { row1_sparePartNumber: true },
    );
    expect(result).toBe("incompatibleServiceOfferingType");
  });

  it("returns empty string when a position field is present but its value is not a material position", () => {
    const result = getSparePartCompatibilityMessage(
      sparePartField,
      "row1_sparePartNumber",
      { row1_rowType: "WARRANTY", row1_position: "LB", actionType: "REPAIR" },
      [sparePartField, rowTypeField(), positionField()],
      { row1_sparePartNumber: true },
    );
    expect(result).toBe("");
  });

  it("returns empty string when a position field is present but has no value", () => {
    const result = getSparePartCompatibilityMessage(
      sparePartField,
      "row1_sparePartNumber",
      { row1_rowType: "WARRANTY", actionType: "REPAIR" },
      [sparePartField, rowTypeField(), positionField()],
      { row1_sparePartNumber: true },
    );
    expect(result).toBe("");
  });

  it.each(["NEW_TOOL_EXCHANGE", "SPARE_PARTS_EXCHANGE", "ACCESSORIES_EXCHANGE"])(
    "returns empty string when actionType is the exchange type %s",
    (actionType) => {
      const result = getSparePartCompatibilityMessage(
        sparePartField,
        "row1_sparePartNumber",
        { row1_rowType: "WARRANTY", actionType },
        [sparePartField, rowTypeField()],
        { row1_sparePartNumber: true },
      );
      expect(result).toBe("");
    },
  );

  it("returns empty string for a SERVICE_OFFERING row with an exchange actionType", () => {
    const result = getSparePartCompatibilityMessage(
      sparePartField,
      "row1_sparePartNumber",
      { row1_rowType: "SERVICE_OFFERING", actionType: "SPARE_PARTS_EXCHANGE" },
      [sparePartField, rowTypeField()],
      { row1_sparePartNumber: true },
    );
    expect(result).toBe("");
  });

  it("treats a missing actionType as a non-exchange action", () => {
    const result = getSparePartCompatibilityMessage(
      sparePartField,
      "row1_sparePartNumber",
      { row1_rowType: "WARRANTY" },
      [sparePartField, rowTypeField()],
      { row1_sparePartNumber: true },
    );
    expect(result).toBe("incompatibleWarrantyType");
  });

  it("compares the row type case-insensitively", () => {
    const result = getSparePartCompatibilityMessage(
      sparePartField,
      "row1_sparePartNumber",
      { row1_rowType: "warranty", actionType: "REPAIR" },
      [sparePartField, rowTypeField()],
      { row1_sparePartNumber: true },
    );
    expect(result).toBe("incompatibleWarrantyType");
  });

  it("returns empty string when rowType is neither WARRANTY nor SERVICE_OFFERING", () => {
    const result = getSparePartCompatibilityMessage(
      sparePartField,
      "row1_sparePartNumber",
      { row1_rowType: "REPAIR", actionType: "REPAIR" },
      [sparePartField, rowTypeField()],
      { row1_sparePartNumber: true },
    );
    expect(result).toBe("");
  });

  it("returns empty string when the row type value is not set", () => {
    const result = getSparePartCompatibilityMessage(
      sparePartField,
      "row1_sparePartNumber",
      { actionType: "REPAIR" },
      [sparePartField, rowTypeField()],
      { row1_sparePartNumber: true },
    );
    expect(result).toBe("");
  });

  it("returns empty string when no matching diagnosticType field exists", () => {
    const result = getSparePartCompatibilityMessage(
      sparePartField,
      "row1_sparePartNumber",
      { actionType: "REPAIR" },
      [sparePartField],
      { row1_sparePartNumber: true },
    );
    expect(result).toBe("");
  });

  it("ignores a diagnosticType field that belongs to another row", () => {
    const result = getSparePartCompatibilityMessage(
      sparePartField,
      "row1_sparePartNumber",
      { row2_rowType: "WARRANTY", actionType: "REPAIR" },
      [sparePartField, rowTypeField("row2_")],
      { row1_sparePartNumber: true },
    );
    expect(result).toBe("");
  });
});
