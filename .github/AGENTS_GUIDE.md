# BASS-Next AI Agents Guide

Fast agent selection, minimal tokens. Works for GitHub Copilot custom agents (`.github/agents/*.agent.md`) and Claude Code (same files are readable as subagent briefs).

## Switchboard

`.github/ai-workflow.yml` controls: base branch, checks, reports on/off, Jira / Confluence / Azure DevOps / SonarQube on/off. Agents read it once per task. Every integration is optional; agents fall back to user input + git.

## Agent Matrix

| Agent                             | Use for                                               | Writes code | Integrations used (optional)   |
| --------------------------------- | ----------------------------------------------------- | ----------- | ------------------------------ |
| BASS-Next Orchestrator            | ticket -> branch -> plan -> implement -> verify       | no          | Jira or Azure DevOps           |
| BASS-Next Requirements            | turn request/ticket into testable requirements        | no          | Jira or Azure DevOps (read)    |
| BASS-Next Planner                 | file-level plan, risks, skills to load                | no          | —                              |
| BASS-Next Developer               | features & fixes                                      | yes         | —                              |
| BASS-Next Debugger                | root cause + minimal confirmed patch                  | minimal     | tracker (read)                 |
| BASS-Next Reviewer                | strict diff review (BLOCK/WARN/INFO)                  | no          | —                              |
| BASS-Next Tester                  | Vitest tests                                          | tests only  | —                              |
| BASS-Next Diagnostics             | diagnostics & claim pricing/material audit            | no          | —                              |
| BASS-Next Validator               | UIConfiguration / data / rules validation             | no          | —                              |
| BASS-Next Data Audit              | integrity, orphans, duplicates, status checks         | no          | —                              |
| BASS-Next Reporter                | business data reports (jobs, pricing, claims)         | no          | —                              |
| BASS-Next SonarQube               | Sonar triage + minimal fixes                          | yes         | SonarQube                      |
| BASS-Next Release Notes Publisher | release notes (canonical)                             | no          | Jira/ADO + Confluence/ADO wiki |
| BASS-Next Release Notes           | wrapper -> Publisher                                  | no          | —                              |
| BASS Changelog                    | changelog since ref                                   | no          | tracker + docs                 |
| BASS Sprint Monitor               | sprint health table                                   | no          | Jira or Azure DevOps           |
| BASS Triage                       | propose type/priority/estimate                        | no          | Jira or Azure DevOps           |
| BASS Comment Cleanup              | delete agent comments by marker                       | no          | Jira or Azure DevOps           |

## Routing

1. Ticket key or "do ticket X" -> Orchestrator.
2. Vague request -> Requirements -> Planner.
3. Bug with symptom -> Debugger; bigger fix -> Developer.
4. Small clear change -> Developer directly (skip Planner).
5. "Review" -> Reviewer. "Tests/coverage" -> Tester.
6. Pricing / spare parts / claims numbers -> Diagnostics first.
7. Sonar rule ids -> SonarQube.

## Token Savers

- Skip Planner for 1-2 file changes. Skip Requirements when AC are clear.
- Delegate with self-contained prompts (ticket, AC, plan step, skill names); do not forward whole transcripts.
- Load one matching skill; read big files by symbol.
- Reports off by default (`reporting.enabled: false`).

## Shared Constraints

- Follow `.github/copilot-instructions.md` + matching `.github/skills/*/SKILL.md`.
- External writes (comments, publish, field updates, Sonar resolve) only after explicit user confirmation.
- Commits via `npm run commit`; never push unless asked.
