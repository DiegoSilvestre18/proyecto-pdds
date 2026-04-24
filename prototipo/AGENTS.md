# AGENTS.md

Operational guide for coding agents in this repository.

## Project Scope
- Code root: `prototipo/`
- Stack: React 19 + Vite 8 + JavaScript (ESM) + CSS
- Package manager: npm (`package-lock.json` present)
- Source root: `src/`
- Entry point: `src/main.jsx`
- Main shell: `src/App.jsx`
- Lint config: `eslint.config.js` (flat config)
- TypeScript: not configured
- Tests: not configured

## Rules Discovery
- Cursor folder rules `.cursor/rules/`: not found
- Cursor root file `.cursorrules`: not found
- Copilot rules `.github/copilot-instructions.md`: not found
- This file is the active instruction set for agents

## Setup
Run all commands from `prototipo/`.

```bash
npm install
```

## Build, Lint, and Validation Commands
Core scripts from `package.json`:

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run preview
```

```bash
npm run lint
```

Useful lint variants:

```bash
npm run lint -- --fix
```

```bash
npm run lint -- src/App.jsx
```

```bash
npm run lint -- src/components
```

## Running A Single Test (Important)
- There is no `test` script in `package.json`
- No test runner is installed (Vitest/Jest not set up)
- Running a single test is currently unavailable

Use this validation flow until tests exist:
1. `npm run lint`
2. `npm run build`
3. Manual QA with `npm run dev`

If Vitest is added later, common patterns will be:

```bash
npm run test
```

```bash
npm run test -- src/components/Widget.test.jsx
```

```bash
npm run test -- -t "renders title"
```

```bash
npm run test -- --watch
```

## Style Source Of Truth
- First: surrounding code in `src/`
- Second: `eslint.config.js`
- Prefer local consistency over introducing new patterns

## Imports
- Use ESM imports/exports only
- Use relative imports inside `src/` (no aliases configured)
- Keep import groups in this order:
  1) external packages
  2) local styles
  3) local modules/assets
- Remove unused imports immediately

## Formatting
- 2-space indentation
- Single quotes
- Omit semicolons
- Keep trailing commas where multiline style already uses them
- Wrap long JSX for readability
- Keep spacing and line breaks consistent with nearby code

## React And Component Conventions
- Use function components (no class components)
- Use hooks for state and effects
- Keep hook calls at component top level
- Include cleanup in `useEffect` for listeners/timers/subscriptions
- Keep components focused; extract repeated UI/logic when needed
- Prefer explicit state names (`isOpen`, `activeTab`, `selectedId`)

## Types And Data Contracts
- JavaScript-only project; do not add TypeScript by default
- Validate external/computed data at boundaries
- Guard against `null` and `undefined` before deep property access
- Use explicit fallback values for optional data
- Add JSDoc only when a contract is non-obvious

## Naming Conventions
- Component files: `PascalCase.jsx`
- Components: `PascalCase`
- Variables/functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE` only for real constants
- Booleans: `is*`, `has*`, `can*`, `should*`
- CSS classes: lowercase, hyphenated, align with existing `ct-` pattern

## Error Handling
- Do not swallow errors silently
- Catch errors where recovery or feedback is possible
- Handle async rejections explicitly
- Provide actionable UI fallback text for user-visible failures
- Keep messages specific enough to debug without exposing sensitive data

## ESLint Details
- Lint scope: `**/*.{js,jsx}`
- `dist/` is ignored
- `no-unused-vars` is error
- `varsIgnorePattern: ^[A-Z_]` is enabled
- `eslint-plugin-react-hooks` rules are enabled
- `eslint-plugin-react-refresh` Vite rules are enabled

## CSS Conventions
- Reuse tokens from `src/index.css` before adding new variables
- Preserve existing responsive breakpoints and layout behavior
- Prefer component-scoped selectors over broad global overrides
- Keep modifier naming aligned with existing class patterns

## Agent Change Discipline
- Make minimal, task-focused changes
- Avoid unrelated refactors
- Preserve behavior unless task explicitly changes behavior
- Keep accessibility attributes on interactive elements
- Update this file when scripts/tooling/conventions change

## Pre-Handoff Checklist
- Run `npm run lint`
- Run `npm run build`
- Manually verify impacted UI in `npm run dev`
- Confirm no unused imports/variables remain
- Confirm edited files follow conventions above
