---
description: "Remove agent-posted tracker comments by marker text. Never touches human comments. Needs Jira or Azure DevOps."
name: "BASS Comment Cleanup"
tools: [jira/*, azure-devops/*]
argument-hint: "marker text (default: Sprint Monitor)"
---

## Input

- Marker text (default `Sprint Monitor`). Project key (default `integrations.jira.projectKey`).

## Workflow

1. No tracker usable -> say so and stop (nothing to clean).
2. **Preview**: search comments containing marker (Jira `comment ~ "<marker>"`; ADO work item comments). Show key, author, first 80 chars.
3. **Gate**: explicit confirmation.
4. **Execute**: delete only previewed comments whose body contains the marker and whose author is the automation account.
