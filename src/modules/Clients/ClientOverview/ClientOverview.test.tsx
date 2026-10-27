import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useContext } from "react";
import ClientOverview from "./ClientOverview";
import { getCustomerById } from "../../../api/services/customers/customers";
import type { ClientManagementCustomerDetails } from "../../../api/services/clientManagement/clientManagement.types";
import { GenericFormContext } from "../../../components/generics/Form/GenericForm.context";
import { MessagesContext } from "../../../contexts/messagescontext";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ clientId: "client-123" }),
}));

vi.mock("../../../api/services/customers/customers", () => ({
  getCustomerById: vi.fn(),
  createClient: vi.fn(),
}));

const mockUseClientManagementCustomerDetails = vi.fn();
vi.mock("../../../api/services/clientManagement/hooks", () => ({
  useClientManagementCustomerDetails: (...args: unknown[]) =>
    mockUseClientManagementCustomerDetails(...args),
}));

// useUpdateCustomer is replaced so tests can trigger onSuccess / onError and inspect mutate calls.
// The rest of the module (e.g. useDeleteCustomer) stays real.
const mockMutate = vi.fn();
let updateCustomerOptions: any;
vi.mock("../../../api/services/customers/hooks", async () => ({
  ...(await vi.importActual<Record<string, unknown>>("../../../api/services/customers/hooks")),
  useUpdateCustomer: (options: unknown) => {
    updateCustomerOptions = options;
    return { mutate: mockMutate };
  },
}));

vi.mock("../../../utils/queryConstants", () => ({
  DEFAULT_STALE_TIME_MS: 60000,
}));

vi.mock("../../../hooks/useBreadcrumbs", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("../../../components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay", () => ({
  default: () => <div data-testid="loading" />,
}));

vi.mock("../../../components/ui/OverviewHeader/OverviewHeader", () => ({
  default: (props: any) => (
    <div data-testid="overview-header">
      <span data-testid="header-id">{props.id}</span>
      {props.items.map((item: any, idx: number) => (
        <div key={idx} data-testid={`header-item-${idx}`}>
          {item.title} | {item.subtitle}
        </div>
      ))}
    </div>
  ),
}));

// Tab content overrides rendered by ClientOverview via tabContentOverrides.
vi.mock("./ClientAssetsTab/ClientAssetsTab", () => ({
  default: (props: any) => <div data-testid="assets-tab">{props.clientId}</div>,
}));

vi.mock("./ClientOrdersTab/ClientOrdersTab", () => ({
  default: (props: any) => <div data-testid="orders-tab">{props.clientId}</div>,
}));

vi.mock("./ClientJobsTab/ClientJobsTab", () => ({
  default: (props: any) => (
    <div data-testid="jobs-tab">
      <span data-testid="jobs-tab-client-id">{props.clientId}</span>
      <button data-testid="jobs-row" onClick={() => props.onRowClick({ jobId: "job-42" })}>
        row
      </button>
      <button data-testid="jobs-create" onClick={props.onCreateJob}>
        create
      </button>
    </div>
  ),
}));

// Mocked once here; GenericOverviewFormSection and DeleteClientDialog also import this module,
// but Vitest resolves module mocks by absolute path, so this single mock
// intercepts all import sites.
vi.mock("@bosch/react-frok", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  TextArea: ({ label, id, ...props }: any) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <textarea id={id} {...props} />
    </div>
  ),
  Dialog: ({ children, title, open, onClose, className }: any) =>
    open ? (
      <div role="dialog" aria-label={title} className={className}>
        <h2>{title}</h2>
        <button aria-label="Close" onClick={onClose} />
        {children}
      </div>
    ) : null,
  TabNavigation: (props: any) => (
    <div data-testid="tab-navigation">
      {React.Children.map(props.children, (child: any) =>
        React.cloneElement(child, {
          onClick: () => props.onTabSelect(null, { value: child.props.value }),
        }),
      )}
    </div>
  ),
  Tab: (props: any) => (
    <button data-testid={`tab-${props.value}`} onClick={props.onClick}>
      {props.children}
    </button>
  ),
}));

// ClientOverview mutates the form/field objects it receives (isDisabled flags),
// so every test gets fresh copies instead of shared module-level objects.
const createBaseFields = () => [
  { name: "firstName", isDisabled: true },
  { name: "lastName", isDisabled: true },
];

// Stable per-test result: the real hook returns stable references between renders.
let formInitResult: any;
vi.mock("../../../hooks/useFormInitialization", () => ({
  useFormInitialization: () => formInitResult,
}));

const formValidationResult = {
  validate: vi.fn(),
  validateByAction: vi.fn(),
  startValidation: vi.fn(),
  stopValidation: vi.fn(),
  setCurrentAction: vi.fn(),
};
vi.mock("../../../components/generics/Form/useFormValidation", () => ({
  useFormValidation: () => formValidationResult,
}));

// Runs the success callback immediately, simulating a form that passes validation.
vi.mock("../../../hooks/useActionWithValidation", () => ({
  useActionWithValidation:
    () => (_action: string, _values: unknown, _helpers: unknown, onSuccess: () => void) =>
      onSuccess(),
}));

// GenericOverviewFormSection (used by ClientOverview) imports this module too;
// same reasoning as the @bosch/react-frok mock above.
vi.mock("../../../components/generics/Action/GenericAction", () => ({
  default: (props: any) => (
    <div data-testid="generic-action">
      {props.actions.map((action: any) => (
        <button key={action.name} onClick={() => props.onActionClick(action.name)}>
          {action.name}
        </button>
      ))}
    </div>
  ),
}));

const saveFormValues = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  phoneNumber: "123456",
  communicationMedium: "email",
  streetName: "Main St",
  houseNumber: "1",
  addressLineTwo: "",
  neighborhood: "",
  postalCode: "12345",
  district: "",
  city: "Springfield",
  countryCode: "US",
};

const cancelHelpers = {
  setErrors: vi.fn(),
  setTouched: vi.fn(),
  setFieldValue: vi.fn(),
};

// Mocked as a context consumer so tests can trigger onSaveClient / onCancelSaveClient,
// which are only exposed via GenericFormContext. Also imported transitively via
// GenericOverviewFormSection.
vi.mock("../../../components/generics/Section/GenericSection", () => ({
  default: (props: any) => {
    const ctx = useContext(GenericFormContext);
    return (
      <div data-testid={`section-${props.section.name}`}>
        <button data-testid={`edit-${props.section.name}`} onClick={props.onEdit}>
          edit
        </button>
        <button
          data-testid="trigger-save"
          onClick={() =>
            ctx.actionCallbacks.onSaveClient(saveFormValues, {
              setErrors: vi.fn(),
              setTouched: vi.fn(),
              setFieldValue: vi.fn(),
            })
          }
        >
          save
        </button>
        <button
          data-testid="trigger-cancel"
          onClick={() => ctx.actionCallbacks.onCancelSaveClient(saveFormValues, cancelHelpers)}
        >
          cancel
        </button>
      </div>
    );
  },
}));

const mockMapValuesToAPI = vi.fn();
vi.mock("../../../components/generics/utils", () => ({
  toggleSectionFieldsDisabled: (allFields: unknown[]) => allFields,
  convertAPIDataToFormValues: () => ({ firstName: "Jane", lastName: "Doe" }),
  mapValuesToAPI: (...args: unknown[]) => mockMapValuesToAPI(...args),
}));

const mockAxiosDelete = vi.fn();
vi.mock("../../../api/axios-client/axiosClient", () => ({
  default: {
    defaults: { baseURL: "http://localhost", headers: {} },
    delete: (...args: unknown[]) => mockAxiosDelete(...args),
  },
}));

const mockSetMessages = vi.fn();

const createClientOverviewForm = () => ({
  name: "ClientOverview",
  sections: [
    {
      name: "clientInfo",
      label: "clientInfo",
      position: 0,
      isDisabled: false,
      areas: [{ fields: createBaseFields() }],
    },
    {
      name: "Assets",
      label: "assets",
      position: 1,
      isDisabled: true,
      areas: [],
    },
    {
      name: "Orders",
      label: "orders",
      position: 2,
      isDisabled: true,
      areas: [],
    },
    {
      name: "Jobs",
      label: "jobs",
      position: 3,
      isDisabled: true,
      areas: [],
    },
    {
      name: "otherTab",
      label: "otherTab",
      position: 4,
      isDisabled: true,
      areas: [],
    },
  ],
  actions: [{ name: "onDeleteClient" }, { name: "onCreateJob" }],
});

const mockClient = {
  customerId: "customer-1",
  ascId: "asc-1",
  customerType: "PRIVATE",
  firstName: "Jane",
  lastName: "Doe",
  isActive: true,
  assetsCount: 3,
  createdOn: "2024-01-01",
  billingAddress: { street: "Main St", city: "Springfield", stateProvinceRegion: "IL" },
  deliveryAddress: { street: "Side St", city: "Springfield" },
  phoneNumber: "555-0000",
  mobileNumber: "555-1111",
  primaryEmail: "jane@example.com",
};

const mockCustomerDetails: ClientManagementCustomerDetails = {
  customerId: "client-123",
  name: "Jane Doe",
  phoneNumber: "555-1111",
  email: "jane@example.com",
  billingAddress: {
    city: "Springfield",
    stateProvinceRegion: "IL",
    countryCode: "US",
    postalCode: "62704",
  },
  assetCount: 3,
  totalActiveJobs: 5,
  createdAt: "2024-01-01",
};

// "CLDE" is PERMISSIONS.CLIENT.CAN_DELETE_CLIENT.
function createQueryClient(roles = ["ASC_MANAGER"], permissions = ["CLDE"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(["user"], {
    ascId: "asc-1",
    language: "en",
    locale: "en_US",
    countryCode: "US",
    roles,
    permissions,
  });
  queryClient.setQueryData(["UIConfiguration", "US"], { forms: [createClientOverviewForm()] });
  return queryClient;
}

function renderWithProviders(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MessagesContext.Provider value={{ setMessages: mockSetMessages } as any}>
        <ClientOverview />
      </MessagesContext.Provider>
    </QueryClientProvider>,
  );
}

describe("ClientOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks keeps unconsumed mockImplementationOnce queues, so reset these explicitly.
    mockNavigate.mockReset();
    mockAxiosDelete.mockReset();
    sessionStorage.clear();
    updateCustomerOptions = undefined;
    formInitResult = {
      initialFormValues: {},
      setInitialFormValues: vi.fn(),
      allFields: createBaseFields(),
      setAllFields: vi.fn(),
      mandatoryFields: {},
      tabs: [
        { name: "clientInfo", label: "clientInfo", position: 0 },
        { name: "Assets", label: "assets", position: 1 },
        { name: "Orders", label: "orders", position: 2 },
        { name: "Jobs", label: "jobs", position: 3 },
        { name: "otherTab", label: "otherTab", position: 4 },
      ],
      isInitialized: true,
    };
    mockUseClientManagementCustomerDetails.mockReturnValue({ data: mockCustomerDetails });
    mockMapValuesToAPI.mockReturnValue({});
  });

  it("shows loading indicator while fetching the client", () => {
    vi.mocked(getCustomerById).mockReturnValue(new Promise(() => {}));
    renderWithProviders(createQueryClient());

    expect(screen.getByTestId("loading")).toBeInTheDocument();
    expect(screen.queryByTestId("overview-header")).not.toBeInTheDocument();
  });

  it("fetches the client and the customer details using the clientId from the route", async () => {
    vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
    renderWithProviders(createQueryClient());

    await screen.findByTestId("overview-header");

    expect(getCustomerById).toHaveBeenCalledWith("client-123");
    expect(mockUseClientManagementCustomerDetails).toHaveBeenCalledWith("client-123");
  });

  it("renders the header with client details once loaded", async () => {
    vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
    renderWithProviders(createQueryClient());

    expect(await screen.findByTestId("overview-header")).toBeInTheDocument();
    expect(screen.getByTestId("header-id")).toHaveTextContent("client-123");
    expect(screen.getByTestId("header-item-0")).toHaveTextContent(
      "Jane Doe | 555-1111 | jane@example.com",
    );
    expect(screen.getByTestId("header-item-1")).toHaveTextContent("Springfield | IL | 62704");
    expect(screen.getByTestId("header-item-2")).toHaveTextContent("3");
    expect(screen.getByTestId("header-item-3")).toHaveTextContent("5");
  });

  describe("header fallbacks", () => {
    it("shows '-' for missing phone, email and address parts", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      mockUseClientManagementCustomerDetails.mockReturnValue({
        data: { name: "Jane Doe", assetCount: 3, totalActiveJobs: 5 },
      });
      renderWithProviders(createQueryClient());

      await screen.findByTestId("overview-header");

      expect(screen.getByTestId("header-item-0")).toHaveTextContent("Jane Doe | - | -");
      expect(screen.getByTestId("header-item-1")).toHaveTextContent("- | - | -");
    });

    it("falls back to client.assetsCount when customer details have no assetCount", async () => {
      vi.mocked(getCustomerById).mockResolvedValue({ ...mockClient, assetsCount: 7 } as never);
      mockUseClientManagementCustomerDetails.mockReturnValue({
        data: { ...mockCustomerDetails, assetCount: undefined },
      });
      renderWithProviders(createQueryClient());

      await screen.findByTestId("overview-header");

      expect(screen.getByTestId("header-item-2")).toHaveTextContent(/^7 \| totalAssets$/);
    });

    it("shows '-' when there is no asset count anywhere", async () => {
      vi.mocked(getCustomerById).mockResolvedValue({
        ...mockClient,
        assetsCount: undefined,
      } as never);
      mockUseClientManagementCustomerDetails.mockReturnValue({
        data: { ...mockCustomerDetails, assetCount: undefined },
      });
      renderWithProviders(createQueryClient());

      await screen.findByTestId("overview-header");

      expect(screen.getByTestId("header-item-2")).toHaveTextContent(/^- \| totalAssets$/);
    });

    it("defaults total active jobs to 0 when it is missing", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      mockUseClientManagementCustomerDetails.mockReturnValue({
        data: { ...mockCustomerDetails, totalActiveJobs: undefined },
      });
      renderWithProviders(createQueryClient());

      await screen.findByTestId("overview-header");

      expect(screen.getByTestId("header-item-3")).toHaveTextContent(/^0 \| totalActiveJobs$/);
    });
  });

  it("switches the visible section when a different tab is selected", async () => {
    vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
    renderWithProviders(createQueryClient());

    await screen.findByTestId("section-clientInfo");
    fireEvent.click(screen.getByTestId("tab-otherTab"));

    expect(screen.getByTestId("section-otherTab")).toBeInTheDocument();
    expect(screen.queryByTestId("section-clientInfo")).not.toBeInTheDocument();
  });

  describe("tab content overrides", () => {
    it("renders the assets tab with the clientId when the Assets tab is selected", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      renderWithProviders(createQueryClient());

      await screen.findByTestId("section-clientInfo");
      fireEvent.click(screen.getByTestId("tab-Assets"));

      expect(screen.getByTestId("assets-tab")).toHaveTextContent("client-123");
      expect(screen.queryByTestId("section-clientInfo")).not.toBeInTheDocument();
    });

    it("renders the orders tab with the clientId when the Orders tab is selected", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      renderWithProviders(createQueryClient());

      await screen.findByTestId("section-clientInfo");
      fireEvent.click(screen.getByTestId("tab-Orders"));

      expect(screen.getByTestId("orders-tab")).toHaveTextContent("client-123");
      expect(screen.queryByTestId("section-clientInfo")).not.toBeInTheDocument();
    });

    it("renders the jobs tab with the clientId when the Jobs tab is selected", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      renderWithProviders(createQueryClient());

      await screen.findByTestId("section-clientInfo");
      fireEvent.click(screen.getByTestId("tab-Jobs"));

      expect(screen.getByTestId("jobs-tab")).toBeInTheDocument();
      expect(screen.getByTestId("jobs-tab-client-id")).toHaveTextContent("client-123");
    });

    it("navigates to the job overview when a job row is clicked", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      renderWithProviders(createQueryClient());

      await screen.findByTestId("section-clientInfo");
      fireEvent.click(screen.getByTestId("tab-Jobs"));
      fireEvent.click(screen.getByTestId("jobs-row"));

      expect(mockNavigate).toHaveBeenCalledWith("/job-overview/job-42");
    });

    it("navigates to create-job with the client prefilled when creating a job from the jobs tab", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      renderWithProviders(createQueryClient());

      await screen.findByTestId("section-clientInfo");
      fireEvent.click(screen.getByTestId("tab-Jobs"));
      fireEvent.click(screen.getByTestId("jobs-create"));

      expect(mockNavigate).toHaveBeenCalledWith("/create-job", {
        state: { prefillCustomer: mockClient },
      });
    });

    it("swallows a rejected navigation promise when opening a job", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      mockNavigate.mockImplementationOnce(() => Promise.reject(new Error("nav failed")));
      renderWithProviders(createQueryClient());

      await screen.findByTestId("section-clientInfo");
      fireEvent.click(screen.getByTestId("tab-Jobs"));

      expect(() => fireEvent.click(screen.getByTestId("jobs-row"))).not.toThrow();
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/job-overview/job-42"));
    });

    it("swallows a rejected navigation promise when creating a job", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      mockNavigate.mockImplementationOnce(() => Promise.reject(new Error("nav failed")));
      renderWithProviders(createQueryClient());

      await screen.findByText("onCreateJob");

      expect(() => fireEvent.click(screen.getByText("onCreateJob"))).not.toThrow();
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    });
  });

  describe("save flow", () => {
    const expectedQuery = {
      pickupType: "PICKUP_IN_WORKSHOP",
      isDraft: false,
      isBillingAddressMandatory: true,
    };

    it("maps the form values to the API and submits the merged customer payload", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      mockMapValuesToAPI.mockReturnValue({
        firstName: "Janet",
        useBillingAddressForDelivery: false,
        billingAddress: { city: "Shelbyville" },
        deliveryAddress: { city: "Capital City" },
      });
      renderWithProviders(createQueryClient());

      await screen.findByTestId("trigger-save");
      fireEvent.click(screen.getByTestId("trigger-save"));

      expect(mockMapValuesToAPI).toHaveBeenCalledWith(saveFormValues, expect.any(Array));
      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith({
        payload: expect.objectContaining({
          ...mockClient,
          firstName: "Janet",
          billingAddress: { ...mockClient.billingAddress, city: "Shelbyville" },
          deliveryAddress: { ...mockClient.deliveryAddress, city: "Capital City" },
          customerId: "customer-1",
          ascId: "asc-1",
          customerType: "PRIVATE",
        }),
        query: expectedQuery,
      });
    });

    it("sends a null delivery address when the billing address is used for delivery", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      mockMapValuesToAPI.mockReturnValue({
        useBillingAddressForDelivery: true,
        billingAddress: { city: "Shelbyville" },
        deliveryAddress: { city: "Capital City" },
      });
      renderWithProviders(createQueryClient());

      await screen.findByTestId("trigger-save");
      fireEvent.click(screen.getByTestId("trigger-save"));

      expect(mockMutate).toHaveBeenCalledWith({
        payload: expect.objectContaining({ deliveryAddress: null }),
        query: expectedQuery,
      });
    });

    it("keeps the existing billing address when the form does not provide one", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      mockMapValuesToAPI.mockReturnValue({ firstName: "Janet" });
      renderWithProviders(createQueryClient());

      await screen.findByTestId("trigger-save");
      fireEvent.click(screen.getByTestId("trigger-save"));

      expect(mockMutate).toHaveBeenCalledWith({
        payload: expect.objectContaining({
          firstName: "Janet",
          billingAddress: mockClient.billingAddress,
          deliveryAddress: null,
        }),
        query: expectedQuery,
      });
    });

    it("invalidates the client queries and shows a success message on successful update", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      const queryClient = createQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      renderWithProviders(queryClient);

      await screen.findByTestId("trigger-save");
      await act(async () => {
        updateCustomerOptions.onSuccess();
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["client", "client-123"] });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["clientManagementCustomerDetails", "client-123"],
      });
      expect(mockSetMessages).toHaveBeenCalledTimes(1);
      const updater = mockSetMessages.mock.calls[0][0];
      expect(updater([])).toEqual([
        { text: "clientUpdatedSuccessfully", type: "success", duration: 3000 },
      ]);
    });

    it("shows an error message when the update fails", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      renderWithProviders(createQueryClient());

      await screen.findByTestId("trigger-save");
      await act(async () => {
        updateCustomerOptions.onError();
      });

      expect(mockSetMessages).toHaveBeenCalledTimes(1);
      const updater = mockSetMessages.mock.calls[0][0];
      expect(updater([])).toEqual([
        { text: "errorUpdateClientData", type: "error", duration: 3000 },
      ]);
    });
  });

  describe("cancel flow", () => {
    it("resets form values to the client data and clears errors and touched state", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      renderWithProviders(createQueryClient());

      await screen.findByTestId("trigger-cancel");
      fireEvent.click(screen.getByTestId("trigger-cancel"));

      expect(cancelHelpers.setFieldValue).toHaveBeenCalledWith("firstName", "Jane");
      expect(cancelHelpers.setFieldValue).toHaveBeenCalledWith("lastName", "Doe");
      expect(cancelHelpers.setErrors).toHaveBeenCalledWith({});
      expect(cancelHelpers.setTouched).toHaveBeenCalledWith({});
    });
  });

  describe("delete flow", () => {
    it("deletes the client and navigates to the clients list", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      mockAxiosDelete.mockResolvedValue({ status: 204 });
      const queryClient = createQueryClient();
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
      renderWithProviders(queryClient);

      await screen.findByText("onDeleteClient");
      fireEvent.click(screen.getByText("onDeleteClient"));

      expect(mockAxiosDelete).not.toHaveBeenCalled();
      expect(screen.getByText("deleteClientConfirmationText")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "delete" }));

      await waitFor(() => expect(mockAxiosDelete).toHaveBeenCalledWith("/v1/customers/client-123"));
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/clients"));
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["clientManagementCustomers"] });
      expect(invalidateQueries).toHaveBeenCalledTimes(1);
      expect(getCustomerById).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("does not delete the client when confirmation is cancelled", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      renderWithProviders(createQueryClient());

      fireEvent.click(await screen.findByText("onDeleteClient"));
      fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "cancel" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(mockAxiosDelete).not.toHaveBeenCalled();
    });

    it.each(["ASC_MANAGER", "ASC_MANAGER_WITHOUT_CLAIM", "ASC_RECEPTIONIST"])(
      "allows %s with delete permission to open confirmation",
      async (role) => {
        vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
        renderWithProviders(createQueryClient([role]));

        fireEvent.click(await screen.findByText("onDeleteClient"));

        expect(
          screen.getByRole("dialog", { name: "deleteClientConfirmationTitle" }),
        ).toBeInTheDocument();
        expect(mockAxiosDelete).not.toHaveBeenCalled();
      },
    );

    it("hides deletion when required permission is missing", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      renderWithProviders(createQueryClient(["ASC_MANAGER"], []));

      await screen.findByTestId("overview-header");

      expect(screen.queryByText("onDeleteClient")).not.toBeInTheDocument();
      expect(mockAxiosDelete).not.toHaveBeenCalled();
    });

    it.each([
      { permissions: ["CL_E"] },
      { permissions: ["CL_A"] },
      { permissions: ["CL_E", "CL_A", "CL_V"] },
    ])(
      "hides deletion when user has $permissions but not the delete permission",
      async ({ permissions }) => {
        vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
        renderWithProviders(createQueryClient(["ASC_MANAGER"], permissions));

        await screen.findByTestId("overview-header");

        expect(screen.queryByText("onDeleteClient")).not.toBeInTheDocument();
        expect(mockAxiosDelete).not.toHaveBeenCalled();
      },
    );

    it("keeps the other actions visible when deletion is hidden", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      renderWithProviders(createQueryClient(["ASC_MANAGER"], []));

      await screen.findByTestId("overview-header");

      expect(screen.getByText("onCreateJob")).toBeInTheDocument();
      expect(screen.queryByText("onDeleteClient")).not.toBeInTheDocument();
    });

    it("closes confirmation without deletion through dialog close", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      renderWithProviders(createQueryClient());

      fireEvent.click(await screen.findByText("onDeleteClient"));
      fireEvent.click(screen.getByRole("button", { name: "Close" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(mockAxiosDelete).not.toHaveBeenCalled();
    });

    it("keeps dialog open after failure and allows retry", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      mockAxiosDelete
        .mockRejectedValueOnce(new Error("Delete failed"))
        .mockResolvedValueOnce({ status: 204 });
      renderWithProviders(createQueryClient());

      fireEvent.click(await screen.findByText("onDeleteClient"));
      fireEvent.click(screen.getByRole("button", { name: "delete" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("errorDeleteClient");
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "delete" }));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/clients"));
      expect(mockAxiosDelete).toHaveBeenCalledTimes(2);
    });

    it("blocks duplicate requests and dismissal while deletion is pending", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      let resolveDelete: (value: unknown) => void = () => {};
      mockAxiosDelete.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveDelete = resolve;
        }),
      );
      renderWithProviders(createQueryClient());

      fireEvent.click(await screen.findByText("onDeleteClient"));
      const deleteButton = screen.getByRole("button", { name: "delete" });
      fireEvent.click(deleteButton);
      fireEvent.click(deleteButton);

      await waitFor(() => expect(deleteButton).toBeDisabled());
      expect(
        within(screen.getByRole("dialog")).getByRole("button", { name: "cancel" }),
      ).toBeDisabled();
      expect(screen.getByRole("textbox", { name: "deleteClientNotesLabel" })).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(mockAxiosDelete).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveDelete({});
      });
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/clients"));
    });

    it("swallows a rejected navigation promise after deleting the client", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      mockAxiosDelete.mockResolvedValue({ status: 204 });
      mockNavigate.mockImplementationOnce(() => Promise.reject(new Error("nav failed")));
      renderWithProviders(createQueryClient());

      fireEvent.click(await screen.findByText("onDeleteClient"));
      fireEvent.click(screen.getByRole("button", { name: "delete" }));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/clients"));
    });

    it("accepts optional notes and clears them when confirmation is reopened", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      renderWithProviders(createQueryClient());

      fireEvent.click(await screen.findByText("onDeleteClient"));
      const notes = screen.getByRole("textbox", { name: "deleteClientNotesLabel" });
      expect(notes).toHaveAttribute("placeholder", "deleteClientNotesPlaceholder");
      fireEvent.change(notes, { target: { value: "Client requested removal" } });
      expect(notes).toHaveValue("Client requested removal");
      expect(mockAxiosDelete).not.toHaveBeenCalled();

      fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "cancel" }));
      fireEvent.click(screen.getByText("onDeleteClient"));

      expect(screen.getByRole("textbox", { name: "deleteClientNotesLabel" })).toHaveValue("");
    });
  });

  it("navigates to the create-job page with the client prefilled", async () => {
    vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
    renderWithProviders(createQueryClient());

    await screen.findByText("onCreateJob");
    fireEvent.click(screen.getByText("onCreateJob"));

    expect(mockNavigate).toHaveBeenCalledWith("/create-job", {
      state: { prefillCustomer: mockClient },
    });
  });
});
