import {
  answerCurrent,
  buildQuizTasks,
  buildResult,
  getLearnedKey,
  getTaskParsed,
  getTaskRuntime,
  startQuiz,
  validateTask,
} from "./js/quiz.js";
import { canGoNext, getCurrentTask, nextTask, resetCurrentTask } from "./js/state.js";
import { renderResult, renderSetup, renderTask } from "./js/render.js";

const appNode = document.getElementById("app");

const SUBJECTS_INDEX_URL = "./data/subjects/index.json";
const COUNT_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
  { value: "all", label: "все" },
];
const SETTINGS_KEY = "spellingQuiz.settings";
const LEARNED_WORDS_KEY = "spellingQuiz.learnedWords";

let subjects = [];
let selectedSubjectDir = "";
let selectedDictionaryFile = "";
let selectedCount = "10";
let learnedWords = new Set();
let currentSubject = null;
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
      selectedSubjectDir,
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

async function fetchJson(url, errorMessage) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(errorMessage);
  }
  const text = await response.text();
  return JSON.parse(text);
}

async function loadSubjects() {
  const list = await fetchJson(SUBJECTS_INDEX_URL, "Не удалось загрузить список предметов.");
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("Список предметов пуст или некорректен.");
  }

  return Promise.all(
    list.map(async (subject) => {
      if (!subject || typeof subject.title !== "string" || typeof subject.dir !== "string") {
        throw new Error("Некорректная запись предмета в data/subjects/index.json.");
      }

      const subjectIndex = await fetchJson(
        `./data/subjects/${subject.dir}/index.json`,
        `Не удалось загрузить словари предмета: ${subject.title}`,
      );

      if (!Array.isArray(subjectIndex) || subjectIndex.length === 0) {
        throw new Error(`Список словарей пуст для предмета: ${subject.title}`);
      }

      const dictionaries = await Promise.all(
        subjectIndex.map(async (item) => {
          if (!item || typeof item.file !== "string" || typeof item.title !== "string") {
            throw new Error(`Некорректная запись словаря для предмета: ${subject.title}`);
          }

          const dictionary = await fetchJson(
            `./data/subjects/${subject.dir}/dictionaries/${item.file}`,
            `Не удалось загрузить словарь: ${item.file}`,
          );

          if (!dictionary || !Array.isArray(dictionary.tasks) || dictionary.tasks.length === 0) {
            throw new Error(`Словарь ${item.file} не содержит tasks.`);
          }

          try {
            dictionary.tasks.forEach(validateTask);
          } catch (error) {
            throw new Error(
              `Ошибка в файле "${item.file}" (предмет "${subject.title}"): ${error.message}`,
            );
          }

          return {
            file: item.file,
            title: dictionary.title ?? item.title,
            description: dictionary.description ?? "",
            tasks: dictionary.tasks,
          };
        }),
      );

      return {
        title: subject.title,
        dir: subject.dir,
        dictionaries,
      };
    }),
  );
}

function getSelectedSubject() {
  return subjects.find((item) => item.dir === selectedSubjectDir) ?? subjects[0];
}

function getSelectedDictionary(subject) {
  return subject.dictionaries.find((item) => item.file === selectedDictionaryFile) ?? subject.dictionaries[0];
}

function renderSetupScreen() {
  const subject = getSelectedSubject();
  const dictionaries = subject.dictionaries;

  renderSetup(appNode, {
    subjects: subjects.map((item) => ({ title: item.title, dir: item.dir })),
    dictionaries: dictionaries.map((item) => ({
      file: item.file,
      title: item.title,
      description: item.description,
      taskCount: item.tasks.length,
    })),
    selectedSubjectDir,
    selectedDictionaryFile,
    selectedCount,
    countOptions: COUNT_OPTIONS,
  });

  appNode.querySelector(".setup-subject-list").addEventListener("click", onSubjectSelect);
  appNode.querySelector(".setup-dictionary-list").addEventListener("click", onDictionarySelect);
  appNode.querySelector(".setup-chips").addEventListener("click", onCountSelect);
  appNode.querySelector("#startBtn").addEventListener("click", startNewQuiz);
}

function onSubjectSelect(event) {
  const button = event.target.closest("[data-subject-dir]");
  if (!button) return;
  selectedSubjectDir = button.dataset.subjectDir;
  const subject = getSelectedSubject();
  selectedDictionaryFile = subject.dictionaries[0]?.file ?? "";
  writeSettings();
  renderSetupScreen();
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
  currentSubject = getSelectedSubject();
  currentDictionary = getSelectedDictionary(currentSubject);
  selectedDictionaryFile = currentDictionary.file;
  writeSettings();

  const requestedCount = resolveRequestedCount(selectedCount, currentDictionary.tasks.length);
  const pickedTasks = buildQuizTasks(currentDictionary.tasks, requestedCount, [...learnedWords]);
  quizState = startQuiz(pickedTasks, pickedTasks.length);
  renderCurrentTask();
  playAudioWithDelay();
}

function renderCurrentTask() {
  const task = getCurrentTask(quizState);
  const parsed = getTaskParsed(task);
  const runtime = getTaskRuntime(task);

  renderTask(appNode, {
    task,
    parsed,
    runtime,
    index: quizState.currentIndex,
    total: quizState.allTasks.length,
    outcome: quizState.currentOutcome,
    nextEnabled: canGoNext(quizState),
    currentSelections: quizState.currentSelections,
    currentStepIndex: quizState.currentStepIndex,
    dictionaryTitle: currentDictionary.title,
  });
}

function playAudioWithDelay() {
  const task = getCurrentTask(quizState);
  const parsed = getTaskParsed(task);

  if (task.type === "audioToWord" && parsed.audioSrc && !quizState.currentOutcome) {
    setTimeout(() => {
      const audioElement = document.querySelector('.audio-wrap audio');
      if (audioElement) {
        audioElement.play().catch(err => {
          console.log('Autoplay prevented:', err);
        });
      }
    }, 300);
  }
}

function submitAnswer(input) {
  const result = answerCurrent(quizState, input);
  if (result.isFinal && result.isCorrect) {
    const task = getCurrentTask(quizState);
    learnedWords.add(getLearnedKey(task));
    writeLearnedWords();
  }
  renderCurrentTask();
}

// Global event delegation for option buttons
appNode.addEventListener("click", (event) => {
  const target = event.target;
  const button = target.closest(".option-btn");

  if (!button || quizState?.currentOutcome) return;

  if (button.dataset.letter) {
    submitAnswer({ letter: button.dataset.letter });
  } else if (button.dataset.answerIndex !== undefined) {
    submitAnswer({ index: Number(button.dataset.answerIndex) });
  } else if (button.dataset.letterIndex !== undefined) {
    submitAnswer({ letterIndex: Number(button.dataset.letterIndex) });
  }
});

// Global event delegation for next button
appNode.addEventListener("click", (event) => {
  if (event.target.closest("#nextBtn") && quizState) {
    onNextClick();
  }
});

// Global event delegation for clear button
appNode.addEventListener("click", (event) => {
  if (event.target.closest("#clearBtn") && quizState && !quizState.currentOutcome) {
    resetCurrentTask(quizState);
    renderCurrentTask();
  }
});

// Global event delegation for pair check button
appNode.addEventListener("click", (event) => {
  const target = event.target;
  const button = target.closest("#pairCheckBtn");

  if (!button || quizState?.currentOutcome) return;

  try {
    const mapping = {};
    appNode.querySelectorAll(".pair-select").forEach((select) => {
      mapping[select.dataset.left] = select.value;
    });
    submitAnswer({ mapping });
  } catch (error) {
    // Display error to user
    const feedback = document.getElementById("feedback");
    if (feedback) {
      feedback.className = "feedback error";
      feedback.innerHTML = `<h3 class="feedback-title">Ошибка</h3><p>${escapeHtml(error.message)}</p>`;
    }
    console.error("Pair check error:", error);
  }
});

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Global event delegation for restart and change dictionary buttons
appNode.addEventListener("click", (event) => {
  const target = event.target;
  const restartBtn = target.closest("#restartBtn");
  const changeDictBtn = target.closest("#changeDictionaryBtn");

  if (restartBtn) {
    startNewQuiz();
  } else if (changeDictBtn) {
    renderSetupScreen();
  }
});

function onNextClick() {
  nextTask(quizState);

  if (quizState.isFinished) {
    const result = buildResult(quizState);
    renderResult(appNode, {
      ...result,
      subjectTitle: currentSubject.title,
      dictionaryTitle: currentDictionary.title,
    });
    return;
  }

  renderCurrentTask();
  playAudioWithDelay();
}

async function bootstrap() {
  try {
    subjects = await loadSubjects();
    learnedWords = new Set(readLearnedWords());

    const saved = readSettings();
    selectedSubjectDir = saved?.selectedSubjectDir ?? subjects[0].dir;
    selectedCount = saved?.selectedCount ?? "10";

    if (!subjects.some((item) => item.dir === selectedSubjectDir)) {
      selectedSubjectDir = subjects[0].dir;
    }

    const activeSubject = getSelectedSubject();
    selectedDictionaryFile = saved?.selectedDictionaryFile ?? activeSubject.dictionaries[0].file;
    if (!activeSubject.dictionaries.some((item) => item.file === selectedDictionaryFile)) {
      selectedDictionaryFile = activeSubject.dictionaries[0].file;
    }

    if (!COUNT_OPTIONS.some((item) => item.value === selectedCount)) {
      selectedCount = "10";
    }

    renderSetupScreen();
  } catch (error) {
    appNode.innerHTML = `<p class="error">Ошибка загрузки: ${error.message}</p>`;
  }
}

bootstrap();
