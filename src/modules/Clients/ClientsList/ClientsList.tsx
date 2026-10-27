import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { ActivityIndicator, Button, Icon } from "@bosch/react-frok";
import Filters from "components/ui/List/Filters/Filters";
import Table from "components/ui/List/Table/Table";
import Pagination from "components/ui/Pagination/Pagination";
import { ScrollablePopover } from "components/ui/ScrollablePopover/ScrollablePopover";
import { QuickFilter, Filter } from "components/ui/List/List.types";
import { useListFilterHandlers } from "hooks/useListFilterHandlers";
import { useDebouncedValue } from "hooks/useDebouncedValue";
import { useClientManagementCustomers } from "api/services/clientManagement/hooks";
import { ClientManagementCustomer } from "api/services/clientManagement/clientManagement.types";
import { HeaderUserData } from "api/services/header/action";
import GenericForm from "components/generics/Form/GenericForm.types";
import { useDeleteCustomer } from "api/services/customers/hooks";
import { useHasPermission } from "hooks/useHasPermission";
import { PERMISSIONS } from "utils/Permissions";
import DeleteClientDialog from "../ClientOverview/DeleteClientDialog/DeleteClientDialog";
import { getClientColumns } from "./ClientsListColumns.config";
import { resolveCustomerTypeFilter } from "./ClientsList.utils";
import { useListTracking } from "@/analytics";
import "./ClientsList.scss";

const QUICK_FILTERS: QuickFilter[] = [
  { key: "INDIVIDUAL_PRIVATE", label: "individual", selected: false },
  { key: "INDIVIDUAL_PRO", label: "individualPro", selected: false },
  { key: "COMPANY", label: "company", selected: false },
  { key: "DEALERSHIP", label: "dealership", selected: false },
];

function ClientsList() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const uiConfiguration = queryClient.getQueryData<{ forms: GenericForm[] }>([
    "UIConfiguration",
    user?.countryCode,
  ]);
  const clientFiltersSection =
    uiConfiguration?.forms.find((f) => f.name === "clientFilters")?.sections[0] ?? null;

  const quickFiltersFromStorage = JSON.parse(
    sessionStorage.getItem("client-quickFilters") || "null",
  );
  const advancedFiltersFromStorage = JSON.parse(
    sessionStorage.getItem(`${clientFiltersSection?.name}-client-advancedFilters`) || "[]",
  );

  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>(
    quickFiltersFromStorage ?? QUICK_FILTERS,
  );
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchValue = useDebouncedValue(searchValue, 500);
  const [advancedFilters, setAdvancedFilters] = useState<Filter[]>(advancedFiltersFromStorage);
  const [pagination, setPagination] = useState({
    page: Number(sessionStorage.getItem("clientList-currentPage")) || 1,
    pageSize: Number(sessionStorage.getItem("clientList-pageSize")) || 10,
  });

  const canDeleteClient = useHasPermission([PERMISSIONS.CLIENT.CAN_DELETE_CLIENT]);
  const [clientToDelete, setClientToDelete] = useState<ClientManagementCustomer | null>(null);
  const deleteCustomer = useDeleteCustomer();
  const deletionPendingRef = useRef(false);

  const { handleToggleFilter, applyAdvancedFilters, resetAdvancedFilters } = useListFilterHandlers(
    setQuickFilters,
    setAdvancedFilters,
    setPagination,
    "client",
  );

  const customerTypes = resolveCustomerTypeFilter(quickFilters, advancedFilters);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearchValue, quickFilters, advancedFilters]);

  const { data, isLoading, isFetching, isError } = useClientManagementCustomers(
    { ascId: user?.ascId || "", searchTerm: debouncedSearchValue || undefined, customerTypes },
    pagination.page - 1,
    pagination.pageSize,
  );

  const CLIENT_COLUMNS = useMemo(() => getClientColumns(t), [t]);
  const visibleColumns = useMemo(() => CLIENT_COLUMNS.map((col) => col.key), [CLIENT_COLUMNS]);

  const activeFilterKeys = useMemo(
    () => [
      ...quickFilters.filter((filter) => filter.selected).map((filter) => filter.key),
      ...advancedFilters.map((filter) => filter.name),
    ],
    [quickFilters, advancedFilters],
  );

  useListTracking({
    searchValue: debouncedSearchValue,
    activeFilterKeys,
    resultCount: data?.page?.totalElements ?? 0,
    isLoading: isFetching || isError,
  });

  const handlePageChange = (page: number) => {
    sessionStorage.setItem("clientList-currentPage", page.toString());
    setPagination((prev) => ({ ...prev, page }));
  };

  const handlePageSizeChange = (option: string) => {
    sessionStorage.setItem("clientList-pageSize", option);
    sessionStorage.setItem("clientList-currentPage", "1");
    setPagination({ page: 1, pageSize: Number(option) });
  };

  const isPaginationVisible = (data?.page?.totalElements || 0) > pagination.pageSize;

  const handleRowClick = (client: ClientManagementCustomer) => {
    const navigateResult = navigate(`/client-overview/${client.customerId}`);
    if (navigateResult instanceof Promise) {
      navigateResult.catch(() => undefined);
    }
  };

  const onDeleteClient = (client: ClientManagementCustomer) => {
    if (!canDeleteClient || deletionPendingRef.current) return;
    deleteCustomer.reset();
    setClientToDelete(client);
  };

  const closeDeleteDialog = () => {
    if (!deletionPendingRef.current) setClientToDelete(null);
  };

  const confirmDeleteClient = () => {
    if (!clientToDelete || !canDeleteClient || deletionPendingRef.current) return;
    deletionPendingRef.current = true;
    deleteCustomer.mutate(clientToDelete.customerId, {
      onSuccess: () => {
        setClientToDelete(null);
        queryClient
          .invalidateQueries({ queryKey: ["clientManagementCustomers"] })
          .catch(() => undefined);
      },
      onSettled: () => {
        deletionPendingRef.current = false;
      },
    });
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <ActivityIndicator size="large" />
      </div>
    );
  }

  if (isError) {
    return <div className="loading-container">{t("SomethingWentWrong")}</div>;
  }

  return (
    <div className="clients-list-container">
      <Filters
        quickFilters={quickFilters}
        filters={clientFiltersSection ?? undefined}
        applyAdvancedFilters={applyAdvancedFilters}
        resetAdvancedFilters={resetAdvancedFilters}
        onToggleFilter={handleToggleFilter}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSearchReset={() => setSearchValue("")}
        type="client"
      />
      <Table<ClientManagementCustomer>
        data={data?.content || []}
        columns={CLIENT_COLUMNS}
        visibleColumns={visibleColumns}
        getRowKey={(row) => row.customerId}
        onRowClick={handleRowClick}
        renderRowActions={(client) => (
          <ScrollablePopover
            data-testid={`client-actions-popover-${client.customerId}`}
            trigger={
              <Button
                icon={"options"}
                className="actions-popover-trigger"
                tabIndex={0}
                aria-label="More client options"
                data-testid={`client-actions-popover-trigger-${client.customerId}`}
              />
            }
            className="actions-popover"
          >
            <button
              type="button"
              className="client-action-button"
              data-testid={`client-action-view-${client.customerId}`}
              onClick={() => handleRowClick(client)}
            >
              <Icon iconName="right" aria-hidden="true" />
              <span>{t("viewDetails")}</span>
            </button>
            {canDeleteClient && (
              <button
                type="button"
                className="client-action-button"
                data-testid={`client-action-delete-${client.customerId}`}
                onClick={() => {
                  onDeleteClient(client);
                }}
              >
                <Icon iconName="right" aria-hidden="true" />
                <span>{t("delete")}</span>
              </button>
            )}
          </ScrollablePopover>
        )}
        emptyListMessage="noClientsFound"
      />
      {clientToDelete && (
        <DeleteClientDialog
          isOpen={!!clientToDelete}
          isPending={deleteCustomer.isPending}
          isError={deleteCustomer.isError}
          onCancel={closeDeleteDialog}
          onConfirm={confirmDeleteClient}
        />
      )}
      {isPaginationVisible && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          onPageChange={handlePageChange}
          onDropdownOptionChange={handlePageSizeChange}
          totalResults={data?.page?.totalElements || 0}
        />
      )}
    </div>
  );
}

export default ClientsList;
