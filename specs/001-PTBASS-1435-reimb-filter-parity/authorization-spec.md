# Feature: Access control for the Reimbursement date-range filter

The /reimbursement page and all its date-range filter interactions are restricted to
users who hold the REIMBURSEMENT.CAN_VIEW permission ("R\_\_V").

## Background

Given the application is running and routing is active

---

## Scenario: Authenticated user with REIMBURSEMENT.CAN_VIEW accesses the reimbursement page

Given I am an authenticated Bosch user
And my account has the REIMBURSEMENT.CAN_VIEW ("R\_\_V") permission
When I navigate to /reimbursement
Then I see the "ASC List" and "Reimbursement List" tabs
And the date picker and "Last Month" chip are rendered and interactive

## Scenario: Authenticated user without REIMBURSEMENT.CAN_VIEW is denied access

Given I am an authenticated Bosch user
And my account does not have the REIMBURSEMENT.CAN_VIEW ("R\_\_V") permission
When I navigate to /reimbursement
Then I am shown a "You do not have permission to view this page" message
And no reimbursement data is fetched

## Scenario: Unauthenticated user is redirected to login when accessing /reimbursement

Given I am not authenticated
When I navigate to /reimbursement
Then I am redirected to the login page
And no reimbursement data is fetched

## Scenario: Authenticated user with REIMBURSEMENT.CAN_VIEW accesses the reimbursement detail page

Given I am an authenticated Bosch user with REIMBURSEMENT.CAN_VIEW
And I am on the ASC List tab viewing a service center
When I click on a service-center row
Then I am navigated to /reimbursement-detail/:ascId
And the reimbursements for that service center are loaded

## Scenario: Authenticated user without REIMBURSEMENT.CAN_VIEW is denied access to reimbursement detail

Given I am an authenticated Bosch user without REIMBURSEMENT.CAN_VIEW
When I navigate directly to /reimbursement-detail/:ascId
Then I am shown a permission denied message
And no reimbursement data for that service center is fetched

## Scenario: Date range changes made by a permitted user propagate to the API

Given I am an authenticated Bosch user with REIMBURSEMENT.CAN_VIEW
And I am on the ASC List tab
When I change the date range using the "Last Month" chip
Then the service-center list endpoint is called with the updated fromDate and endDate
And the updated list is displayed

## Scenario: Session-stored filter state is only applied when the user still holds the required permission

Given I previously visited /reimbursement as an authenticated user with REIMBURSEMENT.CAN_VIEW
And filter state was stored in the session
When my permission is later revoked and I visit /reimbursement again
Then I am shown a permission denied message
And the stored session state does not cause any data requests to be made
