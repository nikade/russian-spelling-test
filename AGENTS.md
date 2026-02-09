# Repository Guidelines

## Project Structure & Module Organization
- Static web app without bundler.
- Core files:
  - `index.html` — entry and Material Web CDN.
  - `app.js` — bootstrap, setup flow, localStorage integration.
  - `styles.css` — responsive UI styles.
- Logic modules:
  - `js/state.js` — quiz state and transitions.
  - `js/quiz.js` — task parsing/validation, answer flow, stats.
  - `js/render.js` — setup/task/result rendering.
- Dictionary data:
  - `data/dictionaries/index.json` — list of dictionary files.
  - `data/dictionaries/*.json` — dictionary content.
- Tests:
  - `tests/quiz.test.js`
  - `tests/state.test.js`
- Reports:
  - `report01.md`, `report02.md`, `report03.md`

## Build, Test, and Development Commands
- `npm run dev` — local server at `http://localhost:4173`.
- `npm test` — run Node tests.
- `node --check app.js`
- `node --check js/quiz.js`
- `node --check js/render.js`

## Coding Style & Naming Conventions
- 2-space indentation for JS/CSS/JSON.
- Keep modules focused by responsibility.
- Naming:
  - functions/variables: `camelCase`
  - constants: `UPPER_SNAKE_CASE`
  - tests: `*.test.js`
- UI text remains Russian unless requirements change.

## Testing Guidelines
- Use `node:test` + `assert/strict`.
- Cover:
  - word pattern parser (`[варианты|правильная]`)
  - step-by-step letter selection for multiple orthograms
  - final combined validation after last step
  - error highlighting for wrong positions in rendered word
  - result counters and percent
  - unlearned-first task selection

## Dictionary Data Rules
- Task format:
  - `word: string`
  - `hint: string`
- Token syntax in `word`: `[варианты|правильная]`
- Rules:
  - at least one token per word
  - variants count 2-4
  - correct letter is one char and must be in variants
- `id` is not used.
- UI behavior:
  - no `Буква N из M` label
  - active orthogram is highlighted directly in the word
  - final check happens only after all orthograms are selected

## Local Storage Contract
- `spellingQuiz.settings`:
  - `selectedDictionaryFile`
  - `selectedCount` (`10`, `25`, `50`, `100`, `all`)
- `spellingQuiz.learnedWords`:
  - array of learned full words (resolved correct spelling)

## Commit & Pull Request Guidelines
- Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `style:`.
- PR checklist:
  - behavior summary
  - screenshots for UI updates
  - `npm test` passes
  - dictionary/data format changes described
