# CLAUDE.md

Claude Code entry point for BASS-Next Web. Shared rules live in one place so Copilot and Claude never drift:

@.github/copilot-instructions.md

## Claude-specific setup

- Switchboard: `.github/ai-workflow.yml` (base branch, checks, reports on/off, Jira / Confluence / Azure DevOps / SonarQube on/off). Read once per task.
- Domain skills (load the one that matches): `.github/skills/*/SKILL.md`, table in the imported file above.
- Auto-loaded path rules: `.claude/rules/`

| Rule                        | Loads for                                                                 |
| --------------------------- | ------------------------------------------------------------------------- |
| `typescript-conventions.md` | `src/**/*.ts(x)`                                                          |
| `react-conventions.md`      | `src/components/**/*.tsx`, `src/modules/**/*.tsx`                         |
| `api-domain-pattern.md`     | `src/api/services/**`                                                     |
| `metadata-driven-forms.md`  | `src/components/generics/**`                                              |
| `price-calculator.md`       | `priceCalculator.ts`, both materials managers, JobOverview, ClaimOverview |
| `testing.md`                | `src/**/*.test.ts(x)`                                                     |

- Claude skills: `.claude/skills/`

| Skill                       | Use for                                                                  |
| --------------------------- | ------------------------------------------------------------------------ |
| `bass-generic-field`        | New field type / GenericField behavior                                   |
| `bass-custom-area`          | New custom area in `CustomAreasMapper`                                   |
| `bass-diagnostics-material` | Spare-part rows (job & claim), row gates, recalculation flow             |
| `feature-workflow`          | Only when user says "start feature": ticket -> spec -> plan -> branch -> implement -> commit -> review |

- Agents: `.github/agents/*.agent.md` double as subagent briefs; routing in `.github/AGENTS_GUIDE.md`.
- Specs from `feature-workflow`: `specs/<NNN>-<TICKET>-<slug>/` (committed with the feature).

## Claude-only notes

- Commands, commits, i18n, architecture: see imported file. Do not duplicate them here.
- `.claude/settings.local.json` holds machine-specific permissions; keep personal paths out of shared files.
- `.claudboard/catalog.json` drives claudboard `/analyse` -> `/generate`. Regenerating overwrites hand-fixed rules/skills; re-check them against code after any regeneration.
