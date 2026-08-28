# 📄 Technical Specification: Monorepo Code Quality & Workspace Tooling

> **Step ID**: `0.3`  
> **Target Module**: `infra` / `workspace`  
> **Git Feature Branch**: `feat/step-0-3-code-quality-tooling`  
> **Status**: 📋 Draft / Ready for Implementation  
> **Created**: 2026-08-28  

---

## 1. Executive Summary

Step 0.3 establishes the foundational monorepo developer tooling and code formatting conventions for the Safe Yatra project. Standardizing code styling rules across JavaScript/TypeScript (`backend-spatial`, `mobile-app`, `admin-dashboard`) and Python (`ml-risk-engine`), setting up editor normalization (`.editorconfig`), and providing standard development workflow shortcuts via a root `Makefile` ensures seamless collaboration, eliminates formatting churn in pull requests, and streamlines service orchestration (`up`, `down`, `logs`, `db-reset`, `test-all`).

---

## 2. Dependencies & Prerequisites

- **Depends on**: 
  - Monorepo directory structure established in Phase 0.2 (`admin-dashboard/`, `backend-spatial/`, `ml-risk-engine/`, `mobile-app/`).
  - Docker Compose configuration (`docker-compose.yml`) for database and caching services.
- **Blocked by**: None.
- **New Packages / Tools**:
  - Prettier (root dev dependency or standalone config).
  - Standard GNU Make / EditorConfig compliant editors.

---

## 3. 🧠 Sequential Thinking Strategy
> *Algorithmic & Complexity Evaluation*

- **Complexity Tier**: Standard Tooling Configuration (No multi-variable dynamic mathematical models or PostGIS spatial queries).
- **Sequential Thinking MCP**: `Skipped` (Task consists of standardized configuration files, line-ending normalization, and make target recipes).

---

## 4. Configuration Specifications & Contracts

### 4.1 Root `.editorconfig`
Establishes cross-IDE formatting rules:
- Charset: `utf-8`
- End of line: `lf`
- Insert final newline: `true`
- Trim trailing whitespace: `true`
- Indent style: `space` (2 spaces for JS/TS/JSON/YAML/Markdown, 4 spaces for Python).

```ini
# EditorConfig is awesome: https://EditorConfig.org

root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.py]
indent_size = 4

[*.md]
trim_trailing_whitespace = false

[Makefile]
indent_style = tab
```

### 4.2 Prettier Configuration (`prettier.config.js` and `.prettierignore`)
Defines shared formatting invariants across all TypeScript/JavaScript modules:
- Single quotes: `true`
- Trailing commas: `all`
- Print width: `100`
- Tab width: `2`
- Semi: `true`

```javascript
/** @type {import("prettier").Config} */
module.exports = {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  printWidth: 100,
  arrowParens: 'avoid',
  bracketSpacing: true,
  endOfLine: 'lf',
};
```

### 4.3 Root `Makefile`
Provides single-command shortcuts for all core developer tasks across the 4 modules:

| Target | Command / Description |
| :--- | :--- |
| `up` | Starts Docker infrastructure (`docker-compose up -d postgres redis`) |
| `down` | Stops all containers (`docker-compose down`) |
| `logs` | Tails database and redis logs (`docker-compose logs -f`) |
| `db-reset` | Resets Prisma migrations and seeds spatial demo data (`cd backend-spatial && npx prisma migrate reset --force`) |
| `test-all` | Runs test suites across all 4 modules (`ml-risk-engine`, `backend-spatial`, `mobile-app`, `admin-dashboard`) |
| `lint` | Runs TypeScript/ESLint and Python Ruff linters |
| `format-check` | Verifies codebase formatting compliance |

---

## 5. Step-by-Step Implementation Sequence

1. **Phase A: Editor & Formatting Invariants**
   - [ ] Author root `.editorconfig` with Python (4 spaces) and TypeScript (2 spaces) rules.
   - [ ] Author root `prettier.config.js` and `.prettierignore` (ignoring `.next/`, `node_modules/`, `dist/`, `venv/`, etc.).

2. **Phase B: Monorepo Orchestration (Makefile)**
   - [ ] Author root `Makefile` with targets: `up`, `down`, `logs`, `db-reset`, `test-all`, `lint`, `format-check`, and `help`.
   - [ ] Ensure Makefile uses literal tab characters for command recipes.

3. **Phase C: Verification & Cross-Platform Checks**
   - [ ] Validate Makefile syntax and recipe targets.
   - [ ] Validate Prettier and EditorConfig rule parsing.

---

## 6. Edge Cases & Failure Recovery

- **Windows Line Endings (CRLF vs LF)**: Git on Windows may check out files with CRLF. Both `.editorconfig` and `prettier.config.js` explicitly enforce `end_of_line = lf` to prevent git diff pollution.
- **Tab requirement in Makefile**: Make recipes strictly require TAB characters rather than spaces. Verification must validate tab indentation.

---

## 7. Verification & Acceptance Criteria

### Automated Verification Commands
```bash
# Verify Makefile targets and help menu
make help

# Verify Prettier configuration syntax
node -e "console.log(require('./prettier.config.js'))"
```

### Acceptance Checklist
- [ ] `.editorconfig` created at repository root with language-specific indent rules.
- [ ] `prettier.config.js` and `.prettierignore` present and syntactically valid.
- [ ] `Makefile` present with all specified targets (`up`, `down`, `logs`, `db-reset`, `test-all`, `lint`, `help`).
- [ ] No git conflicts or uncommitted artifacts outside the target files.
