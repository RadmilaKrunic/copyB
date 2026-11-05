import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  useAnalytics,
  toFailureReason,
  AnalyticsEventName,
  AscSection,
  SaveType,
} from "@/analytics";
import { useLocation, useParams } from "react-router-dom";
import { DEFAULT_STALE_TIME_MS } from "utils/queryConstants";
import { createASC, getASCById } from "api/services/serviceCenters/action";
import ActivityIndicatorWithDelay from "components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay";
import OverviewHeader from "components/ui/OverviewHeader";
import { formatDateToDisplay } from "utils/dateFormatter";
import { useBreadcrumbs } from "hooks/useBreadcrumbs";
import { HeaderUserData } from "api/services/header/action";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Tab, TabNavigation } from "@bosch/react-frok";
import { useFormInitialization } from "hooks/useFormInitialization";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { type GenericFormContextType } from "components/generics/Form/GenericForm.context";
import Field from "components/generics/Field/GenericField.types";
import GenericSection from "components/generics/Section/GenericSection";
import { Formik, Form, FormikProps } from "formik";
import { toggleSectionFieldsDisabled } from "components/generics/utils";
import { useFormValidation } from "components/generics/Form/useFormValidation";
import {
  RepairCosts,
  ServiceCenter,
  Ranges as ServiceCenterRanges,
} from "api/services/serviceCenters/serviceCenters.types";
import {
  LABOR_RULE_DEFAULTS,
  mapBanking,
  mapBoschConfig,
  mapExchangeLaborCostTableDataFromFormValues,
  mapGeneralInfo,
  mapLaborCostDetailsToApiPayload,
  mapNotifications,
  mapPricing,
  mapReimbursement,
  shouldShowAddLaborRuleButton,
  updateLaborExchangeSections,
  updateLaborRepairSections,
} from "../ASC.utils";
import Section from "components/generics/Section/GenericSection.types";
import { MessagesContext } from "contexts/messagescontext";
import { useActionWithValidation } from "../../../../hooks/useActionWithValidation";
import { scrollToTop } from "../../../../utils/scrollToError";
import GenericAction from "../../../../components/generics/Action/GenericAction";
import axiosClient from "../../../../api/axios-client/axiosClient";
import { useResourceUIConfiguration } from "hooks/useUIConfiguration";
import {
  LaborExchangeRow,
  showLaborRulesTable,
} from "../AscLaborRulesExchangeArea/AscLaborRulesExchangeArea.utils";
import { showLaborRulesMatrix } from "../AscLaborRulesRepairArea/AscLaborRulesRepairArea.utils";
import { Ranges } from "../../../../api/services/laborCost/laborCost";
import ExchangeLaborCostModal from "@/components/ui/ExchangeLaborCostModal/ExchangeLaborCostModal";
import RepairLaborCostMatrixModal from "@/components/ui/RepairLaborCostMatrixModal/RepairLaborCostMatrixModal";
import { AscIdProvider } from "../AscId.context";

const ASC_SECTION_BY_TAB: Readonly<Record<string, AscSection>> = {
  generalInfo: AscSection.GENERAL_INFO,
  banking: AscSection.BANKING,
  notifications: AscSection.NOTIFICATIONS,
  pricing: AscSection.PRICING,
  boschInternalConfiguration: AscSection.BOSCH_INTERNAL_CONFIGURATION,
  reimbursement: AscSection.REIMBURSEMENT,
};

function AscOverview() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const analytics = useAnalytics();
  const { setMessages } = useContext(MessagesContext);

  const queryClient = useQueryClient();
  const { ascId: paramsAscId } = useParams<{ ascId: string }>();
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const ascId = paramsAscId || user?.ascId || "";

  const { data: asc, isLoading } = useQuery({
    queryKey: ["ASC", ascId],
    queryFn: () => getASCById(ascId),
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    refetchOnMount: false,
    enabled: Boolean(ascId),
  });

  const formikRef = useRef<FormikProps<any>>(null);
  const [selectedLaborRules, setSelectedLaborRules] = useState<{
    repair: string | null;
    exchange: string | null;
  }>({
    repair: LABOR_RULE_DEFAULTS.repair,
    exchange: LABOR_RULE_DEFAULTS.exchange,
  });

  const [isExchangeLaborCostModalOpen, setIsExchangeLaborCostModalOpen] = useState(false);
  const [exchangeLaborCostTableDataByRule, setExchangeLaborCostTableDataByRule] = useState<
    Record<string, LaborExchangeRow[]>
  >({});
  const [isRepairLaborCostModalOpen, setIsRepairLaborCostModalOpen] = useState(false);
  const [repairLaborCostMatrixDataByRule, setRepairLaborCostMatrixDataByRule] = useState<
    Record<string, RepairCosts>
  >({});

  const currentExchangeLaborRule = selectedLaborRules.exchange ?? LABOR_RULE_DEFAULTS.exchange;
  const currentRepairLaborRule = selectedLaborRules.repair ?? LABOR_RULE_DEFAULTS.repair;

  const repairLaborCostMatrixData = useMemo(() => {
    const laborRepairConfigSource = asc?.laborCostMethod?.repairCosts;

    return (
      repairLaborCostMatrixDataByRule[currentRepairLaborRule] ??
      showLaborRulesMatrix(laborRepairConfigSource, currentRepairLaborRule)
    );
  }, [currentRepairLaborRule, repairLaborCostMatrixDataByRule, asc]);

  const exchangeLaborCostTableData = useMemo(() => {
    const laborExchangeConfigSource = asc?.laborCostMethod;

    return (
      exchangeLaborCostTableDataByRule[currentExchangeLaborRule] ??
      showLaborRulesTable(laborExchangeConfigSource, currentExchangeLaborRule)
    );
  }, [currentExchangeLaborRule, exchangeLaborCostTableDataByRule, asc]);

  const laborConfigSource = asc?.laborCostMethod;

  const {
    uiConfiguration,
    isLoading: isLoadingUIConfig,
    isError: isUIConfigError,
  } = useResourceUIConfiguration(asc?.defaultCountry);
  const ascOverviewForm =
    uiConfiguration?.forms.find((form) => form.name === "ASCOverview") || null;
  const location = useLocation();

  const initialTab = location.hash.replace("#", "") || ascOverviewForm?.sections[0]?.name || "";
  const [selectedTab, setSelectedTab] = useState<string>(initialTab);

  const breadcrumbs = paramsAscId
    ? [
        { label: t("ascProfiles"), href: "/asc-profiles" },
        { label: t("ascOverview"), href: "/" },
      ]
    : [{ label: t("ascProfile"), href: "/" }];

  useBreadcrumbs(breadcrumbs);

  const {
    initialFormValues,
    sections,
    setSections,
    setInitialFormValues,
    allFields,
    setAllFields,
    mandatoryFields,
    tabs,
    isInitialized,
  } = useFormInitialization(ascOverviewForm);

  const { validate, validateByAction, startValidation, stopValidation, setCurrentAction } =
    useFormValidation({
      allFields,
      mandatoryFieldsMap: mandatoryFields,
    });

  const handleActionWithValidation = useActionWithValidation({
    allFields,
    validateByAction,
    startValidation,
    stopValidation,
    setCurrentAction,
  });

  const setFieldValueRef = useRef<any>(null);

  const status = asc?.isActive ? "ACTIVE" : "INACTIVE";
  const imageUrl = asc?.logo?.logoId
    ? `${import.meta.env.VITE_API_BASE_URL}/v1/files/static/${asc.logo.logoId}`
    : "";

  const toggleFieldDisabledState = useCallback(
    (section: Section) => {
      if (section) {
        let isFieldDisabled = false;
        section.areas.forEach((area) => {
          area.fields.forEach((field) => {
            field.isDisabled = !field.isDisabled;
            isFieldDisabled = !field.isDisabled;
          });
        });

        const allFieldsDisabled = toggleSectionFieldsDisabled(
          allFields || [],
          section,
          isFieldDisabled,
        );
        setAllFields(allFieldsDisabled);
      }
    },
    [allFields, setAllFields],
  );

  const enableEditSection = (sectionName: string) => {
    const section = ascOverviewForm?.sections.find((section) => section.name === sectionName);
    if (section) {
      section.isDisabled = false;
      toggleFieldDisabledState(section);
    }
  };

  const mapValuesToFormFields = useCallback((asc: ServiceCenter): Record<string, unknown> => {
    const formFieldValues: Record<string, unknown> = {
      name: asc.name,
      email: asc.email,
      phoneNumber: asc.phoneNumber,
      gst: asc.gst,
      companyVATNumber: asc.companyVATNumber,
      isActive: asc.isActive,
      streetName: asc.address?.street,
      city: asc.address?.city,
      neighborhood: asc.address?.neighborhood,
      district: asc.address?.district,
      addressLineTwo: asc.address?.additionalDetails,
      state: asc.address?.stateProvinceRegion,
      postalCode: asc.address?.postalCode,
      country: asc.address?.countryCode,
      logo: asc?.logo?.logoId
        ? [{ name: asc.logo.name, type: asc.logo.type, attachmentId: asc.logo.logoId }]
        : [],
      houseNumber: asc.address?.houseNumber,
      bankName: asc.bankAccount?.bankName,
      accountNumber: asc.bankAccount?.accountNumber,
      notificationEmail: asc?.notification?.includes("EMAIL") || false,
      notificationSMS: asc?.notification?.includes("SMS") || false,
      parentNotificationEmail: asc?.parentNotification?.includes("EMAIL") || false,
      parentNotificationSMS: asc?.parentNotification?.includes("SMS") || false,
      biqicName: asc.biqicName,
      pkPriceChargeable: asc.pkPriceChargeable,
      laPriceChargeable: asc.laPriceChargeable,
      frPriceChargeable: asc.frPriceChargeable,
      customerCode: asc.customerCode,
      serviceCenterType: asc.serviceCenterType,
      laPrice: asc.laPrice,
      frPrice: asc.frPrice,
      pkPrice: asc.pkPrice,
      sparePartsDiscount: asc.sparePartsDiscount,
      accessoriesDiscount: asc.accessoriesDiscount,
      sparePartsIncentive: asc.sparePartsIncentive,
      accessoriesIncentive: asc.accessoriesIncentive,
      packagingCost: asc.packagingCost,
      defaultCountry: asc.defaultCountry,
      preferredSelectedCountry: asc.preferredSelectedCountry,
      reimbursementConfig:
        asc.reimbursementConfig?.map((config) => {
          return {
            category: config.category,
            reimbursementMethods: {
              REPAIR: config.reimbursementMethods.REPAIR || "",
              EXCHANGE: config.reimbursementMethods.EXCHANGE || "",
            },
          };
        }) || null,
      reimbursementCreateOn: asc.reimbursementCreateOn,
      reimbursementPeriodType: asc.reimbursementPeriodType,
    };
    return formFieldValues;
  }, []);

  useEffect(() => {
    if (asc && isInitialized) {
      const mappedValues = mapValuesToFormFields(asc);
      setInitialFormValues((prev) => ({
        ...prev,
        ...mappedValues,
      }));
    }
  }, [asc, isInitialized, setInitialFormValues, mapValuesToFormFields]);

  const onCancelUpdate = useCallback(
    (
      formValues: Record<string, unknown>,
      {
        setErrors,
        setTouched,
        setFieldValue,
      }: { setFieldValue: any; setErrors: any; setTouched: any },
    ) => {
      if (!asc) {
        return;
      }
      const activeSection = ascOverviewForm?.sections.find(
        (section) => section.name === selectedTab,
      );
      if (activeSection) {
        activeSection.isDisabled = true;
        toggleFieldDisabledState(activeSection);
      }

      const oldValues = mapValuesToFormFields(asc);
      Object.entries(oldValues).forEach(([key, value]) => {
        setFieldValue(key, value);
      });
      setErrors({});
      setTouched({});
    },
    [asc, ascOverviewForm, selectedTab, toggleFieldDisabledState, mapValuesToFormFields],
  );

  const { mutate } = useMutation({
    mutationFn: (data: any) => {
      return createASC(data, false);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["ascProfiles"] });
      queryClient.setQueryData(["ASC", ascId], response);
      setMessages([{ type: "success", duration: 5000, text: t("dataUpdatedSuccessfully") }]);
      scrollToTop();
      analytics.trackAscSaved({
        saveType: SaveType.UPDATED,
        ascSection: ASC_SECTION_BY_TAB[selectedTab],
      });
    },
    onError: (error) => {
      analytics.trackActionFailed({
        failedAction: AnalyticsEventName.ASC_SAVED,
        failureReason: toFailureReason(error),
        saveType: SaveType.UPDATED,
        ascSection: ASC_SECTION_BY_TAB[selectedTab],
      });
      if (!asc) return;

      const oldValues = mapValuesToFormFields(asc);
      Object.entries(oldValues).forEach(([key, value]) => {
        setFieldValueRef.current?.(key, value);
      });

      setMessages([{ type: "error", duration: 5000, text: t("failedToUpdateData") }]);
      scrollToTop();
    },
  });

  const mapToAPIValues = useCallback(
    (
      formValues: Record<string, any>,
      overrideExchangeDataByRule?: Record<string, LaborExchangeRow[]>,
      overrideRepairDataByRule?: Record<string, RepairCosts>,
    ) => {
      if (!asc) return {};

      const activeRepairDataByRule = overrideRepairDataByRule || repairLaborCostMatrixDataByRule;
      const activeExchangeDataByRule =
        overrideExchangeDataByRule || exchangeLaborCostTableDataByRule;

      const currentActiveExchangeTable = currentExchangeLaborRule
        ? activeExchangeDataByRule[currentExchangeLaborRule] ||
          showLaborRulesTable(asc.laborCostMethod, currentExchangeLaborRule)
        : [];
      const exchangeLaborCostTableDataByRuleWithCurrentValues = currentExchangeLaborRule
        ? {
            ...activeExchangeDataByRule,
            [currentExchangeLaborRule]: mapExchangeLaborCostTableDataFromFormValues(
              currentActiveExchangeTable,
              formValues,
            ),
          }
        : activeExchangeDataByRule;

      const compatibleLaborCostConfig: any = {
        repairCostConfiguration: {
          repairCosts: asc.laborCostMethod?.repairCosts || [],
        },
        newToolExchange: asc.laborCostMethod?.newToolExchange,
        accessoryExchange: asc.laborCostMethod?.accessoryExchange,
        sparePartsExchange: asc.laborCostMethod?.sparePartsExchange,
      };

      const updatedValues: any = {
        ...initialFormValues,
        ...mapGeneralInfo(selectedTab === "generalInfo" ? formValues : initialFormValues),
        bankAccount: {
          ...mapBanking(selectedTab === "banking" ? formValues : initialFormValues),
        },
        ...mapPricing(selectedTab === "pricing" ? formValues : initialFormValues),
        ...mapBoschConfig(
          selectedTab === "boschInternalConfiguration" ? formValues : initialFormValues,
        ),
        ...mapReimbursement(selectedTab === "reimbursement" ? formValues : initialFormValues, asc),
        ...mapNotifications(selectedTab === "notifications" ? formValues : initialFormValues),

        ascId: asc.ascId,
        currencySymbol: asc.currencySymbol,
        currency: asc.currency,
        reimbursementType: "DIRECT_SHIPMENT",
        laborCostMethod: mapLaborCostDetailsToApiPayload(
          compatibleLaborCostConfig,
          formValues,
          exchangeLaborCostTableDataByRuleWithCurrentValues,
          activeRepairDataByRule,
        ),
        freightCostDetails: asc.freightCostDetails,
        packagingCostDetails: asc.packagingCostDetails,
      };

      if (updatedValues.reimbursementPeriodType === "CUSTOM") {
        updatedValues.reimbursementCreateOn = null;
      }
      if (updatedValues.reimbursementPeriodType !== "CUSTOM") {
        updatedValues.reimbursementCreateOn = updatedValues.reimbursementCreateOn || "1";
      }

      delete updatedValues["state"];
      delete updatedValues["streetName"];
      delete updatedValues["postalCode"];
      delete updatedValues["country"];
      delete updatedValues["houseNumber"];
      delete updatedValues["city"];
      delete updatedValues["accountNumber"];
      delete updatedValues["bankName"];
      delete updatedValues["notificationEmail"];
      delete updatedValues["notificationSMS"];
      delete updatedValues["parentNotificationEmail"];
      delete updatedValues["parentNotificationSMS"];
      Object.keys(updatedValues).forEach((key) => {
        if (key.includes("reimbursementMethod")) {
          delete updatedValues[key];
        }
      });

      return updatedValues;
    },
    [
      asc,
      initialFormValues,
      selectedTab,
      repairLaborCostMatrixDataByRule,
      currentExchangeLaborRule,
      exchangeLaborCostTableDataByRule,
    ],
  );

  const onSettledSaveUpdate = useCallback(() => {
    const section = ascOverviewForm?.sections.find((section) => section.name === selectedTab);
    if (section && section.name != "internalLaborConfiguration") {
      section.isDisabled = true;
      toggleFieldDisabledState(section);
    }
  }, [ascOverviewForm, selectedTab, toggleFieldDisabledState]);

  const onSaveUpdate = useCallback(
    (
      formValues: Record<string, unknown>,
      { setErrors, setTouched }: { setFieldValue: any; setErrors: any; setTouched: any },
      overrideExchangeDataByRule?: Record<string, LaborExchangeRow[]>,
      overrideRepairDataByRule?: Record<string, RepairCosts>,
    ) => {
      if (!asc) return;
      const apiValues = mapToAPIValues(
        formValues,
        overrideExchangeDataByRule,
        overrideRepairDataByRule,
      );
      handleActionWithValidation("save", formValues, { setErrors, setTouched }, () => {
        mutate(
          { serviceCenter: { ...apiValues } },
          {
            onSettled: onSettledSaveUpdate,
          },
        );
      });
    },
    [asc, mapToAPIValues, handleActionWithValidation, mutate, onSettledSaveUpdate],
  );

  const handleAscOverviewAction = useCallback(
    (actionName: string) => {
      if (actionName === "onDeactivateASC") {
        void axiosClient.put(`/v1/service-centers/${ascId}`).then(
          () => {
            void queryClient.invalidateQueries({ queryKey: ["ASC", ascId] });
            analytics.trackAscDeactivated();
          },
          (error: unknown) => {
            analytics.trackActionFailed({
              failedAction: AnalyticsEventName.ASC_DEACTIVATED,
              failureReason: toFailureReason(error),
            });
            throw error;
          },
        );
      }
    },
    [ascId, queryClient, analytics],
  );

  const updateLaborRule = useCallback(
    (rule: "repair" | "exchange", selectedActionName: string) => {
      setSelectedLaborRules((prev) => ({
        ...prev,
        [rule]: selectedActionName,
      }));
      setSections((prevSections) =>
        rule === "repair"
          ? updateLaborRepairSections(prevSections, selectedActionName)
          : updateLaborExchangeSections(prevSections, selectedActionName),
      );
    },
    [setSections],
  );

  const laborRuleActionCallbacks = useMemo(
    () => ({
      addLaborExchangeRule: () => {
        if (!laborConfigSource || !currentExchangeLaborRule) {
          setIsExchangeLaborCostModalOpen(true);
          return;
        }

        setExchangeLaborCostTableDataByRule((prev) => {
          if (prev[currentExchangeLaborRule]) {
            return prev;
          }

          return {
            ...prev,
            [currentExchangeLaborRule]: showLaborRulesTable(
              laborConfigSource,
              currentExchangeLaborRule,
            ),
          };
        });
        setIsExchangeLaborCostModalOpen(true);
      },
      showAddLaborRule: () =>
        shouldShowAddLaborRuleButton(laborConfigSource?.repairCosts, selectedLaborRules.repair),
      addLaborRepairRule: () => {
        if (!laborConfigSource) {
          setIsRepairLaborCostModalOpen(true);
          return;
        }
        setIsRepairLaborCostModalOpen(true);
      },
      switchLaborRepairRuleLevel1: () => updateLaborRule("repair", "level1Repair"),
      switchLaborRepairRuleLevel2: () => updateLaborRule("repair", "level2Repair"),
      switchLaborRepairRuleLevel3: () => updateLaborRule("repair", "level3Repair"),
      switchLaborExchangeRuleLevel1: () => updateLaborRule("exchange", "level1Exchange"),
      switchLaborExchangeRuleLevel2: () => updateLaborRule("exchange", "level2Exchange"),
      switchLaborExchangeRuleLevel3: () => updateLaborRule("exchange", "level3Exchange"),
    }),
    [laborConfigSource, currentExchangeLaborRule, selectedLaborRules.repair, updateLaborRule],
  );

  const handleExchangeLaborCostSave = useCallback(
    (updatedTableData: LaborExchangeRow[]) => {
      if (!currentExchangeLaborRule) {
        return;
      }
      if (formikRef.current) {
        const { values, setErrors, setTouched, setFieldValue } = formikRef.current;

        const nextExchangeLaborCostTableDataByRule: Record<string, LaborExchangeRow[]> = {
          ...exchangeLaborCostTableDataByRule,
          [currentExchangeLaborRule]: updatedTableData,
        };
        setExchangeLaborCostTableDataByRule(nextExchangeLaborCostTableDataByRule);

        onSaveUpdate(
          values,
          { setErrors, setTouched, setFieldValue },
          nextExchangeLaborCostTableDataByRule,
        );
      }
    },
    [currentExchangeLaborRule, exchangeLaborCostTableDataByRule, onSaveUpdate],
  );

  const handleRepairLaborCostSave = useCallback(
    (updatedMatrixData: Ranges[] | ServiceCenterRanges[]) => {
      if (formikRef.current) {
        const { values, setErrors, setTouched, setFieldValue } = formikRef.current;
        const existingRuleConfig =
          repairLaborCostMatrixDataByRule[currentRepairLaborRule] ||
          showLaborRulesMatrix(laborConfigSource?.repairCosts, currentRepairLaborRule);

        if (!existingRuleConfig) {
          return;
        }

        const nextRepairLaborCostMatrixDataByRule: Record<string, RepairCosts> = {
          ...repairLaborCostMatrixDataByRule,
          [currentRepairLaborRule]: {
            ...existingRuleConfig,
            method: "MATRIX",
            ranges: updatedMatrixData,
          },
        };

        setRepairLaborCostMatrixDataByRule(nextRepairLaborCostMatrixDataByRule);
        onSaveUpdate(
          values,
          { setErrors, setTouched, setFieldValue },
          undefined,
          nextRepairLaborCostMatrixDataByRule,
        );
      }
    },
    [currentRepairLaborRule, laborConfigSource, onSaveUpdate, repairLaborCostMatrixDataByRule],
  );

  const genericFormContextValue = useMemo(
    () => ({
      allFields: allFields || [],
      setAllFields: (value: React.SetStateAction<Field[]>) => {
        if (typeof value === "function") {
          setAllFields((prev) => value(prev || []));
        } else {
          setAllFields(value);
        }
      },
      mandatoryFields,
      setMandatoryFields: () => {},
      selectedLaborRepairRule: selectedLaborRules.repair,
      selectedLaborExchangeRule: selectedLaborRules.exchange,
      selectedLaborExchangeAction: selectedLaborRules.exchange,
      exchangeLaborCostTableData,
      repairLaborCostMatrixData: repairLaborCostMatrixData ?? undefined,
      actionCallbacks: {
        onSaveUpdate,
        onCancelUpdate,
        ...laborRuleActionCallbacks,
      } as GenericFormContextType["actionCallbacks"],
    }),
    [
      allFields,
      setAllFields,
      mandatoryFields,
      onSaveUpdate,
      onCancelUpdate,
      laborRuleActionCallbacks,
      selectedLaborRules.repair,
      selectedLaborRules.exchange,
      exchangeLaborCostTableData,
      repairLaborCostMatrixData,
    ],
  );

  if (isLoading || !ascId || isLoadingUIConfig) {
    return (
      <div className="loading-container">
        <ActivityIndicatorWithDelay delay={500} />
      </div>
    );
  }

  if (isUIConfigError) {
    return <div>{t("error")}</div>;
  }

  return (
    <div>
      <OverviewHeader
        type="ASC"
        id={ascId || ""}
        idLabel={t("ascId")}
        createdAt={formatDateToDisplay(asc?.createdOn || "")}
        createdAtLabel={t("createdAt")}
        items={[
          {
            icon: "imagery",
            title: `${asc?.name || "-"}`,
            subtitle: `${t("authorizedServiceCenter")}`,
            isImage: true,
            imgUrl: imageUrl,
          },
          {
            icon: "call",
            title: `${asc?.phoneNumber || "-"}`,
            subtitle: `${asc?.email || "-"}`,
          },
          {
            icon: "locator",
            title: `${asc?.address?.street || "-"}`,
            subtitle: `${asc?.address?.city || "-"}, ${asc?.address?.stateProvinceRegion || "-"}`,
          },
        ]}
        status={asc?.isActive ? "ACTIVE" : "INACTIVE"}
        showStatus={true}
      />
      <AscIdProvider value={ascId}>
        <GenericFormContext.Provider value={genericFormContextValue}>
          <TabNavigation
            className="sticky-tab-navigation"
            selectedValue={selectedTab || tabs[0]?.name}
            onTabSelect={(_, data) => setSelectedTab(data.value as string)}
          >
            {tabs.map((tab) => (
              <Tab
                key={`${tab.name}_${tab.position}`}
                as={"a"}
                href={`#${tab.name}`}
                value={tab.name}
              >
                {t(tab.label)}
              </Tab>
            ))}
          </TabNavigation>
          <Formik
            innerRef={formikRef}
            initialValues={initialFormValues}
            validate={validate}
            onSubmit={() => {}}
            enableReinitialize={true}
            validateOnBlur={false}
          >
            {({ setFieldValue }) => {
              setFieldValueRef.current = setFieldValue;
              return (
                <Form>
                  {sections
                    .filter((section) => section.name === selectedTab)
                    .map((section) => {
                      return (
                        <GenericSection
                          key={`${section.name}`}
                          section={section}
                          onEdit={() => enableEditSection(section.name)}
                        />
                      );
                    })}
                  <GenericAction
                    actions={ascOverviewForm?.actions || []}
                    onActionClick={(actionName) => {
                      if (!actionName) return;
                      handleAscOverviewAction(actionName);
                    }}
                    currentStatus={status}
                  />
                  <ExchangeLaborCostModal
                    isOpen={isExchangeLaborCostModalOpen}
                    onClose={() => setIsExchangeLaborCostModalOpen(false)}
                    tableData={exchangeLaborCostTableData}
                    onSave={handleExchangeLaborCostSave}
                    currentExchangeLaborRule={currentExchangeLaborRule}
                    currentExchangeMethod={laborConfigSource ?? undefined}
                  />
                  <RepairLaborCostMatrixModal
                    isOpen={isRepairLaborCostModalOpen}
                    onClose={() => setIsRepairLaborCostModalOpen(false)}
                    onSave={handleRepairLaborCostSave}
                    matrixData={repairLaborCostMatrixData}
                  />
                </Form>
              );
            }}
          </Formik>
        </GenericFormContext.Provider>
      </AscIdProvider>
    </div>
  );
}

export default AscOverview;
