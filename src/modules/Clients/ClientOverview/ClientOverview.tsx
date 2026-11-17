import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getCustomerById } from "../../../api/services/customers/customers";
import { Address, Customer, CustomerJob } from "../../../api/services/customers/customers.types";
import { useClientManagementCustomerDetails } from "../../../api/services/clientManagement/hooks";
import { DEFAULT_STALE_TIME_MS } from "../../../utils/queryConstants";
import { formatDateToDisplay } from "../../../utils/dateFormatter";
import ActivityIndicatorWithDelay from "../../../components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay";
import { useBreadcrumbs } from "../../../hooks/useBreadcrumbs";
import { useTranslation } from "react-i18next";
import OverviewHeader from "../../../components/ui/OverviewHeader/OverviewHeader";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useFormInitialization } from "../../../hooks/useFormInitialization";
import GenericForm from "../../../components/generics/Form/GenericForm.types";
import { HeaderUserData } from "../../../api/services/header/action";
import { GenericFormContext } from "../../../components/generics/Form/GenericForm.context";
import Field from "../../../components/generics/Field/GenericField.types";
import { useFormValidation } from "../../../components/generics/Form/useFormValidation";
import {
  toggleSectionFieldsDisabled,
  convertAPIDataToFormValues,
  mapValuesToAPI,
  setSectionDisabledState,
} from "../../../components/generics/utils";
import { useDeleteCustomer, useUpdateCustomer } from "../../../api/services/customers/hooks";
import { useHasPermission } from "../../../hooks/useHasPermission";
import { PERMISSIONS } from "../../../utils/Permissions";
import DeleteClientDialog from "./DeleteClientDialog/DeleteClientDialog";
import { useActionWithValidation } from "../../../hooks/useActionWithValidation";
import { MessagesContext } from "../../../contexts/messagescontext";
import OverviewContent from "../../../components/ui/OverviewContent/OverviewContent";
import ClientJobsTab from "./ClientJobsTab/ClientJobsTab";
import ClientOrdersTab from "./ClientOrdersTab/ClientOrdersTab";
import ClientAssetsTab from "./ClientAssetsTab/ClientAssetsTab";
import { getCustomerTypeIcon } from "@/utils/customerUtils";

// mapValuesToAPI omits top-level attributes whose form value is empty, null or undefined.
// The save payload spreads the existing client first, so a field the user cleared would
// otherwise keep its old value. This returns an empty string for each cleared top-level
// field so that it overrides the old value.
const getClearedTopLevelFields = (
  allFields: Field[],
  formValues: Record<string, unknown>,
  mappedCustomer: Record<string, unknown>,
): Record<string, unknown> => {
  const clearedFields: Record<string, unknown> = {};
  for (const field of allFields) {
    const attr = field.fieldMapping?.map;
    const isTopLevel = !field.fieldMapping?.parentMap?.length;
    if (!attr || !isTopLevel) continue;
    const formValue = formValues[field.name || ""];
    const isCleared = formValue === "" || formValue === null || formValue === undefined;
    if (isCleared && !(attr in mappedCustomer)) {
      clearedFields[attr] = "";
    }
  }
  return clearedFields;
};

function ClientOverview() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const { setMessages } = useContext(MessagesContext);

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => getCustomerById(clientId || ""),
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
  });
  const { isActive, assetsCount } = client || {};
  const status = isActive ? "ACTIVE" : "INACTIVE";

  const { data: customerDetails } = useClientManagementCustomerDetails(clientId || "");
  const assetCount = customerDetails?.assetCount ?? assetsCount;
  const totalActiveJobs = customerDetails?.totalActiveJobs ?? 0;

  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const canDeleteClient = useHasPermission([PERMISSIONS.CLIENT.CAN_DELETE_CLIENT]);
  const canEditClientDetails = useHasPermission([PERMISSIONS.CLIENT.CAN_EDIT_CLIENT_DETAILS]);
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

  const [editingSections, setEditingSections] = useState<Set<string>>(new Set());

  const enableSectionEditing = useCallback(
    (sectionName: string) => {
      if (!clientInfoSection) return;
      setEditingSections((prev) => new Set(prev).add(sectionName));
      if (allFields) {
        setAllFields(toggleSectionFieldsDisabled(allFields, clientInfoSection, false));
      }
    },
    [clientInfoSection, allFields, setAllFields],
  );

  const disableSectionEditing = useCallback(
    (sectionName: string) => {
      if (!clientInfoSection) return;
      if (allFields) {
        setAllFields(toggleSectionFieldsDisabled(allFields, clientInfoSection, true));
      }
      setEditingSections((prev) => {
        const updated = new Set(prev);
        updated.delete(sectionName);
        return updated;
      });
    },
    [clientInfoSection, allFields, setAllFields],
  );

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
        disableSectionEditing("clientInfo");
        const oldValues = mapValuesToFormFields(client);
        Object.entries(oldValues).forEach(([key, value]) => setFieldValue(key, value));
        setErrors({});
        setTouched({});
      },
    [client, mapValuesToFormFields, disableSectionEditing],
  );

  const enableEditSection = (sectionName: string) => {
    if (sectionName === "clientInfo" && canEditClientDetails) {
      enableSectionEditing(sectionName);
    }
  };

  const handleActionWithValidation = useActionWithValidation({
    allFields,
    validateByAction,
    startValidation,
    stopValidation,
    setCurrentAction,
  });

  const updateCustomerMutation = useUpdateCustomer({
    onSuccess: () => {
      disableSectionEditing("clientInfo");
      void queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      void queryClient.invalidateQueries({
        queryKey: ["clientManagementCustomerDetails", clientId],
      });
      void queryClient.invalidateQueries({ queryKey: ["clientManagementCustomers"] });
      setMessages((prev) => [
        ...prev,
        { text: t("clientUpdatedSuccessfully"), type: "success", duration: 3000 },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { text: t("errorUpdateClientData"), type: "error", duration: 3000 },
      ]);
    },
  });

  const onSaveClient = useMemo(
    () =>
      (
        formValues: Record<string, unknown>,
        { setErrors, setTouched }: { setFieldValue: any; setErrors: any; setTouched: any },
      ) => {
        void handleActionWithValidation("save", formValues, { setErrors, setTouched }, () => {
          if (!allFields || !client) {
            return;
          }
          const mappedCustomer = mapValuesToAPI(formValues, allFields) as Record<string, unknown>;
          const clearedTopLevelFields = getClearedTopLevelFields(
            allFields,
            formValues,
            mappedCustomer,
          );

          const mappedBillingAddress = mappedCustomer["billingAddress"] as
            | Record<string, unknown>
            | undefined;
          const mappedDeliveryAddress = mappedCustomer["useBillingAddressForDelivery"]
            ? null
            : (mappedCustomer["deliveryAddress"] as Record<string, unknown> | undefined);
          const payload: Partial<Customer> = {
            ...client,
            ...clearedTopLevelFields,
            ...mappedCustomer,
            billingAddress: mappedBillingAddress
              ? { ...client.billingAddress, ...mappedBillingAddress }
              : client.billingAddress,
            deliveryAddress: mappedDeliveryAddress
              ? ({
                  ...client.deliveryAddress,
                  ...mappedDeliveryAddress,
                } as Address)
              : null,
            customerId: client.customerId,
            ascId: client.ascId,
          };
          updateCustomerMutation.mutate({
            payload,
            query: {
              pickupType: "PICKUP_IN_WORKSHOP",
              isDraft: false,
              isBillingAddressMandatory: true,
            },
          });
        });
      },
    [handleActionWithValidation, allFields, client, updateCustomerMutation],
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
        sections: clientOverviewForm.sections.map((section) =>
          section.name === "clientInfo"
            ? setSectionDisabledState(section, !editingSections.has("clientInfo"))
            : section,
        ),
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
        createdAt={formatDateToDisplay(customerDetails?.createdAt || "")}
        createdAtLabel={t("createdAt")}
        items={[
          {
            icon: getCustomerTypeIcon({
              customerType: customerDetails?.customerType || client?.customerType,
            }),
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
            Jobs: <ClientJobsTab clientId={clientId || ""} onRowClick={onJobRowClick} />,
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
