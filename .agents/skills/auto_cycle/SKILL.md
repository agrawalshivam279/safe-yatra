---
name: auto_cycle
description: >-
  Master Autonomous Feature Lifecycle Orchestrator. Coordinates the full end-to-end development cycle
  by sequentially executing plan_step, code synthesis, verify_step, and ship_step with explicit
  context-window budget monitoring (40-50% headroom buffer), subagent delegation, timeout circuit-breakers, and fail-safe checkpoints.
  Use whenever executing a complete atomic feature from start to finish, or calling /auto_cycle.
---

# ♾️ Auto Cycle — Master Autonomous Feature Lifecycle Orchestrator

`auto_cycle` is the overarching development orchestrator for the Safe Yatra project. It connects **[`plan_step`](file:///d:/SIH%202026/.agents/skills/plan_step/SKILL.md)**, **Code Implementation**, **[`verify_step`](file:///d:/SIH%202026/.agents/skills/verify_step/SKILL.md)**, and **[`ship_step`](file:///d:/SIH%202026/.agents/skills/ship_step/SKILL.md)** into a continuous, guarded development loop.

---

## 🔄 The 4-Phase Lifecycle Architecture

```mermaid
flowchart TD
    subgraph Phase1["Phase 1: Plan & Branch"]
        A["Trigger /auto_cycle"] --> B["Run /plan_step"]
        B --> C["Verify Git Clean ➔ Branch ➔ DB Safety Checklist ➔ Author Spec"]
    end

    subgraph Phase2["Phase 2: Code Synthesis"]
        C --> D{"High Complexity?"}
        D -- "Yes" --> E["🧠 Apply Sequential Thinking MCP Strategy"]
        D -- "No" --> F["Direct Implementation"]
        E --> G["Write Service / UI / Schema (<= 320 LOC)"]
        F --> G
    end

    subgraph Phase3["Phase 3: Verify & Polish"]
        G --> H["Run /verify_step"]
        H --> I["Stage 0: Typecheck ➔ Stage 0.5: API Contract Check ➔ Stage 1A: test_writer ➔ Stage 1B: test_runner"]
        I --> J{"🧪 Tests Pass & Contracts Valid?"}
        J -- "❌ No" --> K["🛑 HALT: Output Trace & Auto-Fix Prompt"]
        J -- "✅ Yes" --> L["🕵️ Stage 2: code_reviewer (Static Architecture, Security & DB Safety)"]
    end

    subgraph Phase4["Phase 4: Ship & Transition"]
        L --> M["Run /ship_step"]
        M --> N["🕰️ flashback ➔ 🚀 update-github (Squash Merge PR)"]
        N --> O["🎯 Pre-fetch Next Atomic Step from Queue"]
    end

    Phase1 --> Phase2 --> Phase3 --> Phase4
```

---

## 🔒 The 5 Invariant Guardrails & Circuit Breakers

To guarantee long-term stability and eliminate runaway errors on large codebases, `auto_cycle` enforces five non-negotiable gates:

| Gate | Trigger Condition | Automated Action |
| :--- | :--- | :--- |
| **1. Clean Tree Gate** | Modified or untracked files detected before starting. | **Halts immediately**. Prompts user to commit or stash. |
| **2. Context Window Gate** | Turn token consumption exceeds $\sim 75,000$ tokens. | Completes current atomic step, ships PR, and **pauses to start a fresh turn**, preserving 40–50% headroom. |
| **3. Test & Contract Failure Gate** | Any schema drift or pytest / Jest assertion fails during verification. | **Hard stop**. Does NOT review or ship. Outputs failure analysis and single-turn fix prompt. |
| **4. Subagent Boundary Rule** | Subagents are used for parallel testing and code review. | **Subagents never touch Git directly**. All Git commits, pushes, and PR merges are strictly synchronous on the primary agent. |
| **5. Stage Timeout Circuit Breaker** | Any stage exceeds its time threshold (30s typecheck, 15s contract check, 120s test authoring, 60s test run, 90s review). | **Interrupts hung process**, logs timeout diagnostic, and asks user to resume or inspect. |

---

## 📋 Execution Protocol

### Step 1: Planning & Branch Provisioning (`plan_step`)
1. Executes [`plan_step`](file:///d:/SIH%202026/.agents/skills/plan_step/SKILL.md).
2. Identifies the next incomplete Goldilocks step from [`implementation_plan.md`](file:///d:/SIH%202026/implementation_plan.md).
3. Verifies `git status -s`, switches to `main`, pulls latest, and branches off: `feat/<feature-slug>`.
4. Evaluates DB Migration Safety and authors the technical specification file in `docs/specs/` or `<module>/docs/`.

---

### Step 2: Implementation & Code Synthesis
1. Implements data models, services, routes, or UI components matching the specification.
2. If Sequential Thinking MCP was recommended in the spec, executes multi-stage hypothesis validation before writing complex spatial or ML math.
3. Adheres strictly to the $\le 320$ LOC limit to avoid bloated commits.

---

### Step 3: Dual Verification & Polish (`verify_step`)
1. Executes [`verify_step`](file:///d:/SIH%202026/.agents/skills/verify_step/SKILL.md).
2. Stage 0 runs `tsc --noEmit` and `ruff check .`.
3. Stage 0.5 executes `api_contract_validator` (if REST routes/schemas touched).
4. Stage 1A spawns `test_writer` to author spec-driven unit/integration tests.
5. Stage 1B spawns `test_runner` to execute the targeted test command.
6. If tests pass, runs `code_reviewer` (Stage 2) for static architectural, security, DB migration safety, and performance alignment.
7. If issues arise, prompts the user and applies fixes before proceeding.

---

### Step 4: Release, Sync & Loop (`ship_step`)
1. Executes [`ship_step`](file:///d:/SIH%202026/.agents/skills/ship_step/SKILL.md).
2. Logs milestone in [`.agents/memory/flashback.md`](file:///d:/SIH%202026/.agents/memory/flashback.md) and marks task `[x]` in [`implementation_plan.md`](file:///d:/SIH%202026/implementation_plan.md).
3. Creates a conventional commit ($<100$ chars), pushes to GitHub, creates PR, checks CI status, and executes **Squash Merge** into `main`.
4. Cleans up local branch, retains remote branch on GitHub, and queues up the next atomic step.

---

## 📤 Standard Cycle Summary Output

```markdown
# ♾️ /auto_cycle Complete — [Step ID: Feature Title]

### 📊 Lifecycle Execution Summary
- **1. Planning & Spec**: `✓` Created branch `feat/[slug]` and spec `[docs/...md]`.
- **2. Implementation**: `✓` Generated [N] files ([X] LOC total).
- **3. Dynamic Verification**: `✓` [K] tests passed (0 failures, contracts verified).
- **4. Static Review**: `✓` Architecture verified against Safe Yatra invariants.
- **5. Shipping & Memory**: `✓` PR #<N> squash-merged to `main`, `flashback.md` updated.

---

### 🌿 Git & Repository State
- **Current Branch**: `main` (Up to date)
- **Remote Branch**: `origin/feat/[slug]` (Preserved on GitHub)

---

### 🎯 Next Atomic Step in Queue
> **[Next Step ID] — [Next Step Title]** (`[Module Name]`)  
> *Objective: [1-sentence description]*

---

### ⚡ Continue Auto Cycle?
Would you like me to start the next `/auto_cycle` for **[Next Step ID: Next Step Title]**?
```

---

## 🚀 Triggers

- `/auto_cycle`
- `/auto_cycle [step-number] [feature-name]`
- `"Run full autonomous cycle for next feature"`
- `"Execute next step end-to-end"`
