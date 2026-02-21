export function shuffleArray(items, randomFn = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(randomFn() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickRandomTasks(tasks, count = 10, randomFn = Math.random) {
  if (!Array.isArray(tasks) || tasks.length < count) {
    throw new Error("Недостаточно заданий для запуска теста.");
  }
  return shuffleArray(tasks, randomFn).slice(0, count);
}

export function createQuizState(allTasks) {
  return {
    allTasks,
    currentIndex: 0,
    answers: [],
    currentSelections: [],
    currentStepIndex: 0,
    currentOutcome: null,
    isFinished: false,
  };
}

export function getCurrentTask(state) {
  return state.allTasks[state.currentIndex] ?? null;
}

export function canGoNext(state) {
  return Boolean(state.currentOutcome);
}

export function nextTask(state) {
  if (!state.currentOutcome) {
    throw new Error("Нельзя перейти дальше без ответа.");
  }

  if (state.currentIndex >= state.allTasks.length - 1) {
    state.isFinished = true;
    return state;
  }

  state.currentIndex += 1;
  state.currentSelections = [];
  state.currentStepIndex = 0;
  state.currentOutcome = null;
  return state;
}

export function resetCurrentTask(state) {
  state.currentSelections = [];
  state.currentStepIndex = 0;
  state.currentOutcome = null;
  return state;
}
