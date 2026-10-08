# Feature: Validate refactoring maintains existing functionality

Developer ensures that code duplication removal and test additions do not introduce behavioral regressions.

## Background
  Given the BASS-Next application has existing functionality
  And all existing tests pass before refactoring begins

## Scenario: Refactoring does not break existing tests
  Given developer has extracted DateChangeObserver to a shared component
  And developer has extracted filter/pagination logic to a custom hook
  And developer has extracted query param builder utility
  When developer runs npm run test
  Then all previously passing tests continue to pass
  And no new test failures are introduced by refactoring

## Scenario: New test files follow project conventions
  Given the project uses Vitest with React Testing Library
  And test files are colocated with source files
  And test naming follows Component.test.tsx pattern
  When developer creates new test files
  Then each test file is located alongside its source file
  And test file names match the source file name with .test.tsx or .test.ts extension
  And all tests use vitest/globals (no explicit imports of describe, it, expect)
  And all tests import from @testing-library/react and @testing-library/jest-dom

## Scenario: API mocks follow project patterns
  Given the project uses vi.mock() for mocking dependencies
  And React Query hooks are tested with QueryClientProvider wrapper
  When developer mocks API service layer functions
  Then action.ts functions are mocked using vi.mock("./action", () => ({ ... }))
  And axios calls are mocked using vi.mock("api/axios-client/axiosClient")
  And React Query hooks use makeWrapper() pattern with QueryClientProvider
  And mock implementations return realistic data structures matching production types

## Scenario: Component tests follow React Testing Library best practices
  Given the project uses React Testing Library for component testing
  When developer writes component tests
  Then tests query elements by accessible roles and labels
  And tests avoid querying by implementation details like class names or data-testid unless necessary
  And tests verify user-visible behavior, not internal state
  And async operations use waitFor() from @testing-library/react

## Scenario: Test coverage is measured accurately
  Given vitest.config.ts defines coverage thresholds and exclusions
  When developer runs npm run test:cov
  Then coverage includes all src/**/*.{ts,tsx} files
  And coverage excludes *.d.ts, *.types.ts, setupTests.ts, and main.tsx
  And coverage reports show statement, branch, function, and line metrics
  And coverage HTML report is generated in coverage/ directory

## Scenario: Extracted components preserve TypeScript types
  Given the project enforces strict TypeScript checking
  And no 'any' types are allowed
  When developer extracts shared DateChangeObserver component
  Then DateChangeObserver has properly typed props interface
  And DateFilterValues interface is exported for reuse
  And all Formik context types are properly inferred
  And npm run typecheck passes without errors

## Scenario: Extracted hooks preserve React hook rules
  Given the project follows React hooks conventions
  When developer extracts useReimbursementListState hook
  Then the hook name starts with 'use' prefix
  And the hook only calls other hooks at the top level
  And the hook returns a consistent shape across all calls
  And hooks are only called from React components or other hooks

## Scenario: Extracted utilities are pure functions
  Given the project prefers pure utilities without side effects
  When developer extracts queryParamBuilder utility
  Then the utility function has explicit return type
  And the utility function has no side effects
  And the utility function is exported from src/utils/
  And the utility function has JSDoc comments if logic is non-obvious

## Scenario: Refactored imports use path aliases
  Given the project enforces path alias usage over relative imports
  When developer imports shared DateChangeObserver
  Then imports use path aliases like "components/" or "@/"
  And no relative imports like "../../../" are used
  And linter does not flag any import violations

## Scenario: Test mocks are cleaned up between tests
  Given Vitest tests share global state
  When developer writes test files with vi.mock()
  Then each test file includes afterEach(() => vi.clearAllMocks())
  And test suites do not leak state between test cases
  And QueryClient is recreated per test to avoid cache pollution
