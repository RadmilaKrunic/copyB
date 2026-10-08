# Feature: Diagnostics Spare Parts Validation — Input Validation and Price Calculation Rules

Price rounding, discount bounds, and field calculation correctness for spare parts rows in both
NET_PRICE and GROSS_PRICE discount modes. These scenarios verify the arithmetic contract that the
UI enforces on every field change, independent of whether a network validation has occurred.

## Background

Given a job is open in the Job Overview on the diagnostics tab
And the user has permission to edit diagnostics

---

## Scenario: Net amount in NET_PRICE mode equals suggested net price minus discount amount

Given the country discount mode is NET_PRICE
And a spare parts row has quantity 2, unit price 50.00, and discount 10%
Then the suggested net price is 100.00
And the discount amount is 10.00
And the net amount is 90.00
And the gross amount is net amount plus the tax amount

---

## Scenario: Total amount in GROSS_PRICE mode equals gross minus discount amount

Given the country discount mode is GROSS_PRICE
And a spare parts row has quantity 2, unit price 50.00, tax 10%, and discount 10%
Then the suggested net price is 100.00
And the gross amount is 110.00
And the discount amount is 11.00
And the total amount is 99.00

---

## Scenario: Discount percentage is recalculated when the user edits the net amount in NET_PRICE mode

Given the country discount mode is NET_PRICE
And a spare parts row has suggested net price 100.00
When the user changes the net amount to 80.00
Then the discount percentage is 20%
And the discount amount is 20.00

---

## Scenario: Discount percentage is recalculated when the user edits the total amount in GROSS_PRICE mode

Given the country discount mode is GROSS_PRICE
And a spare parts row has gross amount 110.00
When the user changes the total amount to 99.00
Then the discount percentage is 10%
And the discount amount is 11.00

---

## Scenario: Discount percentage cannot become negative when net amount exceeds suggested net price in NET_PRICE mode

Given the country discount mode is NET_PRICE
And a spare parts row has suggested net price 100.00
When the user enters a net amount of 110.00
Then the net amount is clamped to 100.00 (the suggested net price)
And the discount percentage is 0%
And the discount amount is 0.00

---

## Scenario: Discount percentage cannot become negative when total amount exceeds gross amount in GROSS_PRICE mode

Given the country discount mode is GROSS_PRICE
And a spare parts row has gross amount 110.00
When the user enters a total amount of 120.00
Then the total amount is clamped to 110.00 (the gross amount)
And the discount percentage is 0%

---

## Scenario: Discount percentage is 0% when gross amount is zero in GROSS_PRICE mode

Given the country discount mode is GROSS_PRICE
And a spare parts row has gross amount 0.00 (unit price not yet entered)
When the user views the discount field
Then the discount percentage is 0%
And no division-by-zero or NaN value is displayed

---

## Scenario: Discount percentage is 0% when suggested net price is zero in NET_PRICE mode

Given the country discount mode is NET_PRICE
And a spare parts row has unit price 0.00
When the user views the discount field
Then the discount percentage is 0%
And no division-by-zero or NaN value is displayed

---

## Scenario: All price fields update atomically when quantity changes

Given a spare parts row has a unit price set and a non-zero discount
When the user changes the quantity
Then the suggested net price is recalculated as new quantity times unit price
And the discount amount is recalculated from the new suggested net price
And the net amount or total amount is updated accordingly in one step
And no field displays a transient zero or stale value

---

## Scenario: All price fields update atomically when unit price changes

Given a spare parts row has a non-zero quantity and a non-zero discount
When the user changes the unit price
Then the suggested net price is recalculated as quantity times new unit price
And the discount amount is recalculated from the new suggested net price
And the net amount or total amount is updated accordingly in one step

---

## Scenario: Changing unit price when the suggested net price is stale does not introduce a rounding error

Given the country discount mode is NET_PRICE
And a spare parts row was previously validated and the suggested net price was stored from the server
And the user now changes the unit price to a new value
When the price calculation runs
Then the new suggested net price is computed as quantity times the new unit price
And the calculation uses the freshly computed suggested net price, not the stale stored value
And the resulting net amount does not differ from the expected value by more than 0.01

---

## Scenario: Tax amount is recalculated correctly for each row when rows are added sequentially

Given a spare parts row has been validated and its tax amount is correct
When the user adds a second spare parts row and enters a unit price
Then the tax amount on the first row is unchanged
And the tax amount on the new row is computed as net amount times tax percentage divided by 100
And neither row shows a zero tax amount when the tax percentage is greater than zero

---

## Scenario: Discount fields (visible, hidden, and hidden amount) are all in sync after user edits discount

Given a spare parts row in either NET_PRICE or GROSS_PRICE mode
When the user changes the discount percentage
Then the visible discount field shows the new percentage
And the hidden discount field used for API submission holds the same percentage
And the hidden discount amount field holds the calculated discount amount
And all three values are consistent with each other

---

## Scenario: Discount fields (visible, hidden, and hidden amount) are reset when row type changes

Given a spare parts row has a non-zero discount set
When the user changes the row type (for example from COMMERCIAL_GOODWILL to CHARGEABLE)
Then the visible discount field is reset to 0%
And the hidden discount field is reset to 0%
And the hidden discount amount field is reset to 0.00
And the net amount equals the full suggested net price

---

## Scenario: Summary discount percentage is 0% when the summed gross amount across all rows is zero

Given the country discount mode is GROSS_PRICE
And all spare parts rows have unit price 0.00
When the user views the summary area discount field
Then the summary discount percentage is 0%
And no NaN or infinity value appears in the summary

---

## Scenario: Summary discount percentage is 0% when the summed suggested net price across all rows is zero in NET_PRICE mode

Given the country discount mode is NET_PRICE
And all spare parts rows have unit price 0.00
When the user views the summary area discount field
Then the summary discount percentage is 0%
And no NaN or infinity value appears in the summary

---

## Scenario: All monetary values are rounded to two decimal places

Given a spare parts row has a quantity and unit price that produce a value with more than two decimal places when multiplied
When the system calculates the suggested net price, net amount, gross amount, and total amount
Then each calculated value is rounded to exactly two decimal places using half-up rounding
And the sum of rounded sub-values is consistent with the rounded total
