import test from "node:test";
import assert from "node:assert/strict";
import {
  answerCurrent,
  buildQuizTasks,
  buildResult,
  getTaskParsed,
  parseWordPattern,
  startQuiz,
  validateTask,
} from "../js/quiz.js";
import { nextTask } from "../js/state.js";

function makeInsertTask(override = {}) {
  return {
    type: "insertMissingLetters",
    word: "м[ао|о]л[ао|о]ко",
    hint: "Проверка: молоко`.",
    ...override,
  };
}

test("parseWordPattern поддерживает несколько орфограмм", () => {
  const parsed = parseWordPattern("м[ао|о]л[ао|о]ко");
  assert.equal(parsed.orthCount, 2);
  assert.equal(parsed.correctWord, "молоко");
});

test("validateTask валидирует chooseWordVariant", () => {
  assert.doesNotThrow(() =>
    validateTask({
      type: "chooseWordVariant",
      variants: ["малако", "молоко"],
      correctIndex: 1,
      hint: "...",
    }),
  );
});

test("validateTask валидирует buildForeignWord", () => {
  assert.doesNotThrow(() =>
    validateTask({
      type: "buildForeignWord",
      sourceWord: "стол",
      targetWord: "table",
      letters: ["t", "a", "b", "l", "e"],
      hint: "...",
    }),
  );
});

test("answerCurrent для insertMissingLetters финализируется на последнем шаге", () => {
  const state = startQuiz([makeInsertTask()], 1);
  const step1 = answerCurrent(state, { letter: "о" });
  assert.equal(step1.isFinal, false);

  const step2 = answerCurrent(state, { letter: "о" });
  assert.equal(step2.isFinal, true);
  assert.equal(step2.isCorrect, true);
});

test("answerCurrent для chooseWordVariant", () => {
  const task = {
    type: "chooseWordVariant",
    variants: ["малако", "молоко"],
    correctIndex: 1,
    hint: "...",
  };
  const state = startQuiz([task], 1);
  const final = answerCurrent(state, { index: 0 });
  assert.equal(final.isFinal, true);
  assert.equal(final.isCorrect, false);
  assert.equal(final.correctWord, "молоко");
});

test("answerCurrent для buildForeignWord использует буквы по индексам один раз", () => {
  const task = {
    type: "buildForeignWord",
    sourceWord: "стол",
    targetWord: "table",
    letters: ["t", "a", "b", "l", "e"],
    hint: "...",
  };
  const state = startQuiz([task], 1);
  answerCurrent(state, { letterIndex: 0 });
  answerCurrent(state, { letterIndex: 1 });
  answerCurrent(state, { letterIndex: 2 });
  answerCurrent(state, { letterIndex: 3 });
  const final = answerCurrent(state, { letterIndex: 4 });
  assert.equal(final.isCorrect, true);
  assert.throws(() => answerCurrent(startQuiz([task], 1), { letterIndex: 9 }), /индекс/i);
});

test("pairMatch проверяется по mapping", () => {
  const task = {
    type: "pairMatch",
    pairs: [
      ["стол", "table"],
      ["книга", "book"],
    ],
    hint: "...",
  };
  const state = startQuiz([task], 1);
  const final = answerCurrent(state, {
    mapping: {
      стол: "table",
      книга: "book",
    },
  });
  assert.equal(final.isCorrect, true);
});

test("audioToWord chooseVariant", () => {
  const task = {
    type: "audioToWord",
    mode: "chooseVariant",
    audioSrc: "audio/en/table.mp3",
    variants: ["table", "cable"],
    correctIndex: 0,
    hint: "...",
  };
  const state = startQuiz([task], 1);
  const final = answerCurrent(state, { index: 0 });
  assert.equal(final.isCorrect, true);
});

test("audioToWord buildWord", () => {
  const task = {
    type: "audioToWord",
    mode: "buildWord",
    audioSrc: "audio/en/book.mp3",
    targetWord: "book",
    letters: ["b", "o", "o", "k"],
    hint: "...",
  };
  const state = startQuiz([task], 1);
  answerCurrent(state, { letterIndex: 0 });
  answerCurrent(state, { letterIndex: 1 });
  answerCurrent(state, { letterIndex: 2 });
  const final = answerCurrent(state, { letterIndex: 3 });
  assert.equal(final.isCorrect, true);
});

test("buildQuizTasks сначала берет невыученные по ключу <type>:<correctWord>", () => {
  const tasks = [
    {
      type: "chooseWordVariant",
      variants: ["малако", "молоко"],
      correctIndex: 1,
      hint: "1",
    },
    {
      type: "chooseWordVariant",
      variants: ["карова", "корова"],
      correctIndex: 1,
      hint: "2",
    },
  ];

  const selected = buildQuizTasks(tasks, 1, ["chooseWordVariant:молоко"], () => 0.1);
  const parsed = getTaskParsed(selected[0]);
  assert.equal(parsed.correctWord, "корова");
});

test("buildResult считает статистику", () => {
  const tasks = [
    {
      type: "chooseWordVariant",
      variants: ["малако", "молоко"],
      correctIndex: 1,
      hint: "...",
    },
    makeInsertTask({ word: "в[ао|о]р[ао|о]на" }),
  ];

  const state = startQuiz(tasks, 2, () => 0.99);
  answerCurrent(state, { index: 1 });
  nextTask(state);
  answerCurrent(state, { letter: "а" });
  answerCurrent(state, { letter: "о" });

  const result = buildResult(state);
  assert.equal(result.correctCount, 1);
  assert.equal(result.wrongCount, 1);
  assert.equal(result.percent, 50);
});

