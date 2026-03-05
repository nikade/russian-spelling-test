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
      <h1 class="title">Тест-тренажёр</h1>
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
    dictionaryTitle,
  } = payload;

  const needsClearBtn = task.type === "insertMissingLetters" ||
                         task.type === "buildForeignWord" ||
                         (task.type === "audioToWord" && parsed.mode === "buildWord");

  const isPairMatch = task.type === "pairMatch";

  const showClearBtn = !outcome && needsClearBtn;
  const clearBtnDisabled = !currentSelections?.length && currentStepIndex === 0;
  const showMainActions = !isPairMatch;

  const feedbackClass = outcome
    ? (outcome.isCorrect ? "feedback success" : "feedback error")
    : "feedback empty";

  container.innerHTML = `
    <div class="row">
      <h1 class="title">${escapeHtml(dictionaryTitle)}</h1>
      <span class="progress">Задание ${index + 1} из ${total}</span>
    </div>
    <div class="content-wrapper">
      <section class="task-panel">
        ${renderTaskBody(task, parsed, runtime, outcome, currentSelections, currentStepIndex)}
      </section>
      <section class="feedback ${feedbackClass}" id="feedback">
        ${renderFeedback(outcome)}
      </section>
    </div>
    <div class="actions">
      ${task.type === "pairMatch" && !outcome ? `
        <md-outlined-button id="pairClearBtn" disabled>Очистить</md-outlined-button>
      ` : showClearBtn ? `
        <md-outlined-button id="clearBtn" ${clearBtnDisabled ? "disabled" : ""}>Очистить</md-outlined-button>
      ` : `
        <md-filled-button id="nextBtn" ${nextEnabled ? "" : "disabled"}>Дальше</md-filled-button>
      `}
    </div>
  `;
}

export function renderResult(container, result) {
  const items = result.wrongItems
    .map((outcome) => {
      // Format error information based on outcome type
      let errorText = '';

      if (outcome.taskType === 'insertMissingLetters') {
        const wrongLetters = outcome.wrongIndexes.map(idx => {
          const correctLetter = outcome.correctWord[idx];
          return `позиция ${idx + 1}: «${correctLetter}»`;
        }).join(', ');
        errorText = `${outcome.selectedWord} (ошибки: ${wrongLetters}). ${outcome.hint ? formatHint(outcome.hint) : ''}`;
      } else if (outcome.taskType === 'chooseWordVariant') {
        errorText = `выбрано «${outcome.selectedWord}», правильно «${outcome.correctWord}». ${outcome.hint ? formatHint(outcome.hint) : ''}`;
      } else if (outcome.taskType === 'pairMatch') {
        const wrongPairs = outcome.wrongIndexes || [];
        if (Array.isArray(wrongPairs) && wrongPairs.length > 0) {
          errorText = wrongPairs.map(pair => `${pair} → ${outcome.correctMap[pair] || '?'}`).join(', ');
        }
        errorText += `. ${outcome.hint ? formatHint(outcome.hint) : ''}`;
      } else {
        errorText = `${outcome.hint ? formatHint(outcome.hint) : 'Ошибка в ответе'}`;
      }

      return `<li>${errorText}</li>`;
    })
    .join("");

  container.innerHTML = `
    <div class="row">
      <h1 class="title">Тест завершен</h1>
    </div>
    <section class="feedback ${result.wrongCount === 0 ? 'success' : 'error'}">
      <h3 class="feedback-title">${result.wrongCount === 0 ? '🎉 Отличный результат!' : 'Результаты теста'}</h3>
      <p><strong>Верных:</strong> ${result.correctCount}</p>
      <p><strong>Ошибок:</strong> ${result.wrongCount}</p>
      <p><strong>Процент:</strong> ${result.percent}%</p>
      ${
        result.wrongCount > 0 && items
          ? `<p style="margin-top: 12px;"><strong>Слова с ошибками:</strong></p>
          <ul class="result-list">${items}</ul>`
          : result.wrongCount === 0
          ? `<p>Вы не допустили ни одной ошибки!</p>`
          : ""
      }
    </section>
    <div class="actions">
      <md-filled-button id="restartBtn">Пройти ещё раз</md-filled-button>
      <md-outlined-button id="changeDictionaryBtn">Сменить словарь</md-outlined-button>
    </div>
  `;
}

function renderTaskBody(task, parsed, runtime, outcome, currentSelections, currentStepIndex) {
  switch (task.type) {
    case "insertMissingLetters":
      return renderOrthogramTask(task, parsed, outcome, currentSelections, currentStepIndex);
    case "chooseWordVariant":
      return renderChooseVariantTask(task, parsed, runtime, outcome);
    case "buildForeignWord":
      return renderBuildWordTask(task, parsed, runtime, outcome, currentSelections);
    case "audioToWord":
      if (parsed.mode === "chooseVariant") {
        return renderChooseVariantTask(task, parsed, runtime, outcome);
      }
      return renderBuildWordTask(task, parsed, runtime, outcome, currentSelections);
    case "pairMatch":
      return renderPairMatchTask(task, runtime, outcome);
    default:
      return `<p class="error">Неизвестный тип задания.</p>`;
  }
}

function renderOrthogramTask(task, parsed, outcome, currentSelections, currentStepIndex) {
  const promptHtml = task.prompt && task.prompt.trim() ? `<p class="task-prompt">${escapeHtml(task.prompt)}</p>` : "";

  if (!parsed || !parsed.orthograms || parsed.orthograms.length === 0) {
    return `<p class="error">Некорректные данные задания</p>`;
  }

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
        const letter = outcome?.selectedLetters ? outcome.selectedLetters[seg.orthIndex] : currentSelections[seg.orthIndex];
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
              `<md-outlined-button class="option-btn" data-letter="${opt}" data-letter-index="${idx}">
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

function renderChooseVariantTask(task, parsed, runtime, outcome) {
  const promptHtml = task.prompt && task.prompt.trim() ? `<p class="task-prompt">${escapeHtml(task.prompt)}</p>` : "";

  // Если есть outcome (после ответа), используем questionAnswer, иначе questionDisplay
  const questionText = outcome
    ? (parsed.questionAnswer ?? parsed.questionDisplay ?? null)
    : parsed.questionDisplay;

  const questionHtml = questionText
    ? `<p class="task-question">${escapeHtml(questionText)}</p>`
    : "";

  const audioHtml = parsed.audioSrc
    ? renderAudioPlayer(parsed.audioSrc)
    : "";

  const variantsHtml = outcome
    ? ""
    : `<div class="options">
      ${runtime.shuffledVariants.map(
        ({ variant, index }) =>
          `<md-outlined-button class="option-btn" data-answer-index="${index}">
            <span class="option-letter">${variant}</span>
          </md-outlined-button>`,
      ).join("")}
    </div>`;

  return `
    ${promptHtml}
    ${questionHtml}
    ${audioHtml}
    ${variantsHtml}
  `;
}

function renderBuildWordTask(task, parsed, runtime, outcome, currentSelections) {
  const promptHtml = task.prompt && task.prompt.trim() ? `<p class="task-prompt">${escapeHtml(task.prompt)}</p>` : "";

  const audioHtml = parsed.audioSrc
    ? renderAudioPlayer(parsed.audioSrc)
    : "";

  // Показываем sourceWord как подсказку, если есть
  const sourceHtml = parsed.sourceWord
    ? `<p class="task-source">${escapeHtml(parsed.sourceWord)}</p>`
    : "";

  const targetLength = parsed.targetWord.length;

  // Показываем слово с placeholder'ами для незаполненных позиций
  let wordDisplay = "";

  if (outcome) {
    // После ответа - показываем собранное слово с подсветкой ошибок
    const selectedWord = outcome.selectedWord || "";
    const wrongIndexes = outcome.wrongIndexes || [];

    wordDisplay = selectedWord.split("").map((letter, idx) => {
      const isWrong = wrongIndexes.includes(idx);
      const cssClass = isWrong ? "word-gap word-wrong-letter" : "word-gap";
      return `<span class="${cssClass}">${letter}</span>`;
    }).join("");
  } else {
    // В процессе сборки - показываем выбранные буквы + placeholder'ы
    const selectedLetters = (currentSelections ?? [])
      .map((idx) => runtime.shuffledLetters[idx]);

    for (let i = 0; i < targetLength; i++) {
      if (i < selectedLetters.length) {
        wordDisplay += `<span class="word-gap word-gap-active">${selectedLetters[i]}</span>`;
      } else {
        wordDisplay += `<span class="word-gap">..</span>`;
      }
    }
  }

  const wordHtml = `<p class="word">${wordDisplay}</p>`;

  const optionsHtml = outcome
    ? ""
    : `<div class="options">
      ${runtime.shuffledLetters.map(
        (letter, idx) => {
          const isUsed = currentSelections?.includes(idx);
          return `<md-outlined-button class="option-btn" data-letter-index="${idx}" ${isUsed ? "disabled" : ""}>
            <span class="option-letter">${letter === " " ? "_" : letter}</span>
          </md-outlined-button>`;
        }
      ).join("")}
    </div>`;

  return `
    ${promptHtml}
    ${sourceHtml}
    ${audioHtml}
    ${wordHtml}
    ${optionsHtml}
  `;
}

function renderAudioPlayer(audioSrc) {
  return `
    <div class="audio-wrap">
      <audio controls src="${escapeHtml(audioSrc)}">
        Ваш браузер не поддерживает аудио элемент.
      </audio>
    </div>
  `;
}

function renderPairMatchTask(task, runtime, outcome) {
  const promptHtml = task.prompt && task.prompt.trim() ? `<p class="task-prompt">${escapeHtml(task.prompt)}</p>` : "";

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
    return ``;
  }

  if (outcome.isCorrect) {
    return `
      <h3 class="feedback-title">✓ Верно!</h3>
    `;
  }

  return `
    <h3 class="feedback-title">✗ Ошибка</h3>
    ${outcome.hint ? `<p>${formatHint(outcome.hint)}</p>` : ""}
    ${outcome.correctWord !== undefined ? `
      <p class="correct-word-label">Правильное написание:</p>
      <p class="correct-word">${outcome.correctWord}</p>
    ` : ""}
  `;
}

function formatHint(hint) {
  // Сначала обрабатываем комбинированные маркеры (более специфичные)
  let result = hint.replace(/!!__(.+?)__!!/g, '<span class="hint-red hint-underline">$1</span>');
  result = result.replace(/__!!(.+?)!!__/g, '<span class="hint-red hint-underline">$1</span>');

  // Затем одиночные маркеры
  result = result.replace(/!!(.+?)!!/g, '<span class="hint-red">$1</span>');
  result = result.replace(/__(.+?)__/g, '<span class="hint-underline">$1</span>');

  // Существующее форматирование (обратная совместимость)
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/`/g, "<strong>&#769;</strong>");
  result = result.replace(/\n/g, "<br>");

  return result;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
