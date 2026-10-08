---
name: bass-integrations
description: "Optional Jira, Confluence, Azure DevOps and SonarQube steps, with a no-integration fallback for each."
---

# Integrations (optional)

Settings: `.github/ai-workflow.yml > integrations`. Every integration is optional.

## Resolve Once Per Task

1. Read `integrations`.
2. Integration usable = `enabled: true` AND its MCP tools (`<mcpServer>/*`) are available in this session.
3. `tracker: auto` -> Jira if usable, else Azure DevOps if usable, else `none`.
4. Docs target -> Confluence if usable, else Azure DevOps wiki if `azureDevOps.wiki` set and usable, else local markdown.
5. State the result in one line: `Integrations: tracker=jira, docs=confluence, sonar=off`.
6. Never stop a task because an integration is off or unreachable. Use the fallback.

## Operation Matrix

| Operation          | Jira                       | Azure DevOps                         | Fallback (none)                                    |
| ------------------ | -------------------------- | ------------------------------------ | -------------------------------------------------- |
| Read ticket        | `jira_get_issue`           | work item get (`azure-devops/*`)     | Ask user to paste title + description + AC         |
| Search tickets     | `jira_search` (JQL)        | WIQL query                           | Skip; use user list                                |
| Comment on ticket  | `jira_add_comment`         | work item comment                    | Print comment text for user to paste               |
| Update fields      | `jira_update_issue`        | work item update                     | Print proposed field values                        |
| Release notes data | `jira_generate_release_notes` (fixVersion) | work items by iteration/tag | `git log <from>..<to>` + ticket keys from commits |
| Publish page       | `confluence_publish_release_notes` / page create | wiki page create/update | Write `release-notes/<version>.md` locally and show path |
| Sonar issues       | `sonarqube/*`              | —                                    | `npm run lint`; ask user for Sonar export          |

Exact tool names depend on the MCP server; map by intent, not by name.

## Safety Gates

- Any write to an external system (comment, field update, publish, resolve Sonar issue) needs explicit user confirmation in this session. Show a preview first.
- Never delete human-written comments. Cleanup only matches the configured marker text.
- Never paste secrets, tokens, internal hostnames beyond what config already lists.

## Ticket Keys

- Key pattern: `project.ticketPrefix` + `-` + digits (Jira) or `#<id>` / `AB#<id>` (Azure DevOps).
- Commit message still uses `PTBASS-####` (commitlint). For Azure DevOps-only work, put the work item as `AB#<id>` in the commit body.
