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
          : "<p>Ошибок нет. Отличный результат!</p>"
      }
    </section>
    <div class="actions">
      <md-filled-button id="restartBtn">Пройти ещё раз</md-filled-button>
    </div>
  `;
}

function renderTaskBody(task, parsed, runtime, outcome, currentSelections, currentStepIndex) {
  switch (task.type) {
    case "insertMissingLetters":
      return renderOrthogramTask(task, parsed, outcome, currentSelections, currentStepIndex);
    case "chooseWordVariant":
      return renderChooseVariantTask(task, parsed, outcome);
    case "buildForeignWord":
    case "audioToWord":
      return renderBuildWordTask(task, parsed, outcome, currentSelections);
    case "pairMatch":
      return renderPairMatchTask(task, runtime, outcome);
    default:
      return `<p class="error">Неизвестный тип задания.</p>`;
  }
}

function renderOrthogramTask(task, parsed, outcome, currentSelections, currentStepIndex) {
  const promptHtml = task.prompt ? `<p class="task-prompt">${escapeHtml(task.prompt)}</p>` : "";

  if (parsed.orthograms.length === 1) {
    // One orthogram - simple selection
    const orth = parsed.orthograms[0];
    const segments = parsed.segments.map((seg) => {
      if (seg.type === "text") return seg.value;
      const currentLetter = currentSelections?.[seg.orthIndex];
      const selected = outcome ? outcome.selectedLetters?.[seg.orthIndex] : currentLetter;
      const cssClass = selected
        ? selected === orth.correct
          ? "word-gap word-gap-active"
          : "word-gap"
        : "word-gap";

      const letter = selected ?? "..";
      return `<span class="${cssClass}">${letter}</span>`;
    });

    const optionsHtml = outcome
      ? ""
      : `<div class="options">
        ${orth.options
          .map(
            (opt) =>
              `<md-outlined-button class="option-btn" data-letter="${opt}">
                <span class="option-letter">${opt}</span>
              </md-outlined-button>`,
          )
          .join("")}
      </div>`;

    return `
      ${promptHtml}
      <p class="word">${segments.join("")}</p>
      ${optionsHtml}
    `;
  } else {
    // Multiple orthograms - step-by-step
    const currentStep = outcome ? parsed.orthograms.length : (currentStepIndex ?? 0);
    const orth = parsed.orthograms[currentStep];
    const selectedLetter = currentSelections?.[currentStep];

    const segments = parsed.segments.map((seg, idx) => {
      if (seg.type === "text") return seg.value;

      const isCurrent = seg.orthIndex === currentStep;
      const isPast = seg.orthIndex < currentStep;

      if (isPast || outcome) {
        const letter = outcome ? outcome.selectedLetters[seg.orthIndex] : currentSelections[seg.orthIndex];
        const correct = parsed.orthograms[seg.orthIndex].correct;
        const cssClass = letter === correct ? "word-gap" : "word-gap word-wrong-letter";
        return `<span class="${cssClass}">${letter}</span>`;
      } else if (isCurrent) {
        return `<span class="word-gap word-gap-active">${selectedLetter ?? ".."}</span>`;
      } else {
        return `<span class="word-gap">..</span>`;
      }
    });

    const optionsHtml = outcome
      ? ""
      : `<div class="options">
        ${orth.options
          .map(
            (opt, idx) =>
              `<md-outlined-button class="option-btn" data-letter-index="${idx}">
                <span class="option-letter">${opt}</span>
              </md-outlined-button>`,
          )
          .join("")}
      </div>`;

    return `
      ${promptHtml}
      <p class="word">${segments.join("")}</p>
      ${optionsHtml}
    `;
  }
}

function renderChooseVariantTask(task, parsed, outcome) {
  const promptHtml = task.prompt ? `<p class="task-prompt">${escapeHtml(task.prompt)}</p>` : "";

  const variantsHtml = outcome
    ? ""
    : `<div class="options">
      ${parsed.variants.map(
        (variant, idx) =>
          `<md-outlined-button class="option-btn" data-answer-index="${idx}">
            <span class="option-letter">${variant}</span>
          </md-outlined-button>`,
      ).join("")}
    </div>`;

  return `
    ${promptHtml}
    ${variantsHtml}
  `;
}

function renderBuildWordTask(task, parsed, outcome, currentSelections) {
  const promptHtml = task.prompt ? `<p class="task-prompt">${escapeHtml(task.prompt)}</p>` : "";

  const currentWord = (currentSelections ?? []).join("");

  const wordHtml =
    currentWord.length > 0
      ? `<p class="word">${currentWord.split("").map((letter) =>
          letter === " " ? "&nbsp;" : letter,
        ).join("")}</p>`
      : "";

  const optionsHtml = outcome
    ? ""
    : `<div class="options">
      ${parsed.shuffledLetters.map(
        (letter, idx) =>
          `<md-outlined-button class="option-btn" data-letter-index="${idx}">
            <span class="option-letter">${letter}</span>
          </md-outlined-button>`,
      ).join("")}
    </div>`;

  return `
    ${promptHtml}
    ${wordHtml}
    ${optionsHtml}
  `;
}

function renderPairMatchTask(task, runtime, outcome) {
  const promptHtml = task.prompt ? `<p class="task-prompt">${escapeHtml(task.prompt)}</p>` : "";

  const pairsHtml = outcome
    ? ""
    : `<div class="pair-grid">
      ${runtime.left.map((left, idx) => `
        <div class="pair-row">
          <span class="pair-left">${escapeHtml(left)}</span>
          <select class="pair-select" data-left="${escapeHtml(left)}">
            <option value="">-- Выберите --</option>
            ${runtime.right.map((right) =>
              `<option value="${escapeHtml(right)}">${escapeHtml(right)}</option>`,
            ).join("")}
          </select>
        </div>
      `).join("")}
    </div>
    <div class="actions">
      <md-filled-button id="pairCheckBtn">Проверить</md-filled-button>
    </div>`;

  return `
    ${promptHtml}
    ${pairsHtml}
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

function renderFeedback(outcome) {
  if (!outcome) {
    return `<p class="feedback-neutral"></p>`;
  }

  if (outcome.isCorrect) {
    return `
      <div class="feedback-state feedback-success">
        <h3 class="feedback-title">Верно!</h3>
      </div>
    `;
  }

  return `
    <div class="feedback-state feedback-error">
      <h3 class="feedback-title">Ошибка</h3>
      ${outcome.hint ? `<p>${formatHint(outcome.hint)}</p>` : ""}
      ${outcome.correctWord !== undefined ? `
        <p class="correct-word-label">Правильное написание:</p>
        <p class="correct-word">${outcome.correctWord}</p>
      ` : ""}
    </div>
  `;
}

function formatHint(hint) {
  return hint
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/`/g, "<strong>&#769;</strong>")
    .replace(/\n/g, "<br>");
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
