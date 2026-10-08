# Feature: Date-range input validation for the Reimbursement filter

When UIConfiguration provides a reimbursementFilters form, the date picker accepts only complete,
well-formed ranges. When UIConfiguration has no reimbursementFilters form, the date picker is not
rendered and filtering is controlled solely by the "Last Month" chip. Incomplete or cleared input
is handled gracefully without triggering API calls or leaving the UI in an inconsistent state.

## Background

Given I am an authenticated Bosch user with REIMBURSEMENT.CAN_VIEW
And I am on the /reimbursement page

---

## Scenario: A complete date range is accepted and sent to the server on the ASC List tab when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
When I pick a valid start date and a valid end date using the date picker
Then the chosen range is accepted
And a request carrying fromDate set to the start date and endDate set to the end date is sent to the service-center list endpoint

## Scenario: A complete date range is accepted and sent to the server on the Reimbursement List tab when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
When I pick a valid start date and a valid end date using the date picker
Then the chosen range is accepted
And a request carrying fromDate set to the start date and endDate set to the end date is sent to the reimbursements endpoint

## Scenario: A start date without an end date does not trigger an API call on the ASC List tab when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
When I enter a start date in the date picker but do not yet select an end date
Then the date picker shows the partial entry
And no request is sent to the service-center list endpoint
And the previously loaded list remains displayed

## Scenario: A start date without an end date does not trigger an API call on the Reimbursement List tab when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
When I enter a start date in the date picker but do not yet select an end date
Then the date picker shows the partial entry
And no request is sent to the reimbursements endpoint
And the previously loaded list remains displayed

## Scenario: Clearing the date picker entirely reverts to the default range on the ASC List tab when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
And the date picker shows a custom range
When I clear both dates from the date picker
Then the date picker resets to the first day of the current month through today
And a request carrying that default range is sent to the service-center list endpoint

## Scenario: Clearing the date picker entirely reverts to the default range on the Reimbursement List tab when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
And the date picker shows a custom range
When I clear both dates from the date picker
Then the date picker resets to the first day of the current month through today
And a request carrying that default range is sent to the reimbursements endpoint

## Scenario: An end date earlier than the start date is not sent as a valid range when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
When I pick an end date that is earlier than the start date in the date picker
Then the picker does not produce a complete valid range
And no request carrying that inverted range is sent to the reimbursements endpoint

## Scenario: Date format is formatted as YYYY-MM-DD when sent to the backend

Given the "ASC List" tab is selected
And I have selected 05 June 2025 as start and 30 June 2025 as end
When the request is sent to the service-center list endpoint
Then the fromDate query parameter is "2025-06-05"
And the endDate query parameter is "2025-06-30"

## Scenario: Date format is formatted as YYYY-MM-DD when sent to the reimbursements endpoint

Given the "Reimbursement List" tab is selected
And I have selected 01 May 2025 as start and 31 May 2025 as end
When the request is sent to the reimbursements endpoint
Then the fromDate query parameter is "2025-05-01"
And the endDate query parameter is "2025-05-31"

## Scenario: The "Last Month" chip produces correct boundary dates for a month-end edge case

Given today is the first day of a month (e.g. 1 July 2025)
And the "Reimbursement List" tab is selected
When I click the "Last Month" chip
Then fromDate is set to 01 June 2025
And endDate is set to 30 June 2025
And the request uses those exact dates

## Scenario: The default range on the first day of a month spans exactly one day when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And today is the first day of a month (e.g. 1 July 2025)
And the "ASC List" tab is selected
And no session state is stored
When the tab loads
Then fromDate and endDate in the initial request are both 2025-07-01

## Scenario: No date query params are sent when the "Last Month" chip is deselected and UIConfiguration has no reimbursementFilters form on ASC List tab

Given the UIConfiguration API has not returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
And the "Last Month" chip is deselected
When a request is sent to the service-center list endpoint
Then the request URL contains no fromDate query parameter
And the request URL contains no endDate query parameter

## Scenario: No date query params are sent when the "Last Month" chip is deselected and UIConfiguration has no reimbursementFilters form on Reimbursement List tab

Given the UIConfiguration API has not returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
And the "Last Month" chip is deselected
When a request is sent to the reimbursements endpoint
Then the request URL contains no fromDate query parameter
And the request URL contains no endDate query parameter

## Scenario: Last month range is sent as YYYY-MM-DD when the "Last Month" chip is selected and UIConfiguration has no reimbursementFilters form on ASC List tab

Given the UIConfiguration API has not returned a form named "reimbursementFilters" for my country
And today is 15 July 2025
And the "ASC List" tab is selected
And the "Last Month" chip is selected
When a request is sent to the service-center list endpoint
Then the fromDate query parameter is "2025-06-01"
And the endDate query parameter is "2025-06-30"

## Scenario: Last month range is sent as YYYY-MM-DD when the "Last Month" chip is selected and UIConfiguration has no reimbursementFilters form on Reimbursement List tab

Given the UIConfiguration API has not returned a form named "reimbursementFilters" for my country
And today is 15 July 2025
And the "Reimbursement List" tab is selected
And the "Last Month" chip is selected
When a request is sent to the reimbursements endpoint
Then the fromDate query parameter is "2025-06-01"
And the endDate query parameter is "2025-06-30"
