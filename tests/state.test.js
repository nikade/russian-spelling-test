import test from "node:test";
import assert from "node:assert/strict";
import { createQuizState, nextTask, pickRandomTasks } from "../js/state.js";

function makeTask(id) {
  return { id: `t-${id}` };
}

test("pickRandomTasks выбрасывает ошибку при нехватке заданий", () => {
  const tasks = Array.from({ length: 5 }, (_, i) => makeTask(i));
  assert.throws(() => pickRandomTasks(tasks, 10), /Недостаточно заданий/i);
});

test("nextTask запрещает переход без ответа", () => {
  const state = createQuizState(Array.from({ length: 2 }, (_, i) => makeTask(i)));
  assert.throws(() => nextTask(state), /без ответа/i);
});

test("nextTask двигает индекс и завершает тест на последнем задании", () => {
  const state = createQuizState(Array.from({ length: 2 }, (_, i) => makeTask(i)));
  state.currentOutcome = { isCorrect: true };
  nextTask(state);
  assert.equal(state.currentIndex, 1);
  assert.equal(state.isFinished, false);

  state.currentOutcome = { isCorrect: false };
  nextTask(state);
  assert.equal(state.isFinished, true);
});
