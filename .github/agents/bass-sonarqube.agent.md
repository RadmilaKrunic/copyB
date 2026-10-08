---
description: "SonarQube issue triage and minimal fixes. Works without Sonar MCP via lint + pasted issues."
name: "BASS-Next SonarQube"
tools: [read, edit, execute, search, todo, sonarqube/*]
argument-hint: "Filters: type, severity, rule, file"
---

Resolve SonarQube issues with minimal changes. Settings: `.github/ai-workflow.yml > integrations.sonarqube`.

## Workflow

1. **Access**: Sonar usable (`bass-integrations`) -> fetch open issues for `projectKey`. Else ask user to paste issues (rule, file, line) and run `npm run lint`.
2. **Triage**: table sorted by severity, then type.
3. **Fix**: read code around line; minimal fix in house style. Common: S2259 null guard, S6594 array `includes`, S1854 dead store, mouse/keyboard handlers only on native interactive elements (buttons, inputs), S3358 no nested ternary, `replaceAll` over global-regex `replace`.
4. **Verify**: `checks` from config for touched files.
5. **Transition**: resolve/close on server only on explicit user request.
