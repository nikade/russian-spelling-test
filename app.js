import { answerCurrent, buildResult, startQuiz } from "./js/quiz.js";
import { canGoNext, getCurrentTask, nextTask } from "./js/state.js";
import { fillOptionButtons, renderResult, renderTask } from "./js/render.js";

const appNode = document.getElementById("app");
const TASKS_URL = "./data/tasks.json";
const TASKS_PER_QUIZ = 10;

let sourceTasks = [];
let quizState = null;

async function loadTasks() {
  const response = await fetch(TASKS_URL);
  if (!response.ok) {
    throw new Error("Не удалось загрузить задания.");
  }
  return response.json();
}

function renderCurrentTask() {
  const task = getCurrentTask(quizState);
  renderTask(appNode, {
    task,
    index: quizState.currentIndex,
    total: quizState.allTasks.length,
    outcome: quizState.currentOutcome,
    nextEnabled: canGoNext(quizState),
  });

  if (!quizState.currentOutcome) {
    const optionsNode = appNode.querySelector("#options");
    fillOptionButtons(optionsNode, task.options);
    optionsNode.addEventListener("click", onOptionClick);
  }

  const nextBtn = appNode.querySelector("#nextBtn");
  nextBtn.addEventListener("click", onNextClick);
}

function onOptionClick(event) {
  const target = event.target.closest(".option-btn");
  if (!target) return;

  const letter = target.dataset.letter;
  answerCurrent(quizState, letter);
  renderCurrentTask();
}

function onNextClick() {
  nextTask(quizState);

  if (quizState.isFinished) {
    const result = buildResult(quizState);
    renderResult(appNode, result);
    appNode.querySelector("#restartBtn").addEventListener("click", startNewQuiz);
    return;
  }

  renderCurrentTask();
}

function startNewQuiz() {
  quizState = startQuiz(sourceTasks, TASKS_PER_QUIZ);
  renderCurrentTask();
}

async function bootstrap() {
  try {
    sourceTasks = await loadTasks();
    startNewQuiz();
  } catch (error) {
    appNode.innerHTML = `<p class="error">Ошибка загрузки: ${error.message}</p>`;
  }
}

bootstrap();
