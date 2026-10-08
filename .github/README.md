# BASS-Next AI Setup

| File / folder                | Purpose                                                                     |
| ---------------------------- | --------------------------------------------------------------------------- |
| `ai-workflow.yml`            | Switchboard: base branch, checks, reports on/off, integrations on/off       |
| `copilot-instructions.md`    | Always-loaded rules (short). Shared by Copilot and Claude Code              |
| `AGENTS_GUIDE.md`            | Which agent for which task                                                   |
| `agents/*.agent.md`          | Agent definitions                                                           |
| `skills/*/SKILL.md`          | Domain rules, loaded on demand                                              |

## Common Switches

- Turn task reports on: `reporting.enabled: true`.
- Work without Jira/Confluence: set `integrations.jira.enabled` / `confluence.enabled` to `false` (or just don't connect the MCP server).
- Use Azure DevOps: `integrations.azureDevOps.enabled: true`, fill `organization`/`project`, optionally `tracker: azureDevOps`.

## Keeping Docs Current

- Change code that a skill describes -> update that skill in the same PR.
- Skills state current behavior only; history goes in commit messages.
