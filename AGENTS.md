# Repository Guidelines

## Project Structure & Module Organization
- Static web app without bundler.
- Core files:
  - `index.html` Ч entry and Material Web CDN.
  - `app.js` Ч bootstrap, setup flow, localStorage integration.
  - `styles.css` Ч responsive UI styles.
- Logic modules:
  - `js/state.js` Ч quiz state and transitions.
  - `js/quiz.js` Ч task parsing/validation, answer flow, stats.
  - `js/render.js` Ч setup/task/result rendering.
- Subject data (per subject directory):
  - `data/subjects/index.json` Ч list of subjects for the setup screen.
  - `data/subjects/<dir>/index.json` Ч dictionaries inside the selected subject.
  - `data/subjects/<dir>/dictionaries/*.json` Ч dictionary content.
- Tests:
  - `tests/quiz.test.js`
  - `tests/state.test.js`
- Reports:
  - `report01.md`, `report02.md`, `report03.md`, `report04.md`

## Build, Test, and Development Commands
- `npm run dev` Ч local server at `http://localhost:4173` (python http.server).
- `npm test` Ч run Node tests.
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
  - parser for `[варианты|правильна€]`
  - task validation across all `type`
  - multi-step selection for orthograms/build-word tasks
  - final validation and stats
  - error highlighting data (`wrongIndexes`)
  - unlearned-first task selection

## Dictionary Data Rules
- Supported `type` values:
  - `insertMissingLetters` Ч токены `[варианты|правильна€]`, минимум 1 токен, варианты (2-4) содержат правильную букву.
  - `chooseWordVariant` Ч массив `variants` (2-4 слов), `correctIndex` или `correctWord` идентифицирует ответ.
  - `buildForeignWord` Ч `targetWord`, `letters[]` (массив букв, задаЄтс€ вручную, допускаютс€ дубли, кажда€ буква используетс€ не больше одного раза), опционально `sourceWord`/`prompt`.
  - `pairMatch` Ч `pairs: [[left,right], ...]` с готовыми строками; значени€ внутри каждой стороны уникальны, перемешивание выполн€етс€ на клиенте.
  - `audioToWord` Ч `audioSrc`, `mode: "chooseVariant" | "buildWord"`; в первом случае нужны `variants`, во втором `letters[]` как у `buildForeignWord`.
- ќбщие пол€: `type`, `hint`, опциональный `prompt`, вспомогательные данные (`word`, `variants`, `pairs`, `letters`).
- `hint` формат: `**жирный**`, `__подчеркнутый__`, ударение символом `` ` `` после гласной, `\n` > `<br>`.
- `id` не используетс€.
- Ћевые буквы/доп. варианты задаютс€ только €вно в JSON (нет `allowExtraLetters`).
- —труктура каталогов: задани€ хран€тс€ в `data/subjects/<subject>/dictionaries/*.json`, UI сначала выбирает предмет, затем словарь.

## Local Storage Contract
- `spellingQuiz.settings`:
  - `selectedSubjectDir`
  - `selectedDictionaryFile`
  - `selectedCount` (`10`, `25`, `50`, `100`, `all`)
- `spellingQuiz.learnedWords`:
  - массив ключей `<type>:<correctWord>`

## Commit & Pull Request Guidelines
- Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `style:`.
- PR checklist:
  - behavior summary
  - screenshots for UI updates
  - `npm test` passes
  - dictionary/data format changes described
- Ќе добавл€ть локальные скриншоты (например, `screen*.png`), если €вно не просили.
