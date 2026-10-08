# Feature: Refactor code duplication and increase test coverage to meet quality standards

Developer refactors duplicated code patterns in Reimbursement module and writes comprehensive tests to raise coverage from 72.44% to at least 83%, satisfying SonarQube quality gate requirements.

## Background
  Given the BASS-Next repository contains production code with 72.44% statement coverage
  And SonarQube enforces a minimum quality gate of 83% statement coverage
  And the Reimbursement module contains duplicated code patterns across three list components

## Scenario: Extract duplicated DateChangeObserver component
  Given DateChangeObserver is duplicated in ReimbursementList, ReimbursementASCList, and ReimbursementClaimsList
  And the component logic is identical across all three instances
  When developer extracts DateChangeObserver to a shared component file
  Then the component is located in src/modules/Reimbursement/shared/DateChangeObserver.tsx
  And all three list components import the shared DateChangeObserver
  And the refactored code maintains identical runtime behavior

## Scenario: Extract duplicated date filter and pagination hooks
  Given filter management logic is duplicated across ReimbursementList, ReimbursementASCList, and ReimbursementClaimsList
  And pagination state management follows the same pattern in all three components
  When developer extracts the filter and pagination logic into a custom hook
  Then the hook is located in src/hooks/useReimbursementListState.ts
  And the hook manages date filters, search state, and pagination state
  And all three list components use the shared hook
  And the refactored code maintains identical runtime behavior

## Scenario: Extract duplicated query parameter building utility
  Given query parameter construction for API calls is duplicated across reimbursement service hooks
  And the parameter building logic follows the same pattern for fromDate, toDate, search, page, and pageSize
  When developer extracts the query building logic into a utility function
  Then the utility is located in src/utils/queryParamBuilder.ts
  And reimbursement hooks use the shared utility
  And the refactored code maintains identical runtime behavior

## Scenario: Write tests for Reimbursement module components
  Given ReimbursementList has 0% test coverage
  And ReimbursementASCList has 0% test coverage
  And ReimbursementClaimsList has 0% test coverage
  When developer writes test files for each component
  Then ReimbursementList.test.tsx covers happy-path rendering and user interactions
  And ReimbursementASCList.test.tsx covers happy-path rendering and user interactions
  And ReimbursementClaimsList.test.tsx covers happy-path rendering and user interactions
  And all API calls are mocked using vitest.mock()

## Scenario: Write tests for ASC module components
  Given ASCList has 7% test coverage
  And ASCDetail has minimal test coverage
  When developer writes additional test cases for ASC components
  Then ASCList.test.tsx achieves at least 80% statement coverage
  And ASCDetail.test.tsx achieves at least 80% statement coverage
  And all API calls are mocked using vitest.mock()

## Scenario: Write tests for Dashboard module
  Given Dashboard module has 33.86% coverage
  When developer writes test files for uncovered Dashboard components
  Then Dashboard component tests cover happy-path rendering
  And Dashboard widget tests verify data display logic
  And Dashboard module achieves at least 80% statement coverage

## Scenario: Write tests for API service layers
  Given reimbursements service has 5% coverage
  And users service has 28% coverage
  And serviceCenters service has low coverage
  When developer writes action.test.ts and hooks.test.ts files for each service
  Then reimbursements/action.test.ts achieves at least 80% coverage
  And reimbursements/hooks.test.ts achieves at least 80% coverage
  And users/action.test.ts achieves at least 80% coverage
  And users/hooks.test.ts achieves at least 80% coverage
  And serviceCenters/action.test.ts achieves at least 80% coverage
  And serviceCenters/hooks.test.ts achieves at least 80% coverage
  And all axios calls are mocked using vi.mock()

## Scenario: Write tests for UI components
  Given DynamicDropdown has partial test coverage
  And PurchaseDateModal has no test coverage
  And ClaimSparePartsArea has no test coverage
  When developer writes test files for uncovered UI components
  Then DynamicDropdown.test.tsx achieves at least 80% coverage
  And PurchaseDateModal.test.tsx covers happy-path rendering and user interactions
  And ClaimSparePartsArea.test.tsx covers happy-path rendering and CRUD operations
  And all component tests follow React Testing Library patterns

## Scenario: Verify overall coverage reaches target
  Given all refactoring and new test files are complete
  When developer runs npm run test:cov
  Then the total statement coverage is at least 83%
  And the coverage report shows no critical gaps in priority modules
  And SonarQube quality gate passes
