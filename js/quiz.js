import { createQuizState, getCurrentTask, pickRandomTasks } from "./state.js";

const RULE_TYPES = new Set([
  "unstressed_vowel",
  "paired_consonant",
  "zhi_shi",
  "cha_shcha",
  "chu_shchu",
  "dictionary",
]);

export function validateTask(task) {
  if (!task || typeof task !== "object") {
    throw new Error("Задание должно быть объектом.");
  }
  const required = [
    "id",
    "wordMask",
    "correctWord",
    "correctLetter",
    "options",
    "ruleType",
    "hint",
  ];
  for (const field of required) {
    if (task[field] === undefined || task[field] === null) {
      throw new Error(`Поле ${field} отсутствует.`);
    }
  }

  if (typeof task.wordMask !== "string" || !task.wordMask.includes("..")) {
    throw new Error("wordMask должен содержать '..'.");
  }
  if (task.wordMask.split("..").length !== 2) {
    throw new Error("В слове должен быть ровно один пропуск.");
  }
  if (typeof task.correctLetter !== "string" || task.correctLetter.length !== 1) {
    throw new Error("correctLetter должен быть одной буквой.");
  }
  if (!Array.isArray(task.options) || task.options.length < 2 || task.options.length > 4) {
    throw new Error("options должен содержать от 2 до 4 букв.");
  }
  if (!task.options.every((item) => typeof item === "string" && item.length === 1)) {
    throw new Error("Каждый вариант должен быть одной буквой.");
  }
  if (!task.options.includes(task.correctLetter)) {
    throw new Error("options должен включать correctLetter.");
  }
  if (!RULE_TYPES.has(task.ruleType)) {
    throw new Error(`Неизвестный ruleType: ${task.ruleType}`);
  }
}

export function startQuiz(tasks, count = 10, randomFn = Math.random) {
  tasks.forEach(validateTask);
  const selected = pickRandomTasks(tasks, count, randomFn);
  return createQuizState(selected);
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

  const isCorrect = selectedLetter === task.correctLetter;
  const outcome = {
    taskId: task.id,
    wordMask: task.wordMask,
    selectedLetter,
    correctLetter: task.correctLetter,
    correctWord: task.correctWord,
    hint: task.hint,
    isCorrect,
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
