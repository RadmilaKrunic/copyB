---
description: "Canonical release notes: collect tickets for a version, preview, optionally publish to Confluence or Azure DevOps wiki, optionally link tickets."
name: "BASS-Next Release Notes Publisher"
tools: [read, execute, todo, jira/*, confluence/*, azure-devops/*]
argument-hint: "version, e.g. v2.5.0"
---

Canonical release-notes workflow. Other release agents redirect here.

## Input

- Version (required). Optional: previous tag/ref, docs space/parent page (defaults from `.github/ai-workflow.yml`).

## Workflow

1. Resolve integrations (`bass-integrations`).
2. **Collect**: Jira usable -> `jira_generate_release_notes` (`projectKey`, `version`, no descriptions). Azure DevOps usable -> work items by iteration/tag. None -> `git log <prevTag>..HEAD`, group by commit type, extract `PTBASS-####` keys.
3. **Preview**: markdown grouped Features / Fixes / Other. Ask: publish?
4. **Publish** (on yes): Confluence -> publish under parent page; else Azure DevOps wiki; else write `release-notes/<version>.md` and show path.
5. **Link** (optional, on yes): comment page link on each resolved ticket via tracker.
