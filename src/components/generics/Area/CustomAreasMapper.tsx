import type { ReactNode } from "react";
import DocumentTabArea from "components/ui/DocumentTabArea/DocumentTabArea";
import AccessoryArea from "../../../modules/JobManagement/CreateJob/AssetData/AccessoryArea/AccessoryArea";
import Area from "./GenericArea.types";
import NotesList from "components/ui/NotesSection/NotesList";
import SparePartsArea from "../../../modules/JobManagement/JobOverview/SparePartsArea/SparePartsArea";
import SummaryArea from "modules/JobManagement/JobOverview/SparePartsArea/SummaryArea";
import ArchivedSparePartsArea from "modules/JobManagement/JobOverview/ArchivedSparePartsArea/ArchivedSparePartsArea";
import ClaimSparePartsArea from "modules/ClaimManagement/ClaimOverview/ClaimSparePartsArea/ClaimSparePartsArea";
import ClaimSummaryArea from "modules/ClaimManagement/ClaimOverview/ClaimSummaryArea/ClaimSummaryArea";
import ClaimArchivedSparePartsArea from "modules/ClaimManagement/ClaimOverview/ClaimArchivedSparePartsArea/ClaimArchivedSparePartsArea";
import AscReimbursementArea from "../../../modules/AccountManagement/ASC/AscReimbursementArea/AscReimbursementArea";
import AscLaborRulesRepairArea from "@/modules/AccountManagement/ASC/AscLaborRulesRepairArea/AscLaborRulesRepairArea";
import AscLaborRulesExchangeArea from "@/modules/AccountManagement/ASC/AscLaborRulesExchangeArea/AscLaborRulesExchangeArea";
import FreightPackagingCostConfigurationArea from "@/modules/AccountManagement/ASC/FreightPackagingConfigurationArea/FreightPackagingCostConfigurationArea";
import FreightPackagingFields from "@/modules/AccountManagement/ASC/FreightPackagingConfigurationArea/FreightPackagingFields";

interface CustomAreaMatcher {
  matches: (area: Area) => boolean;
  render: (area: Area) => ReactNode;
}

const CUSTOM_AREA_MATCHERS: CustomAreaMatcher[] = [
  {
    matches: (area) => area.name.includes("accessory"),
    render: (area) => {
      const isCreateJobPattern = area.name.includes("assetData#");
      const isReadOnly = !isCreateJobPattern && area.isDisabled !== false;
      return <AccessoryArea area={area} readOnly={isReadOnly} />;
    },
  },
  {
    matches: (area) => area.name.includes("claimDocumentList"),
    render: (area) => <DocumentTabArea area={area} entityType="claim" />,
  },
  {
    matches: (area) => area.name.includes("documentList"),
    render: (area) => <DocumentTabArea area={area} />,
  },
  {
    matches: (area) => area.name.includes("claimNotesList"),
    render: () => <NotesList entityType="claim" />,
  },
  {
    matches: (area) => area.name.includes("notesList"),
    render: () => <NotesList />,
  },
  {
    matches: (area) => area.name.includes("claimArchivedSpareParts"),
    render: (area) => <ClaimArchivedSparePartsArea area={area} />,
  },
  {
    matches: (area) => area.name.includes("claimSpareParts"),
    render: (area) => <ClaimSparePartsArea area={area} />,
  },
  {
    matches: (area) => area.name.includes("diagnosticsSpareParts"),
    render: (area) => <SparePartsArea area={area} />,
  },
  {
    matches: (area) => area.name.includes("claimDiagnosticsSummary"),
    render: (area) => <ClaimSummaryArea area={area} />,
  },
  {
    matches: (area) => area.name.includes("diagnosticsSummary"),
    render: (area) => <SummaryArea area={area} />,
  },
  {
    matches: (area) => area.name.includes("archivedSpareParts"),
    render: (area) => <ArchivedSparePartsArea area={area} />,
  },
  {
    matches: (area) => area.name.includes("AscReimbursementArea"),
    render: (area) => <AscReimbursementArea area={area} />,
  },
  {
    matches: (area) => area.name.includes("laborRulesRepair"),
    render: (area) => <AscLaborRulesRepairArea area={area} />,
  },
  {
    matches: (area) => area.name.includes("laborRulesExchange"),
    render: (area) => <AscLaborRulesExchangeArea area={area} />,
  },
  {
    matches: (area) =>
      area.name.includes("freightCostConfiguration") ||
      area.name.includes("packagingCostConfiguration"),
    render: (area) => <FreightPackagingCostConfigurationArea area={area} />,
  },
  {
    matches: (area) =>
      area.name.includes("freightCostType") || area.name.includes("packagingCostType"),
    render: (area) => <FreightPackagingFields area={area} />,
  },
];

export const getCustomArea = (area: Area) =>
  CUSTOM_AREA_MATCHERS.find((matcher) => matcher.matches(area))?.render(area) ?? null;
