# Feature: Diagnostics spare parts integration behavior

Price calculations, part number autocomplete, and validation must integrate correctly with the
backend API and maintain state consistency across the diagnostics context and Formik form state.

## Background
  Given the user is viewing JobOverview diagnostics tab
  And spare part rows are present
  And the diagnostics context is initialized

## Scenario: Part number autocomplete queries backend API
  Given a spare part row has an empty part number field
  When the technician types "123" in the autocomplete field
  Then the autocomplete component queries the backend API with search term "123"
  And the API returns matching part numbers with descriptions
  And the dropdown displays the matching options

## Scenario: Autocomplete selection populates sibling fields via autoFillFields
  Given a spare part row has a part number autocomplete field
  And the field metadata includes autoFillFields for description and unit price
  When the technician selects a part from the autocomplete dropdown
  Then the part number field is set to the selected part number
  And the description field is auto-filled via autoFillFields
  And the unit price field is auto-filled if the API provides it

## Scenario: Validation API request includes all pending materials
  Given three spare part rows are pending validation
  And the rows have part numbers "AAA", "BBB", and "CCC"
  When the technician triggers validation
  Then the validation API request payload includes all three materials
  And each material includes position, part number, quantity, type, and current prices

## Scenario: Validation API response updates prices in materials state
  Given a spare part row has part number "AAA" with unitPrice 100
  When the validation API returns updated unitPrice 120 for "AAA"
  Then the materials state is updated with the new unitPrice 120
  And the form is reinitialized with the new price
  And the row displays unitPrice 120

## Scenario: Validation API response assigns materialId to new rows
  Given a spare part row has no materialId (user-added row)
  When the validation API response includes a materialId "m123" for the row
  Then the materials state is updated with materialId "m123"
  And the form field for materialId is set to "m123"
  And subsequent validations reference materialId "m123"

## Scenario: Part number change moves validated material to archivedMaterials
  Given a spare part row has part number "AAA" with materialId "m1"
  And the row has been validated
  When the technician changes the part number to "BBB"
  Then the material with part number "AAA" is removed from materials array
  And the material with part number "AAA" is added to archivedMaterials array
  And the archivedMaterials item retains materialId "m1"

## Scenario: Archived materials are sent in validation request payload
  Given a spare part row with part number "AAA" was archived
  And the archived material has materialId "m1"
  When the technician triggers validation
  Then the validation API request includes an archivedMaterials section
  And the archivedMaterials section includes the material with part number "AAA"
  And the archived material retains materialId "m1"

## Scenario: Validation response refetch updates diagnosticData query cache
  Given validation has been triggered
  When the validation API response is successful
  Then the diagnosticData query cache is invalidated
  And the diagnosticData query refetches from the backend
  And the materials array is resynced from the fresh API data

## Scenario: Discount base mode determines which price field is editable
  Given the discount base is "GROSS_PRICE"
  And a spare part row has type "CHARGEABLE"
  When the row is rendered
  Then the total amount field is editable
  And the net amount field is disabled

## Scenario: Discount base mode NET_PRICE makes net amount editable
  Given the discount base is "NET_PRICE"
  And a spare part row has type "CHARGEABLE"
  When the row is rendered
  Then the net amount field is editable
  And the total amount field is disabled

## Scenario: Allowed positions filter position dropdown options
  Given the country configuration allows positions LA, SP, PN
  And the configuration does not allow position AC
  When a spare part row position dropdown is rendered
  Then the dropdown options include LA, SP, PN
  And the dropdown options do not include AC

## Scenario: Position-based permissions disable restricted positions in dropdown
  Given the allowed positions include FR
  And the user does not have permission "CAN_INSERT_AND_DELETE_FREIGHT_ITEMS"
  When the position dropdown is rendered
  Then the FR option is disabled
  And the user cannot select FR

## Scenario: Automatic rows are created based on country configuration
  Given the country configuration specifies automatic rows LA, PN
  When the diagnostics tab is initialized
  Then a spare part row with position LA is automatically created
  And a spare part row with position PN is automatically created
  And both rows are populated with default quantity from configuration

## Scenario: Fault code dropdown selection updates labour quantity
  Given a spare part row has position LA
  And the country configuration sets quantity source to "FAULT_CODES"
  When the technician selects fault code "F001:3" from the dropdown
  Then the labour quantity field is updated to 3
  And the quantity is extracted from the fault code value

## Scenario: Bare-sales-relation API populates PN row part number
  Given the baretool number field is populated with "TOOL123"
  And the action type is "NEW_TOOL_EXCHANGE"
  When the bare-sales-relation API returns salesSku "SKU456"
  Then the PN row part number field is auto-filled with "SKU456"
  And the PN row description is auto-filled with the returned description

## Scenario: Validation skipped when job is on hold
  Given the job status is "ON_HOLD"
  When the technician attempts to trigger validation
  Then the validation button is disabled
  And no validation API request is sent

## Scenario: Row deletion archives material when job status allows archiving
  Given a spare part row has materialId "m1"
  And the job status is "IN_DIAGNOSTICS"
  When the technician deletes the row
  Then the material is moved to archivedMaterials
  And the row is removed from the UI
  And the archived material is included in the next validation request

## Scenario: Row deletion permanently removes material when job status blocks archiving
  Given a spare part row has materialId "m1"
  And the job status is "COMPLETED"
  When the technician attempts to delete the row
  Then the delete action is blocked
  And the row remains in the UI

## Scenario: Country configuration currency symbol displays in price fields
  Given the country configuration specifies currency symbol "€"
  When price fields are rendered
  Then the currency symbol "€" is displayed adjacent to the price input
  And the symbol reflects the country configuration

## Scenario: Tax percentage from API is applied in price calculations
  Given the API returns a material with tax 19
  When the price calculator computes taxAmount
  Then the tax amount is calculated as netAmount × 0.19
  And the gross amount includes the tax amount

## Scenario: Special materials origin flag preserved across validation
  Given a spare part row has origin "specialMaterial"
  When the technician validates the row
  And the API returns updated prices
  Then the origin "specialMaterial" flag is preserved
  And the row remains identified as a special material
