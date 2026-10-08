# Feature: Spare parts pricing field permissions

Control which users can edit pricing fields based on row type and position.

## Background
  Given an authorized service center user views diagnostics spare parts

## Scenario: User with permission can edit discount on CHARGEABLE row
  Given the user has permission DIAGNOSTICS.CAN_EDIT_DISCOUNT_ON_SPARE_PARTS
  And a spare part row has type CHARGEABLE
  And the row position is SP (spare parts)
  When the user views the discount field
  Then the discount field is enabled
  And the user can change the discount value

## Scenario: User with permission can edit discount on COMMERCIAL_GOODWILL row
  Given the user has permission DIAGNOSTICS.CAN_EDIT_DISCOUNT_ON_SPARE_PARTS
  And a spare part row has type COMMERCIAL_GOODWILL
  And the row position is SP (spare parts)
  When the user views the discount field
  Then the discount field is enabled
  And the user can change the discount value

## Scenario: User without permission cannot edit discount on CHARGEABLE row
  Given the user lacks permission DIAGNOSTICS.CAN_EDIT_DISCOUNT_ON_SPARE_PARTS
  And a spare part row has type CHARGEABLE
  When the user views the discount field
  Then the discount field is disabled
  And the user cannot modify the discount value

## Scenario: Discount field is disabled for WARRANTY rows
  Given a spare part row has type WARRANTY
  When the user views the discount field
  Then the discount field is disabled
  And the user cannot modify the discount value
  And the discount remains at the value set by the system

## Scenario: Discount field is disabled for SERVICE_OFFERING rows
  Given a spare part row has type SERVICE_OFFERING
  When the user views the discount field
  Then the discount field is disabled
  And the user cannot modify the discount value

## Scenario: User can edit total amount on CHARGEABLE row in GROSS_PRICE mode
  Given discount mode is GROSS_PRICE
  And the user has permission DIAGNOSTICS.CAN_EDIT_TOTAL_ON_SPARE_PARTS
  And a spare part row has type CHARGEABLE
  When the user views the total amount field
  Then the total amount field is enabled
  And the user can change the total amount value

## Scenario: User can edit net amount on CHARGEABLE row in NET_PRICE mode
  Given discount mode is NET_PRICE
  And the user has permission DIAGNOSTICS.CAN_EDIT_TOTAL_ON_SPARE_PARTS
  And a spare part row has type CHARGEABLE
  When the user views the net amount field
  Then the net amount field is enabled
  And the user can change the net amount value

## Scenario: User without permission cannot edit total amount
  Given the user lacks permission DIAGNOSTICS.CAN_EDIT_TOTAL_ON_SPARE_PARTS
  And a spare part row has type CHARGEABLE
  When the user views the total amount field
  Then the total amount field is disabled
  And the user cannot modify the total amount value

## Scenario: Total and net amount fields are disabled for WARRANTY rows
  Given a spare part row has type WARRANTY
  When the user views the total and net amount fields
  Then the total amount field is disabled
  And the net amount field is disabled
  And the user cannot modify either field

## Scenario: All price fields are disabled when job status is CUSTOMER_APPROVAL_PENDING
  Given the job status is CUSTOMER_APPROVAL_PENDING
  And a spare part row has type CHARGEABLE
  When the user views the pricing fields
  Then all price fields are disabled
  And the user cannot edit discount, total, or net amounts

## Scenario: All price fields are disabled when row is approved
  Given a spare part row has status APPROVED
  When the user views the pricing fields
  Then all price fields are disabled
  And the user cannot edit any pricing values

## Scenario: All price fields are disabled during validation
  Given the user has triggered validateAndSave
  And isValidating is true
  When the user views the pricing fields
  Then all price fields are disabled
  And the user cannot edit fields until validation completes

## Scenario: Summary discount field requires CAN_EDIT_TOTAL_DISCOUNT permission
  Given the user views the diagnostics summary area
  And the summary type is chargeable
  When the user does not have permission DIAGNOSTICS.CAN_EDIT_TOTAL_DISCOUNT
  Then the summary discount field is disabled
  And the user cannot edit the aggregate discount

## Scenario: User with permission can edit summary discount for CHARGEABLE summary
  Given the user has permission DIAGNOSTICS.CAN_EDIT_TOTAL_DISCOUNT
  And the summary type is chargeable
  When the user views the summary discount field
  Then the summary discount field is enabled
  And the user can change the summary discount value

## Scenario: Summary total amount requires CAN_EDIT_TOTAL_AMOUNT permission
  Given the user views the diagnostics summary area
  And the summary type is chargeable
  When the user does not have permission DIAGNOSTICS.CAN_EDIT_TOTAL_AMOUNT
  Then the summary total amount field is disabled
  And the user cannot edit the aggregate total amount

## Scenario: User with permission can edit summary total amount in GROSS_PRICE mode
  Given discount mode is GROSS_PRICE
  And the user has permission DIAGNOSTICS.CAN_EDIT_TOTAL_AMOUNT
  And the summary type is chargeable
  When the user views the summary total amount field
  Then the summary total amount field is enabled
  And the user can change the summary total amount value

## Scenario: Summary net amount field is disabled in GROSS_PRICE mode
  Given discount mode is GROSS_PRICE
  And the summary type is chargeable
  When the user views the summary net amount field
  Then the summary net amount field is disabled
  And the user cannot edit it regardless of permissions

## Scenario: Summary total amount field is disabled in NET_PRICE mode
  Given discount mode is NET_PRICE
  And the summary type is chargeable
  When the user views the summary total amount field
  Then the summary total amount field is disabled
  And the user cannot edit it regardless of permissions

## Scenario: Position-specific permissions control discount editability
  Given the user has permission DIAGNOSTICS.CAN_EDIT_DISCOUNT_ON_LABOUR
  And the user lacks permission DIAGNOSTICS.CAN_EDIT_DISCOUNT_ON_SPARE_PARTS
  And a labour row (position LA) has type CHARGEABLE
  And a spare part row (position SP) has type CHARGEABLE
  When the user views both rows
  Then the labour row discount field is enabled
  And the spare part row discount field is disabled
