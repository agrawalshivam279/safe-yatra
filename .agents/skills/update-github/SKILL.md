---
name: update-github
version: '2.0'
description: >-
  Commit changes, push to feature branch, create PR via GitHub MCP, verify CI status checks,
  squash merge to main, and clean up the local branch while keeping the remote branch on GitHub.
  Use whenever the user says "update github", "push to github", "ship feature", or calls /update-github.
---

# 🚀 Update GitHub — Commit, Push, PR & Merge Workflow

This workflow automates the end-to-end Git lifecycle for the Safe Yatra project: creating conventional commits under 100 characters, pushing the branch, creating a Pull Request, polling CI status checks, squash merging into `main`, deleting the local branch, and **preserving the remote branch on GitHub**.

---

## Workflow Steps

### Step 1 — Verify & Identify Current Branch

```bash
git branch --show-current
```

- Store the output as `CURRENT_BRANCH`.
- If on `main` and uncommitted changes exist:
  - Generate a descriptive branch name based on the changes (e.g. `feat/step-4-11b-geofence-job`).
  - Create and switch to it: `git checkout -b <new-branch-name>`
  - Set `CURRENT_BRANCH = <new-branch-name>`

---

### Step 2 — Generate Conventional Commit Message

Inspect changes and project context:

```bash
git diff --staged
git diff
git status -s
```

Consult [`.agents/memory/flashback.md`](file:///d:/SIH%202026/.agents/memory/flashback.md), [`implementation_plan.md`](file:///d:/SIH%202026/implementation_plan.md), or [`GEMINI.md`](file:///d:/SIH%202026/GEMINI.md) for relevant feature scope.

#### Commit Message Rules:

- **Type Prefix**:
  - `feat:` new feature or capability
  - `fix:` bug fix or error resolution
  - `chore:` config, dependencies, tooling, or setup
  - `docs:` documentation, specifications, or markdown notes
  - `refactor:` code refactoring without behavior change
  - `test:` adding or updating tests
- **Format**: Lowercase prefix and message description.
- **No Period**: Do not add a trailing period.
- **Length Constraint**: **Strictly under 100 characters**.
- **User-Centric**: Describe what the change accomplishes.

**Examples**:

- `feat: implement periodic geofence monitoring job with postgis alerts` (69 chars)
- `fix: correct postgis st_dwithin calculation for nearby volunteers` (65 chars)
- `chore: configure docker compose for postgres 16 and redis 7` (59 chars)

---

### Step 3 — Stage and Commit

Stage all project modifications, module files, and `.agents/` customizations:

```bash
git add .
git commit -m "<generated-message>"
```

Report:

```text
✓ Committed — <generated-message>
```

---

### Step 4 — Push to Remote Feature Branch

Push current branch to GitHub remote:

```bash
git push -u origin CURRENT_BRANCH
```

#### Git Push Recovery:

- If push fails due to upstream divergence or non-fast-forward: run `git pull --rebase origin CURRENT_BRANCH` and retry.
- If push fails due to missing upstream: run `git push --set-upstream origin CURRENT_BRANCH`.

Report:

```text
✓ Pushed — CURRENT_BRANCH
```

---

### Step 5 — Create Pull Request

Use GitHub MCP (or GitHub CLI `gh pr create`) to create a PR from `CURRENT_BRANCH` into `main`.

- **PR Title**: Plain English feature/fix title without conventional prefix (e.g., `Implement Periodic Geofence Monitoring Job`).
- **PR Description Template**:

```markdown
## What this PR does

<1-2 paragraph summary of the feature, bugfix, or tooling added>

## Module Impact

- `backend-spatial` | `ml-risk-engine` | `mobile-app` | `admin-dashboard` | `infra`

## Key Changes

- <Bullet list of modified components and files>

## Verification

- **Backend Tests**: X/Y passed (Jest)
- **ML Tests**: X/Y passed (pytest)
- **Type Check**: ✅ 0 errors (`tsc --noEmit`)
- **Lint**: ✅ Clean (`ruff check .`)
```

Report:

```text
✓ PR created — <PR URL or PR Number>
```

---

### Step 6 — Verify CI Status Checks & Merge

Before merging, verify that the monorepo CI workflow passes:

1. Wait 30–60 seconds for GitHub Actions to trigger.
2. Check PR check status via GitHub MCP `get_pull_request_status` or `gh pr checks`.
3. If checks are pending, poll up to 3 times (30s intervals).
4. If CI fails, **HALT IMMEDIATELY** and notify developer.
5. Once CI is green, execute **Squash Merge** into `main` via GitHub MCP (`merge_pull_request`) or `gh pr merge --squash`.

Report:

```text
✓ CI checks passed
✓ PR merged to main (Squash Merge)
```

---

### Step 7 — Remote Branch Retention

> **Important Rule**: Do **NOT** delete the remote branch on GitHub. Preserve it for revision history and audit trails.

Report:

```text
✓ Remote branch retained on GitHub — origin/CURRENT_BRANCH
```

---

### Step 8 — Switch to Main & Pull Latest

Switch back to the local `main` branch and pull the merged changes:

```bash
git checkout main
git pull origin main
```

Report:

```text
✓ Switched to main — up to date
```

---

### Step 9 — Delete Local Feature Branch Only

Delete the local feature branch to keep the local workspace clean:

```bash
git branch -D CURRENT_BRANCH
```

Report:

```text
✓ Local branch deleted — CURRENT_BRANCH
```

---

### Step 10 — Flashback Memory Sync

Update [`.agents/memory/flashback.md`](file:///d:/SIH%202026/.agents/memory/flashback.md) under the Chronological Activity Log with a one-line entry noting the merged PR and commit.

---

## Final Output Format

```text
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
/update-github complete
✓ Committed — <message>
✓ Pushed — <branch>
✓ CI checks passed
✓ PR created and merged (#<PR_NUMBER>)
✓ Remote branch preserved on GitHub (origin/<branch>)
✓ Switched to main (up to date)
✓ Local branch deleted (<branch>)
✓ Flashback ledger synchronized
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
```

---

## Safety & Exception Rules

1. **Never commit directly to `main`**: Always branch off before committing.
2. **Always squash merge**: Keeps `main` commit history clean and linear.
3. **Never delete remote branches**: Only remove the local branch.
4. **Push Upstream Handling**: If push fails due to missing upstream, use `git push --set-upstream origin CURRENT_BRANCH`.
5. **CI & PR Failures**: If PR creation or CI checks fail, stop immediately and report the error without attempting to merge.
