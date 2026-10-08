# Feature: Error handling for Reimbursement date-range filter interactions

The reimbursement tabs degrade gracefully when the backend is unavailable or returns
errors, and do not leave the UI in a state where stale filter parameters silently produce
wrong data.

## Background

Given I am an authenticated Bosch user with REIMBURSEMENT.CAN_VIEW
And I am on the /reimbursement page

---

## Scenario: ASC List tab shows an empty or error state when the service-center endpoint fails

Given the "ASC List" tab is selected
And the date picker shows the current-month default range
When the service-center list endpoint returns an error
Then the service-center table does not display stale data from a previous request
And an appropriate error indication is visible to the user
And the date picker and "Last Month" chip remain usable for retrying

## Scenario: Reimbursement List tab shows an empty or error state when the reimbursements endpoint fails

Given the "Reimbursement List" tab is selected
And the date picker shows the current-month default range
When the reimbursements endpoint returns an error
Then the reimbursements table does not display stale data from a previous request
And an appropriate error indication is visible to the user
And the date picker and "Last Month" chip remain usable for retrying

## Scenario: Changing the date range while a previous request is still in flight on the ASC List tab

Given the "ASC List" tab is selected
And a request for the current date range is in flight
When I change the date range before the request completes
Then the tab uses the result of the request that matches the currently displayed date range
And no race condition causes the list to display data from the superseded date range

## Scenario: Changing the date range while a previous request is still in flight on the Reimbursement List tab

Given the "Reimbursement List" tab is selected
And a request for the current date range is in flight
When I change the date range before the request completes
Then the tab uses the result of the request that matches the currently displayed date range
And no race condition causes the list to display data from the superseded date range

## Scenario: Formik render-cycle does not produce infinite re-render loops on the ASC List tab when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
When I interact with the date picker
Then no state update is triggered inside the Formik render function in a way that causes an infinite re-render loop
And the browser does not freeze or report maximum update depth exceeded

## Scenario: Formik render-cycle does not produce infinite re-render loops on the Reimbursement List tab when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
When I interact with the date picker
Then no state update is triggered inside the Formik render function in a way that causes an infinite re-render loop
And the browser does not freeze or report maximum update depth exceeded

## Scenario: The ASC List tab does not call setDateRangeFilter inside the Formik render function when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
When the Formik render function executes
Then any synchronisation between Formik field values and the date range filter state occurs outside the render path (e.g. in a useEffect or event handler)
And the render function only reads state, never writes it

## Scenario: The Reimbursement List tab does not call setDateRangeFilter inside the Formik render function when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
When the Formik render function executes
Then any synchronisation between Formik field values and the date range filter state occurs outside the render path (e.g. in a useEffect or event handler)
And the render function only reads state, never writes it

## Scenario: Session storage corruption does not break the date picker default when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the session storage entry for the date range contains a malformed value
When the "ASC List" tab loads
Then the tab ignores the malformed session value
And the date picker defaults to the current-month range
And a request is sent using that default range

## Scenario: Session storage corruption does not break the Reimbursement List date picker default when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the session storage entry for the reimbursement list date range contains a malformed value
When the "Reimbursement List" tab loads
Then the tab ignores the malformed session value
And the date picker defaults to the current-month range
And a request is sent using that default range

## Scenario: Session storage corruption does not break the chip default when UIConfiguration has no reimbursementFilters form

Given the UIConfiguration API has not returned a form named "reimbursementFilters" for my country
And the session storage entry for the chip state contains a malformed value
When the "ASC List" tab loads
Then the tab ignores the malformed session value
And the "Last Month" chip is selected by default
And a request is sent using the last-month date range

## Scenario: Session storage corruption does not break the Reimbursement List chip default when UIConfiguration has no reimbursementFilters form

Given the UIConfiguration API has not returned a form named "reimbursementFilters" for my country
And the session storage entry for the chip state contains a malformed value
When the "Reimbursement List" tab loads
Then the tab ignores the malformed session value
And the "Last Month" chip is selected by default
And a request is sent using the last-month date range

## Scenario: Network timeout on the ASC List endpoint does not permanently disable the filter

Given the "ASC List" tab is selected
And the service-center list endpoint times out
When the request eventually fails
Then the date picker and "Last Month" chip are still enabled
And the user can change the date range to trigger a new attempt

## Scenario: Network timeout on the Reimbursement List endpoint does not permanently disable the filter

Given the "Reimbursement List" tab is selected
And the reimbursements endpoint times out
When the request eventually fails
Then the date picker and "Last Month" chip are still enabled
And the user can change the date range to trigger a new attempt
