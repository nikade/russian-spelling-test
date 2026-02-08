import test from "node:test";
import assert from "node:assert/strict";
import { answerCurrent, buildResult, startQuiz } from "../js/quiz.js";

function makeTask(id, override = {}) {
  return {
    id: `t-${id}`,
    wordMask: "б..рег",
    correctWord: "берег",
    correctLetter: "е",
    options: ["а", "о", "е"],
    ruleType: "unstressed_vowel",
    hint: "Проверка: берег — берега.",
    ...override,
  };
}

test("startQuiz выбирает 10 заданий", () => {
  const tasks = Array.from({ length: 12 }, (_, i) => makeTask(i));
  const state = startQuiz(tasks, 10);
  assert.equal(state.allTasks.length, 10);
  assert.equal(state.currentIndex, 0);
});

test("answerCurrent возвращает верный результат", () => {
  const tasks = Array.from({ length: 12 }, (_, i) => makeTask(i));
  const state = startQuiz(tasks, 10);
  const outcome = answerCurrent(state, "е");
  assert.equal(outcome.isCorrect, true);
  assert.equal(outcome.message, "Верно");
});

test("answerCurrent возвращает ошибку и запрещает повторный выбор", () => {
  const tasks = Array.from({ length: 12 }, (_, i) => makeTask(i));
  const state = startQuiz(tasks, 10);
  const outcome = answerCurrent(state, "а");
  assert.equal(outcome.isCorrect, false);
  assert.equal(outcome.message, "Ошибка");
  assert.throws(() => answerCurrent(state, "е"), /уже выбран/i);
});

test("buildResult считает статистику", () => {
  const tasks = Array.from({ length: 12 }, (_, i) => makeTask(i));
  const state = startQuiz(tasks, 10);
  answerCurrent(state, "е");
  state.currentOutcome = null;
  answerCurrent(state, "а");
  const result = buildResult(state);

  assert.equal(result.correctCount, 1);
  assert.equal(result.wrongCount, 1);
  assert.equal(result.percent, 50);
  assert.equal(result.wrongItems.length, 1);
});
