---
name: bass-reporting
description: "Optional minimal task report. Load only when ai-workflow.yml reporting.enabled is true."
---

# Task Reporting (optional)

## Switch

- `.github/ai-workflow.yml > reporting.enabled`. `false` (default) -> write nothing, mention nothing.
- User says "no report" -> skip for this task. User says "report" -> write one even when disabled.
- `level: minimal` (default) or `standard` (adds time estimate table).

## Where

- `reporting.dir/reporting.fileName` (default `performance-reports/report-<TICKET>.md`). No ticket -> `report-<slug>-<YYYY-MM-DD>.md`.
- One file per ticket. New session = append a `## <date> — <title>` block. Never rewrite older blocks.

## Minimal Format (max ~15 lines)

```md
## 2026-10-08 — <short title>

- Ticket: PTBASS-1234 | Branch: bugfix/PTBASS-1234-slug
- Changed: `path/a.ts`, `path/b.tsx` (+N tests)
- Root cause / goal: <1 line>
- Result: <1 line>
- Checks: typecheck ok, lint ok, tests 12/12
- Risks / follow-ups: <1 line or "none">
```

## Standard Format (= minimal + estimate)

| Phase   | AI agent | Developer est. |
| ------- | -------: | -------------: |
| Context |   ~x min |         ~y min |
| Change  |   ~x min |         ~y min |
| Verify  |   ~x min |         ~y min |
| Total   |   ~x min |         ~y min |

## Rules

- Facts only from this session (commands actually run, files actually changed).
- No code dumps, no full test output, no repeated summaries.
- Publish elsewhere (Jira comment / Confluence / Azure DevOps) only via `bass-integrations` + user confirmation.
