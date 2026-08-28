---
name: flashback
description: >-
  Access, inspect, update, or summarize the project's persistent memory ledger,
  architectural decisions (ADRs), milestones, progress history, and technical pivots.
  Use whenever the user asks to recall decisions, check project progress, log milestones,
  or triggers the /flashback command.
---

# 🕰️ Flashback — Project Memory & Decision Ledger

`flashback` is the project's living memory system. It records all major architectural decisions, progress milestones, module statuses, key conventions, and pivots across the Safe Yatra project lifecycle.

---

## Memory Ledger Location

The single source of truth for project memory is located at:
- **Primary Memory File**: [`.agents/memory/flashback.md`](file:///d:/SIH%202026/.agents/memory/flashback.md)

---

## When to Trigger Flashback

Activate this skill when:
1. **User asks for history/status**: "What decisions did we make regarding X?", "What phase are we on?", "Show me project progress", "Run flashback", or `/flashback`.
2. **Milestone Completed**: When a major phase, module, or core feature is implemented, update the milestone tracker and changelog in the memory file.
3. **Architectural Decision Taken (ADR)**: When selecting libraries, designing schemas, choosing protocols, or refactoring components, record an ADR entry.
4. **Session Resumption**: At the start of a session or when onboarding context, consult `flashback.md` to quickly restore project context without re-reading the entire codebase.

---

## Operating Modes

### 1. View / Summarize Memory (`flashback status` / `flashback summary`)
- Read [`.agents/memory/flashback.md`](file:///d:/SIH%202026/.agents/memory/flashback.md).
- Provide a concise summary containing:
  - Current Phase & Active Module
  - Recent Decisions & Milestones
  - Current Blockers / In-Progress Tasks

### 2. Log an Architectural Decision (`flashback record-adr`)
When an architectural or design decision is made, append a new ADR in `flashback.md` under **Section 2: Architecture Decision Records (ADRs)** with format:

```markdown
### ADR-XXX: [Decision Title]
- **Date**: YYYY-MM-DD
- **Status**: [Proposed | Accepted | Superseded | Deprecated]
- **Context**: Why was this decision necessary? What problem does it solve?
- **Decision**: What was chosen and why?
- **Consequences**: Trade-offs, constraints, or downstream impacts.
```

### 3. Log a Progress Event / Milestone (`flashback log-progress`)
Append an entry in `flashback.md` under **Section 4: Chronological Changelog & Activity Log**:

```markdown
### [YYYY-MM-DD] — [Milestone / Change Summary]
- **Module**: `backend-spatial` | `ml-risk-engine` | `mobile-app` | `admin-dashboard` | `infra`
- **Details**: Brief explanation of what was achieved or changed.
- **Artifacts / Files Modified**: List of key files created or updated.
```

### 4. Update Phase Status (`flashback update-phase`)
Update the checkboxes and phase status table in **Section 3: Implementation Phase Tracker**.

---

## Maintenance Guidelines for Antigravity

- **Keep Entries Concise**: State the *why* and *what*, avoiding redundant code dumps.
- **Preserve Historical Integrity**: Never delete old ADRs. If a decision is changed, mark the old ADR as `Superseded by ADR-XXX` and add a new ADR.
- **Keep Timestamps Accurate**: Always record dates in `YYYY-MM-DD` format.
