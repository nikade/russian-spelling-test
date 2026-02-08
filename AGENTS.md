# Repository Guidelines

## Project Structure & Module Organization
- Application is a static web app (no bundler).
- Core files:
  - `index.html` — entry page and Material Web CDN import.
  - `app.js` — app bootstrap and event wiring.
  - `styles.css` — layout, responsive styles, feedback visuals.
- Business logic is split into modules:
  - `js/state.js` — quiz state, transitions, random selection helpers.
  - `js/quiz.js` — validation, answer checking, final stats.
  - `js/render.js` — task/result rendering.
- Data source: `data/tasks.json` (30 predefined tasks).
- Tests: `tests/quiz.test.js`, `tests/state.test.js`.

## Build, Test, and Development Commands
- `npm run dev` — starts local static server on `http://localhost:4173`.
- `npm test` — runs Node test suite (`node --test`).
- `node --check app.js` — quick syntax check for app entry.
- `node --check js/render.js` — quick syntax check for rendering module.

## Coding Style & Naming Conventions
- Use 2-space indentation across JS/CSS/JSON.
- Keep JS modules small and single-purpose (`state`, `quiz`, `render` separation).
- Naming:
  - functions/variables: `camelCase`
  - constants: `UPPER_SNAKE_CASE`
  - test files: `*.test.js`
- Keep UI text in Russian (project requirement).

## Testing Guidelines
- Framework: built-in Node test runner (`node:test` + `assert/strict`).
- Mandatory coverage for logic changes:
  - answer correctness (`Верно/Ошибка`)
  - no repeated answer in one task
  - next-step gating (cannot continue without answer)
  - final result counters and percent
- Add at least one regression test for every fixed logic bug.

## Data Content Rules
- Every task in `data/tasks.json` must include:
  - `id`, `wordMask`, `correctWord`, `correctLetter`, `options`, `ruleType`, `hint`
- `wordMask` must contain exactly one `..`.
- `options` length must be 2-4 and include `correctLetter`.
- Allowed `ruleType` values are validated in `js/quiz.js`.

## Commit & Pull Request Guidelines
- Follow Conventional Commits:
  - `feat: ...`, `fix: ...`, `docs: ...`, `test: ...`, `style: ...`
- PR checklist:
  - what changed and why
  - screenshots for UI updates
  - confirmation that `npm test` passes
  - note any content updates in `data/tasks.json`
