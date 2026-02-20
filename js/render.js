export function renderTask(container, payload) {
  const {
    task,
    parsed,
    runtime,
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
    <section class="task-panel">
      ${renderTaskBody(task, parsed, runtime, outcome, currentSelections, currentStepIndex)}
    </section>
    <section class="feedback" id="feedback">
      ${renderFeedback(outcome)}
    </section>
    <div class="actions">
      <md-filled-button id="nextBtn" ${nextEnabled ? "" : "disabled"}>Дальше</md-filled-button>
    </div>
  `;
}

export function renderSetup(container, payload) {
  const {
    subjects,
    dictionaries,
    selectedSubjectDir,
    selectedDictionaryFile,
    selectedCount,
    countOptions,
  } = payload;

  const subjectCards = subjects
    .map((item) => {
      const active = item.dir === selectedSubjectDir ? "setup-item-active" : "";
      return `
        <button class="setup-item ${active}" data-subject-dir="${escapeHtml(item.dir)}">
          <span class="setup-item-title">${escapeHtml(item.title)}</span>
        </button>
      `;
    })
    .join("");

  const dictionaryCards = dictionaries
    .map((item) => {
      const active = item.file === selectedDictionaryFile ? "setup-item-active" : "";
      const subtitle = item.description
        ? `<p class="setup-subtitle">${escapeHtml(item.description)}</p>`
        : "";
      return `
        <button class="setup-item ${active}" data-dictionary-file="${escapeHtml(item.file)}">
          <span class="setup-item-title">${escapeHtml(item.title)}</span>
          <span class="setup-item-meta">${item.taskCount} заданий</span>
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
      <h2 class="setup-title">Предмет</h2>
      <div class="setup-list setup-subject-list">${subjectCards}</div>
    </section>
    <section class="setup-block">
      <h2 class="setup-title">Словарь</h2>
      <div class="setup-list setup-dictionary-list">${dictionaryCards}</div>
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

export function renderResult(container, result) {
  const items = result.wrongItems
    .map(
      (item) => `
        <li>
          ${escapeHtml(item.selectedWord)} -> ${escapeHtml(item.correctWord)}. ${formatHint(item.hint)}
        </li>
      `,
    )
    .join("");

  container.innerHTML = `
    <div class="row">
      <h1 class="title">Тест завершен</h1>
    </div>
    <section class="feedback">
      <p><strong>Предмет:</strong> ${escapeHtml(result.subjectTitle)}</p>
      <p><strong>Словарь:</strong> ${escapeHtml(result.dictionaryTitle)}</p>
      <p><strong>Верных:</strong> ${result.correctCount}</p>
      <p><strong>Ошибок:</strong> ${result.wrongCount}</p>
      <p><strong>Процент:</strong> ${result.percent}%</p>
      <p><strong>Задания с ошибками:</strong></p>
      ${items ? `<ul class="result-list">${items}</ul>` : "<p>Ошибок нет. Отличный результат.</p>"}
    </section>
    <div class="actions actions-duo">
      <md-outlined-button id="changeDictionaryBtn">Изменить настройки</md-outlined-button>
      <md-filled-button id="restartBtn">Пройти еще раз</md-filled-button>
    </div>
  `;
}

function renderTaskBody(task, parsed, runtime, outcome, currentSelections, currentStepIndex) {
  switch (task.type) {
    case "insertMissingLetters":
      return renderInsertMissingLetters(parsed, outcome, currentSelections, currentStepIndex);
    case "chooseWordVariant":
      return renderChooseVariant(parsed, task.prompt, outcome);
    case "buildForeignWord":
      return renderBuildWord(parsed, task.prompt, outcome, currentSelections);
    case "pairMatch":
      return renderPairMatch(parsed, runtime, task.prompt, outcome);
    case "audioToWord":
      return renderAudioToWord(task, parsed, outcome, currentSelections);
    default:
      return "<p class='error'>Неизвестный тип задания.</p>";
  }
}

function renderInsertMissingLetters(parsed, outcome, currentSelections, currentStepIndex) {
  const options = outcome ? "" : renderOptions(parsed.orthograms[currentStepIndex].options);
  return `
    <p class="word">${renderWord(parsed, currentSelections, outcome, currentStepIndex)}</p>
    <div class="options ${outcome ? "options-hidden" : ""}" id="options">${options}</div>
  `;
}

function renderChooseVariant(parsed, prompt, outcome) {
  const options = parsed.variants
    .map(
      (variant, index) =>
        `<md-outlined-button class="option-btn" data-answer-index="${index}">${escapeHtml(variant)}</md-outlined-button>`,
    )
    .join("");

  return `
    <p class="task-prompt">${escapeHtml(prompt ?? "Выбери правильное слово")}</p>
    <div class="options ${outcome ? "options-hidden" : ""}" id="options">${options}</div>
  `;
}

function renderBuildWord(parsed, prompt, outcome, selections) {
  const selectedWord = selections.map((index) => parsed.letters[index]).join("");
  const letterButtons = parsed.letters
    .map((letter, index) => {
      const used = selections.includes(index);
      return `<md-outlined-button class="option-btn" data-letter-index="${index}" ${used || outcome ? "disabled" : ""}>${escapeHtml(letter)}</md-outlined-button>`;
    })
    .join("");

  return `
    <p class="task-prompt">${escapeHtml(prompt ?? "Собери слово")}</p>
    ${parsed.sourceWord ? `<p class="word">${escapeHtml(parsed.sourceWord)}</p>` : ""}
    <p class="word">${escapeHtml(selectedWord || "…")}</p>
    <div class="options" id="options">${letterButtons}</div>
  `;
}

function renderPairMatch(parsed, runtime, prompt, outcome) {
  const rightOptions = runtime.right
    .map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)
    .join("");

  const rows = runtime.left
    .map(
      (left) => `
      <div class="pair-row">
        <span class="pair-left">${escapeHtml(left)}</span>
        <select class="pair-select" data-left="${escapeHtml(left)}" ${outcome ? "disabled" : ""}>
          <option value="">Выбери</option>
          ${rightOptions}
        </select>
      </div>
    `,
    )
    .join("");

  return `
    <p class="task-prompt">${escapeHtml(prompt ?? "Сопоставь пары")}</p>
    <div class="pair-grid" id="pairGrid">${rows}</div>
    ${outcome ? "" : "<div class='actions'><md-outlined-button id='pairCheckBtn'>Проверить</md-outlined-button></div>"}
  `;
}

function renderAudioToWord(task, parsed, outcome, selections) {
  const player = `
    <div class="audio-wrap">
      <p class="task-prompt">${escapeHtml(task.prompt ?? "Прослушай задание")}</p>
      <audio controls src="${escapeHtml(task.audioSrc)}"></audio>
    </div>
  `;

  if (parsed.mode === "chooseVariant") {
    return `${player}${renderChooseVariant(parsed, "Выбери слово", outcome)}`;
  }

  return `${player}${renderBuildWord(parsed, "Собери слово", outcome, selections)}`;
}

function renderFeedback(outcome) {
  if (!outcome) {
    return `
      <div class="feedback-neutral">
        <p>Выполните задание и нажмите «Дальше».</p>
      </div>
    `;
  }

  if (outcome.isCorrect) {
    return `
      <div class="feedback-state feedback-success">
        <p class="feedback-title ok">Верно</p>
      </div>
    `;
  }

  return `
    <div class="feedback-state feedback-error">
      <p class="feedback-title error">Ошибка</p>
      <p>${formatHint(outcome.hint)}</p>
      <p class="correct-word-label">Правильный ответ:</p>
      <p class="correct-word">${escapeHtml(outcome.correctWord)}</p>
    </div>
  `;
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

function renderOptions(options) {
  return options
    .map(
      (letter) =>
        `<md-outlined-button class="option-btn" data-letter="${letter}"><span class="option-letter">${letter}</span></md-outlined-button>`,
    )
    .join("");
}

function formatHint(text) {
  let out = escapeHtml(String(text));
  out = out.replace(/([А-Яа-яЁёAEIOUYaeiouy])`/g, "$1\u0301");
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__(.+?)__/g, "<u>$1</u>");
  out = out.replace(/\n/g, "<br>");
  return out;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

