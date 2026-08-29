---
name: ship_step
version: '2.0'
description: >-
  Automated Memory Sync, Git PR & Transition Pipeline. Seamlessly chains flashback (milestone logging
  and plan checkbox updates) with update-github (conventional commit <100 chars, push, PR creation,
  CI/status check verification polling, squash merge to main, local branch cleanup, remote branch retention),
  followed by next_step to preview the upcoming atomic task. Use whenever code is verified and ready to ship, or calling /ship_step.
---

# 🚀 Ship Step — Memory Sync, Git PR & Transition Pipeline

`ship_step` is the automated release and synchronization engine for Safe Yatra. It takes verified, high-quality code, logs the achievement in the project's living memory ledger ([`.agents/memory/flashback.md`](file:///d:/SIH%202026/.agents/memory/flashback.md)), checks off the roadmap milestone in [`implementation_plan.md`](file:///d:/SIH%202026/implementation_plan.md), executes the complete Git & GitHub PR squash-merge lifecycle with CI status check polling, and pre-fetches the next atomic task.

---

## 🔄 End-to-End Pipeline Workflow

```mermaid
flowchart TD
    A["Trigger /ship_step"] --> B["🕰️ flashback (Log Milestone & Check Plan [x])"]
    B --> C["🔍 Inspect Git Changes & Generate Conventional Commit (<100 chars)"]
    C --> D["🌿 git push -u origin feat/<slug>"]
    D --> E["🐙 Create GitHub Pull Request via MCP / gh CLI"]
    E --> F["⏳ Poll CI Status Checks (wait 30-60s, max 3 retries)"]
    F --> G{"CI Passed?"}
    G -- "❌ CI Failing / Timeout" --> H["🛑 HARD STOP: Report CI failure & await developer fix"]
    G -- "✅ CI Passed" --> I["🔀 Squash Merge PR to main"]
    I --> J{"⚠️ Merge Conflict?"}

    J -- "Yes" --> K["🛑 HARD STOP: Report exact conflict & await human guidance"]
    J -- "No" --> L["🌿 Switch to main && git pull origin main"]
    L --> M["🗑️ Delete local branch (Retain origin/feat/<slug> on GitHub)"]
    M --> N["🎯 Query next_step for upcoming atomic task"]
    N --> O["⚡ Output Final Shipping Summary + Next Step Preview"]
```

---

## 🛑 MANDATORY STOP GATE: Anti-Auto-Advance Rule

> **CRITICAL RULE**: After `/ship_step` completes squash-merge, local cleanup, and memory sync, the agent **MUST IMMEDIATELY STOP** and preview the next task in queue.
> **DO NOT** execute `/plan_step` for the next task.
> **DO NOT** create a new feature branch.
> **DO NOT** start coding the next task.
> Wait for the user to explicitly trigger `/plan_step` or instruct the next action. The only exception is `/auto_cycle`.

---

## 🔒 Automated Execution Stages

### Stage 1: Living Memory & Plan Synchronization (`flashback`)

1. Appends a chronological entry in [`.agents/memory/flashback.md`](file:///d:/SIH%202026/.agents/memory/flashback.md) under **Section 4: Chronological Activity Log**:
   - Module impacted (`backend-spatial` | `ml-risk-engine` | `mobile-app` | `admin-dashboard` | `infra`).
   - Summary of changes, new components, and tests added.
   - List of key files created/modified.
2. Updates checkboxes `[x]` in [`implementation_plan.md`](file:///d:/SIH%202026/implementation_plan.md) for completed tasks.
3. If an architectural decision was established during the feature, records an ADR in `.agents/memory/flashback.md`.

---

### Stage 2: Git Commit, Push & GitHub PR Lifecycle (`update-github`)

1. **Identify Branch**: Confirms current feature branch name (`CURRENT_BRANCH`).
2. **Conventional Commit Message Generation**:
   - Prefix: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`
   - Format: Lowercase, no trailing period.
   - **Length Constraint**: **Strictly under 100 characters**.
3. **Stage & Commit**:
   ```bash
   git add .
   git commit -m "<conventional-message>"
   ```
4. **Push Upstream**:
   ```bash
   git push -u origin CURRENT_BRANCH
   ```
5. **Create Pull Request**:
   - Creates Pull Request into `main` via GitHub MCP / `gh pr create`.
   - Embeds verification metrics in the PR description (test count, type check, lint status).
6. **CI Status Check & Polling Protocol**:
   - After creating the PR, wait 30–60 seconds for CI to trigger.
   - Poll PR status via GitHub MCP `get_pull_request_status` or `gh pr checks`.
   - If CI is still `pending`, wait 30s and re-check (up to 3 polling intervals).
   - **Hard Stop**: If CI fails (`failure` or `error`), **HALT IMMEDIATELY**. Do NOT merge.
7. **Squash Merge**:
   - Executes **Squash Merge** into `main` via GitHub MCP / `gh pr merge --squash`.
8. **Local Cleanup & Remote Retention**:
   - Switches to `main`: `git checkout main && git pull origin main`.
   - _Git Recovery_: If `git pull` encounters conflict with uncommitted local work: `git stash` $\rightarrow$ `git pull origin main` $\rightarrow$ `git stash pop` $\rightarrow$ resolve.
   - Deletes local branch: `git branch -D CURRENT_BRANCH`.
   - **Rule**: **Preserves `origin/CURRENT_BRANCH` on GitHub** for revision history and audit trails.

---

### Stage 3: Next Atomic Task Query (`next_step`)

1. Immediately queries [`next_step`](file:///d:/SIH%202026/.agents/skills/next_step/SKILL.md) to inspect the updated plan and memory ledger.
2. Prepares the next atomic, Goldilocks-sized task in queue.

---

## 📤 Standard Output Format

```markdown
# 🚢 /ship_step Complete — [Feature Title]

### 📦 GitHub PR & Merge Summary

- **Commit**: `<type>: <description>` _(Under 100 characters)_
- **Pull Request**: `PR #<NUMBER> — <PR Title>`
- **CI Status**: `✅ Passed (All workflows green)`
- **Merge Strategy**: `Squash & Merge` ➔ `main` (Up to date)
- **Branch Status**:
  - `✓` Remote branch preserved on GitHub: `origin/feat/<feature-slug>`
  - `✓` Local feature branch cleaned up: `feat/<feature-slug>`

---

### 🕰️ Memory Ledger Synchronized

- **Flashback Log**: [`.agents/memory/flashback.md`](file:///d:/SIH%202026/.agents/memory/flashback.md) updated.
- **Roadmap Checklist**: [`implementation_plan.md`](file:///d:/SIH%202026/implementation_plan.md) marked `[x]` for completed step.

---

### ⏭️ Up Next in Queue

_The next atomic task in the Safe Yatra roadmap is:_

> **[Step ID] — [Next Step Title]** (`[Module Name]`)  
> _Objective: [1-sentence description of what comes next]_

---

### ⚡ Ready to Continue?

Would you like me to trigger `/plan_step` for **[Next Step ID: Next Step Title]**?
```

---

## 🚀 Triggers

- `/ship_step`
- `"Ship current feature and merge to main"`
- `"Merge PR and update memory"`
- `"Complete step and update github"`
