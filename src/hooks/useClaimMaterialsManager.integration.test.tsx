import { render, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Formik } from "formik";
import { useCallback, useEffect, useRef, useState } from "react";
import data from "../../data/dataTR.json";
import { useFormInitialization } from "hooks/useFormInitialization";
import { useClaimMaterialsManager } from "hooks/useClaimMaterialsManager";
import { useDiagnosticsManager } from "hooks/useDiagnosticsManager";
import { convertAPIDataToFormValues } from "components/generics/utils";

// Mirrors how ClaimOverview wires the claim and diagnostics material managers into
// one shared Formik form, so the interaction between the two hooks is exercised.
const mat = (position: string, order: number, net: number, partNumber = "") => ({
  order,
  position,
  partNumber,
  jobType: "WARRANTY",
  status: "PENDING",
  description: position,
  quantity: 1,
  isValidated: true,
  price: {
    unitPrice: net,
    suggestedNetPrice: net,
    netAmount: net,
    tax: 20,
    taxAmount: net * 0.2,
    grossAmount: net * 1.2,
    discount: 0,
    discountAmount: 0,
    totalAmount: net * 1.2,
  },
});

let latest: Record<string, unknown> = {};
function Harness({ claimData, form }: { claimData: any; form: any }) {
  const { initialFormValues, setInitialFormValues, allFields, setAllFields, tabs, setTabs } =
    useFormInitialization(form);
  const formValuesRef = useRef<Record<string, unknown>>({});
  const skipFormResetRef = useRef(false);
  const [claimFullData, setClaimFullData] = useState<any>(null);
  const prev = useRef<any>(undefined);
  const tabsReady = tabs.length > 0;
  const [v, setV] = useState(false);
  useClaimMaterialsManager({
    claimId: "c1",
    claimMaterials: tabsReady ? claimData?.materials : undefined,
    claimArchivedMaterials: tabsReady ? claimData?.archivedMaterials : undefined,
    currentActionType: "REPAIR",
    currentJobType: "WARRANTY",
    tabs,
    setTabs,
    allFields,
    setAllFields,
    setInitialFormValues,
    skipFormResetRef,
    formValuesRef,
    arePricesValidated: v,
    setArePricesValidated: setV,
    readOnly: false,
  } as any);
  useEffect(() => {
    if (claimData) setClaimFullData(claimData);
  }, [claimData]);
  const [dv, setDv] = useState(false);
  useDiagnosticsManager({
    diagnosticData: tabsReady ? claimData?.jobDiagnostic : undefined,
    currentActionType: "REPAIR",
    currentJobType: "WARRANTY",
    tabs,
    setTabs,
    allFields,
    setAllFields,
    setInitialFormValues,
    skipFormResetRef,
    formValuesRef,
    arePricesValidated: dv,
    setArePricesValidated: setDv,
    readOnly: true,
  } as any);
  const syncData = useCallback(
    (cfd: any, af: any) => {
      const dataMapped = convertAPIDataToFormValues(cfd, af || [], formValuesRef.current);
      const valuesToMerge = skipFormResetRef.current
        ? Object.fromEntries(Object.entries(dataMapped).filter(([k]) => !k.includes("#")))
        : dataMapped;
      setInitialFormValues((p) => ({ ...p, ...valuesToMerge }));
      skipFormResetRef.current = false;
    },
    [setInitialFormValues],
  );
  useEffect(() => {
    if (claimFullData !== prev.current && claimFullData && allFields && allFields.length > 0) {
      syncData(claimFullData, allFields);
      prev.current = claimFullData;
    } else skipFormResetRef.current = false;
  }, [claimFullData, allFields, syncData]);
  if (!form) return null;
  return (
    <Formik initialValues={initialFormValues} enableReinitialize onSubmit={() => {}}>
      {({ values }) => {
        formValuesRef.current = values;
        latest = values;
        return null;
      }}
    </Formik>
  );
}

const form = (data as any).forms.find((f: any) => f.name === "ClaimOverview");
const row = (i: number, f: string) => latest[`claims_claimSpareParts#${i}_${f}`];

const withPrices = (net: (i: number) => number) => ({
  materials: [mat("LA", 0, net(0)), mat("SP", 1, net(1), "123")],
  jobDiagnostic: {
    materials: [
      { ...mat("LA", 0, 50), id: "m1" },
      { ...mat("SP", 1, 30, "1"), id: "m2" },
    ],
  },
});

describe("ClaimOverview claim rows alongside the diagnostics tab", () => {
  const qc = new QueryClient();
  const ui = (claimData: any, f: any) => (
    <QueryClientProvider client={qc}>
      <Harness claimData={claimData} form={f} />
    </QueryClientProvider>
  );
  const flush = () =>
    act(async () => {
      await new Promise((res) => setTimeout(res, 50));
    });

  it("populates the first claim row with API prices when a job diagnostic is present", async () => {
    const claim = withPrices((i) => (i === 0 ? 50 : 30));
    const view = render(ui(claim, null));
    await flush();
    view.rerender(ui(claim, structuredClone(form)));
    await flush();

    expect(row(0, "position")).toBe("LA");
    expect(Number(row(0, "netAmount"))).toBe(50);
    expect(Number(row(0, "totalAmount"))).toBe(60);
    expect(Number(row(1, "netAmount"))).toBe(30);
  });

  it("repopulates the first claim row when a refetch returns new prices", async () => {
    const f = structuredClone(form);
    const view = render(
      ui(
        withPrices(() => 0),
        f,
      ),
    );
    await flush();
    expect(Number(row(0, "netAmount"))).toBe(0);

    view.rerender(
      ui(
        withPrices((i) => (i === 0 ? 50 : 30)),
        f,
      ),
    );
    await flush();

    expect(Number(row(0, "netAmount"))).toBe(50);
    expect(Number(row(1, "netAmount"))).toBe(30);
  });
});
