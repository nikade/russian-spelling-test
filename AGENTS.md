# Repository Guidelines

## Project Structure & Module Organization
- Static web app without bundler.
- Core files:
  - `index.html` — entry and Material Web components (optimized bundle).
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

## Material Web Components

### Currently Used Components
The project uses only these Material Web components for optimal bundle size:

| Component | Import Path | Usage Locations |
|-----------|-------------|-----------------|
| `md-filled-button` | `@material/web/button/filled-button.js` | Primary action buttons (Start, Next, Restart) |
| `md-outlined-button` | `@material/web/button/outlined-button.js` | Secondary buttons (Clear, Change Dictionary, option buttons) |

### Adding New Components

When adding a new Material Web component:

1. **Find the component name** you need from https://github.com/material-components/material-web/tree/main/packages

2. **Add the import** to `index.html` in the `<script type="module">` block:

   ```html
   <script type="module">
     import '@material/web/button/filled-button.js';
     import '@material/web/button/outlined-button.js';
     import '@material/web/checkbox/checkbox.js';  // New component
   </script>
   ```

3. **Common component imports** (for reference):
   ```html
   <!-- Buttons -->
   import '@material/web/button/filled-button.js';
   import '@material/web/button/outlined-button.js';
   import '@material/web/button/text-button.js';

   <!-- Selection -->
   import '@material/web/checkbox/checkbox.js';
   import '@material/web/radio/radio.js';
   import '@material/web/switch/switch.js';
   import '@material/web/select/filled-select.js';
   import '@material/web/select/outlined-select.js';

   <!-- Inputs -->
   import '@material/web/textfield/filled-text-field.js';
   import '@material/web/textfield/outlined-text-field.js';

   <!-- Other -->
   import '@material/web/icon/icon.js';
   import '@material/web/progress/circular-progress.js';
   import '@material/web/progress/linear-progress.js';
   import '@material/web/dialog/dialog.js';
   import '@material/web/list/list-item.js';
   import '@material/web/tabs/tabs.js';
   ```

4. **Use the component** in your HTML/JS:
   ```html
   <md-filled-button>Click me</md-filled-button>
   <md-checkbox>Check me</md-checkbox>
   ```

5. **Verify** that only needed components load in DevTools → Network tab.

### Why Individual Imports?

The project uses individual component imports instead of `@material/web/all.js` to:
- Reduce bundle size by ~96% (only 2 components vs 50+)
- Improve page load performance
- Minimize bandwidth usage for users
- Make component dependencies explicit

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
  - `chooseWordVariant` — массив `variants` (2-6 слов), `correctIndex` идентифицирует ответ, опционально `question`; варианты перемешиваются при показе.
  - `buildForeignWord` — `targetWord`, `letters[]` (массив букв, задаётся вручную, допускаются дубли, каждая буква используется не больше одного раза), опционально `sourceWord`/`prompt`.
  - `pairMatch` — `pairs: [[left,right], ...]` с готовыми строками; значения внутри каждой стороны уникальны, перемешивание выполняется на клиенте.
  - `audioToWord` — `audioSrc`, `mode: "chooseVariant" | "buildWord"`; в первом случае нужны `variants` (перемешиваются), во втором `letters[]` как у `buildForeignWord`.
- Общие поля: `type`, `hint`, опциональный `prompt` (если отсутствует или пустой — не отображается и не занимает место), вспомогательные данные (`word`, `variants`, `pairs`, `letters`).
- `hint` формат:
  - `**жирный**` — жирный шрифт
  - `!!красный!!` — красный цвет текста
  - `__подчеркнутый__` — подчёркнуто красной линией
  - `!!__комбо__!!` или `__!!комбо!!__` — красный + подчёркнутый
  - Ударение: символ `` ` `` после гласной
  - `\n` > `<br>`
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

## Visual Testing Guidelines
Для тестирования UI и проверки визуальных изменений используйте MCP chrome-devtools:

1. **Запуск dev сервера:**
   ```bash
   npm run dev
   ```
   Сервер запускается на `http://localhost:4173`

2. **Открытие страницы в браузере:**
   ```
   mcp__chrome-devtools__new_page
   url: http://localhost:4173
   ```

3. **Получение snapshot (снимка состояния DOM):**
   ```
   mcp__chrome-devtools__take_snapshot
   ```
   Возвращает древовидную структуру страницы с UID элементов для взаимодействия.

4. **Взаимодействие с элементами:**
   - Клик: `mcp__chrome-devtools__click` с параметром `uid`
   - Заполнение формы: `mcp__chrome-devtools__fill` с параметрами `uid` и `value`
   - Навигация: `mcp__chrome-devtools__navigate_page` с параметром `type` (url/reload)

5. **Скриншоты для визуальной проверки:**
   ```
   mcp__chrome-devtools__take_screenshot
   ```
   Делает скриншот текущего viewport для проверки рендеринга.

6. **Выполнение JavaScript для отладки:**
   ```
   mcp__chrome-devtools__evaluate_script
   function: () => { /* JS код */ }
   ```
   Позволяет проверить стили, классы и состояние элементов.

**Порядок тестирования визуальных изменений:**
1. Открыть страницу через `new_page`
2. Пройти пользовательский сценарий (клики, заполнение форм)
3. Сделать snapshot чтобы проверить DOM-структуру
4. Сделать скриншот для визуальной проверки
5. При необходимости использовать `evaluate_script` для проверки CSS/JS

## Commit & Pull Request Guidelines
- Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `style:`.
- PR checklist:
  - behavior summary
  - screenshots for UI updates
  - `npm test` passes
  - dictionary/data format changes described
- Не добавлять локальные скриншоты (например, `screen*.png`), если явно не просили.
