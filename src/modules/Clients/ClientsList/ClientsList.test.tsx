import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import ClientsList from "./ClientsList";
import { useClientManagementCustomers } from "api/services/clientManagement/hooks";
import { useDeleteCustomer } from "api/services/customers/hooks";
import { useHasPermission } from "hooks/useHasPermission";
import { useListTracking } from "@/analytics";
import { resolveCustomerTypeFilter } from "./ClientsList.utils";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("api/services/clientManagement/hooks", () => ({
  useClientManagementCustomers: vi.fn(),
}));

vi.mock("api/services/customers/hooks", () => ({
  useDeleteCustomer: vi.fn(),
}));

vi.mock("hooks/useHasPermission", () => ({
  useHasPermission: vi.fn(),
}));

vi.mock("hooks/useDebouncedValue", () => ({
  useDebouncedValue: (value: unknown) => value,
}));

vi.mock("@/analytics", () => ({
  useListTracking: vi.fn(),
}));

vi.mock("./ClientsList.utils", () => ({
  resolveCustomerTypeFilter: vi.fn(() => undefined),
}));

vi.mock("./ClientsListColumns.config", () => ({
  getClientColumns: () => [{ key: "name", header: "Name" }],
}));

vi.mock("hooks/useListFilterHandlers", () => ({
  useListFilterHandlers: () => ({
    handleToggleFilter: vi.fn(),
    applyAdvancedFilters: vi.fn(),
    resetAdvancedFilters: vi.fn(),
  }),
}));

vi.mock("components/ui/List/Filters/Filters", () => ({
  default: ({ onSearchChange }: { onSearchChange: (value: string) => void }) => (
    <input data-testid="filters" onChange={(e) => onSearchChange(e.target.value)} />
  ),
}));

vi.mock("components/ui/List/Table/Table", () => ({
  default: ({
    data,
    onRowClick,
    renderRowActions,
  }: {
    data: { customerId: string }[];
    onRowClick: (row: { customerId: string }) => void;
    renderRowActions: (row: { customerId: string }) => React.ReactNode;
  }) => (
    <div data-testid="table">
      {data.length} rows
      {data.map((row) => (
        <div key={row.customerId}>
          <button data-testid={`row-${row.customerId}`} onClick={() => onRowClick(row)} />
          {renderRowActions(row)}
        </div>
      ))}
    </div>
  ),
}));

vi.mock("components/ui/Pagination/Pagination", () => ({
  default: ({
    onPageChange,
    onDropdownOptionChange,
  }: {
    onPageChange: (page: number) => void;
    onDropdownOptionChange: (option: string) => void;
  }) => (
    <div data-testid="pagination">
      <button data-testid="go-to-page-2" onClick={() => onPageChange(2)} />
      <button data-testid="set-page-size-20" onClick={() => onDropdownOptionChange("20")} />
    </div>
  ),
}));

vi.mock("components/ui/ScrollablePopover/ScrollablePopover", () => ({
  ScrollablePopover: ({
    trigger,
    children,
  }: {
    trigger: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      {trigger}
      {children}
    </div>
  ),
}));

vi.mock("../ClientOverview/DeleteClientDialog/DeleteClientDialog", () => ({
  default: ({
    isPending,
    isError,
    onCancel,
    onConfirm,
  }: {
    isPending: boolean;
    isError: boolean;
    onCancel: () => void;
    onConfirm: () => void;
  }) => (
    <div data-testid="delete-dialog" data-pending={isPending} data-error={isError}>
      <button data-testid="delete-dialog-cancel" onClick={onCancel} />
      <button data-testid="delete-dialog-confirm" onClick={onConfirm} />
    </div>
  ),
}));

vi.mock("@bosch/react-frok", () => ({
  ActivityIndicator: () => <div data-testid="loading" />,
  Button: ({ ...props }: Record<string, unknown>) => <button {...props} />,
  Icon: () => <span />,
}));

const mutate = vi.fn();
const reset = vi.fn();

type MutateOptions = { onSuccess?: () => void; onSettled?: () => void };

function mockDeleteCustomer(overrides: Record<string, unknown> = {}) {
  vi.mocked(useDeleteCustomer).mockReturnValue({
    mutate,
    reset,
    isPending: false,
    isError: false,
    ...overrides,
  } as never);
}

function lastMutateOptions(): MutateOptions {
  const calls = mutate.mock.calls;
  return calls[calls.length - 1][1] as MutateOptions;
}

function mockCustomers(
  content: { customerId: string; name: string }[],
  totalElements = content.length,
) {
  vi.mocked(useClientManagementCustomers).mockReturnValue({
    data: {
      content,
      page: { totalElements, number: 0, size: 10, totalPages: Math.ceil(totalElements / 10) },
    },
    isLoading: false,
    isFetching: false,
    isError: false,
  } as never);
}

function createQueryClient(roles: string[] | null = ["ASC_MANAGER"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(["user"], {
    ascId: "123",
    countryCode: "US",
    roles: roles ?? undefined,
  });
  return queryClient;
}

function renderWithProviders(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ClientsList />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ClientsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.mocked(useHasPermission).mockReturnValue(true);
    mockDeleteCustomer();
  });

  describe("loading, error and data", () => {
    it("shows loading indicator while fetching", () => {
      vi.mocked(useClientManagementCustomers).mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
        isError: false,
      } as never);

      renderWithProviders(createQueryClient());

      expect(screen.getByTestId("loading")).toBeInTheDocument();
    });

    it("shows error message when query fails", async () => {
      vi.mocked(useClientManagementCustomers).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        isError: true,
      } as never);

      renderWithProviders(createQueryClient());

      expect(await screen.findByText("SomethingWentWrong")).toBeInTheDocument();
    });

    it("renders table with fetched clients", async () => {
      mockCustomers([
        { customerId: "1", name: "John Doe" },
        { customerId: "2", name: "Jane Smith" },
      ]);

      renderWithProviders(createQueryClient());

      expect(await screen.findByTestId("table")).toHaveTextContent("2 rows");
      expect(screen.getByTestId("filters")).toBeInTheDocument();
    });
  });

  describe("query params, search and tracking", () => {
    it("requests the first page with ascId, default page size and resolved customer types", () => {
      vi.mocked(resolveCustomerTypeFilter).mockReturnValue(["COMPANY"] as never);
      mockCustomers([{ customerId: "1", name: "John Doe" }]);

      renderWithProviders(createQueryClient());

      expect(useClientManagementCustomers).toHaveBeenLastCalledWith(
        { ascId: "123", searchTerm: undefined, customerTypes: ["COMPANY"] },
        0,
        10,
      );
    });

    it("uses the page size stored in sessionStorage", () => {
      sessionStorage.setItem("clientList-pageSize", "50");
      mockCustomers([{ customerId: "1", name: "John Doe" }]);

      renderWithProviders(createQueryClient());

      expect(useClientManagementCustomers).toHaveBeenLastCalledWith(expect.anything(), 0, 50);
    });

    it("passes the search term to the query", () => {
      mockCustomers([{ customerId: "1", name: "John Doe" }]);

      renderWithProviders(createQueryClient());
      fireEvent.change(screen.getByTestId("filters"), { target: { value: "john" } });

      expect(useClientManagementCustomers).toHaveBeenLastCalledWith(
        expect.objectContaining({ searchTerm: "john" }),
        0,
        10,
      );
    });

    it("reports list state to tracking", () => {
      mockCustomers([{ customerId: "1", name: "John Doe" }], 7);

      renderWithProviders(createQueryClient());

      expect(useListTracking).toHaveBeenLastCalledWith({
        searchValue: "",
        activeFilterKeys: [],
        resultCount: 7,
        isLoading: false,
      });
    });
  });

  describe("pagination", () => {
    it("does not show pagination when clients fit on one page", async () => {
      mockCustomers([{ customerId: "1", name: "John Doe" }]);

      renderWithProviders(createQueryClient());

      await screen.findByTestId("table");
      expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
    });

    it("shows pagination when total clients exceed the page size", async () => {
      mockCustomers([{ customerId: "1", name: "John Doe" }], 25);

      renderWithProviders(createQueryClient());

      expect(await screen.findByTestId("pagination")).toBeInTheDocument();
    });

    it("changes page and persists it in sessionStorage", async () => {
      mockCustomers([{ customerId: "1", name: "John Doe" }], 25);

      renderWithProviders(createQueryClient());
      fireEvent.click(await screen.findByTestId("go-to-page-2"));

      expect(sessionStorage.getItem("clientList-currentPage")).toBe("2");
      expect(useClientManagementCustomers).toHaveBeenLastCalledWith(expect.anything(), 1, 10);
    });

    it("changes page size, resets to the first page and persists both", async () => {
      mockCustomers([{ customerId: "1", name: "John Doe" }], 25);

      renderWithProviders(createQueryClient());
      fireEvent.click(await screen.findByTestId("set-page-size-20"));

      expect(sessionStorage.getItem("clientList-pageSize")).toBe("20");
      expect(sessionStorage.getItem("clientList-currentPage")).toBe("1");
      expect(useClientManagementCustomers).toHaveBeenLastCalledWith(expect.anything(), 0, 20);
    });
  });

  describe("navigation", () => {
    it("navigates to client overview when a row is clicked", async () => {
      mockCustomers([{ customerId: "42", name: "John Doe" }]);

      renderWithProviders(createQueryClient());
      fireEvent.click(await screen.findByTestId("row-42"));

      expect(mockNavigate).toHaveBeenCalledWith("/client-overview/42");
    });

    it("navigates to client overview from the view details action", async () => {
      mockCustomers([{ customerId: "42", name: "John Doe" }]);

      renderWithProviders(createQueryClient());
      fireEvent.click(await screen.findByTestId("client-action-view-42"));

      expect(mockNavigate).toHaveBeenCalledWith("/client-overview/42");
    });
  });

  describe("delete permissions", () => {
    it("shows the delete action when the user has the delete permission", async () => {
      mockCustomers([{ customerId: "42", name: "John Doe" }]);

      renderWithProviders(createQueryClient());

      expect(await screen.findByTestId("client-action-delete-42")).toBeInTheDocument();
    });

    it("hides the delete action when the user lacks the delete permission", async () => {
      vi.mocked(useHasPermission).mockReturnValue(false);
      mockCustomers([{ customerId: "42", name: "John Doe" }]);

      renderWithProviders(createQueryClient());

      await screen.findByTestId("table");
      expect(screen.getByTestId("client-action-view-42")).toBeInTheDocument();
      expect(screen.queryByTestId("client-action-delete-42")).not.toBeInTheDocument();
    });
  });

  describe("delete flow", () => {
    it("does not render the delete dialog initially", async () => {
      mockCustomers([{ customerId: "1", name: "John Doe" }]);

      renderWithProviders(createQueryClient());

      await screen.findByTestId("table");
      expect(screen.queryByTestId("delete-dialog")).not.toBeInTheDocument();
    });

    it("opens the delete dialog and resets the mutation when delete is clicked", async () => {
      mockCustomers([{ customerId: "42", name: "John Doe" }]);

      renderWithProviders(createQueryClient());
      fireEvent.click(await screen.findByTestId("client-action-delete-42"));

      expect(reset).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
    });

    it("passes pending and error state of the mutation to the dialog", async () => {
      mockDeleteCustomer({ isPending: true, isError: true });
      mockCustomers([{ customerId: "42", name: "John Doe" }]);

      renderWithProviders(createQueryClient());
      fireEvent.click(await screen.findByTestId("client-action-delete-42"));

      const dialog = screen.getByTestId("delete-dialog");
      expect(dialog).toHaveAttribute("data-pending", "true");
      expect(dialog).toHaveAttribute("data-error", "true");
    });

    it("closes the dialog on cancel", async () => {
      mockCustomers([{ customerId: "42", name: "John Doe" }]);

      renderWithProviders(createQueryClient());
      fireEvent.click(await screen.findByTestId("client-action-delete-42"));
      fireEvent.click(screen.getByTestId("delete-dialog-cancel"));

      expect(screen.queryByTestId("delete-dialog")).not.toBeInTheDocument();
      expect(mutate).not.toHaveBeenCalled();
    });

    it("deletes the selected client on confirm", async () => {
      mockCustomers([
        { customerId: "1", name: "John Doe" },
        { customerId: "2", name: "Jane Smith" },
      ]);

      renderWithProviders(createQueryClient());
      fireEvent.click(await screen.findByTestId("client-action-delete-2"));
      fireEvent.click(screen.getByTestId("delete-dialog-confirm"));

      expect(mutate).toHaveBeenCalledTimes(1);
      expect(mutate).toHaveBeenCalledWith("2", expect.any(Object));
    });

    it("on success closes the dialog and invalidates the clients list", async () => {
      mockCustomers([{ customerId: "42", name: "John Doe" }]);
      const queryClient = createQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined);

      renderWithProviders(queryClient);
      fireEvent.click(await screen.findByTestId("client-action-delete-42"));
      fireEvent.click(screen.getByTestId("delete-dialog-confirm"));

      act(() => lastMutateOptions().onSuccess?.());

      expect(screen.queryByTestId("delete-dialog")).not.toBeInTheDocument();
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["clientManagementCustomers"] });
    });

    it("keeps the dialog open when the deletion fails", async () => {
      mockCustomers([{ customerId: "42", name: "John Doe" }]);

      renderWithProviders(createQueryClient());
      fireEvent.click(await screen.findByTestId("client-action-delete-42"));
      fireEvent.click(screen.getByTestId("delete-dialog-confirm"));

      act(() => lastMutateOptions().onSettled?.());

      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
    });

    it("allows retrying after a failed deletion", async () => {
      mockCustomers([{ customerId: "42", name: "John Doe" }]);

      renderWithProviders(createQueryClient());
      fireEvent.click(await screen.findByTestId("client-action-delete-42"));
      fireEvent.click(screen.getByTestId("delete-dialog-confirm"));
      act(() => lastMutateOptions().onSettled?.());

      fireEvent.click(screen.getByTestId("delete-dialog-confirm"));

      expect(mutate).toHaveBeenCalledTimes(2);
    });
  });

  describe("while a deletion is pending", () => {
    it("ignores a second confirm", async () => {
      mockCustomers([{ customerId: "42", name: "John Doe" }]);

      renderWithProviders(createQueryClient());
      fireEvent.click(await screen.findByTestId("client-action-delete-42"));
      fireEvent.click(screen.getByTestId("delete-dialog-confirm"));
      fireEvent.click(screen.getByTestId("delete-dialog-confirm"));

      expect(mutate).toHaveBeenCalledTimes(1);
    });

    it("ignores cancel", async () => {
      mockCustomers([{ customerId: "42", name: "John Doe" }]);

      renderWithProviders(createQueryClient());
      fireEvent.click(await screen.findByTestId("client-action-delete-42"));
      fireEvent.click(screen.getByTestId("delete-dialog-confirm"));
      fireEvent.click(screen.getByTestId("delete-dialog-cancel"));

      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
    });

    it("ignores delete requests for other clients", async () => {
      mockCustomers([
        { customerId: "1", name: "John Doe" },
        { customerId: "2", name: "Jane Smith" },
      ]);

      renderWithProviders(createQueryClient());
      fireEvent.click(await screen.findByTestId("client-action-delete-1"));
      fireEvent.click(screen.getByTestId("delete-dialog-confirm"));
      reset.mockClear();

      fireEvent.click(screen.getByTestId("client-action-delete-2"));

      expect(reset).not.toHaveBeenCalled();
    });

    it("allows closing the dialog again once the mutation has settled", async () => {
      mockCustomers([{ customerId: "42", name: "John Doe" }]);

      renderWithProviders(createQueryClient());
      fireEvent.click(await screen.findByTestId("client-action-delete-42"));
      fireEvent.click(screen.getByTestId("delete-dialog-confirm"));
      act(() => lastMutateOptions().onSettled?.());

      fireEvent.click(screen.getByTestId("delete-dialog-cancel"));

      expect(screen.queryByTestId("delete-dialog")).not.toBeInTheDocument();
    });
  });
});
