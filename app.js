import {
  answerCurrent,
  buildQuizTasks,
  buildResult,
  getTaskParsed,
  startQuiz,
  validateTask,
} from "./js/quiz.js";
import { canGoNext, getCurrentTask, nextTask } from "./js/state.js";
import { fillOptionButtons, renderResult, renderSetup, renderTask } from "./js/render.js";

const appNode = document.getElementById("app");

const DICTIONARY_INDEX_URL = "./data/dictionaries/index.json";
const DICTIONARY_BASE_URL = "./data/dictionaries/";
const COUNT_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
  { value: "all", label: "все" },
];
const SETTINGS_KEY = "spellingQuiz.settings";
const LEARNED_WORDS_KEY = "spellingQuiz.learnedWords";

let dictionaries = [];
let selectedDictionaryFile = "";
let selectedCount = "10";
let learnedWords = new Set();
let currentDictionary = null;
let quizState = null;

function readSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeSettings() {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      selectedDictionaryFile,
      selectedCount,
    }),
  );
}

function readLearnedWords() {
  try {
    const raw = localStorage.getItem(LEARNED_WORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeLearnedWords() {
  localStorage.setItem(LEARNED_WORDS_KEY, JSON.stringify([...learnedWords]));
}

function resolveRequestedCount(rawValue, dictionaryLength) {
  if (rawValue === "all") return dictionaryLength;
  const parsed = Number.parseInt(rawValue, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return Math.min(10, dictionaryLength);
  return Math.min(parsed, dictionaryLength);
}

async function loadDictionaries() {
  const indexResponse = await fetch(DICTIONARY_INDEX_URL);
  if (!indexResponse.ok) {
    throw new Error("Не удалось загрузить список словарей.");
  }

  const index = await indexResponse.json();
  if (!index || !Array.isArray(index.dictionaries) || index.dictionaries.length === 0) {
    throw new Error("Список словарей пуст или некорректен.");
  }

  const loaded = await Promise.all(
    index.dictionaries.map(async (item) => {
      if (!item || typeof item.file !== "string" || item.file.trim() === "") {
        throw new Error("В index.json отсутствует file у словаря.");
      }

      const response = await fetch(`${DICTIONARY_BASE_URL}${item.file}`);
      if (!response.ok) {
        throw new Error(`Не удалось загрузить словарь: ${item.file}`);
      }

      const dictionary = await response.json();
      if (!dictionary || typeof dictionary.title !== "string") {
        throw new Error(`Словарь ${item.file} не содержит поле title.`);
      }
      if (!Array.isArray(dictionary.tasks) || dictionary.tasks.length === 0) {
        throw new Error(`Словарь ${item.file} не содержит tasks.`);
      }

      dictionary.tasks.forEach(validateTask);
      return {
        file: item.file,
        title: dictionary.title,
        description: dictionary.description ?? "",
        tasks: dictionary.tasks,
      };
    }),
  );

  return loaded;
}

function getSelectedDictionary() {
  return dictionaries.find((item) => item.file === selectedDictionaryFile) ?? dictionaries[0];
}

function renderSetupScreen() {
  renderSetup(appNode, {
    dictionaries: dictionaries.map((item) => ({
      file: item.file,
      title: item.title,
      description: item.description,
      taskCount: item.tasks.length,
    })),
    selectedDictionaryFile,
    selectedCount,
    countOptions: COUNT_OPTIONS,
  });

  appNode.querySelector(".setup-list").addEventListener("click", onDictionarySelect);
  appNode.querySelector(".setup-chips").addEventListener("click", onCountSelect);
  appNode.querySelector("#startBtn").addEventListener("click", startNewQuiz);
}

function onDictionarySelect(event) {
  const button = event.target.closest("[data-dictionary-file]");
  if (!button) return;
  selectedDictionaryFile = button.dataset.dictionaryFile;
  writeSettings();
  renderSetupScreen();
}

function onCountSelect(event) {
  const button = event.target.closest("[data-quiz-count]");
  if (!button) return;
  selectedCount = button.dataset.quizCount;
  writeSettings();
  renderSetupScreen();
}

function startNewQuiz() {
  currentDictionary = getSelectedDictionary();
  selectedDictionaryFile = currentDictionary.file;
  writeSettings();

  const requestedCount = resolveRequestedCount(selectedCount, currentDictionary.tasks.length);
  const pickedTasks = buildQuizTasks(currentDictionary.tasks, requestedCount, [...learnedWords]);
  quizState = startQuiz(pickedTasks, pickedTasks.length);
  renderCurrentTask();
}

function renderCurrentTask() {
  const task = getCurrentTask(quizState);
  const parsed = getTaskParsed(task);

  renderTask(appNode, {
    task,
    parsed,
    index: quizState.currentIndex,
    total: quizState.allTasks.length,
    outcome: quizState.currentOutcome,
    nextEnabled: canGoNext(quizState),
    currentSelections: quizState.currentSelections,
    currentStepIndex: quizState.currentStepIndex,
  });

  if (!quizState.currentOutcome) {
    const optionsNode = appNode.querySelector("#options");
    const currentOrth = parsed.orthograms[quizState.currentStepIndex];
    fillOptionButtons(optionsNode, currentOrth.options);
    optionsNode.addEventListener("click", onOptionClick);
  }

  appNode.querySelector("#nextBtn").addEventListener("click", onNextClick);
}

function onOptionClick(event) {
  const target = event.target.closest(".option-btn");
  if (!target) return;

  const letter = target.dataset.letter;
  const result = answerCurrent(quizState, letter);
  if (result.isFinal && result.isCorrect) {
    learnedWords.add(result.correctWord);
    writeLearnedWords();
  }
  renderCurrentTask();
}

function onNextClick() {
  nextTask(quizState);

  if (quizState.isFinished) {
    const result = buildResult(quizState);
    renderResult(appNode, {
      ...result,
      dictionaryTitle: currentDictionary.title,
    });
    appNode.querySelector("#restartBtn").addEventListener("click", startNewQuiz);
    appNode.querySelector("#changeDictionaryBtn").addEventListener("click", renderSetupScreen);
    return;
  }

  renderCurrentTask();
}

async function bootstrap() {
  try {
    dictionaries = await loadDictionaries();
    learnedWords = new Set(readLearnedWords());

    const saved = readSettings();
    selectedDictionaryFile = saved?.selectedDictionaryFile ?? dictionaries[0].file;
    selectedCount = saved?.selectedCount ?? "10";

    if (!COUNT_OPTIONS.some((item) => item.value === selectedCount)) {
      selectedCount = "10";
    }
    if (!dictionaries.some((item) => item.file === selectedDictionaryFile)) {
      selectedDictionaryFile = dictionaries[0].file;
    }

    renderSetupScreen();
  } catch (error) {
    appNode.innerHTML = `<p class="error">Ошибка загрузки: ${error.message}</p>`;
  }
}

bootstrap();
