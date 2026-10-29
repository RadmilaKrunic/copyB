import { describe, it, expect } from "vitest";
import {
  applyClaimRecalculation,
  findClaimRowIndex,
  getClaimFieldOriginalName,
  getClaimRecalculationPayloadErrors,
  getClaimSparePartsAreas,
  getRecalculationErrorKeys,
  hasRecalculationErrors,
  makeFieldGetter,
  orderClaimAreasLikeDiagnostics,
  withClaimRecalculateActions,
  withClaimValidateMandatoryFields,
} from "./ClaimOverview.utils";
import type GenericForm from "components/generics/Form/GenericForm.types";
import type Area from "components/generics/Area/GenericArea.types";
import type Field from "components/generics/Field/GenericField.types";

describe("ClaimOverview utils", () => {
  it("makeFieldGetter returns form value by subtype mapping", () => {
    const fields = [
      { name: "a.position", subtype: "diagnosticPosition" },
      { name: "a.partNumber", subtype: "diagnosticPartNumber" },
    ];
    const formValues = { "a.position": "POS1", "a.partNumber": "PN1" };
    const get = makeFieldGetter(fields as any, formValues);
    expect(get("diagnosticPosition")).toBe("POS1");
    expect(get("diagnosticPartNumber")).toBe("PN1");
    expect(get("unknown")).toBeUndefined();
  });
});

const area = (name: string, fieldNames: string[], isMultiple = true) =>
  ({ name, isMultiple, fields: fieldNames.map((n) => ({ name: n })) }) as any;

describe("claim recalculation utils", () => {
  const tabs = [
    {
      name: "claims",
      areas: [
        area("claimSpareParts#0", ["r0_quantity"]),
        area("claimSpareParts#2", ["r2_quantity"]),
        area("claimSpareParts_claimArchivedSpareParts#0", ["arch_quantity"]),
        area("claimData", ["claimData_x"], false),
      ],
    },
  ] as any;

  it("getClaimSparePartsAreas keeps the active rows only, in order", () => {
    expect(getClaimSparePartsAreas(tabs).map((a) => a.name)).toEqual([
      "claimSpareParts#0",
      "claimSpareParts#2",
    ]);
    expect(getClaimSparePartsAreas([])).toEqual([]);
  });

  it("findClaimRowIndex finds the row by field name", () => {
    const areas = getClaimSparePartsAreas(tabs);
    expect(findClaimRowIndex(areas, "r2_quantity")).toBe(1);
    expect(findClaimRowIndex(areas, "arch_quantity")).toBe(-1);
  });

  it("getClaimFieldOriginalName prefers fieldMapping, else strips the row prefix", () => {
    expect(
      getClaimFieldOriginalName({
        name: "claims_claimSpareParts#2_quantity",
        fieldMapping: { originalName: "qty" },
      } as any),
    ).toBe("qty");
    expect(getClaimFieldOriginalName({ name: "claims_claimSpareParts#2_unitPrice" } as any)).toBe(
      "unitPrice",
    );
  });

  it("getClaimRecalculationPayloadErrors keeps errors of active row fields only", () => {
    const errors = { r0_quantity: "required", arch_quantity: "x", claimData_x: "y" };
    expect(getClaimRecalculationPayloadErrors(getClaimSparePartsAreas(tabs), errors)).toEqual({
      r0_quantity: "required",
    });
  });

  it("applyClaimRecalculation copies only the price parts that are present", () => {
    const claim = { id: "C1", materials: [], claimPriceSummary: { netAmount: 1 } } as any;
    const result = applyClaimRecalculation(claim, {
      materials: [{ id: "L1" }],
      claimPriceSummary: null,
      claimStatus: "APPROVED",
    });
    expect(result).toEqual({
      id: "C1",
      materials: [{ id: "L1" }],
      claimPriceSummary: { netAmount: 1 },
    });
    expect(result).not.toBe(claim);
  });

  it("getRecalculationErrorKeys dedupes keys and drops 2004", () => {
    expect(
      getRecalculationErrorKeys({
        errorMessages: [{ key: "A" }, { key: "A" }, { key: "2004" }, {}],
      }),
    ).toEqual(["A"]);
    expect(getRecalculationErrorKeys({})).toEqual([]);
  });

  it("hasRecalculationErrors is true for any error message", () => {
    expect(hasRecalculationErrors({ errorMessages: [{ key: "2004" }] })).toBe(true);
    expect(hasRecalculationErrors({ errorMessages: [] })).toBe(false);
    expect(hasRecalculationErrors({})).toBe(false);
  });
});

describe("orderClaimAreasLikeDiagnostics", () => {
  const area = (name: string, position: number) => ({ name, position, fields: [] }) as any;

  it("moves archived rows after the summary, like job diagnostics", () => {
    const areas = [
      area("claimData", 1),
      area("claimSpareParts", 2),
      area("claimArchivedSpareParts", 3),
      area("claimArchivedSpareParts#1", 3),
      area("claimDiagnosticsSummary", 3),
    ];
    const ordered = orderClaimAreasLikeDiagnostics(areas)
      .toSorted((a, b) => a.position - b.position)
      .map((a) => a.name);
    expect(ordered).toEqual([
      "claimData",
      "claimSpareParts",
      "claimDiagnosticsSummary",
      "claimArchivedSpareParts",
      "claimArchivedSpareParts#1",
    ]);
  });

  it("leaves areas unchanged when archived rows already come last or are absent", () => {
    const withLastArchived = [
      area("claimDiagnosticsSummary", 3),
      area("claimArchivedSpareParts", 4),
    ];
    expect(orderClaimAreasLikeDiagnostics(withLastArchived)[1].position).toBe(4);
    const noArchived = [area("claimSpareParts", 2)];
    expect(orderClaimAreasLikeDiagnostics(noArchived)).toBe(noArchived);
  });
});

describe("withClaimValidateMandatoryFields", () => {
  const rowFields = ["position", "sparePartNumber", "type", "quantity"];

  it("requires the claim row fields on validate when the UI config lists none", () => {
    expect(withClaimValidateMandatoryFields(null)).toEqual({ validate: { fieldList: rowFields } });
    const note = { fieldList: ["note"] };
    expect(
      withClaimValidateMandatoryFields({ validate: { fieldList: [] }, savechanges: note }),
    ).toEqual({ validate: { fieldList: rowFields }, savechanges: note });
  });

  it("adds the claim row fields a non-empty UI config list misses", () => {
    const config = { validate: { fieldList: ["sparePartNumber", "note"] } };
    expect(withClaimValidateMandatoryFields(config)).toEqual({
      validate: { fieldList: ["sparePartNumber", "note", "position", "type", "quantity"] },
    });
  });

  it("keeps a UI config list that already has every claim row field", () => {
    const config = { validate: { fieldList: ["Position", "sparePartNumber", "type", "quantity"] } };
    expect(withClaimValidateMandatoryFields(config)).toBe(config);
  });
});

describe("withClaimRecalculateActions", () => {
  const field = (name: string, actions: Partial<Field> = {}): Field => ({
    name,
    label: name,
    type: "text",
    ...actions,
  });
  const area = (name: string, fields: Field[]): Area => ({
    name,
    label: "",
    position: 1,
    fields,
    dependFieldCondition: "",
    dependentFields: [],
    actions: null,
    isSubArea: false,
  });
  const form = (areas: Area[]): GenericForm => ({
    name: "ClaimOverview",
    formGroup: "",
    position: 1,
    actions: null,
    sections: [
      {
        name: "claims",
        isHidden: false,
        label: "",
        dependFieldCondition: "",
        position: 1,
        areas,
        actions: null,
        isSubSection: false,
        isAccordion: false,
        isTab: true,
      },
    ],
  });
  const fieldsOf = (result: GenericForm | null, areaName: string): Field[] =>
    result?.sections[0].areas.find((a) => a.name === areaName)?.fields ?? [];

  it("adds the job row recalculate actions to claim row fields without actions", () => {
    const result = withClaimRecalculateActions(
      form([
        area("claimSpareParts", [
          field("type"),
          field("position"),
          field("quantity"),
          field("sparePartNumber"),
          field("description"),
        ]),
      ]),
    );
    const [type, position, quantity, sparePartNumber, description] = fieldsOf(
      result,
      "claimSpareParts",
    );
    expect(type.onValueChange).toBe("onRecalculatePrices");
    expect(position.onValueChange).toBe("onRecalculatePrices");
    expect(quantity.onBlur).toBe("onRecalculatePrices");
    expect(sparePartNumber.onBlur).toBe("onRecalculatePrices");
    expect(description.onBlur).toBeUndefined();
    expect(description.onValueChange).toBeUndefined();
  });

  it("keeps configured actions and leaves other areas alone", () => {
    const result = withClaimRecalculateActions(
      form([
        area("claimSpareParts", [field("quantity", { onValueChange: "custom" })]),
        area("claimArchivedSpareParts", [field("type")]),
      ]),
    );
    const [quantity] = fieldsOf(result, "claimSpareParts");
    expect(quantity.onValueChange).toBe("custom");
    expect(quantity.onBlur).toBeUndefined();
    expect(fieldsOf(result, "claimArchivedSpareParts")[0].onValueChange).toBeUndefined();
  });

  it("returns null without a form", () => {
    expect(withClaimRecalculateActions(null)).toBeNull();
  });
});
