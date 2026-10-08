# Feature: Integrate refactored code and new tests into CI/CD pipeline

Developer ensures that refactoring and test additions work correctly with the existing build and deployment pipeline.

## Background
  Given the BASS-Next project uses Commitizen for commits
  And the project enforces pre-commit hooks for linting and type checking
  And CI/CD pipeline runs tests and coverage checks

## Scenario: Refactored code passes linting
  Given developer has extracted shared components, hooks, and utilities
  When developer runs npm run lint
  Then linter reports no errors in refactored files
  And linter reports no errors in new test files
  And linter enforces no-relative-imports rule for path aliases
  And linter enforces no-any-type rule for all TypeScript files

## Scenario: Refactored code passes type checking
  Given developer has extracted DateChangeObserver, useReimbursementListState, and queryParamBuilder
  When developer runs npm run typecheck
  Then TypeScript compiler reports no errors
  And all type inference works correctly in consuming components
  And no implicit 'any' types are present

## Scenario: All tests pass in CI/CD pipeline
  Given developer has committed refactored code and new tests
  When CI/CD pipeline runs npm run test
  Then all tests pass successfully
  And test execution time is acceptable (no timeout failures)
  And no flaky tests cause intermittent failures

## Scenario: Coverage report is generated and uploaded
  Given developer has committed all test files
  When CI/CD pipeline runs npm run test:cov
  Then coverage report is generated in coverage/ directory
  And coverage data is available in lcov format
  And SonarQube scanner uploads coverage to SonarQube server
  And coverage metrics are visible in SonarQube dashboard

## Scenario: SonarQube quality gate passes
  Given developer has increased coverage to 83%
  When SonarQube analyzes the code
  Then SonarQube reports overall coverage >= 83%
  And SonarQube reports code duplication is reduced in Reimbursement module
  And SonarQube quality gate status is "Passed"
  And build pipeline proceeds to deployment steps

## Scenario: Commits follow project conventions
  Given developer uses npm run commit for all commits
  When developer commits refactored code
  Then commit message follows "type(scope): PTBASS-881 description" format
  And commit type is "refactor" for duplication removal
  And commit type is "test" for new test files
  And commit message includes PTBASS-881 ticket number
  And pre-commit hooks do not block the commit

## Scenario: Branch is ready for pull request
  Given all refactoring and tests are committed to bugfix/PTBASS-881-sonarqube-issues
  When developer prepares to open a pull request
  Then all tests pass locally
  And coverage is at least 83%
  And linter reports no violations
  And TypeScript compiler reports no errors
  And the branch is up to date with main branch

## Scenario: Build succeeds with refactored code
  Given developer has completed all refactoring
  When developer runs npm run build:dev
  Then Vite builds the application successfully
  And no TypeScript errors are reported during build
  And no missing dependencies are reported
  And production bundle is generated without warnings

## Scenario: Development server runs with refactored code
  Given developer has extracted shared components
  When developer runs npm run dev
  Then Vite dev server starts successfully
  And no module resolution errors occur
  And hot module replacement works for refactored components
  And application loads in the browser without errors

## Scenario: Test watch mode works for iterative development
  Given developer is writing new test files
  When developer runs npm run test:watch
  Then Vitest watches for file changes
  And tests re-run automatically when source or test files change
  And only affected tests re-run after changes
  And developer can iterate on tests efficiently
