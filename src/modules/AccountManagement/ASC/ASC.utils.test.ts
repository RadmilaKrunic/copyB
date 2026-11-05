import { describe, it, expect } from "vitest";
import {
  mapGeneralInfo,
  mapBanking,
  mapPricing,
  mapBoschConfig,
  mapReimbursement,
  mapNotifications,
  mapLaborCostDetailsToApiPayload,
  mapExchangeLaborCostTableDataFromFormValues,
  updateLaborExchangeSections,
} from "./ASC.utils";
import { ServiceCenter } from "../../../api/services/serviceCenters/serviceCenters.types";

describe("ASC.utils", () => {
  describe("mapGeneralInfo", () => {
    it("should map general info with all fields", () => {
      const generalInfo = {
        name: "Test ASC",
        email: "test@asc.com",
        phoneNumber: "+1234567890",
        gst: "GST123",
        companyVATNumber: "VAT456",
        isActive: true,
        streetName: "Main Street",
        houseNumber: "123",
        city: "Test City",
        state: "Test State",
        postalCode: "12345",
        country: "US",
        preferredSelectedCountry: "TR",
        logo: [
          {
            attachmentId: "logo-id-1",
            name: "logo.png",
            type: "image/png",
          },
        ],
      };

      const result = mapGeneralInfo(generalInfo);

      expect(result.name).toBe("Test ASC");
      expect(result.email).toBe("test@asc.com");
      expect(result.phoneNumber).toBe("+1234567890");
      expect(result.gst).toBe("GST123");
      expect(result.companyVATNumber).toBe("VAT456");
      expect(result.isActive).toBe(true);
      expect(result.preferredSelectedCountry).toBe("TR");
      expect(result.address).toEqual({
        street: "Main Street",
        houseNumber: "123",
        city: "Test City",
        stateProvinceRegion: "Test State",
        postalCode: "12345",
        countryCode: "US",
      });
      expect(result.logo).toEqual({
        logoId: "logo-id-1",
        name: "logo.png",
      });
    });

    it("should handle empty logo array", () => {
      const generalInfo = {
        name: "Test ASC",
        email: "test@asc.com",
        phoneNumber: "+1234567890",
        gst: "GST123",
        companyVATNumber: "VAT456",
        isActive: true,
        streetName: "Main Street",
        houseNumber: "123",
        city: "Test City",
        state: "Test State",
        postalCode: "12345",
        country: "US",
        logo: [],
      };

      const result = mapGeneralInfo(generalInfo);

      expect(result.logo).toBeNull();
    });

    it("should handle missing logo field", () => {
      const generalInfo = {
        name: "Test ASC",
        email: "test@asc.com",
        phoneNumber: "+1234567890",
        gst: "GST123",
        companyVATNumber: "VAT456",
        isActive: true,
        streetName: "Main Street",
        houseNumber: "123",
        city: "Test City",
        state: "Test State",
        postalCode: "12345",
        country: "US",
      };

      const result = mapGeneralInfo(generalInfo);

      expect(result.logo).toBeNull();
    });

    it("should handle isActive false", () => {
      const generalInfo = {
        name: "Inactive ASC",
        email: "inactive@asc.com",
        phoneNumber: "+1234567890",
        gst: "GST123",
        companyVATNumber: "VAT456",
        isActive: false,
        streetName: "Main Street",
        houseNumber: "123",
        city: "Test City",
        state: "Test State",
        postalCode: "12345",
        country: "US",
        logo: [],
      };

      const result = mapGeneralInfo(generalInfo);

      expect(result.isActive).toBe(false);
    });
  });

  describe("mapBanking", () => {
    it("should map banking info with all fields", () => {
      const bankingInfo = {
        bankName: "Test Bank",
        accountNumber: "1234567890",
      };

      const result = mapBanking(bankingInfo);

      expect(result.bankName).toBe("Test Bank");
      expect(result.accountNumber).toBe("1234567890");
    });

    it("should handle empty banking info", () => {
      const bankingInfo = {};

      const result = mapBanking(bankingInfo);

      expect(result.bankName).toBeUndefined();
      expect(result.accountNumber).toBeUndefined();
    });

    it("should handle partial banking info", () => {
      const bankingInfo = {
        bankName: "Test Bank",
      };

      const result = mapBanking(bankingInfo);

      expect(result.bankName).toBe("Test Bank");
      expect(result.accountNumber).toBeUndefined();
    });
  });

  describe("mapPricing", () => {
    it("should convert pricing strings to numbers", () => {
      const pricingInfo = {
        laPriceChargeable: "100.50",
        frPriceChargeable: "200.75",
        pkPriceChargeable: "300.25",
      };

      const result = mapPricing(pricingInfo);

      expect(result.laPriceChargeable).toBe(100.5);
      expect(result.frPriceChargeable).toBe(200.75);
      expect(result.pkPriceChargeable).toBe(300.25);
      expect(typeof result.laPriceChargeable).toBe("number");
    });

    it("should handle numeric pricing values", () => {
      const pricingInfo = {
        laPriceChargeable: 100,
        frPriceChargeable: 200,
        pkPriceChargeable: 300,
      };

      const result = mapPricing(pricingInfo);

      expect(result.laPriceChargeable).toBe(100);
      expect(result.frPriceChargeable).toBe(200);
      expect(result.pkPriceChargeable).toBe(300);
    });

    it("should handle zero values", () => {
      const pricingInfo = {
        laPriceChargeable: "0",
        frPriceChargeable: "0",
        pkPriceChargeable: "0",
      };

      const result = mapPricing(pricingInfo);

      expect(result.laPriceChargeable).toBe(0);
      expect(result.frPriceChargeable).toBe(0);
      expect(result.pkPriceChargeable).toBe(0);
    });
  });

  describe("mapBoschConfig", () => {
    it("should map bosch config with all numeric conversions", () => {
      const boschConfigInfo = {
        biqicName: "BIQIC001",
        customerCode: "CUST001",
        serviceCenterType: "AUTHORIZED",
        laPrice: "100",
        frPrice: "200",
        pkPrice: "300",
        sparePartsDiscount: "10.5",
        accessoriesDiscount: "5.25",
        sparePartsIncentive: "2.5",
        accessoriesIncentive: "1.75",
        packagingCost: "50.00",
      };

      const result = mapBoschConfig(boschConfigInfo);

      expect(result.biqicName).toBe("BIQIC001");
      expect(result.customerCode).toBe("CUST001");
      expect(result.serviceCenterType).toBe("AUTHORIZED");
      expect(result.laPrice).toBe(100);
      expect(result.frPrice).toBe(200);
      expect(result.pkPrice).toBe(300);
      expect(result.sparePartsDiscount).toBe(10.5);
      expect(result.accessoriesDiscount).toBe(5.25);
      expect(result.sparePartsIncentive).toBe(2.5);
      expect(result.accessoriesIncentive).toBe(1.75);
      expect(result.packagingCost).toBe(50);
    });

    it("should handle numeric bosch config values", () => {
      const boschConfigInfo = {
        biqicName: "BIQIC001",
        customerCode: "CUST001",
        serviceCenterType: "AUTHORIZED",
        laPrice: 100,
        frPrice: 200,
        pkPrice: 300,
        sparePartsDiscount: 10.5,
        accessoriesDiscount: 5.25,
        sparePartsIncentive: 2.5,
        accessoriesIncentive: 1.75,
        packagingCost: 50,
      };

      const result = mapBoschConfig(boschConfigInfo);

      expect(result.laPrice).toBe(100);
      expect(result.packagingCost).toBe(50);
    });

    it("should handle zero pricing values", () => {
      const boschConfigInfo = {
        biqicName: "BIQIC001",
        customerCode: "CUST001",
        serviceCenterType: "AUTHORIZED",
        laPrice: "0",
        frPrice: "0",
        pkPrice: "0",
        sparePartsDiscount: "0",
        accessoriesDiscount: "0",
        sparePartsIncentive: "0",
        accessoriesIncentive: "0",
        packagingCost: "0",
      };

      const result = mapBoschConfig(boschConfigInfo);

      expect(result.laPrice).toBe(0);
      expect(result.sparePartsDiscount).toBe(0);
      expect(result.packagingCost).toBe(0);
    });

    it("should handle large numeric values", () => {
      const boschConfigInfo = {
        biqicName: "BIQIC001",
        customerCode: "CUST001",
        serviceCenterType: "AUTHORIZED",
        laPrice: "999999.99",
        frPrice: "888888.88",
        pkPrice: "777777.77",
        sparePartsDiscount: "99.99",
        accessoriesDiscount: "99.99",
        sparePartsIncentive: "99.99",
        accessoriesIncentive: "99.99",
        packagingCost: "9999.99",
      };

      const result = mapBoschConfig(boschConfigInfo);

      expect(result.laPrice).toBe(999999.99);
      expect(result.packagingCost).toBe(9999.99);
    });
  });

  describe("mapReimbursement", () => {
    it("should map reimbursement with form values overriding asc values", () => {
      const formValues = {
        reimbursementMethod_SPARE_PARTS_repair: "METHOD1",
        reimbursementMethod_SPARE_PARTS_exchange: "METHOD2",
        reimbursementMethod_ACCESSORIES_repair: "METHOD3",
        reimbursementMethod_ACCESSORIES_exchange: "METHOD4",
        reimbursementCreateOn: "2026-01-01",
        reimbursementPeriodType: "MONTHLY",
      };

      const asc = {
        reimbursementConfig: [
          {
            category: "SPARE_PARTS",
            reimbursementMethods: {
              REPAIR: "OLD_METHOD1",
              EXCHANGE: "OLD_METHOD2",
            },
          },
          {
            category: "ACCESSORIES",
            reimbursementMethods: {
              REPAIR: "OLD_METHOD3",
              EXCHANGE: "OLD_METHOD4",
            },
          },
        ],
        reimbursementCreateOn: "2025-01-01",
        reimbursementPeriodType: "QUARTERLY",
      } as any as ServiceCenter;

      const result = mapReimbursement(formValues, asc);

      expect(result.reimbursementConfig).toHaveLength(2);
      expect(result.reimbursementConfig[0].category).toBe("SPARE_PARTS");
      expect(result.reimbursementConfig[0].reimbursementMethods.REPAIR).toBe("METHOD1");
      expect(result.reimbursementConfig[0].reimbursementMethods.EXCHANGE).toBe("METHOD2");
      expect(result.reimbursementConfig[1].category).toBe("ACCESSORIES");
      expect(result.reimbursementConfig[1].reimbursementMethods.REPAIR).toBe("METHOD3");
      expect(result.reimbursementConfig[1].reimbursementMethods.EXCHANGE).toBe("METHOD4");
      expect(result.reimbursementCreateOn).toBe("2026-01-01");
      expect(result.reimbursementPeriodType).toBe("MONTHLY");
    });

    it("should use asc values when form values are empty", () => {
      const formValues = {};

      const asc = {
        reimbursementConfig: [
          {
            category: "SPARE_PARTS",
            reimbursementMethods: {
              REPAIR: "METHOD1",
              EXCHANGE: "METHOD2",
            },
          },
        ],
        reimbursementCreateOn: "2025-01-01",
        reimbursementPeriodType: "QUARTERLY",
      } as any as ServiceCenter;

      const result = mapReimbursement(formValues, asc);

      expect(result.reimbursementConfig[0].reimbursementMethods.REPAIR).toBe("METHOD1");
      expect(result.reimbursementCreateOn).toBe("2025-01-01");
      expect(result.reimbursementPeriodType).toBe("QUARTERLY");
    });

    it("should handle partial form value overrides", () => {
      const formValues = {
        reimbursementMethod_SPARE_PARTS_repair: "NEW_METHOD",
      };

      const asc = {
        reimbursementConfig: [
          {
            category: "SPARE_PARTS",
            reimbursementMethods: {
              REPAIR: "OLD_METHOD1",
              EXCHANGE: "OLD_METHOD2",
            },
          },
        ],
        reimbursementCreateOn: "2025-01-01",
        reimbursementPeriodType: "QUARTERLY",
      } as any as ServiceCenter;

      const result = mapReimbursement(formValues, asc);

      expect(result.reimbursementConfig[0].reimbursementMethods.REPAIR).toBe("NEW_METHOD");
      expect(result.reimbursementConfig[0].reimbursementMethods.EXCHANGE).toBe("OLD_METHOD2");
    });

    it("should handle empty reimbursement config", () => {
      const formValues = {};

      const asc = {
        reimbursementConfig: [],
        reimbursementCreateOn: "2025-01-01",
        reimbursementPeriodType: "QUARTERLY",
      } as any as ServiceCenter;

      const result = mapReimbursement(formValues, asc);

      expect(result.reimbursementConfig).toHaveLength(0);
      expect(result.reimbursementCreateOn).toBe("2025-01-01");
    });

    it("should handle undefined reimbursementCreateOn in form", () => {
      const formValues = {
        reimbursementPeriodType: "MONTHLY",
      };

      const asc = {
        reimbursementConfig: [],
        reimbursementCreateOn: "2025-01-01",
        reimbursementPeriodType: "QUARTERLY",
      } as any as ServiceCenter;

      const result = mapReimbursement(formValues, asc);

      expect(result.reimbursementCreateOn).toBe("2025-01-01");
      expect(result.reimbursementPeriodType).toBe("MONTHLY");
    });
  });

  describe("mapNotifications", () => {
    it("should map all notification types when true", () => {
      const formValues = {
        notificationEmail: true,
        notificationSMS: true,
        parentNotificationEmail: true,
        parentNotificationSMS: true,
      };

      const result = mapNotifications(formValues);

      expect(result.notification).toContain("EMAIL");
      expect(result.notification).toContain("SMS");
      expect(result.notification).toHaveLength(2);
      expect(result.parentNotification).toContain("EMAIL");
      expect(result.parentNotification).toContain("SMS");
      expect(result.parentNotification).toHaveLength(2);
    });

    it("should handle only email notifications", () => {
      const formValues = {
        notificationEmail: true,
        notificationSMS: false,
        parentNotificationEmail: false,
        parentNotificationSMS: false,
      };

      const result = mapNotifications(formValues);

      expect(result.notification).toEqual(["EMAIL"]);
      expect(result.parentNotification).toEqual([]);
    });

    it("should handle only SMS notifications", () => {
      const formValues = {
        notificationEmail: false,
        notificationSMS: true,
        parentNotificationEmail: false,
        parentNotificationSMS: true,
      };

      const result = mapNotifications(formValues);

      expect(result.notification).toEqual(["SMS"]);
      expect(result.parentNotification).toEqual(["SMS"]);
    });

    it("should handle no notifications", () => {
      const formValues = {
        notificationEmail: false,
        notificationSMS: false,
        parentNotificationEmail: false,
        parentNotificationSMS: false,
      };

      const result = mapNotifications(formValues);

      expect(result.notification).toEqual([]);
      expect(result.parentNotification).toEqual([]);
    });

    it("should handle missing notification fields", () => {
      const formValues = {};

      const result = mapNotifications(formValues);

      expect(result.notification).toEqual([]);
      expect(result.parentNotification).toEqual([]);
    });

    it("should handle mixed notification settings", () => {
      const formValues = {
        notificationEmail: true,
        notificationSMS: false,
        parentNotificationEmail: true,
        parentNotificationSMS: true,
      };

      const result = mapNotifications(formValues);

      expect(result.notification).toEqual(["EMAIL"]);
      expect(result.parentNotification).toContain("EMAIL");
      expect(result.parentNotification).toContain("SMS");
      expect(result.parentNotification).toHaveLength(2);
    });

    it("should handle undefined values in form", () => {
      const formValues = {
        notificationEmail: undefined,
        notificationSMS: undefined,
        parentNotificationEmail: true,
        parentNotificationSMS: false,
      };

      const result = mapNotifications(formValues);

      expect(result.notification).toEqual([]);
      expect(result.parentNotification).toEqual(["EMAIL"]);
    });
  });

  describe("mapLaborCostDetails", () => {
    it("should map every repair level and all exchange methods", () => {
      const laborCostMethod = {
        repairCostConfiguration: {
          repairCosts: [
            {
              method: "LABOR_UNIT_X_COST_FROM_ASC",
              level: "L1",
              ranges: [],
              value: 100,
            },
            {
              method: "MATRIX",
              level: "L2",
              ranges: [
                { labourUnitRange: ["1", "2"], value: 200 },
                { labourUnitRange: ["3", "4"], value: 300 },
              ],
              value: 200,
            },
            {
              method: "LABOR_UNIT_X_COST_FROM_ERP",
              level: "L3",
              ranges: [],
              value: 300,
            },
          ],
        },
        newToolExchange: {
          prices: [
            { level: "L1", source: "SRC1", unitPrice: 10 },
            { level: "L2", source: "SRC2", unitPrice: 20 },
          ],
          reasonMapping: [
            {
              reasonType: "REASON_A",
              matrix: [
                { level: "L1", laborUnit: "7" },
                { level: "L2", laborUnit: "8" },
              ],
            },
          ],
        },
        accessoryExchange: {
          prices: [{ level: "L2", source: "SRC2", unitPrice: 20 }],
          reasonMapping: [
            {
              reasonType: "REASON_B",
              matrix: [{ level: "L2", laborUnit: "9" }],
            },
          ],
        },
        sparePartsExchange: {
          prices: [{ level: "L3", source: "SRC3", unitPrice: 30 }],
          reasonMapping: [
            {
              reasonType: "REASON_C",
              matrix: [{ level: "L3", laborUnit: "11" }],
            },
          ],
        },
      } as never;

      const result = mapLaborCostDetailsToApiPayload(laborCostMethod, {
        laborRateLevel1: "111",
        laborRateLevel3: 333,
      });

      expect(result.repairCosts).toHaveLength(3);
      expect(result.repairCosts[0]).toEqual({
        method: "LABOR_UNIT_X_COST_FROM_ASC",
        level: "L1",
        ranges: null,
        value: 111,
      });
      expect(result.repairCosts[1]).toEqual({
        method: "MATRIX",
        level: "L2",
        ranges: [
          { labourUnitRange: ["1", "2"], value: 200 },
          { labourUnitRange: ["3", "4"], value: 300 },
        ],
        value: 200,
      });
      expect(result.repairCosts[2]).toEqual({
        method: "LABOR_UNIT_X_COST_FROM_ERP",
        level: "L3",
        ranges: null,
        value: null,
      });
      expect(result.newToolExchange.reasonMapping[0].matrix).toEqual([
        { level: "L1", labourUnit: 7 },
        { level: "L2", labourUnit: 8 },
      ]);
      expect(result.accessoryExchange.prices[0]).toEqual({
        level: "L2",
        source: "SRC2",
        unitPrice: 20,
      });
      expect(result.sparePartsExchange.reasonMapping[0].matrix[0]).toEqual({
        level: "L3",
        labourUnit: 11,
      });
    });

    it("should apply exchange table edits from current form values", () => {
      const laborCostMethod = {
        repairCostConfiguration: { repairCosts: [] },
        newToolExchange: {
          prices: [],
          reasonMapping: [
            {
              reasonType: "REASON_A",
              matrix: [{ level: "L1", laborUnit: "7" }],
            },
          ],
        },
        accessoryExchange: {
          prices: [],
          reasonMapping: [
            {
              reasonType: "REASON_B",
              matrix: [{ level: "L1", laborUnit: "8" }],
            },
          ],
        },
        sparePartsExchange: {
          prices: [],
          reasonMapping: [
            {
              reasonType: "REASON_C",
              matrix: [{ level: "L1", laborUnit: "9" }],
            },
          ],
        },
      } as never;

      const tableData = mapExchangeLaborCostTableDataFromFormValues(
        [
          {
            reasonType: "REASON_A",
            sparePartLaborUnit: 1,
            newToolExchangeLaborUnit: 7,
            accessoryLaborUnit: 1,
          },
          {
            reasonType: "REASON_B",
            sparePartLaborUnit: 1,
            newToolExchangeLaborUnit: 1,
            accessoryLaborUnit: 8,
          },
          {
            reasonType: "REASON_C",
            sparePartLaborUnit: 9,
            newToolExchangeLaborUnit: 1,
            accessoryLaborUnit: 1,
          },
        ],
        {
          newToolExchangeLaborUnits_0: 17,
          accessoryLaborUnits_1: 28,
          sparePartLaborUnits_2: 39,
        },
      );

      const result = mapLaborCostDetailsToApiPayload(
        laborCostMethod,
        {},
        {
          level1Exchange: tableData,
        },
      );

      expect(result.newToolExchange.reasonMapping[0].matrix[0]).toEqual({
        level: "L1",
        labourUnit: 17,
      });
      expect(result.accessoryExchange.reasonMapping[0].matrix[0]).toEqual({
        level: "L1",
        labourUnit: 28,
      });
      expect(result.sparePartsExchange.reasonMapping[0].matrix[0]).toEqual({
        level: "L1",
        labourUnit: 39,
      });
    });
  });

  describe("exchange labor rules", () => {
    it("should switch pressed exchange button mode", () => {
      const sections = [
        {
          name: "internalLaborConfiguration",
          areas: [
            {
              name: "exchangeLaborCalculationArea",
              actions: [
                { name: "level1Exchange", mode: "primary" },
                { name: "level2Exchange", mode: "secondary" },
                { name: "level3Exchange", mode: "secondary" },
              ],
            },
          ],
        },
      ] as never;

      const updatedSections = updateLaborExchangeSections(sections, "level3Exchange");
      const exchangeActions: Array<{ mode?: string }> = updatedSections[0].areas[0].actions ?? [];

      expect(exchangeActions.length).toBe(3);
      expect(exchangeActions[0].mode).toBe("secondary");
      expect(exchangeActions[2].mode).toBe("primary");
    });
  });
});
