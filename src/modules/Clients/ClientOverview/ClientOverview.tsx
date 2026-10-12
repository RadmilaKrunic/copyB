import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getCustomerById } from "../../../api/services/customers/customers";
import { Customer, CustomerJob } from "../../../api/services/customers/customers.types";
import { useClientManagementCustomerDetails } from "../../../api/services/clientManagement/hooks";
import { DEFAULT_STALE_TIME_MS } from "../../../utils/queryConstants";
import ActivityIndicatorWithDelay from "../../../components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay";
import { useBreadcrumbs } from "../../../hooks/useBreadcrumbs";
import { useTranslation } from "react-i18next";
import OverviewHeader from "../../../components/ui/OverviewHeader/OverviewHeader";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormInitialization } from "../../../hooks/useFormInitialization";
import GenericForm from "../../../components/generics/Form/GenericForm.types";
import { HeaderUserData } from "../../../api/services/header/action";
import { GenericFormContext } from "../../../components/generics/Form/GenericForm.context";
import Field from "../../../components/generics/Field/GenericField.types";
import { useFormValidation } from "../../../components/generics/Form/useFormValidation";
import {
  toggleSectionFieldsDisabled,
  convertAPIDataToFormValues,
} from "../../../components/generics/utils";
import { useDeleteCustomer } from "../../../api/services/customers/hooks";
import { useHasPermission } from "../../../hooks/useHasPermission";
import { PERMISSIONS } from "../../../utils/Permissions";
import DeleteClientDialog from "./DeleteClientDialog/DeleteClientDialog";
import { useActionWithValidation } from "../../../hooks/useActionWithValidation";
import OverviewContent from "../../../components/ui/OverviewContent/OverviewContent";
import ClientJobsTab from "./ClientJobsTab/ClientJobsTab";
import ClientOrdersTab from "./ClientOrdersTab/ClientOrdersTab";
import ClientAssetsTab from "./ClientAssetsTab/ClientAssetsTab";

function ClientOverview() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => getCustomerById(clientId || ""),
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    refetchOnMount: false,
  });
  const { isActive, assetsCount } = client || {};
  const status = isActive ? "ACTIVE" : "INACTIVE";

  const { data: customerDetails } = useClientManagementCustomerDetails(clientId || "");
  const assetCount = customerDetails?.assetCount ?? assetsCount;
  const totalActiveJobs = customerDetails?.totalActiveJobs ?? 0;

  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const canAnonymizeClient = useHasPermission([PERMISSIONS.CLIENT.CAN_ANONYMIZE_CLIENT]);
  const canDeleteClient =
    canAnonymizeClient &&
    !!user?.roles?.some((role) =>
      ["ASC_MANAGER", "ASC_MANAGER_WITHOUT_CLAIM", "ASC_RECEPTIONIST"].includes(role),
    );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const deleteCustomer = useDeleteCustomer();
  const deletionPendingRef = useRef(false);
  const uiConfigurationForms = queryClient.getQueryData<{ forms: GenericForm[] }>([
    "UIConfiguration",
    user?.countryCode,
  ]);
  const clientOverviewForm =
    uiConfigurationForms?.forms.find((form) => form.name === "ClientOverview") || null;
  const initialTab = clientOverviewForm?.sections[0]?.name || "";
  const [selectedTab, setSelectedTab] = useState<string>(initialTab);

  const clientInfoSection = clientOverviewForm?.sections.find(
    (section) => section.name === "clientInfo",
  );

  useBreadcrumbs([
    { label: t("clients"), href: "/clients" },
    { label: t("clientOverview"), href: "/" },
  ]);

  const {
    initialFormValues,
    setInitialFormValues,
    allFields,
    setAllFields,
    mandatoryFields,
    tabs,
    isInitialized,
  } = useFormInitialization(clientOverviewForm);

  const { validate, validateByAction, startValidation, stopValidation, setCurrentAction } =
    useFormValidation({
      allFields,
      mandatoryFieldsMap: mandatoryFields,
    });

  const mapValuesToFormFields = useCallback(
    (clientData: Customer): Record<string, unknown> =>
      convertAPIDataToFormValues(clientData, allFields || []),
    [allFields],
  );

  useEffect(() => {
    if (client && isInitialized && allFields && allFields.length > 0) {
      const mappedValues = mapValuesToFormFields(client);
      setInitialFormValues((prev) => ({
        ...prev,
        ...mappedValues,
      }));
    }
  }, [client, isInitialized, allFields, setInitialFormValues, mapValuesToFormFields]);

  const toggleFieldDisabledState = useCallback(() => {
    if (clientInfoSection) {
      let isFieldDisabled = false;
      clientInfoSection.areas.forEach((area) => {
        area.fields.forEach((field) => {
          field.isDisabled = !field.isDisabled;
          isFieldDisabled = !field.isDisabled;
        });
      });

      const allFieldsDisabled = toggleSectionFieldsDisabled(
        allFields || [],
        clientInfoSection,
        isFieldDisabled,
      );
      setAllFields(allFieldsDisabled);
    }
  }, [allFields, clientInfoSection, setAllFields]);

  const setClientInfoDisabled = useCallback(
    (disabled: boolean) => {
      if (clientInfoSection) {
        clientInfoSection.isDisabled = disabled;
        toggleFieldDisabledState();
      }
    },
    [clientInfoSection, toggleFieldDisabledState],
  );

  useEffect(() => {
    if (clientInfoSection && !clientInfoSection?.isDisabled) {
      setClientInfoDisabled(true);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCancelSaveClient = useMemo(
    () =>
      (
        formValues: Record<string, unknown>,
        {
          setErrors,
          setTouched,
          setFieldValue,
        }: { setFieldValue: any; setErrors: any; setTouched: any },
      ) => {
        if (!client) {
          return;
        }
        setClientInfoDisabled(true);
        const oldValues = mapValuesToFormFields(client);
        Object.entries(oldValues).forEach(([key, value]) => setFieldValue(key, value));
        setErrors({});
        setTouched({});
      },
    [client, mapValuesToFormFields, setClientInfoDisabled],
  );

  const enableEditSection = (sectionName: string) => {
    if (sectionName === "clientInfo") {
      setClientInfoDisabled(false);
    }
  };

  const handleActionWithValidation = useActionWithValidation({
    allFields,
    validateByAction,
    startValidation,
    stopValidation,
    setCurrentAction,
  });

  const onSaveClient = useMemo(
    () =>
      (
        formValues: Record<string, unknown>,
        { setErrors, setTouched }: { setFieldValue: any; setErrors: any; setTouched: any },
      ) => {
        void handleActionWithValidation("save", formValues, { setErrors, setTouched }, () => {
          console.log("onSaveClient formValues:", formValues);
        });
      },
    [handleActionWithValidation],
  );

  const onDeleteClient = () => {
    if (!canDeleteClient || !client || !clientId || deletionPendingRef.current) return;
    deleteCustomer.reset();
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (!deletionPendingRef.current) setIsDeleteDialogOpen(false);
  };

  const confirmDeleteClient = () => {
    if (
      !isDeleteDialogOpen ||
      !canDeleteClient ||
      !client ||
      !clientId ||
      deletionPendingRef.current
    ) {
      return;
    }
    deletionPendingRef.current = true;
    const navigateToClientList = () => {
      const navigationResult = navigate("/clients");
      if (navigationResult instanceof Promise) {
        navigationResult.catch(() => undefined);
      }
    };

    deleteCustomer.mutate(clientId, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        queryClient
          .invalidateQueries({ queryKey: ["clientManagementCustomers"] })
          .then(navigateToClientList, navigateToClientList)
          .catch(() => undefined);
      },
      onSettled: () => {
        deletionPendingRef.current = false;
      },
    });
  };

  const onCreateJob = useCallback(() => {
    const navigateResult = navigate(`/create-job`, { state: { prefillCustomer: client } });
    if (navigateResult instanceof Promise) {
      navigateResult.catch(() => undefined);
    }
  }, [navigate, client]);

  const onJobRowClick = useCallback(
    (job: CustomerJob) => {
      const navigateResult = navigate(`/job-overview/${job.jobId}`);
      if (navigateResult instanceof Promise) {
        navigateResult.catch(() => undefined);
      }
    },
    [navigate],
  );

  const handleGenericAction = (actionName: string) => {
    const actionMap: Record<string, () => void> = {
      onDeleteClient: () => onDeleteClient(),
      onCreateJob: () => onCreateJob(),
    };

    const action = actionMap[actionName];
    if (action) {
      action();
    }
  };

  const overviewForm = clientOverviewForm
    ? {
        ...clientOverviewForm,
        actions: (clientOverviewForm.actions || []).filter(
          (action) =>
            (action.onAction !== "onDeleteClient" &&
              action.name !== "onDeleteClient" &&
              action.name !== "deleteClient") ||
            (canDeleteClient && !!client),
        ),
      }
    : null;

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
      actionCallbacks: {
        onSaveClient,
        onCancelSaveClient,
      },
    }),
    [allFields, setAllFields, mandatoryFields, onSaveClient, onCancelSaveClient],
  );

  if (isLoading) {
    return (
      <div className="loading-container">
        <ActivityIndicatorWithDelay delay={500} />
      </div>
    );
  }

  return (
    <div>
      <OverviewHeader
        type="client"
        createdAt={client?.createdOn || ""}
        id={clientId || ""}
        idLabel={t("clientId")}
        createdAtLabel={t("createdAt")}
        items={[
          {
            icon: "customer",
            title: `${customerDetails?.name || "-"}`,
            subtitle: `${customerDetails?.phoneNumber || "-"} | ${customerDetails?.email || "-"}`,
          },
          {
            icon: "locator",
            title: `${customerDetails?.billingAddress?.city || "-"}`,
            subtitle: `${customerDetails?.billingAddress?.stateProvinceRegion || "-"} | ${customerDetails?.billingAddress?.postalCode || "-"}`,
          },
          {
            icon: "drill-driver-cordless",
            title: `${assetCount || "-"}`,
            subtitle: `${t("totalAssets")}`,
          },
          {
            icon: "cube",
            title: `${totalActiveJobs}`,
            subtitle: `${t("totalActiveJobs")}`,
          },
        ]}
        showStatus={false}
      />
      <GenericFormContext.Provider value={genericFormContextValue}>
        <OverviewContent
          form={overviewForm}
          selectedTab={selectedTab}
          tabs={tabs.map((tab) => ({ ...tab, label: t(tab.label) }))}
          onTabSelect={setSelectedTab}
          initialFormValues={initialFormValues}
          validate={validate}
          formKey={clientId}
          onEditSection={enableEditSection}
          currentStatus={status}
          onActionClick={handleGenericAction}
          tabContentOverrides={{
            Assets: <ClientAssetsTab clientId={clientId || ""} />,
            Orders: <ClientOrdersTab clientId={clientId || ""} />,
            Jobs: (
              <ClientJobsTab
                clientId={clientId || ""}
                onRowClick={onJobRowClick}
                onCreateJob={onCreateJob}
              />
            ),
          }}
        />
      </GenericFormContext.Provider>
      {isDeleteDialogOpen && (
        <DeleteClientDialog
          isOpen={isDeleteDialogOpen}
          isPending={deleteCustomer.isPending}
          isError={deleteCustomer.isError}
          onCancel={closeDeleteDialog}
          onConfirm={confirmDeleteClient}
        />
      )}
    </div>
  );
}

export default ClientOverview;
