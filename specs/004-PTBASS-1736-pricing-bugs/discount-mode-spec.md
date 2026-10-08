# Feature: Discount mode behavior (GROSS_PRICE vs NET_PRICE)

Ensure pricing calculations and field visibility behave correctly in both GROSS_PRICE and NET_PRICE discount modes.

## Background
  Given an authorized service center user views diagnostics spare parts
  And the country configuration defines a discount mode

## Scenario: GROSS_PRICE mode shows GROSS discount field
  Given discount mode is GROSS_PRICE
  And a spare part row has type CHARGEABLE
  When the user views the discount field
  Then the GROSS_PRICE discount field is visible
  And the NET_PRICE discount field is hidden
  And the visible discount field is editable

## Scenario: NET_PRICE mode shows NET discount field
  Given discount mode is NET_PRICE
  And a spare part row has type COMMERCIAL_GOODWILL
  When the user views the discount field
  Then the NET_PRICE discount field is visible
  And the GROSS_PRICE discount field is hidden
  And the visible discount field is editable

## Scenario: GROSS_PRICE mode allows editing total amount, not net amount
  Given discount mode is GROSS_PRICE
  And a spare part row has type CHARGEABLE
  When the user views the total and net amount fields
  Then the total amount field is editable
  And the net amount field is disabled
  And discount is applied to gross amount to produce total amount

## Scenario: NET_PRICE mode allows editing net amount, not total amount
  Given discount mode is NET_PRICE
  And a spare part row has type CHARGEABLE
  When the user views the total and net amount fields
  Then the net amount field is editable
  And the total amount field is disabled
  And discount is applied to suggested net price to produce net amount

## Scenario: GROSS_PRICE mode calculates discount from total amount edit
  Given discount mode is GROSS_PRICE
  And a row has quantity 10, unit price 100, tax 20%
  And gross amount is 1200
  When the user sets total amount to 1080
  Then the discount field shows 10%
  And the discount amount is 120
  And net amount remains 1000

## Scenario: NET_PRICE mode calculates discount from net amount edit
  Given discount mode is NET_PRICE
  And a row has quantity 10, unit price 100
  And suggested net price is 1000
  When the user sets net amount to 850
  Then the discount field shows 15%
  And the discount amount is 150
  And total amount reflects tax applied to 850

## Scenario: GROSS_PRICE mode discount is applied after tax
  Given discount mode is GROSS_PRICE
  And a row has net amount 1000, tax 20%, discount 10%
  When the system calculates prices
  Then gross amount is 1200 (net + tax)
  And discount amount is 120 (10% of gross)
  And total amount is 1080 (gross - discount)

## Scenario: NET_PRICE mode discount is applied before tax
  Given discount mode is NET_PRICE
  And a row has suggested net 1000, discount 10%, tax 20%
  When the system calculates prices
  Then discount amount is 100 (10% of suggested net)
  And net amount is 900 (suggested net - discount)
  And tax amount is 180 (20% of net)
  And gross amount is 1080 (net + tax)
  And total amount equals gross amount

## Scenario: Mode switch preserves discount percent value
  Given discount mode is GROSS_PRICE
  And a row has discount 25%
  When the discount mode changes to NET_PRICE
  Then the NET_PRICE discount field shows 25%
  And the hidden discount field shows 25%
  And all three discount fields (GROSS visible, NET visible, hidden) are synchronized

## Scenario: Mode switch recalculates prices with same discount
  Given discount mode is GROSS_PRICE
  And a row has quantity 10, unit price 100, tax 20%, discount 10%
  And total amount is 1080 (gross 1200 minus 10% = 120)
  When the discount mode changes to NET_PRICE
  Then the discount field shows 10%
  And net amount is 900 (suggested net 1000 minus 10% = 100)
  And gross amount is 1080 (net 900 plus tax 180)
  And total amount is 1080

## Scenario: Summary area respects GROSS_PRICE mode
  Given discount mode is GROSS_PRICE
  And the summary type is chargeable
  When the user views the summary area
  Then the summary GROSS discount field is visible
  And the summary NET discount field is hidden
  And the summary total amount field is editable
  And the summary net amount field is disabled

## Scenario: Summary area respects NET_PRICE mode
  Given discount mode is NET_PRICE
  And the summary type is chargeable
  When the user views the summary area
  Then the summary NET discount field is visible
  And the summary GROSS discount field is hidden
  And the summary net amount field is editable
  And the summary total amount field is disabled

## Scenario: Summary aggregates discount correctly in GROSS_PRICE mode
  Given discount mode is GROSS_PRICE
  And three CHARGEABLE rows each have gross 1000 and discount 10%
  And each row total is 900
  When the summary aggregates the rows
  Then summary gross amount is 3000
  And summary total amount is 2700
  And summary discount is 10% (uniform across rows)

## Scenario: Summary aggregates discount correctly in NET_PRICE mode
  Given discount mode is NET_PRICE
  And three CHARGEABLE rows each have suggested net 1000 and discount 15%
  And each row net amount is 850
  When the summary aggregates the rows
  Then summary suggested net price is 3000
  And summary net amount is 2550
  And summary discount is 15% (uniform across rows)

## Scenario: Summary discount calculated from non-uniform row discounts in GROSS mode
  Given discount mode is GROSS_PRICE
  And row 1 has gross 1000, discount 10%, total 900
  And row 2 has gross 2000, discount 20%, total 1600
  When the summary aggregates the rows
  Then summary gross amount is 3000
  And summary total amount is 2500
  And summary discount is calculated as (3000-2500)/3000*100 = 16.67%

## Scenario: Summary discount calculated from non-uniform row discounts in NET mode
  Given discount mode is NET_PRICE
  And row 1 has suggested net 1000, discount 10%, net 900
  And row 2 has suggested net 2000, discount 20%, net 1600
  When the summary aggregates the rows
  Then summary suggested net price is 3000
  And summary net amount is 2500
  And summary discount is calculated as (3000-2500)/3000*100 = 16.67%

## Scenario: Discount distribution to rows uses correct base amount in GROSS mode
  Given discount mode is GROSS_PRICE
  And the user sets summary discount to 12%
  And the summary includes SP, PN, and AC position rows
  When the user distributes the discount to rows
  Then each distributable row receives 12% discount
  And the 12% is applied to each row's gross amount

## Scenario: Discount distribution to rows uses correct base amount in NET mode
  Given discount mode is NET_PRICE
  And the user sets summary discount to 18%
  And the summary includes SP, PN, and AC position rows
  When the user distributes the discount to rows
  Then each distributable row receives 18% discount
  And the 18% is applied to each row's suggested net price
