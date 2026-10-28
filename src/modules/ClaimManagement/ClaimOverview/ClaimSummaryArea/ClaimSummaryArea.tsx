import { useMemo } from "react";
import Area from "components/generics/Area/GenericArea.types";
import SummaryArea from "modules/JobManagement/JobOverview/SparePartsArea/SummaryArea";
import {
  DiagnosticsContext,
  type DiagnosticsContextValue,
} from "modules/JobManagement/JobOverview/DiagnosticsContext";
import { useClaimContext } from "../ClaimContext";

function ClaimSummaryArea({ area }: Readonly<{ area: Area }>) {
  const {
    hasPricesPopulated,
    setSummaryTypeOptions,
    discountBase,
    materials,
    setMaterials,
    priceSummaryDetailedByJobType,
  } = useClaimContext();

  const bridgedContextValue = useMemo<DiagnosticsContextValue>(
    () => ({
      materials,
      setMaterials,
      priceSummaryDetailedByJobType,
      setPriceSummaryDetailedByJobType: () => {},
      onAddRow: () => {},
      onAddMaterials: () => {},
      onDeleteRow: () => {},
      onRestoreRow: () => {},
      addSpecialMaterialsAllowed: false,
      positionDropdownOptions: [],
      allowedPositions: [],
      getExistingPartNumbers: () => new Set(),
      arePricesValidated: false,
      setArePricesValidated: () => {},
      hasPricesPopulated,
      markAllValidated: () => {},
      markRowDirty: () => {},
      summaryTypeOptions: [{ value: "totalSummary", label: "totalSummary" }],
      setSummaryTypeOptions,
      isArchivedExpanded: false,
      setIsArchivedExpanded: () => {},
      canArchiveOnDelete: false,
      jobStatus: "",
      discountBase,
      automaticRows: [],
      apiMaterialsLoaded: false,
      apiMaterialsEmpty: true,
      hasExistingDiagnostic: false,
      isValidating: false,
    }),
    [
      materials,
      setMaterials,
      hasPricesPopulated,
      setSummaryTypeOptions,
      discountBase,
      priceSummaryDetailedByJobType,
    ],
  );

  return (
    <DiagnosticsContext.Provider value={bridgedContextValue}>
      <SummaryArea area={area} />
    </DiagnosticsContext.Provider>
  );
}

export default ClaimSummaryArea;
