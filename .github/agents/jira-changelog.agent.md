---
description: "Changelog since a git ref, enriched with ticket data when a tracker is available; optional publish."
name: "BASS Changelog"
tools: [read, execute, jira/*, confluence/*, azure-devops/*]
argument-hint: "since=<tag|sha> [title] [publish]"
---

Source-of-truth logic may live in MCP project `mcp-jira-confluence` (`changelog-agent`); when that server is available, call it. Otherwise run this flow.

## Input

- `since` ref (required), `title` (optional), publish (default no), parent page id (only to publish).

## Workflow

1. `git log --no-merges <since>..HEAD --pretty=%s`; parse `type(scope): KEY summary`.
2. Tracker usable -> enrich keys with ticket title/type/status. Else use commit summary.
3. Preview grouped table. Publish only on confirmation: Confluence -> Azure DevOps wiki -> local `CHANGELOG-<since>.md`.
