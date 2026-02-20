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
- Subject data (per subject directory):
  - `data/subjects/index.json` — list of subjects for the setup screen.
  - `data/subjects/<dir>/index.json` — dictionaries inside the selected subject.
  - `data/subjects/<dir>/dictionaries/*.json` — dictionary content.
- Tests:
  - `tests/quiz.test.js`
  - `tests/state.test.js`
- Reports:
  - `report01.md`, `report02.md`, `report03.md`, `report04.md`

## Build, Test, and Development Commands
- `npm run dev` — local server at `http://localhost:4173` (python http.server).
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
  - parser for `[варианты|правильная]`
  - task validation across all `type`
  - multi-step selection for orthograms/build-word tasks
  - final validation and stats
  - error highlighting data (`wrongIndexes`)
  - unlearned-first task selection

## Dictionary Data Rules
- Supported `type` values:
  - `insertMissingLetters` — токены `[варианты|правильная]`, минимум 1 токен, варианты (2-4) содержат правильную букву.
  - `chooseWordVariant` — массив `variants` (2-4 слов), `correctIndex` или `correctWord` идентифицирует ответ.
  - `buildForeignWord` — `targetWord`, `letters[]` (массив букв, задаётся вручную, допускаются дубли, каждая буква используется не больше одного раза), опционально `sourceWord`/`prompt`.
  - `pairMatch` — `pairs: [[left,right], ...]` с готовыми строками; значения внутри каждой стороны уникальны, перемешивание выполняется на клиенте.
  - `audioToWord` — `audioSrc`, `mode: "chooseVariant" | "buildWord"`; в первом случае нужны `variants`, во втором `letters[]` как у `buildForeignWord`.
- Общие поля: `type`, `hint`, опциональный `prompt`, вспомогательные данные (`word`, `variants`, `pairs`, `letters`).
- `hint` формат: `**жирный**`, `__подчеркнутый__`, ударение символом `` ` `` после гласной, `\n` > `<br>`.
- `id` не используется.
- Левые буквы/доп. варианты задаются только явно в JSON (нет `allowExtraLetters`).
- Структура каталогов: задания хранятся в `data/subjects/<subject>/dictionaries/*.json`, UI сначала выбирает предмет, затем словарь.

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
- Не добавлять локальные скриншоты (например, `screen*.png`), если явно не просили.
