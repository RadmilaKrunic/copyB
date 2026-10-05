import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CustomerAsset } from "api/services/customers/customers.types";
import { useCustomerAssets } from "api/services/customers/hooks";
import ActivityIndicatorWithDelay from "components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay";
import { Column } from "components/ui/List/List.types";
import Filters from "components/ui/List/Filters/Filters";
import Table from "components/ui/List/Table/Table";
import Pagination from "components/ui/Pagination/Pagination";
import { formatDateToDisplay } from "utils/dateFormatter";
import "./ClientAssetsTab.scss";

interface ClientAssetsTabProps {
  clientId: string;
}

function ClientAssetsTab({ clientId }: Readonly<ClientAssetsTabProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const [searchValue, setSearchValue] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const {
    data: assetsPage,
    isLoading,
    isError,
  } = useCustomerAssets(clientId, {
    searchTerm: searchValue.trim() || undefined,
    page: pagination.page - 1,
    size: pagination.pageSize,
  });

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setPagination((previous) => ({ ...previous, page: 1 }));
  };

  const columns: Column<CustomerAsset>[] = useMemo(
    () => [
      { key: "assetName", label: t("assetName"), render: (asset) => asset.assetName || "-" },
      {
        key: "serialNumber",
        label: t("serialNumber"),
        render: (asset) => asset.serialNumber || "-",
      },
      {
        key: "bareToolNumber",
        label: t("baretoolNumber"),
        render: (asset) => asset.bareToolNumber || "-",
      },
      {
        key: "manufacturedOn",
        label: t("manufacturedOn"),
        render: (asset) => (asset.manufacturedOn ? formatDateToDisplay(asset.manufacturedOn) : "-"),
      },
      {
        key: "purchaseDate",
        label: t("purchasedOn"),
        render: (asset) => (asset.purchaseDate ? formatDateToDisplay(asset.purchaseDate) : "-"),
      },
    ],
    [t],
  );

  return (
    <div className="client-assets-tab">
      <Filters
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        onSearchReset={() => handleSearchChange("")}
      />
      {isLoading && <ActivityIndicatorWithDelay delay={500} />}
      {isError && <p role="alert">{t("errorLoadingAssets")}</p>}
      {!isLoading && !isError && (
        <>
          <Table
            data={assetsPage?.content ?? []}
            columns={columns}
            visibleColumns={columns.map((column) => column.key)}
            getRowKey={(asset) => asset.serialNumber || asset.bareToolNumber}
            renderRowActions={() => null}
            emptyListMessage="noAssetsFoundMessage"
          />
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            onPageChange={(page) => setPagination((previous) => ({ ...previous, page }))}
            onDropdownOptionChange={(option) =>
              setPagination({ page: 1, pageSize: Number(option) })
            }
            totalResults={assetsPage?.page.totalElements ?? 0}
          />
        </>
      )}
    </div>
  );
}

export default ClientAssetsTab;
