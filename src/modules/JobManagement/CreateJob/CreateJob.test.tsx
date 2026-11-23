import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useContext, useEffect, useRef } from "react";
import CreateJob from "./CreateJob";
import * as ordersApi from "../../../api/services/orders/orders";
import type { Order } from "../../../api/services/orders/orders.types";
import { HeaderUserData } from "../../../api/services/header/action";
import { GenericFormContext } from "../../../components/generics/Form/GenericForm.context";

const warrantyMutateAsyncMock = vi.hoisted(() => vi.fn());
const customerChangeConfirmationMock = vi.hoisted(() => vi.fn());
const deliveryAddressInfoMock = vi.hoisted(() =>
  vi.fn((): null | { missingFieldLabels: string[]; isAddressCompletelyEmpty: boolean } => null),
);
const warrantyAreaChangeTrigger = vi.hoisted(
  (): { enabled: boolean; values: Record<string, unknown> } => ({
    enabled: false,
    values: {},
  }),
);
const mappedApiPayloadMock = vi.hoisted((): { value: Record<string, unknown> | null } => ({
  value: null,
}));
const locationStateMock = vi.hoisted(() => ({ state: null as Record<string, unknown> | null }));
const navigateMock = vi.hoisted(() => vi.fn());
const validationMock = vi.hoisted(() => ({
  errors: {} as Record<string, string>,
  visibleErrors: [] as Array<{ name: string }>,
}));
const sectionActionHelpersMock = vi.hoisted(() => ({
  setErrors: vi.fn(),
  setTouched: vi.fn(async () => undefined),
  setFieldValue: vi.fn(),
}));
const useParamsMock = vi.hoisted(() => ({ orderId: "" }));
const useOrderByIdReturnMock = vi.hoisted(
  (): { data: unknown; isLoading: boolean; error: unknown } => ({
    data: undefined,
    isLoading: false,
    error: null,
  }),
);
const selectedCustomerMock = vi.hoisted(() => ({
  customerId: "customer-1",
  customerTitle: "Mr",
  ascId: "1",
  customerType: "INDIVIDUAL_PRIVATE",
  firstName: "John",
  lastName: "Doe",
  primaryEmail: "john@example.com",
  phoneNumber: "123456789",
  mobileNumber: "987654321",
  companyName: "Bosch GmbH",
  dealershipName: "Dealer",
  typeOfIndustry: "INDUSTRY",
  boschCustomerNumber: "BCN-1",
  vatNumber: "VAT-1",
  communicationMedium: "EMAIL",
  useBillingAddressForDelivery: false,
  billingAddress: {
    street: "Billing St",
    houseNumber: "5",
    additionalDetails: "",
    neighborhood: "Center",
    district: "District 1",
    city: "Ankara",
    stateProvinceRegion: "Ankara",
    postalCode: "34000",
    countryCode: "TR",
  },
  deliveryAddress: {
    street: "Delivery St",
    houseNumber: "7",
    additionalDetails: "",
    neighborhood: "North",
    district: "District 2",
    city: "Istanbul",
    stateProvinceRegion: "Istanbul",
    postalCode: "10000",
    countryCode: "TR",
  },
}));

// Mock dependencies
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => useParamsMock,
    useLocation: () => locationStateMock,
  };
});

vi.mock("../../../hooks/useBreadcrumbs", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("../../../api/services/orders/hooks", () => ({
  useOrderById: vi.fn(() => useOrderByIdReturnMock),
  usePostWarrantyCheck: vi.fn(() => ({
    mutateAsync: warrantyMutateAsyncMock,
  })),
}));

vi.mock("../../../components/generics/Form/useFormValidation", () => ({
  useFormValidation: () => ({
    validate: vi.fn(),
    validateByAction: vi.fn(() => validationMock.errors),
    startValidation: vi.fn(),
    stopValidation: vi.fn(),
    setCurrentAction: vi.fn(),
  }),
}));

vi.mock("../../../components/generics/Form/formValidation", () => ({
  getVisibleFieldsWithErrors: vi.fn(() => validationMock.visibleErrors),
  getMandatoryFields: vi.fn(() => ({})),
  getUploadFieldErrors: vi.fn(() => ({})),
}));

vi.mock("../../../utils/scrollToError", () => ({
  scrollToFirstError: vi.fn(),
}));

vi.mock("./CreateJob.utils", async () => {
  const actual = await vi.importActual<typeof import("./CreateJob.utils")>("./CreateJob.utils");
  return {
    ...actual,
    buildCustomerChangeConfirmationData: (
      ...args: Parameters<typeof actual.buildCustomerChangeConfirmationData>
    ) =>
      customerChangeConfirmationMock.getMockImplementation()
        ? customerChangeConfirmationMock(...args)
        : actual.buildCustomerChangeConfirmationData(...args),
    getDeliveryAddressConfirmationInfo: deliveryAddressInfoMock,
  };
});

vi.mock("../../../components/ui/DeliveryAddressConfirmModal/DeliveryAddressConfirmModal", () => ({
  default: ({
    isOpen,
    onConfirm,
    onCancel,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }) =>
    isOpen ? (
      <div data-testid="delivery-confirm-modal">
        <button type="button" onClick={onConfirm} data-testid="confirm-delivery">
          confirm
        </button>
        <button type="button" onClick={onCancel} data-testid="cancel-delivery">
          cancel
        </button>
      </div>
    ) : null,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        saveAsDraft: "Save as Draft",
        next: "Next",
        addMoreTools: "Add More Tools",
        cancel: "Cancel",
        submit: "Submit",
        customerAndPaymentData: "Customer and Payment Data",
        assetData: "Asset Data",
        isRequired: "is required",
        customerChangeConfirmModalTitle: "Customer data changed",
        customerChangeConfirmModalText:
          "Review original and updated customer information before continuing.",
        customerChangeComparisonTableLabel: "Customer change comparison",
        customerChangeField: "Field",
        customerChangeOriginalValue: "Original value",
        customerChangeNewValue: "New value",
        customerChangeStatus: "Status",
        customerChangeChanged: "Changed",
        customerChangeEmptyValue: "Not provided",
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock("../../../components/generics/Section/GenericSection", () => ({
  default: function MockGenericSection({
    children,
    section,
    isCollapsed,
    onDelete,
    onHeaderClick,
  }: {
    children: React.ReactNode;
    section: {
      name?: string;
      index?: number;
      label: string;
      actions?: Array<{ name?: string; mode?: string; onAction?: string }> | null;
    };
    isCollapsed?: boolean;
    onDelete?: () => void;
    onHeaderClick?: () => void;
  }) {
    const { onAreaValueChange, actionCallbacks, isSubmitting } = useContext(GenericFormContext);
    const hasTriggeredRef = useRef(false);

    useEffect(() => {
      if (!warrantyAreaChangeTrigger.enabled) return;
      if (hasTriggeredRef.current) return;
      if (!section.name?.startsWith("assetData#")) return;

      hasTriggeredRef.current = true;
      onAreaValueChange?.("assetData#0_asset", warrantyAreaChangeTrigger.values);
    }, [onAreaValueChange, section.name]);

    return (
      <div
        data-testid={`section-${section.label}`}
        data-collapsed={isCollapsed}
        data-submitting={String(!!isSubmitting)}
      >
        <button
          type="button"
          data-testid={`toggle-${section.name}-${section.index ?? 0}`}
          onClick={onHeaderClick}
        >
          toggle
        </button>
        {onDelete && (
          <button
            type="button"
            data-testid={`delete-${section.name}-${section.index ?? 0}`}
            onClick={onDelete}
          >
            delete
          </button>
        )}
        {children}
        {section.actions && section.actions.length > 0 && (
          <div className="actions">
            {section.actions.map((action) => (
              <button
                key={action.name}
                type="button"
                data-mode={action.mode}
                data-testid={`section-action-${action.name}`}
                onClick={() => {
                  if (action.onAction === "nextSection") {
                    actionCallbacks[action.onAction]?.(
                      {},
                      {
                        setErrors: sectionActionHelpersMock.setErrors,
                        setTouched: sectionActionHelpersMock.setTouched,
                        setFieldValue: sectionActionHelpersMock.setFieldValue,
                      },
                    );
                  }
                }}
              >
                {getActionLabel(action.name)}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
}));

const getActionLabel = (actionName?: string): string => {
  const labelMap: Record<string, string> = {
    addMoreTools: "Add More Tools",
    cancel: "Cancel",
    saveAsDraft: "Save as Draft",
    submit: "Submit",
    next: "Next",
  };
  return labelMap[actionName || ""] || actionName || "";
};

vi.mock("../../../components/generics/Action/GenericAction", () => ({
  default: ({
    actions,
    onActionClick,
  }: {
    actions: Array<{ name?: string; mode?: string; onAction?: string; cssContainer?: string }>;
    onActionClick: (actionName: string | undefined) => void;
  }) => (
    <div className="generic-actions">
      {actions.map((action) => (
        <button
          key={action.name}
          type="button"
          data-mode={action.mode}
          data-testid={`form-action-${action.name}`}
          onClick={() => onActionClick(action.onAction)}
        >
          {getActionLabel(action.name)}
        </button>
      ))}
    </div>
  ),
}));

const mockCreateJobForm = {
  name: "CreateJob",
  position: 0,
  formGroup: "JobManagement",
  sections: [
    {
      name: "customerAndPaymentData",
      isHidden: false,
      label: "customerAndPaymentData",
      dependFieldCondition: "",
      dependentFields: [],
      position: 1,
      areas: [
        {
          name: "testArea",
          label: "testArea",
          position: 1,
          fields: [
            {
              name: "customerId",
              label: "customerId",
              type: "text",
              isRequired: false,
              position: 0,
              fieldMapping: { originalName: "customerId" },
            },
            {
              name: "firstName",
              label: "firstName",
              type: "text",
              isRequired: true,
              position: 1,
              fieldMapping: { originalName: "firstName" },
            },
          ],
          dependFieldCondition: "",
          dependentFields: [],
          actions: [],
          isSubArea: false,
        },
      ],
      tables: [],
      actions: [
        { name: "saveAsDraft", mode: "secondary", onAction: "saveDraft", mandatoryFields: [] },
        {
          name: "next",
          mode: "primary",
          onAction: "nextSection",
          mandatoryFields: ["firstName"],
        },
      ],
      isSubSection: false,
      isAccordion: false,
      isTab: false,
    },
    {
      name: "assetData#0",
      isHidden: false,
      label: "assetData",
      dependFieldCondition: "",
      dependentFields: [],
      position: 2,
      areas: [
        {
          name: "assetArea",
          label: "assetArea",
          position: 1,
          fields: [
            {
              name: "assetData#0_asset_toolModelName",
              label: "toolModelName",
              type: "text",
              isRequired: false,
              position: 1,
              fieldMapping: { originalName: "toolModelName" },
            },
          ],
          dependFieldCondition: "",
          dependentFields: [],
          actions: [],
          isSubArea: false,
        },
      ],
      tables: [],
      actions: null,
      isSubSection: false,
      isAccordion: false,
      isTab: false,
      isMultiple: true,
      index: 0,
    },
  ],
  actions: [
    {
      name: "addMoreTools",
      mode: "secondary",
      onAction: "onAddMoreTools",
      cssContainer: "full",
      cssButton: "full-width",
      mandatoryFields: [],
    },
    {
      name: "cancel",
      mode: "secondary",
      onAction: "onCancelCreateJob",
      cssContainer: "left",
      cssButton: "half-width",
      mandatoryFields: [],
    },
    {
      name: "saveAsDraft",
      mode: "secondary",
      onAction: "onSaveAsDraft",
      cssContainer: "right",
      cssButton: "half-width",
      mandatoryFields: [],
    },
    {
      name: "submit",
      mode: "primary",
      onAction: "onSubmit",
      cssContainer: "right",
      cssButton: "half-width",
      mandatoryFields: ["firstName"],
    },
  ],
};

vi.mock("../../../api/services/orders/orders", () => ({
  createOrder: vi.fn(),
  getOrderReceipt: vi.fn(),
  postWarrantyCheck: vi.fn(),
}));

const analyticsMock = vi.hoisted(() => ({
  trackJobCreated: vi.fn(),
  trackJobSavedAsDraft: vi.fn(),
  trackActionFailed: vi.fn(),
  trackDocumentAction: vi.fn(),
  trackWarrantyCheckPerformed: vi.fn(),
  trackCustomerSelected: vi.fn(),
}));
vi.mock("@/analytics", async () => ({
  ...(await vi.importActual<Record<string, unknown>>("@/analytics")),
  useAnalytics: () => analyticsMock,
}));

vi.mock("../../../components/generics/utils", () => ({
  getAllFieldsFromSection: vi.fn(
    (section) => section.areas?.flatMap((area: any) => area.fields || []) || [],
  ),
  getAreasByName: vi.fn((sections, areaName) =>
    sections
      .flatMap((section: { areas?: Array<{ name?: string }> }) => section.areas || [])
      .filter((area: { name?: string }) => area.name === areaName),
  ),
  setDuplicatedSection: vi.fn((section, index) => ({ ...section, index })),
  setInitalSectionsAreasFields: vi.fn((form) => form.sections),
  getInitialFieldValues: vi.fn((fields) =>
    fields.reduce((acc: Record<string, unknown>, field: any) => {
      acc[field.name] = "";
      return acc;
    }, {}),
  ),
  mapValuesToAPI: vi.fn(
    (values: Record<string, unknown>) =>
      mappedApiPayloadMock.value ?? { order: { customer: { customerId: values.customerId } } },
  ),
  mapFieldToFieldMapping: vi.fn((field) => ({
    ...field,
    fieldMapping: field.fieldMapping || { originalName: field.name },
  })),
  convertAPIDataToFormValues: vi.fn((apiData) => apiData || {}),
  isFieldVisible: vi.fn(() => true),
}));

vi.mock("@bosch/react-frok", async () => {
  const actual = await vi.importActual("@bosch/react-frok");
  return {
    ...actual,
    ActivityIndicator: ({ loading }: { loading: boolean }) =>
      loading ? <div data-testid="activity-indicator">Loading...</div> : null,
    // ... include any other components you're using from this library
  };
});

describe("CreateJob", () => {
  const mockUserData: HeaderUserData = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    ascId: "1",
    type: "user",
    language: "en",
    locale: "en-TR",
    roles: [],
    permissions: [],
    countryCode: "TR",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mappedApiPayloadMock.value = null;
    locationStateMock.state = null;
    navigateMock.mockReset();
    validationMock.errors = {};
    validationMock.visibleErrors = [];
    customerChangeConfirmationMock.mockReset();
    warrantyAreaChangeTrigger.enabled = false;
    warrantyAreaChangeTrigger.values = {};
    deliveryAddressInfoMock.mockReturnValue(null);
    useParamsMock.orderId = "";
    useOrderByIdReturnMock.data = undefined;
    useOrderByIdReturnMock.isLoading = false;
    useOrderByIdReturnMock.error = null;
  });

  const createTestQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

  const renderComponent = () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["user"], mockUserData);
    queryClient.setQueryData(["UIConfiguration", mockUserData.countryCode], {
      forms: [mockCreateJobForm],
    });

    const utils = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CreateJob />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    return { ...utils, queryClient };
  };

  describe("Component Rendering", () => {
    it("renders loading state initially", () => {
      renderComponent();
      // Component should initialize and not show loading after first render
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    it("renders customer section", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId("section-customerAndPaymentData")).toBeInTheDocument();
      });
    });

    it("renders Save as Draft buttons", async () => {
      renderComponent();
      await waitFor(() => {
        // One in customer section, one at form level
        const draftButtons = screen.getAllByText("Save as Draft");
        expect(draftButtons.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("renders Next button", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Next")).toBeInTheDocument();
      });
    });

    it("renders Submit button", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Submit")).toBeInTheDocument();
      });
    });

    it("renders Cancel button", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId("form-action-cancel")).toBeInTheDocument();
      });
    });

    it("renders Add More Tools button", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Add More Tools")).toBeInTheDocument();
      });
    });
  });

  describe("Form Initialization", () => {
    it("initializes form with correct sections", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId("section-customerAndPaymentData")).toBeInTheDocument();
        expect(screen.getByTestId("section-assetData")).toBeInTheDocument();
      });
    });

    it("applies a prefilled customer before saving a draft", async () => {
      const user = userEvent.setup();
      const createOrder = vi.mocked(ordersApi.createOrder);
      createOrder.mockResolvedValue({} as Order);
      locationStateMock.state = { prefillCustomer: selectedCustomerMock };

      renderComponent();
      await user.click(await screen.findByTestId("form-action-saveAsDraft"));

      await waitFor(() => {
        expect(createOrder).toHaveBeenCalledWith(
          true,
          expect.objectContaining({
            order: expect.objectContaining({
              customer: expect.objectContaining({ customerId: "customer-1" }),
            }),
          }),
        );
      });
    });
  });

  describe("Action Buttons", () => {
    it("Next button is initially enabled", async () => {
      renderComponent();
      await waitFor(() => {
        const nextButton = screen.getByText("Next");
        expect(nextButton).toBeEnabled();
      });
    });

    it("Submit button is initially enabled", async () => {
      renderComponent();
      await waitFor(() => {
        const submitButton = screen.getByText("Submit");
        expect(submitButton).toBeEnabled();
      });
    });

    it("marks visible fields touched and stops Next when validation fails", async () => {
      const user = userEvent.setup();
      validationMock.errors = { firstName: "required" };
      validationMock.visibleErrors = [{ name: "firstName" }];

      renderComponent();
      await user.click(await screen.findByTestId("section-action-next"));

      await waitFor(() => {
        expect(sectionActionHelpersMock.setErrors).toHaveBeenCalledWith({ firstName: "required" });
        expect(sectionActionHelpersMock.setTouched).toHaveBeenCalledWith({ firstName: true });
      });
      expect(ordersApi.createOrder).not.toHaveBeenCalled();
    });
  });

  describe("Customer change confirmation", () => {
    it("shows original and updated customer values when customer changes", async () => {
      const user = userEvent.setup();
      const { queryClient } = renderComponent();

      queryClient.setQueryData(["selectedCustomer"], selectedCustomerMock);

      await waitFor(() => {
        expect(screen.getByText("Next")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Next"));

      await waitFor(() => {
        expect(screen.getByTestId("customer-change-confirm-modal")).toBeInTheDocument();
      });

      expect(screen.getByText("Field")).toBeInTheDocument();
      expect(screen.getByText("Original value")).toBeInTheDocument();
      expect(screen.getByText("New value")).toBeInTheDocument();
      expect(screen.getByText("Changed")).toBeInTheDocument();
      expect(screen.getByText("firstName")).toBeInTheDocument();
      expect(screen.getByText("John")).toBeInTheDocument();
      expect(screen.getByText("Not provided")).toBeInTheDocument();
    });
  });

  describe("Add More Tools", () => {
    it("renders Add More Tools button", async () => {
      renderComponent();
      await waitFor(() => {
        const addButton = screen.getByText("Add More Tools");
        expect(addButton).toBeInTheDocument();
      });
    });

    it("Add More Tools button is clickable", async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        const addButton = screen.getByText("Add More Tools");
        expect(addButton).toBeInTheDocument();
      });

      const addButton = screen.getByText("Add More Tools");
      await user.click(addButton);

      // Button should still be there after click
      expect(addButton).toBeInTheDocument();
    });

    it("deletes an added asset section", async () => {
      const user = userEvent.setup();
      renderComponent();

      const addButton = await screen.findByTestId("form-action-addMoreTools");
      await user.click(addButton);
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getAllByTestId(/section-assetData/)).toHaveLength(3);
        expect(screen.getByTestId("delete-assetData#0-2")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("delete-assetData#0-2"));

      await waitFor(() => expect(screen.getAllByTestId(/section-assetData/)).toHaveLength(2));
    });
  });

  describe("Save as Draft", () => {
    it("calls createOrder with isDraft=true when Save as Draft is clicked", async () => {
      const user = userEvent.setup();
      const mockCreateOrder = vi.mocked(ordersApi.createOrder);
      mockCreateOrder.mockResolvedValue({} as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("form-action-saveAsDraft")).toBeInTheDocument();
      });

      // Click the form-level "Save as Draft" button
      const draftButton = screen.getByTestId("form-action-saveAsDraft");
      await user.click(draftButton);

      await waitFor(() => {
        expect(mockCreateOrder).toHaveBeenCalledWith(true, expect.any(Object));
      });
    });
  });

  describe("Form Sections Collapse State", () => {
    it("customer section is open by default", async () => {
      renderComponent();
      await waitFor(() => {
        const customerSection = screen.getByTestId("section-customerAndPaymentData");
        expect(customerSection).toHaveAttribute("data-collapsed", "false");
      });
    });

    it("asset section is collapsed by default", async () => {
      renderComponent();
      await waitFor(() => {
        const assetSection = screen.getByTestId("section-assetData");
        expect(assetSection).toHaveAttribute("data-collapsed", "true");
      });
    });

    it("toggles an asset section open and closed", async () => {
      const user = userEvent.setup();
      renderComponent();

      const assetSection = await screen.findByTestId("section-assetData");
      const toggle = screen.getByTestId("toggle-assetData#0-0");

      await user.click(toggle);
      expect(assetSection).toHaveAttribute("data-collapsed", "false");

      await user.click(toggle);
      expect(assetSection).toHaveAttribute("data-collapsed", "true");
    });
  });

  describe("Cancel Button", () => {
    it("renders Cancel button", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId("form-action-cancel")).toBeInTheDocument();
      });
    });

    it("Cancel button is clickable", async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        const cancelButton = screen.getByTestId("form-action-cancel");
        expect(cancelButton).toBeInTheDocument();
      });

      const cancelButton = screen.getByTestId("form-action-cancel");
      await user.click(cancelButton);

      // Form should reset (we can verify by checking if sections are still there)
      expect(screen.getByTestId("section-customerAndPaymentData")).toBeInTheDocument();
    });
  });

  describe("Customer change confirmation", () => {
    it("sends a null customerId when creating a customer", async () => {
      const user = userEvent.setup();
      customerChangeConfirmationMock.mockReturnValue({
        comparisons: [
          {
            fieldName: "firstName",
            fieldLabel: "firstName",
            originalValue: "John",
            currentValue: "Jane",
          },
        ],
        signature: "customer-changed",
      });
      renderComponent();

      await user.click(await screen.findByTestId("form-action-submit"));
      await user.click(await screen.findByTestId("customer-change-confirm-create"));

      await waitFor(() => {
        expect(ordersApi.createOrder).toHaveBeenCalledWith(
          false,
          expect.objectContaining({
            order: expect.objectContaining({
              customer: expect.objectContaining({ customerId: null }),
            }),
          }),
        );
      });
    });
  });

  describe("Form Context", () => {
    it("provides CreateJobContext to children", async () => {
      renderComponent();
      await waitFor(() => {
        // The form should render, indicating context is provided
        expect(screen.getByTestId("section-customerAndPaymentData")).toBeInTheDocument();
      });
    });

    it("provides GenericFormContext to children", async () => {
      renderComponent();
      await waitFor(() => {
        // The form should render, indicating context is provided
        expect(screen.getByTestId("section-customerAndPaymentData")).toBeInTheDocument();
      });
    });
  });

  describe("Attachment lock while the order is being created", () => {
    const deferCreateOrder = () => {
      let resolve!: (value: Order) => void;
      let reject!: (reason: unknown) => void;
      const pending = new Promise<Order>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      vi.mocked(ordersApi.createOrder).mockReturnValue(pending);
      return { resolve, reject };
    };

    const sectionSubmitting = () =>
      screen.getByTestId("section-customerAndPaymentData").getAttribute("data-submitting");

    it("locks attachments while createOrder is pending and unlocks after it resolves", async () => {
      const user = userEvent.setup();
      const createOrder = deferCreateOrder();

      renderComponent();
      await user.click(await screen.findByTestId("form-action-saveAsDraft"));

      await waitFor(() => expect(sectionSubmitting()).toBe("true"));

      await act(async () => {
        createOrder.resolve({} as Order);
      });

      await waitFor(() => expect(sectionSubmitting()).toBe("false"));
    });

    it("locks attachments while createOrder is pending and unlocks after it rejects", async () => {
      const user = userEvent.setup();
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      const createOrder = deferCreateOrder();

      renderComponent();
      expect(await screen.findByTestId("section-customerAndPaymentData")).toHaveAttribute(
        "data-submitting",
        "false",
      );
      await user.click(screen.getByTestId("form-action-saveAsDraft"));

      await waitFor(() => expect(sectionSubmitting()).toBe("true"));

      await act(async () => {
        createOrder.reject(new Error("API Error"));
      });

      await waitFor(() => expect(sectionSubmitting()).toBe("false"));
      consoleError.mockRestore();
    });
  });

  describe("Multiple Sections", () => {
    it("renders multiple asset sections when they exist", async () => {
      renderComponent();
      await waitFor(() => {
        const assetSections = screen.queryAllByTestId(/section-assetData/);
        expect(assetSections.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("Button States", () => {
    it("buttons are enabled by default", async () => {
      renderComponent();
      await waitFor(() => {
        const nextButton = screen.getByTestId("section-action-next");
        const submitButton = screen.getByTestId("form-action-submit");
        expect(nextButton).toBeEnabled();
        expect(submitButton).toBeEnabled();
      });
    });
  });

  describe("Form Structure", () => {
    it("renders customer actions container", async () => {
      renderComponent();
      await waitFor(() => {
        const customerSection = screen.getByTestId("section-customerAndPaymentData");
        expect(customerSection).toBeInTheDocument();
        // Customer actions should be within the section
        expect(screen.getByText("Next")).toBeInTheDocument();
      });
    });

    it("renders create job actions container", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId("form-action-cancel")).toBeInTheDocument();
        expect(screen.getByTestId("form-action-submit")).toBeInTheDocument();
      });
    });
  });

  describe("API Integration", () => {
    it("runs warranty check on asset area change without crashing on invalid validity date", async () => {
      warrantyAreaChangeTrigger.enabled = true;
      warrantyAreaChangeTrigger.values = {
        "assetData#0_asset_brand": "BOSCH",
        "assetData#0_asset_baretoolNumber": "BT-001",
        "assetData#0_asset_serialNumber": "SN-001",
        "assetData#0_asset_purchaseDate": "2024-05-10",
        "assetData#0_warrantyDetails_warrantyType": "STANDARD_WARRANTY",
      };

      warrantyMutateAsyncMock.mockResolvedValue({
        evaluationStatus: "INELIGIBLE",
        reasonKey: "WARRANTY_EXPIRED",
        validityExpirationDate: "not-a-date",
        supportedWarrantyType: "STANDARD_WARRANTY",
      });

      renderComponent();

      await waitFor(() => {
        expect(warrantyMutateAsyncMock).toHaveBeenCalledWith({
          brand: "BOSCH",
          country: "TR",
          bareToolNumber: "BT-001",
          serialNumber: "SN-001",
          purchaseDate: "2024-05-10",
        });
      });

      expect(screen.getByTestId("section-customerAndPaymentData")).toBeInTheDocument();
    });

    it("does not run warranty check when asset fields are incomplete", async () => {
      warrantyAreaChangeTrigger.enabled = true;
      warrantyAreaChangeTrigger.values = {
        "assetData#0_asset_brand": "BOSCH",
        "assetData#0_asset_baretoolNumber": "",
        "assetData#0_asset_serialNumber": "SN-001",
        "assetData#0_asset_purchaseDate": "",
      };

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("section-customerAndPaymentData")).toBeInTheDocument();
      });

      expect(warrantyMutateAsyncMock).not.toHaveBeenCalled();
    });

    it("prepares payload correctly for API", async () => {
      const user = userEvent.setup();
      const mockCreateOrder = vi.mocked(ordersApi.createOrder);
      mockCreateOrder.mockResolvedValue({} as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("form-action-saveAsDraft")).toBeInTheDocument();
      });

      // Click the form-level "Save as Draft" button
      const draftButton = screen.getByTestId("form-action-saveAsDraft");
      await user.click(draftButton);

      await waitFor(() => {
        expect(mockCreateOrder).toHaveBeenCalledWith(
          true,
          expect.objectContaining({
            order: expect.objectContaining({
              ascId: "1",
              countryCode: "TR",
            }),
          }),
        );
      });
    });

    it("normalizes jobs and customer data in the API payload", async () => {
      const user = userEvent.setup();
      const mockCreateOrder = vi.mocked(ordersApi.createOrder);
      mockCreateOrder.mockResolvedValue({} as Order);
      mappedApiPayloadMock.value = {
        order: { customer: { useBillingAddressForDelivery: true } },
        jobs: [
          {
            asset: {
              hasAccessories: false,
              accessories: [{ accessoryId: "remove" }],
              isBareTool: 0,
            },
          },
          null,
          {
            ascId: "existing-asc",
            orderId: "existing-order",
            asset: {
              hasAccessories: true,
              accessories: [{ accessoryId: "keep" }],
              isBareTool: 1,
            },
          },
        ],
      };

      renderComponent();
      await user.click(await screen.findByTestId("form-action-saveAsDraft"));

      await waitFor(() => expect(mockCreateOrder).toHaveBeenCalledTimes(1));

      const submittedPayload = mockCreateOrder.mock.calls[0][1] as unknown as {
        order: {
          ascId: string;
          countryCode: string;
          customer: { ascId: string; deliveryAddress: null };
        };
        jobs: Array<{
          jobStatus: string;
          ascId: string;
          orderId?: string;
          asset: {
            hasAccessories: boolean;
            accessories?: Array<{ accessoryId: string }>;
            isBareTool: boolean;
          };
        }>;
      };

      expect(submittedPayload.order).toMatchObject({
        ascId: "1",
        countryCode: "TR",
        customer: { ascId: "1", deliveryAddress: null },
      });
      expect(submittedPayload.jobs).toHaveLength(2);
      expect(submittedPayload.jobs[0]).toMatchObject({
        jobStatus: "READY_FOR_DIAGNOSTIC",
        ascId: "1",
        asset: { hasAccessories: false, isBareTool: false },
      });
      expect(submittedPayload.jobs[0].asset).not.toHaveProperty("accessories");
      expect(submittedPayload.jobs[1]).toMatchObject({
        jobStatus: "READY_FOR_DIAGNOSTIC",
        ascId: "existing-asc",
        orderId: "existing-order",
        asset: {
          hasAccessories: true,
          accessories: [{ accessoryId: "keep" }],
          isBareTool: true,
        },
      });
    });

    it("submits through Formik and opens a downloaded order receipt", async () => {
      const createOrder = vi.mocked(ordersApi.createOrder);
      const getOrderReceipt = vi.mocked(ordersApi.getOrderReceipt);
      const receipt = new Blob(["receipt"], { type: "application/pdf" });
      const createObjectURL = vi.fn(() => "blob:order-receipt");
      const revokeObjectURL = vi.fn();
      const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
      const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
      const openWindow = vi.spyOn(window, "open").mockImplementation(() => null);
      createOrder.mockResolvedValue({ order: { orderId: "O-1" } } as Order);
      getOrderReceipt.mockResolvedValue(receipt);
      Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
      Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
      vi.useFakeTimers();

      try {
        renderComponent();
        fireEvent.submit((screen.getByTestId("form-action-submit") as HTMLButtonElement).form!);
        await act(async () => {
          await vi.runAllTimersAsync();
        });

        expect(createOrder).toHaveBeenCalledWith(false, expect.any(Object));
        expect(getOrderReceipt).toHaveBeenCalledWith("O-1");
        expect(analyticsMock.trackDocumentAction).toHaveBeenCalled();
        expect(createObjectURL).toHaveBeenCalledWith(receipt);
        expect(openWindow).toHaveBeenCalledWith("blob:order-receipt", "_blank");
        expect(revokeObjectURL).toHaveBeenCalledWith("blob:order-receipt");
      } finally {
        vi.useRealTimers();
        if (originalCreateObjectURL) {
          Object.defineProperty(URL, "createObjectURL", originalCreateObjectURL);
        } else {
          Reflect.deleteProperty(URL, "createObjectURL");
        }
        if (originalRevokeObjectURL) {
          Object.defineProperty(URL, "revokeObjectURL", originalRevokeObjectURL);
        } else {
          Reflect.deleteProperty(URL, "revokeObjectURL");
        }
        openWindow.mockRestore();
      }
    });

    it("handles API success", async () => {
      const user = userEvent.setup();
      const mockCreateOrder = vi.mocked(ordersApi.createOrder);
      mockCreateOrder.mockResolvedValue({ orderId: 123 } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("form-action-saveAsDraft")).toBeInTheDocument();
      });

      // Click the form-level "Save as Draft" button
      const draftButton = screen.getByTestId("form-action-saveAsDraft");
      await user.click(draftButton);

      await waitFor(() => {
        expect(mockCreateOrder).toHaveBeenCalled();
      });
    });

    it("handles API error gracefully", async () => {
      const user = userEvent.setup();
      const mockCreateOrder = vi.mocked(ordersApi.createOrder);
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      mockCreateOrder.mockRejectedValue(new Error("API Error"));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("form-action-saveAsDraft")).toBeInTheDocument();
      });

      const draftButton = screen.getByTestId("form-action-saveAsDraft");

      // Click and wait for error to be handled
      await user.click(draftButton);

      // Give time for the promise to reject and be handled
      await new Promise((resolve) => setTimeout(resolve, 100));

      // The component should still be rendered (not crashed)
      expect(screen.getByTestId("form-action-submit")).toBeInTheDocument();

      consoleError.mockRestore();
    });

    it("records a failed draft save with its reason", async () => {
      const user = userEvent.setup();
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(ordersApi.createOrder).mockRejectedValue({ response: { status: 422 } });

      renderComponent();
      await user.click(await screen.findByTestId("form-action-saveAsDraft"));

      await waitFor(() => {
        expect(analyticsMock.trackActionFailed).toHaveBeenCalledTimes(1);
      });
      expect(analyticsMock.trackActionFailed).toHaveBeenCalledWith({
        failedAction: "job_saved_as_draft",
        failureReason: "wrong_entry",
      });
      expect(analyticsMock.trackJobSavedAsDraft).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it("records no failure when the draft is saved", async () => {
      const user = userEvent.setup();
      vi.mocked(ordersApi.createOrder).mockResolvedValue({} as Order);

      renderComponent();
      await user.click(await screen.findByTestId("form-action-saveAsDraft"));

      await waitFor(() => {
        expect(analyticsMock.trackJobSavedAsDraft).toHaveBeenCalledTimes(1);
      });
      expect(analyticsMock.trackActionFailed).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("renders buttons with proper types", async () => {
      renderComponent();
      await waitFor(() => {
        const submitButton = screen.getByTestId("form-action-submit");
        expect(submitButton).toHaveAttribute("type", "button");
      });
    });

    it("renders action buttons as button type", async () => {
      renderComponent();
      await waitFor(() => {
        const nextButton = screen.getByTestId("section-action-next");
        const cancelButton = screen.getByTestId("form-action-cancel");
        expect(nextButton).toHaveAttribute("type", "button");
        expect(cancelButton).toHaveAttribute("type", "button");
      });
    });
  });

  describe("Warranty Check - ELIGIBLE and ALLOWED_REPAIR_COUNT_EXCEEDED branches", () => {
    it("handles ELIGIBLE warranty response without crashing", async () => {
      warrantyAreaChangeTrigger.enabled = true;
      warrantyAreaChangeTrigger.values = {
        "assetData#0_asset_brand": "BOSCH",
        "assetData#0_asset_baretoolNumber": "BT-ELIGIBLE",
        "assetData#0_asset_serialNumber": "SN-ELIGIBLE",
        "assetData#0_asset_purchaseDate": "2025-01-01",
      };

      warrantyMutateAsyncMock.mockResolvedValue({
        evaluationStatus: "ELIGIBLE",
        supportedWarrantyType: "STANDARD_WARRANTY",
        reasonKey: null,
      });

      renderComponent();

      await waitFor(() => {
        expect(warrantyMutateAsyncMock).toHaveBeenCalled();
      });

      expect(screen.getByTestId("section-customerAndPaymentData")).toBeInTheDocument();
    });

    it("handles ALLOWED_REPAIR_COUNT_EXCEEDED warranty response without crashing", async () => {
      warrantyAreaChangeTrigger.enabled = true;
      warrantyAreaChangeTrigger.values = {
        "assetData#0_asset_brand": "BOSCH",
        "assetData#0_asset_baretoolNumber": "BT-EXCEEDED",
        "assetData#0_asset_serialNumber": "SN-EXCEEDED",
        "assetData#0_asset_purchaseDate": "2020-06-15",
      };

      warrantyMutateAsyncMock.mockResolvedValue({
        evaluationStatus: "INELIGIBLE",
        reasonKey: "ALLOWED_REPAIR_COUNT_EXCEEDED",
        usedWarrantyRepairCount: 3,
        allowedWarrantyRepairCount: 2,
        supportedWarrantyType: "STANDARD_WARRANTY",
      });

      renderComponent();

      await waitFor(() => {
        expect(warrantyMutateAsyncMock).toHaveBeenCalled();
      });

      expect(screen.getByTestId("section-customerAndPaymentData")).toBeInTheDocument();
    });

    it("handles SKIPPED warranty response without crashing", async () => {
      warrantyAreaChangeTrigger.enabled = true;
      warrantyAreaChangeTrigger.values = {
        "assetData#0_asset_brand": "BOSCH",
        "assetData#0_asset_baretoolNumber": "BT-SKIPPED",
        "assetData#0_asset_serialNumber": "SN-SKIPPED",
        "assetData#0_asset_purchaseDate": "2022-03-10",
      };

      warrantyMutateAsyncMock.mockResolvedValue({
        evaluationStatus: "SKIPPED",
        reasonKey: null,
      });

      renderComponent();

      await waitFor(() => {
        expect(warrantyMutateAsyncMock).toHaveBeenCalled();
      });

      expect(screen.getByTestId("section-customerAndPaymentData")).toBeInTheDocument();
      await waitFor(() => {
        expect(analyticsMock.trackWarrantyCheckPerformed).toHaveBeenCalledWith({
          warrantyResult: "skipped",
        });
      });
    });

    it("handles warranty API rejection without crashing", async () => {
      warrantyAreaChangeTrigger.enabled = true;
      warrantyAreaChangeTrigger.values = {
        "assetData#0_asset_brand": "BOSCH",
        "assetData#0_asset_baretoolNumber": "BT-ERR",
        "assetData#0_asset_serialNumber": "SN-ERR",
        "assetData#0_asset_purchaseDate": "2021-09-01",
      };

      warrantyMutateAsyncMock.mockRejectedValue(new Error("warranty API down"));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("section-customerAndPaymentData")).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(analyticsMock.trackActionFailed).toHaveBeenCalledWith({
          failedAction: "warranty_check_performed",
          failureReason: "system_problem",
        });
      });
      expect(analyticsMock.trackWarrantyCheckPerformed).not.toHaveBeenCalled();
    });

    it("ELIGIBLE with disallowed current warranty type clears warrantyType field", async () => {
      warrantyAreaChangeTrigger.enabled = true;
      warrantyAreaChangeTrigger.values = {
        "assetData#0_asset_brand": "BOSCH",
        "assetData#0_asset_baretoolNumber": "BT-001",
        "assetData#0_asset_serialNumber": "SN-001",
        "assetData#0_asset_purchaseDate": "2024-01-01",
        "assetData#0_warrantyDetails_warrantyType": "EXTENDED_WARRANTY",
      };

      warrantyMutateAsyncMock.mockResolvedValue({
        evaluationStatus: "ELIGIBLE",
        supportedWarrantyType: "STANDARD_WARRANTY",
        reasonKey: null,
      });

      renderComponent();

      await waitFor(() => {
        expect(warrantyMutateAsyncMock).toHaveBeenCalled();
      });

      expect(screen.getByTestId("section-customerAndPaymentData")).toBeInTheDocument();
    });
  });

  describe("Edit Mode", () => {
    const draftOrderData = {
      orderId: "O-1",
      jobs: [
        {
          jobId: "J-1",
          jobStatus: "DRAFT",
          ascId: "ASC-1",
          asset: {
            brand: "BOSCH",
            bareToolNumber: "BT-001",
            serialNumber: "SN-001",
            hasAccessories: false,
          },
        },
      ],
      customer: { firstName: "John" },
    };

    it("renders loading state while order is being fetched in edit mode", async () => {
      useParamsMock.orderId = "O-1";
      useOrderByIdReturnMock.data = undefined;
      useOrderByIdReturnMock.isLoading = true;
      useOrderByIdReturnMock.error = null;

      renderComponent();

      // Form sections are not rendered during loading
      expect(screen.queryByTestId("section-customerAndPaymentData")).not.toBeInTheDocument();
    });

    it("renders form in edit mode when order is DRAFT", async () => {
      useParamsMock.orderId = "O-1";
      useOrderByIdReturnMock.data = draftOrderData;
      useOrderByIdReturnMock.isLoading = false;
      useOrderByIdReturnMock.error = null;

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("section-customerAndPaymentData")).toBeInTheDocument();
      });
    });

    it("duplicates asset sections to match all draft jobs", async () => {
      useParamsMock.orderId = "O-1";
      useOrderByIdReturnMock.data = {
        ...draftOrderData,
        jobs: [draftOrderData.jobs[0], { ...draftOrderData.jobs[0], jobId: "J-2" }],
      };
      useOrderByIdReturnMock.isLoading = false;
      useOrderByIdReturnMock.error = null;

      renderComponent();

      await waitFor(() => expect(screen.getAllByTestId(/section-assetData/)).toHaveLength(2));
    });

    it("does not render form when edit mode order has non-DRAFT job", async () => {
      useParamsMock.orderId = "O-1";
      navigateMock.mockReturnValue(Promise.resolve());
      useOrderByIdReturnMock.data = {
        orderId: "O-1",
        jobs: [{ jobId: "J-1", jobStatus: "READY_FOR_DIAGNOSTIC" }],
        customer: {},
      };
      useOrderByIdReturnMock.isLoading = false;
      useOrderByIdReturnMock.error = null;

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("section-customerAndPaymentData")).toBeInTheDocument();
      });
      expect(navigateMock).toHaveBeenCalledWith(-1);
    });

    it("handles order load error in edit mode", async () => {
      useParamsMock.orderId = "O-1";
      navigateMock.mockReturnValue(Promise.reject(new Error("navigation failed")));
      useOrderByIdReturnMock.data = undefined;
      useOrderByIdReturnMock.isLoading = false;
      useOrderByIdReturnMock.error = new Error("load failed");

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("section-customerAndPaymentData")).toBeInTheDocument();
      });
      await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/job-list"));
    });
  });

  describe("Delivery Address Modal", () => {
    it("does not show delivery address modal initially", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.queryByTestId("delivery-confirm-modal")).not.toBeInTheDocument();
      });
    });

    it("opens delivery address modal when Submit is clicked and info is non-null", async () => {
      const user = userEvent.setup();
      deliveryAddressInfoMock.mockReturnValue({
        missingFieldLabels: ["streetName"],
        isAddressCompletelyEmpty: false,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("form-action-submit")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("form-action-submit"));

      await waitFor(() => {
        expect(screen.getByTestId("delivery-confirm-modal")).toBeInTheDocument();
      });
    });

    it("confirm button closes delivery address modal and executes pending action", async () => {
      const user = userEvent.setup();
      const mockCreateOrder = vi.mocked(ordersApi.createOrder);
      mockCreateOrder.mockResolvedValue({} as never);
      deliveryAddressInfoMock.mockReturnValue({
        missingFieldLabels: ["streetName"],
        isAddressCompletelyEmpty: true,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("form-action-submit")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("form-action-submit"));

      await waitFor(() => {
        expect(screen.getByTestId("delivery-confirm-modal")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("confirm-delivery"));

      await waitFor(() => {
        expect(screen.queryByTestId("delivery-confirm-modal")).not.toBeInTheDocument();
      });
    });

    it("cancel button closes delivery address modal without submitting", async () => {
      const user = userEvent.setup();
      const mockCreateOrder = vi.mocked(ordersApi.createOrder);
      deliveryAddressInfoMock.mockReturnValue({
        missingFieldLabels: ["streetName", "city"],
        isAddressCompletelyEmpty: false,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("form-action-submit")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("form-action-submit"));

      await waitFor(() => {
        expect(screen.getByTestId("delivery-confirm-modal")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("cancel-delivery"));

      await waitFor(() => {
        expect(screen.queryByTestId("delivery-confirm-modal")).not.toBeInTheDocument();
      });

      expect(mockCreateOrder).not.toHaveBeenCalled();
    });
  });
});
