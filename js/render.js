export function renderTask(container, payload) {
  const {
    task,
    parsed,
    index,
    total,
    outcome,
    nextEnabled,
    currentSelections,
    currentStepIndex,
  } = payload;

  container.innerHTML = `
    <div class="row">
      <h1 class="title">Тест на правильность написания</h1>
      <span class="progress">Задание ${index + 1} из ${total}</span>
    </div>
    <p class="word">${renderWord(parsed, currentSelections, outcome, currentStepIndex)}</p>
    <div class="options ${outcome ? "options-hidden" : ""}" id="options"></div>
    <section class="feedback" id="feedback">
      ${renderFeedback(outcome)}
    </section>
    <div class="actions">
      <md-filled-button id="nextBtn" ${nextEnabled ? "" : "disabled"}>Дальше</md-filled-button>
    </div>
  `;
}

export function renderSetup(container, payload) {
  const { dictionaries, selectedDictionaryFile, selectedCount, countOptions } = payload;
  const dictionaryCards = dictionaries
    .map((item) => {
      const active = item.file === selectedDictionaryFile ? "setup-item-active" : "";
      const subtitle = item.description
        ? `<p class="setup-subtitle">${escapeHtml(item.description)}</p>`
        : "";
      return `
        <button class="setup-item ${active}" data-dictionary-file="${escapeHtml(item.file)}">
          <span class="setup-item-title">${escapeHtml(item.title)}</span>
          <span class="setup-item-meta">${item.taskCount} слов</span>
          ${subtitle}
        </button>
      `;
    })
    .join("");

  const countButtons = countOptions
    .map((option) => {
      const active = option.value === selectedCount ? "setup-chip-active" : "";
      return `
        <button class="setup-chip ${active}" data-quiz-count="${option.value}">
          ${escapeHtml(option.label)}
        </button>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="row">
      <h1 class="title">Тест на правильность написания</h1>
    </div>
    <section class="setup-block">
      <h2 class="setup-title">Выберите словарь</h2>
      <div class="setup-list">${dictionaryCards}</div>
    </section>
    <section class="setup-block">
      <h2 class="setup-title">Количество заданий</h2>
      <div class="setup-chips">${countButtons}</div>
    </section>
    <div class="actions">
      <md-filled-button id="startBtn">Начать</md-filled-button>
    </div>
  `;
}

export function fillOptionButtons(optionsNode, options) {
  optionsNode.innerHTML = options
    .map(
      (letter) =>
        `<md-outlined-button class="option-btn" data-letter="${letter}"><span class="option-letter">${letter}</span></md-outlined-button>`,
    )
    .join("");
}

export function renderResult(container, result) {
  const items = result.wrongItems
    .map(
      (item) => `
        <li>
          ${escapeHtml(item.selectedWord)} -> ${escapeHtml(item.correctWord)}. ${escapeHtml(item.hint)}
        </li>
      `,
    )
    .join("");

  container.innerHTML = `
    <div class="row">
      <h1 class="title">Тест завершен</h1>
    </div>
    <section class="feedback">
      <p><strong>Словарь:</strong> ${escapeHtml(result.dictionaryTitle)}</p>
      <p><strong>Верных:</strong> ${result.correctCount}</p>
      <p><strong>Ошибок:</strong> ${result.wrongCount}</p>
      <p><strong>Процент:</strong> ${result.percent}%</p>
      <p><strong>Слова с ошибками:</strong></p>
      ${items ? `<ul class="result-list">${items}</ul>` : "<p>Ошибок нет. Отличный результат.</p>"}
    </section>
    <div class="actions actions-duo">
      <md-outlined-button id="changeDictionaryBtn">Сменить словарь</md-outlined-button>
      <md-filled-button id="restartBtn">Пройти еще раз</md-filled-button>
    </div>
  `;
}

function renderFeedback(outcome) {
  if (!outcome) {
    return `
      <div class="feedback-neutral">
        <p>Выберите букву для текущей орфограммы.</p>
      </div>
    `;
  }

  if (outcome.isCorrect) {
    return `
      <div class="feedback-state feedback-success">
        <p class="feedback-title ok">Верно</p>
        <p>Отлично, все буквы выбраны правильно.</p>
      </div>
    `;
  }

  return `
    <div class="feedback-state feedback-error">
      <p class="feedback-title error">Ошибка</p>
      <p>${escapeHtml(outcome.hint)}</p>
      <p class="correct-word-label">Правильное слово:</p>
      <p class="correct-word">${renderCorrectWord(outcome)}</p>
    </div>
  `;
}

function renderCorrectWord(outcome) {
  const correctChars = Array.from(outcome.correctWord);
  const selectedChars = Array.from(outcome.selectedWord ?? "");
  return correctChars
    .map((letter, index) =>
      selectedChars[index] === letter
        ? escapeHtml(letter)
        : `<span class="orthogram">${escapeHtml(letter)}</span>`,
    )
    .join("");
}

function renderWord(parsed, currentSelections, outcome, currentStepIndex) {
  return parsed.segments
    .map((segment) => {
      if (segment.type === "text") {
        return escapeHtml(segment.value);
      }

      const index = segment.orthIndex;
      const selected = currentSelections[index];
      const letter = selected ?? "…";

      if (!outcome) {
        if (selected) {
          return escapeHtml(letter);
        }
        const activeClass = index === currentStepIndex ? " word-gap-active" : "";
        return `<span class="word-gap${activeClass}">..</span>`;
      }

      if (outcome.isCorrect) {
        return escapeHtml(letter);
      }

      if (outcome.wrongIndexes.includes(index)) {
        return `<span class="word-wrong-letter">${escapeHtml(letter)}</span>`;
      }
      return escapeHtml(letter);
    })
    .join("");
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
