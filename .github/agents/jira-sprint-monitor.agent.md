---
description: "Active sprint health table (stale, blocked, unassigned, over-estimate); optional notify comments."
name: "BASS Sprint Monitor"
tools: [jira/*, azure-devops/*]
---

Source-of-truth logic may live in MCP project `mcp-jira-confluence` (`sprint-monitor`); use it when available.

## Workflow

1. Tracker usable -> active sprint (Jira) / current iteration (ADO). None -> ask user for an export; else stop.
2. Table: key, status, assignee, days in status, flag (stale > 3d, blocked, unassigned, no estimate).
3. Optional: on approval, comment flagged items (prefix comment with `Sprint Monitor` marker for later cleanup).
