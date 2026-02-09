import test from "node:test";
import assert from "node:assert/strict";
import {
  answerCurrent,
  buildQuizTasks,
  buildResult,
  parseWordPattern,
  startQuiz,
  validateTask,
} from "../js/quiz.js";
import { nextTask } from "../js/state.js";

function makeTask(override = {}) {
  return {
    word: "б[аое|е]рег",
    hint: "Проверка: берег — берега.",
    ...override,
  };
}

test("parseWordPattern поддерживает несколько орфограмм", () => {
  const parsed = parseWordPattern("м[ао|о]л[ао|о]ко");
  assert.equal(parsed.orthCount, 2);
  assert.equal(parsed.correctWord, "молоко");
  assert.deepEqual(parsed.orthograms[0].options, ["а", "о"]);
  assert.deepEqual(parsed.orthograms[1].options, ["а", "о"]);
});

test("validateTask принимает новый формат без id", () => {
  assert.doesNotThrow(() => validateTask(makeTask()));
  assert.throws(
    () => validateTask({ id: "x1", wordMask: "б..рег", hint: "..." }),
    /word отсутствует|word/i,
  );
});

test("startQuiz ограничивает размер до доступного числа слов", () => {
  const tasks = Array.from({ length: 3 }, () => makeTask());
  const state = startQuiz(tasks, 10);
  assert.equal(state.allTasks.length, 3);
});

test("answerCurrent: при нескольких орфограммах финал только после последней", () => {
  const tasks = [makeTask({ word: "м[ао|о]л[ао|о]ко" })];
  const state = startQuiz(tasks, 1);

  const step1 = answerCurrent(state, "о");
  assert.equal(step1.isFinal, false);
  assert.equal(state.currentOutcome, null);
  assert.equal(state.currentStepIndex, 1);

  const step2 = answerCurrent(state, "о");
  assert.equal(step2.isFinal, true);
  assert.equal(step2.isCorrect, true);
  assert.equal(step2.correctWord, "молоко");
});

test("answerCurrent формирует общий результат с wrongIndexes", () => {
  const tasks = [makeTask({ word: "м[ао|о]л[ао|о]ко" })];
  const state = startQuiz(tasks, 1);

  answerCurrent(state, "а");
  const final = answerCurrent(state, "о");
  assert.equal(final.isFinal, true);
  assert.equal(final.isCorrect, false);
  assert.deepEqual(final.wrongIndexes, [0]);
  assert.equal(final.selectedWord, "малоко");
});

test("buildResult считает статистику", () => {
  const tasks = [
    makeTask({ word: "м[ао|о]л[ао|о]ко" }),
    makeTask({ word: "в[ао|о]р[ао|о]на" }),
  ];
  const state = startQuiz(tasks, 2, () => 0);

  answerCurrent(state, "о");
  answerCurrent(state, "о");
  nextTask(state);
  answerCurrent(state, "а");
  answerCurrent(state, "о");

  const result = buildResult(state);
  assert.equal(result.correctCount, 1);
  assert.equal(result.wrongCount, 1);
  assert.equal(result.percent, 50);
});

test("buildQuizTasks сначала берет невыученные слова", () => {
  const tasks = [
    makeTask({ word: "б[аое|е]рег", hint: "1" }),
    makeTask({ word: "л[еио|и]са", hint: "2" }),
    makeTask({ word: "тр[оае|а]ва", hint: "3" }),
  ];
  const selected = buildQuizTasks(tasks, 2, ["берег"], () => 0.1);
  assert.equal(selected.length, 2);
  assert.ok(selected.every((item) => item !== tasks[0]));
});
