import { createQuizState, getCurrentTask, pickRandomTasks, shuffleArray } from "./state.js";

export function parseWordPattern(word) {
  if (typeof word !== "string" || word.trim() === "") {
    throw new Error("word должен быть непустой строкой.");
  }

  const segments = [];
  const orthograms = [];
  let cursor = 0;
  let plainBuffer = "";

  while (cursor < word.length) {
    const char = word[cursor];
    if (char !== "[") {
      plainBuffer += char;
      cursor += 1;
      continue;
    }

    const closeIndex = word.indexOf("]", cursor + 1);
    if (closeIndex < 0) {
      throw new Error("Некорректный синтаксис word: нет закрывающей ].");
    }

    if (plainBuffer) {
      segments.push({ type: "text", value: plainBuffer });
      plainBuffer = "";
    }

    const tokenRaw = word.slice(cursor + 1, closeIndex);
    const [optionsRaw, correctRaw, ...rest] = tokenRaw.split("|");
    if (rest.length > 0 || optionsRaw === undefined || correctRaw === undefined) {
      throw new Error("Орфограмма должна быть в формате [варианты|правильная].");
    }

    const options = [...new Set(Array.from(optionsRaw.trim()).filter(Boolean))];
    const correct = correctRaw.trim();

    if (options.length < 2 || options.length > 4) {
      throw new Error("Количество вариантов в орфограмме должно быть от 2 до 4.");
    }
    if (correct.length !== 1) {
      throw new Error("Правильная буква должна быть одной буквой.");
    }
    if (!options.includes(correct)) {
      throw new Error("Правильная буква должна входить в варианты.");
    }

    const orthIndex = orthograms.length;
    segments.push({
      type: "orthogram",
      orthIndex,
      options,
      correct,
    });
    orthograms.push({ options, correct });
    cursor = closeIndex + 1;
  }

  if (plainBuffer) {
    segments.push({ type: "text", value: plainBuffer });
  }

  if (orthograms.length === 0) {
    throw new Error("В word должна быть минимум одна орфограмма.");
  }

  const correctWord = segments
    .map((segment) => (segment.type === "text" ? segment.value : segment.correct))
    .join("");

  const maskedWord = segments
    .map((segment) => (segment.type === "text" ? segment.value : ".."))
    .join("");

  return {
    source: word,
    segments,
    orthograms,
    orthCount: orthograms.length,
    maskedWord,
    correctWord,
  };
}

function getTaskModel(task) {
  if (task.__compiled) {
    return task.__compiled;
  }
  task.__compiled = parseWordPattern(task.word);
  return task.__compiled;
}

export function validateTask(task) {
  if (!task || typeof task !== "object") {
    throw new Error("Задание должно быть объектом.");
  }
  if (typeof task.word !== "string" || task.word.trim() === "") {
    throw new Error("Поле word отсутствует или пустое.");
  }
  if (typeof task.hint !== "string" || task.hint.trim() === "") {
    throw new Error("Поле hint отсутствует или пустое.");
  }
  getTaskModel(task);
}

export function getTaskParsed(task) {
  validateTask(task);
  return getTaskModel(task);
}

function getTaskCorrectWord(task) {
  return getTaskModel(task).correctWord;
}

export function startQuiz(tasks, count = 10, randomFn = Math.random) {
  tasks.forEach(validateTask);
  const safeCount = Math.max(1, Math.min(count, tasks.length));
  const selected = pickRandomTasks(tasks, safeCount, randomFn);
  return createQuizState(selected);
}

export function buildQuizTasks(tasks, count, learnedWords = [], randomFn = Math.random) {
  tasks.forEach(validateTask);
  const safeCount = Math.max(1, Math.min(count, tasks.length));
  const learnedSet = new Set(learnedWords);

  const unlearned = tasks.filter((task) => !learnedSet.has(getTaskCorrectWord(task)));
  const learned = tasks.filter((task) => learnedSet.has(getTaskCorrectWord(task)));

  const selected = shuffleArray(unlearned, randomFn).slice(0, safeCount);
  if (selected.length < safeCount) {
    const need = safeCount - selected.length;
    selected.push(...shuffleArray(learned, randomFn).slice(0, need));
  }
  return selected;
}

export function answerCurrent(state, selectedLetter) {
  if (state.isFinished) {
    throw new Error("Тест уже завершен.");
  }
  if (state.currentOutcome) {
    throw new Error("Ответ в этом задании уже выбран.");
  }

  const task = getCurrentTask(state);
  if (!task) {
    throw new Error("Текущее задание не найдено.");
  }

  const parsed = getTaskModel(task);
  const stepIndex = state.currentStepIndex;
  const currentOrth = parsed.orthograms[stepIndex];
  if (!currentOrth) {
    throw new Error("Орфограмма для текущего шага не найдена.");
  }
  if (!currentOrth.options.includes(selectedLetter)) {
    throw new Error("Выбранная буква не входит в варианты текущей орфограммы.");
  }

  state.currentSelections[stepIndex] = selectedLetter;

  if (stepIndex < parsed.orthCount - 1) {
    state.currentStepIndex += 1;
    return {
      isFinal: false,
      stepIndex: state.currentStepIndex,
      totalSteps: parsed.orthCount,
    };
  }

  const selectedLetters = [...state.currentSelections];
  const correctLetters = parsed.orthograms.map((item) => item.correct);
  const wrongIndexes = correctLetters
    .map((correct, index) => (selectedLetters[index] === correct ? -1 : index))
    .filter((index) => index >= 0);

  const selectedWord = parsed.segments
    .map((segment) =>
      segment.type === "text" ? segment.value : selectedLetters[segment.orthIndex],
    )
    .join("");

  const isCorrect = wrongIndexes.length === 0;
  const outcome = {
    selectedLetters,
    correctLetters,
    wrongIndexes,
    selectedWord,
    correctWord: parsed.correctWord,
    hint: task.hint,
    isCorrect,
    isFinal: true,
    message: isCorrect ? "Верно" : "Ошибка",
  };

  state.answers.push(outcome);
  state.currentOutcome = outcome;
  return outcome;
}

export function buildResult(state) {
  const correctCount = state.answers.filter((item) => item.isCorrect).length;
  const wrongItems = state.answers.filter((item) => !item.isCorrect);
  const wrongCount = wrongItems.length;
  const total = state.answers.length || 1;
  const percent = Math.round((correctCount / total) * 100);

  return {
    correctCount,
    wrongCount,
    percent,
    wrongItems,
  };
}
