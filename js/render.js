export function renderTask(container, payload) {
  const { task, index, total, outcome, nextEnabled } = payload;
  container.innerHTML = `
    <div class="row">
      <h1 class="title">Тест на правильность написания</h1>
      <span class="progress">Задание ${index + 1} из ${total}</span>
    </div>
    <p class="word">${renderWord(task, outcome)}</p>
    <div class="options ${outcome ? "options-hidden" : ""}" id="options"></div>
    <section class="feedback" id="feedback">
      ${renderFeedback(outcome)}
    </section>
    <div class="actions">
      <md-filled-button id="nextBtn" ${nextEnabled ? "" : "disabled"}>Дальше</md-filled-button>
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
          ${item.wordMask}: выбрано «${item.selectedLetter}», правильно «${item.correctLetter}». ${item.hint}
        </li>
      `,
    )
    .join("");

  container.innerHTML = `
    <div class="row">
      <h1 class="title">Тест завершен</h1>
    </div>
    <section class="feedback">
      <p><strong>Верных:</strong> ${result.correctCount}</p>
      <p><strong>Ошибок:</strong> ${result.wrongCount}</p>
      <p><strong>Процент:</strong> ${result.percent}%</p>
      <p><strong>Слова с ошибками:</strong></p>
      ${
        items
          ? `<ul class="result-list">${items}</ul>`
          : "<p>Ошибок нет. Отличный результат.</p>"
      }
    </section>
    <div class="actions">
      <md-filled-button id="restartBtn">Пройти еще раз</md-filled-button>
    </div>
  `;
}

function renderFeedback(outcome) {
  if (!outcome) {
    return `
      <div class="feedback-neutral">
        <p>Выберите букву, чтобы проверить ответ.</p>
      </div>
    `;
  }

  if (outcome.isCorrect) {
    return `
      <div class="feedback-state feedback-success">
        <p class="feedback-title ok">Верно</p>
        <p>Отлично, ответ правильный.</p>
      </div>
    `;
  }

  const highlightedWord = highlightOrthogram(outcome.wordMask, outcome.correctWord);

  return `
    <div class="feedback-state feedback-error">
      <p class="feedback-title error">Ошибка</p>
      <p>${escapeHtml(outcome.hint)}</p>
      <p class="correct-word-label">Правильное слово:</p>
      <p class="correct-word">${highlightedWord}</p>
    </div>
  `;
}

function highlightOrthogram(wordMask, correctWord) {
  const gapIndex = wordMask.indexOf("..");
  if (gapIndex < 0 || gapIndex >= correctWord.length) {
    return escapeHtml(correctWord);
  }

  const safeWord = escapeHtml(correctWord);
  const before = safeWord.slice(0, gapIndex);
  const letter = safeWord.slice(gapIndex, gapIndex + 1);
  const after = safeWord.slice(gapIndex + 1);

  return `${before}<span class="orthogram">${letter}</span>${after}`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderWord(task, outcome) {
  if (!outcome) {
    return escapeHtml(task.wordMask);
  }

  const gapIndex = task.wordMask.indexOf("..");
  if (gapIndex < 0) {
    return escapeHtml(task.wordMask);
  }

  const before = escapeHtml(task.correctWord.slice(0, gapIndex));
  const after = escapeHtml(task.correctWord.slice(gapIndex + 1));

  if (outcome.isCorrect) {
    return `${before}${escapeHtml(outcome.correctLetter)}${after}`;
  }

  return `${before}<span class="word-wrong-letter">${escapeHtml(outcome.selectedLetter)}</span>${after}`;
}
