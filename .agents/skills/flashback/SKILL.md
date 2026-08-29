---
name: flashback
version: '2.0'
description: >-
  Access, inspect, update, or summarize the project's persistent memory ledger,
  architectural decisions (ADRs), milestones, progress history, and technical pivots.
  Includes self-healing section resilience, roadmap synchronization with root implementation_plan.md,
  and aggregate stats reporting mode. Use whenever the user asks to recall decisions, check project progress,
  log milestones, or triggers the /flashback command.
---

# 🕰️ Flashback — Project Memory & Decision Ledger

`flashback` is the project's living memory system. It records all major architectural decisions, progress milestones, module statuses, key conventions, and pivots across the Safe Yatra project lifecycle.

---

## Memory Ledger & Roadmap Locations

The single source of truth for project memory and execution tracking is located at:

- **Canonical Living Memory Ledger**: [`.agents/memory/flashback.md`](file:///d:/SIH%202026/.agents/memory/flashback.md)
- **Root Pointer File**: [`flashback.md`](file:///d:/SIH%202026/flashback.md)
- **Master Implementation Roadmap**: [`implementation_plan.md`](file:///d:/SIH%202026/implementation_plan.md) _(at monorepo root)_

---

## When to Trigger Flashback

Activate this skill when:

1. **User asks for history/status**: "What decisions did we make regarding X?", "What phase are we on?", "Show me project progress", "Run flashback", or `/flashback`.
2. **Milestone Completed**: When a major phase, module, or core feature is implemented, update the milestone tracker and changelog in `flashback.md` and mark checkboxes `[x]` in root `implementation_plan.md`.
3. **Architectural Decision Taken (ADR)**: When selecting libraries, designing schemas, choosing protocols, or refactoring components, record an ADR entry in `flashback.md`.
4. **Session Resumption**: At the start of a session or when onboarding context, consult `flashback.md` to quickly restore project context without re-reading the entire codebase.

---

## Operating Modes

### 1. View / Summarize Memory (`flashback status` / `flashback summary`)

- Read [`.agents/memory/flashback.md`](file:///d:/SIH%202026/.agents/memory/flashback.md).
- Provide a concise summary containing:
  - Current Phase & Active Module
  - Recent Decisions & Milestones
  - Current Blockers / In-Progress Tasks

### 2. Aggregate Statistics (`flashback stats`)

Output a quick numerical snapshot of project progress:

```markdown
### 📊 Safe Yatra Progress Snapshot

- **Phase Progress**: Phase 4 / 7 (Backend Spatial Core in progress)
- **Steps Complete**: 26+ atomic steps completed
- **Tests Total**: 315 tests passing across 32 suites (234 backend-spatial + 81 ml-risk-engine)
- **ADRs Recorded**: 8 Architectural Decision Records
- **Modules**: `ml-risk-engine` ✅ | `backend-spatial` ✅ | `mobile-app` 🚧 | `admin-dashboard` 🚧
```

### 3. Log an Architectural Decision (`flashback record-adr`)

When an architectural or design decision is made, append a new ADR in `.agents/memory/flashback.md` under **Section 2: Architecture Decision Records (ADRs)** with format:

```markdown
### ADR-XXX: [Decision Title]

- **Date**: YYYY-MM-DD
- **Status**: [Proposed | Accepted | Superseded | Deprecated]
- **Context**: Why was this decision necessary? What problem does it solve?
- **Decision**: What was chosen and why?
- **Consequences**: Trade-offs, constraints, or downstream impacts.
```

### 4. Log a Progress Event & Sync Roadmap (`flashback log-progress`)

1. Append an entry in `.agents/memory/flashback.md` under **Section 4: Chronological Activity Log**:

```markdown
### [YYYY-MM-DD] — [Milestone / Change Summary]

- **Module**: `backend-spatial` | `ml-risk-engine` | `mobile-app` | `admin-dashboard` | `infra`
- **Details**: Brief explanation of what was achieved or changed.
- **Key Files Created / Updated**: List of key files created or updated with clickable links.
```

2. Mark the corresponding task checkbox `[x]` in the root [`implementation_plan.md`](file:///d:/SIH%202026/implementation_plan.md).

### 5. Update Phase Status (`flashback update-phase`)

Update the checkboxes and phase status table in **Section 3: Implementation Phase Tracker** of `.agents/memory/flashback.md`.

---

## 🛡️ Self-Healing Section Resilience

If `.agents/memory/flashback.md` is inspected and any standard section header is missing (e.g. from manual edits or merge operations), `flashback` must self-heal the structure by inserting the canonical four sections:

1. `## 1. Executive Status Snapshot`
2. `## 2. Architecture Decision Records (ADRs)`
3. `## 3. Implementation Phase Tracker`
4. `## 4. Chronological Activity & Change Log`

Never throw errors or halt due to missing headers; restore the structure transparently.

---

## Maintenance Guidelines for Antigravity

- **Keep Entries Concise**: State the _why_ and _what_, avoiding redundant code dumps.
- **Preserve Historical Integrity**: Never delete old ADRs. If a decision is changed, mark the old ADR as `Superseded by ADR-XXX` and add a new ADR.
- **Keep Timestamps Accurate**: Always record dates in `YYYY-MM-DD` format.
