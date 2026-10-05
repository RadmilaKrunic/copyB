import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCustomerAssets } from "api/services/customers/hooks";
import ClientAssetsTab from "./ClientAssetsTab";

vi.mock("api/services/customers/hooks", () => ({ useCustomerAssets: vi.fn() }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay", () => ({
  default: () => <div data-testid="loading-assets" />,
}));
vi.mock("components/ui/List/Filters/Filters", () => ({
  default: ({
    searchValue,
    onSearchChange,
    onSearchReset,
  }: {
    searchValue: string;
    onSearchChange: (value: string) => void;
    onSearchReset: () => void;
  }) => (
    <div>
      <input
        aria-label="search"
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <button type="button" onClick={onSearchReset}>
        clear
      </button>
    </div>
  ),
}));
vi.mock("components/ui/List/Table/Table", () => ({
  default: ({ data, columns }: { data: any[]; columns: any[] }) => (
    <table>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>{column.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((asset) => (
          <tr key={asset.serialNumber}>
            {columns.map((column) => (
              <td key={column.key}>{column.render(asset)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));
vi.mock("components/ui/Pagination/Pagination", () => ({
  default: ({
    totalResults,
    onPageChange,
    onDropdownOptionChange,
  }: {
    totalResults: number;
    onPageChange: (page: number) => void;
    onDropdownOptionChange: (option: string) => void;
  }) => (
    <div>
      <span>{totalResults} results</span>
      <button type="button" onClick={() => onPageChange(2)}>
        page 2
      </button>
      <button type="button" onClick={() => onDropdownOptionChange("5")}>
        show 5
      </button>
    </div>
  ),
}));

describe("ClientAssetsTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests and displays the first ten assets with the required columns", () => {
    vi.mocked(useCustomerAssets).mockReturnValue({
      data: {
        page: { number: 0, totalElements: 12, totalPages: 2, size: 10 },
        content: [
          {
            assetName: "Drill",
            serialNumber: "SN-1",
            bareToolNumber: "BT-1",
            manufacturedOn: "2024-01-15",
            purchaseDate: "2024-02-20",
          },
        ],
      },
      isLoading: false,
      isError: false,
    } as never);

    render(<ClientAssetsTab clientId="client-123" />);

    expect(useCustomerAssets).toHaveBeenCalledWith("client-123", {
      searchTerm: undefined,
      page: 0,
      size: 10,
    });
    expect(screen.getByRole("columnheader", { name: "assetName" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "serialNumber" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "baretoolNumber" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "manufacturedOn" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "purchasedOn" })).toBeInTheDocument();
    expect(screen.getByText("Drill")).toBeInTheDocument();
    expect(screen.getByText("SN-1")).toBeInTheDocument();
    expect(screen.getByText("BT-1")).toBeInTheDocument();
    expect(screen.getByText("12 results")).toBeInTheDocument();
  });

  it("requests the selected page and page size", () => {
    vi.mocked(useCustomerAssets).mockReturnValue({
      data: { page: { number: 0, totalElements: 12, totalPages: 3, size: 10 }, content: [] },
      isLoading: false,
      isError: false,
    } as never);

    render(<ClientAssetsTab clientId="client-123" />);

    fireEvent.click(screen.getByRole("button", { name: "page 2" }));
    expect(useCustomerAssets).toHaveBeenLastCalledWith("client-123", {
      searchTerm: undefined,
      page: 1,
      size: 10,
    });

    fireEvent.click(screen.getByRole("button", { name: "show 5" }));
    expect(useCustomerAssets).toHaveBeenLastCalledWith("client-123", {
      searchTerm: undefined,
      page: 0,
      size: 5,
    });
  });

  it("searches assets and resets to the first page when search changes or clears", () => {
    vi.mocked(useCustomerAssets).mockReturnValue({
      data: { page: { number: 0, totalElements: 12, totalPages: 2, size: 10 }, content: [] },
      isLoading: false,
      isError: false,
    } as never);

    render(<ClientAssetsTab clientId="client-123" />);

    fireEvent.click(screen.getByRole("button", { name: "page 2" }));
    fireEvent.change(screen.getByRole("textbox", { name: "search" }), {
      target: { value: "  drill  " },
    });

    expect(useCustomerAssets).toHaveBeenLastCalledWith("client-123", {
      searchTerm: "drill",
      page: 0,
      size: 10,
    });

    fireEvent.click(screen.getByRole("button", { name: "clear" }));
    expect(useCustomerAssets).toHaveBeenLastCalledWith("client-123", {
      searchTerm: undefined,
      page: 0,
      size: 10,
    });
  });

  it("shows an error when assets fail to load", () => {
    vi.mocked(useCustomerAssets).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as never);

    render(<ClientAssetsTab clientId="client-123" />);

    expect(screen.getByRole("alert")).toHaveTextContent("errorLoadingAssets");
  });
});
