import { createQuizState, getCurrentTask, pickRandomTasks, shuffleArray } from "./state.js";

const TASK_TYPES = new Set([
  "insertMissingLetters",
  "chooseWordVariant",
  "buildForeignWord",
  "pairMatch",
  "audioToWord",
]);

const AUDIO_MODES = new Set(["chooseVariant", "buildWord"]);

function ensureHint(task) {
  if (typeof task.hint !== "string" || task.hint.trim() === "") {
    throw new Error("Поле hint отсутствует или пустое.");
  }
}

function ensurePrompt(task) {
  if (task.prompt !== undefined && (typeof task.prompt !== "string" || task.prompt.trim() === "")) {
    throw new Error("Поле prompt должно быть непустой строкой.");
  }
}

function ensureStringArray(value, fieldName, minLength = 1, maxLength = Number.MAX_SAFE_INTEGER) {
  if (!Array.isArray(value) || value.length < minLength || value.length > maxLength) {
    throw new Error(`Поле ${fieldName} имеет некорректную длину.`);
  }
  if (!value.every((item) => typeof item === "string" && item.trim() !== "")) {
    throw new Error(`Поле ${fieldName} должно содержать только непустые строки.`);
  }
}

function ensureUnique(items, fieldName) {
  if (new Set(items).size !== items.length) {
    throw new Error(`Поле ${fieldName} должно содержать уникальные значения.`);
  }
}

function ensureLetterPool(targetWord, letters) {
  const need = new Map();
  Array.from(targetWord).forEach((letter) => {
    need.set(letter, (need.get(letter) ?? 0) + 1);
  });

  const actual = new Map();
  letters.forEach((letter) => {
    if (typeof letter !== "string" || Array.from(letter).length !== 1) {
      throw new Error("Массив letters должен содержать строки длины 1.");
    }
    actual.set(letter, (actual.get(letter) ?? 0) + 1);
  });

  for (const [letter, count] of need.entries()) {
    if ((actual.get(letter) ?? 0) < count) {
      throw new Error("letters должен содержать все буквы targetWord с нужной кратностью.");
    }
  }
}

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
      throw new Error(
        `Количество вариантов в орфограмме должно быть от 2 до 4 (текущих: ${options.length}). Слово: "${word}"`,
      );
    }
    if (Array.from(correct).length !== 1) {
      throw new Error(
        `Правильная буква "${correct}" должна быть одной буквой. Слово: "${word}"`,
      );
    }
    if (!options.includes(correct)) {
      throw new Error(
        `Правильная буква "${correct}" не входит в варианты [${options.join("")}]. Слово: "${word}"`,
      );
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

  return {
    taskType: "insertMissingLetters",
    source: word,
    segments,
    orthograms,
    orthCount: orthograms.length,
    correctWord,
  };
}

function parseChooseWordVariant(task) {
  ensureStringArray(task.variants, "variants", 2, 6);
  ensureUnique(task.variants, "variants");
  if (!Number.isInteger(task.correctIndex)) {
    throw new Error("Поле correctIndex должно быть целым числом.");
  }
  if (task.correctIndex < 0 || task.correctIndex >= task.variants.length) {
    throw new Error("Поле correctIndex вне диапазона variants.");
  }

  return {
    taskType: "chooseWordVariant",
    prompt: task.prompt ?? "Выбери правильное написание",
    questionDisplay: task.questionDisplay ?? null,
    questionAnswer: task.questionAnswer ?? null,
    variants: task.variants,
    correctIndex: task.correctIndex,
    correctWord: task.variants[task.correctIndex],
  };
}

function parseBuildWord(task, kind) {
  if (typeof task.targetWord !== "string" || task.targetWord.trim() === "") {
    throw new Error("Поле targetWord отсутствует или пустое.");
  }
  ensureStringArray(task.letters, "letters", 1);
  ensureLetterPool(task.targetWord, task.letters);

  if (kind === "buildForeignWord") {
    if (typeof task.sourceWord !== "string" || task.sourceWord.trim() === "") {
      throw new Error("Поле sourceWord отсутствует или пустое.");
    }
  }

  return {
    taskType: kind,
    prompt:
      task.prompt ??
      (kind === "buildForeignWord" ? "Собери слово" : "Прослушай и собери слово"),
    sourceWord: task.sourceWord,
    targetWord: task.targetWord,
    letters: task.letters,
    correctWord: task.targetWord,
  };
}

function parsePairMatch(task) {
  if (!Array.isArray(task.pairs) || task.pairs.length < 2 || task.pairs.length > 8) {
    throw new Error("Поле pairs должно быть массивом длиной от 2 до 8.");
  }

  const leftItems = [];
  const rightItems = [];
  task.pairs.forEach((pair) => {
    if (!Array.isArray(pair) || pair.length !== 2) {
      throw new Error("Каждый элемент pairs должен быть массивом из двух строк.");
    }
    const [left, right] = pair;
    if (typeof left !== "string" || left.trim() === "" || typeof right !== "string" || right.trim() === "") {
      throw new Error("Пара должна содержать непустые строки.");
    }
    leftItems.push(left);
    rightItems.push(right);
  });

  ensureUnique(leftItems, "pairs[left]");
  ensureUnique(rightItems, "pairs[right]");

  return {
    taskType: "pairMatch",
    prompt: task.prompt ?? "Сопоставь пары",
    pairs: task.pairs,
    leftItems,
    rightItems,
    correctMap: Object.fromEntries(task.pairs),
    correctWord: JSON.stringify(task.pairs),
  };
}

function parseAudio(task) {
  if (typeof task.audioSrc !== "string" || task.audioSrc.trim() === "") {
    throw new Error("Поле audioSrc отсутствует или пустое.");
  }
  if (!AUDIO_MODES.has(task.mode)) {
    throw new Error("Поле mode для audioToWord должно быть chooseVariant или buildWord.");
  }

  if (task.mode === "chooseVariant") {
    const compiled = parseChooseWordVariant(task);
    return {
      ...compiled,
      taskType: "audioToWord",
      mode: "chooseVariant",
      audioSrc: task.audioSrc,
      prompt: task.prompt ?? "Прослушай и выбери слово",
    };
  }

  const compiled = parseBuildWord(task, "audioToWord");
  return {
    ...compiled,
    taskType: "audioToWord",
    mode: "buildWord",
    audioSrc: task.audioSrc,
  };
}

function compileTask(task) {
  if (!task || typeof task !== "object") {
    throw new Error("Задание должно быть объектом.");
  }
  if (!TASK_TYPES.has(task.type)) {
    throw new Error("Поле type отсутствует или не поддерживается.");
  }
  ensureHint(task);
  ensurePrompt(task);

  switch (task.type) {
    case "insertMissingLetters":
      if (typeof task.word !== "string" || task.word.trim() === "") {
        throw new Error("Поле word отсутствует или пустое.");
      }
      return parseWordPattern(task.word);
    case "chooseWordVariant":
      return parseChooseWordVariant(task);
    case "buildForeignWord":
      return parseBuildWord(task, "buildForeignWord");
    case "pairMatch":
      return parsePairMatch(task);
    case "audioToWord":
      return parseAudio(task);
    default:
      throw new Error("Неизвестный type.");
  }
}

function getTaskModel(task) {
  if (task.__compiled) {
    return task.__compiled;
  }
  task.__compiled = compileTask(task);
  return task.__compiled;
}

function getLearningKey(task) {
  const parsed = getTaskModel(task);
  return `${task.type}:${parsed.correctWord}`;
}

function getPairRuntime(task, parsed, randomFn = Math.random) {
  if (task.__pairRuntime) {
    return task.__pairRuntime;
  }

  const left = shuffleArray(parsed.leftItems, randomFn);
  const right = shuffleArray(parsed.rightItems, randomFn);
  task.__pairRuntime = { left, right };
  return task.__pairRuntime;
}

function getChooseVariantRuntime(task, parsed, randomFn = Math.random) {
  if (task.__chooseVariantRuntime) {
    return task.__chooseVariantRuntime;
  }

  const variantsWithIndex = parsed.variants.map((variant, index) => ({ variant, index }));
  const shuffledVariants = shuffleArray(variantsWithIndex, randomFn);
  task.__chooseVariantRuntime = { shuffledVariants };
  return task.__chooseVariantRuntime;
}

function getBuildWordRuntime(task, parsed, randomFn = Math.random) {
  if (task.__buildWordRuntime) {
    return task.__buildWordRuntime;
  }

  const shuffledLetters = shuffleArray(parsed.letters, randomFn);
  task.__buildWordRuntime = { shuffledLetters };
  return task.__buildWordRuntime;
}

export function validateTask(task) {
  ensureHint(task);
  getTaskModel(task);
}

export function getTaskParsed(task) {
  validateTask(task);
  return getTaskModel(task);
}

export function getTaskRuntime(task, randomFn = Math.random) {
  const parsed = getTaskModel(task);
  if (parsed.taskType === "pairMatch") {
    return getPairRuntime(task, parsed, randomFn);
  }
  if (parsed.taskType === "buildForeignWord" || (parsed.taskType === "audioToWord" && parsed.mode === "buildWord")) {
    return getBuildWordRuntime(task, parsed, randomFn);
  }
  if (parsed.taskType === "chooseWordVariant" || (parsed.taskType === "audioToWord" && parsed.mode === "chooseVariant")) {
    return getChooseVariantRuntime(task, parsed, randomFn);
  }
  return null;
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

  const unlearned = tasks.filter((task) => !learnedSet.has(getLearningKey(task)));
  const learned = tasks.filter((task) => learnedSet.has(getLearningKey(task)));

  const selected = shuffleArray(unlearned, randomFn).slice(0, safeCount);
  if (selected.length < safeCount) {
    const need = safeCount - selected.length;
    selected.push(...shuffleArray(learned, randomFn).slice(0, need));
  }
  return selected;
}

function finalizeOutcome(state, task, payload) {
  state.answers.push(payload);
  state.currentOutcome = payload;
  return payload;
}

function answerInsertMissingLetters(state, task, parsed, input) {
  const selectedLetter = input?.letter;
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
    return { isFinal: false, stepIndex: state.currentStepIndex, totalSteps: parsed.orthCount };
  }

  const selectedLetters = [...state.currentSelections];
  const correctLetters = parsed.orthograms.map((item) => item.correct);
  const wrongIndexes = correctLetters
    .map((correct, index) => (selectedLetters[index] === correct ? -1 : index))
    .filter((index) => index >= 0);

  const selectedWord = parsed.segments
    .map((segment) => (segment.type === "text" ? segment.value : selectedLetters[segment.orthIndex]))
    .join("");

  return finalizeOutcome(state, task, {
    taskType: task.type,
    isCorrect: wrongIndexes.length === 0,
    isFinal: true,
    hint: task.hint,
    selectedWord,
    selectedLetters,
    correctWord: parsed.correctWord,
    wrongIndexes,
    message: wrongIndexes.length === 0 ? "Верно" : "Ошибка",
  });
}

function answerChooseVariant(state, task, parsed, input) {
  const selectedIndex = input?.index;
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= parsed.variants.length) {
    throw new Error("Некорректный вариант ответа.");
  }

  return finalizeOutcome(state, task, {
    taskType: task.type,
    isCorrect: selectedIndex === parsed.correctIndex,
    isFinal: true,
    hint: task.hint,
    selectedWord: parsed.variants[selectedIndex],
    correctWord: parsed.correctWord,
    wrongIndexes: selectedIndex === parsed.correctIndex ? [] : [selectedIndex],
    message: selectedIndex === parsed.correctIndex ? "Верно" : "Ошибка",
  });
}

function answerBuildWord(state, task, parsed, runtime, input) {
  const letterIndex = input?.letterIndex;
  if (!Number.isInteger(letterIndex) || letterIndex < 0 || letterIndex >= runtime.shuffledLetters.length) {
    throw new Error("Некорректный индекс буквы.");
  }

  const usedIndexes = state.currentSelections;
  if (usedIndexes.includes(letterIndex)) {
    throw new Error("Эта буква уже использована.");
  }

  usedIndexes.push(letterIndex);
  const selectedWord = usedIndexes.map((index) => runtime.shuffledLetters[index]).join("");

  if (selectedWord.length < parsed.targetWord.length) {
    state.currentStepIndex += 1;
    return {
      isFinal: false,
      stepIndex: state.currentStepIndex,
      totalSteps: parsed.targetWord.length,
      selectedWord,
    };
  }

  const targetChars = Array.from(parsed.targetWord);
  const selectedChars = Array.from(selectedWord);
  const wrongIndexes = targetChars
    .map((char, index) => (selectedChars[index] === char ? -1 : index))
    .filter((index) => index >= 0);

  return finalizeOutcome(state, task, {
    taskType: task.type,
    mode: task.mode,
    isCorrect: wrongIndexes.length === 0,
    isFinal: true,
    hint: task.hint,
    selectedWord,
    correctWord: parsed.targetWord,
    wrongIndexes,
    message: wrongIndexes.length === 0 ? "Верно" : "Ошибка",
  });
}

function answerPairMatch(state, task, parsed, input) {
  if (!input || typeof input !== "object" || !input.mapping || typeof input.mapping !== "object") {
    throw new Error("Для pairMatch требуется mapping.");
  }

  const mapping = input.mapping;
  const missing = parsed.leftItems.filter((left) => typeof mapping[left] !== "string" || mapping[left] === "");
  if (missing.length > 0) {
    throw new Error("Нужно заполнить все пары перед проверкой.");
  }

  const usedRights = Object.values(mapping);
  if (new Set(usedRights).size !== usedRights.length) {
    throw new Error("Каждому значению справа должна соответствовать только одна пара.");
  }

  const wrongLeft = parsed.leftItems.filter((left) => parsed.correctMap[left] !== mapping[left]);
  const selectedWord = parsed.leftItems.map((left) => `${left}=${mapping[left]}`).join("; ");
  const correctWord = parsed.leftItems.map((left) => `${left}=${parsed.correctMap[left]}`).join("; ");

  return finalizeOutcome(state, task, {
    taskType: task.type,
    isCorrect: wrongLeft.length === 0,
    isFinal: true,
    hint: task.hint,
    selectedWord,
    correctWord,
    correctMap: parsed.correctMap,
    wrongIndexes: wrongLeft,
    message: wrongLeft.length === 0 ? "Верно" : "Ошибка",
  });
}

export function answerCurrent(state, input) {
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
  const runtime = getTaskRuntime(task);

  if (task.type === "insertMissingLetters") {
    return answerInsertMissingLetters(state, task, parsed, input);
  }
  if (task.type === "chooseWordVariant") {
    return answerChooseVariant(state, task, parsed, input);
  }
  if (task.type === "buildForeignWord") {
    return answerBuildWord(state, task, parsed, runtime, input);
  }
  if (task.type === "pairMatch") {
    return answerPairMatch(state, task, parsed, input);
  }
  if (task.type === "audioToWord") {
    if (parsed.mode === "chooseVariant") {
      return answerChooseVariant(state, task, parsed, input);
    }
    return answerBuildWord(state, task, parsed, runtime, input);
  }

  throw new Error("Неизвестный тип задания.");
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

export function getLearnedKey(task) {
  return getLearningKey(task);
}
