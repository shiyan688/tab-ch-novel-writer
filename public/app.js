const API_CONFIG_KEY = "novel-editor-api-config-v2";
const PROJECT_STORAGE_KEY = "novel-editor-project-v2";
const AUTO_TAB_ENABLED_KEY = "novel-editor-auto-tab-enabled-v1";
const AUTOSAVE_MS = 600;
const COMPLETION_DEBOUNCE_MS = 900;
const MIN_CONTEXT_LENGTH = 8;
const MAX_CONTEXT_CHARS = 3000;
const TAB_MAX_TOKENS = 56;
const AUTO_MIN_INTERVAL_MS = 6000;
const AUTO_MAX_PER_MINUTE = 5;
const AUTO_WINDOW_MS = 60 * 1000;

const apiBaseUrlInput = document.getElementById("apiBaseUrl");
const apiKeyInput = document.getElementById("apiKey");
const modelInput = document.getElementById("model");
const chapterModelInput = document.getElementById("chapterModel");
const saveApiConfigBtn = document.getElementById("saveApiConfig");
const clearApiConfigBtn = document.getElementById("clearApiConfig");

const novelTitleInput = document.getElementById("novelTitle");
const chapterTitleInput = document.getElementById("chapterTitle");
const characterSettingInput = document.getElementById("characterSetting");
const chapterSettingInput = document.getElementById("chapterSetting");
const editorStack = document.getElementById("editorStack");
const editor = document.getElementById("editor");
const ghostSuggestionEl = document.getElementById("ghostSuggestion");

const addChapterBtn = document.getElementById("addChapterBtn");
const deleteChapterBtn = document.getElementById("deleteChapterBtn");
const chapterListEl = document.getElementById("chapterList");

const exportTxtBtn = document.getElementById("exportTxtBtn");
const exportMdBtn = document.getElementById("exportMdBtn");
const chooseFolderBtn = document.getElementById("chooseFolderBtn");
const exportFolderBtn = document.getElementById("exportFolderBtn");
const importFolderBtn = document.getElementById("importFolderBtn");

const statusEl = document.getElementById("status");
const autosaveInfoEl = document.getElementById("autosaveInfo");
const suggestionPreviewEl = document.getElementById("suggestionPreview");
const folderInfoEl = document.getElementById("folderInfo");
const chapterTargetCharsInput = document.getElementById("chapterTargetChars");
const continueChapterBtn = document.getElementById("continueChapterBtn");
const autoTabToggleBtn = document.getElementById("autoTabToggleBtn");

let project = createDefaultProject();
let suggestion = "";
let completionDebounceTimer = null;
let autosaveTimer = null;
let inFlightAbortController = null;
let chapterAbortController = null;
let defaultsLoaded = false;
let selectedFolderHandle = null;
let autoTabEnabled = false;
let isComposing = false;
let lastAutoRequestAt = 0;
let autoRequestTimestamps = [];
let lastAutoContextHash = "";

initialize().catch((err) => {
  setStatus(`状态：初始化失败 - ${err.message}`);
});

async function initialize() {
  bindEvents();
  loadAutoTabState();
  renderAutoTabToggle();
  loadApiConfigFromLocal();
  await loadServerDefaults();
  loadProjectFromLocal();
  renderProject();
  defaultsLoaded = true;
  setStatus("状态：就绪");
  autosaveInfoEl.textContent = "自动保存：就绪";
}

function bindEvents() {
  saveApiConfigBtn.addEventListener("click", () => {
    saveApiConfigToLocal();
    setStatus("状态：API 配置已保存");
  });

  clearApiConfigBtn.addEventListener("click", () => {
    apiKeyInput.value = "";
    saveApiConfigToLocal();
    setStatus("状态：API Key 已清空");
  });

  autoTabToggleBtn.addEventListener("click", () => {
    autoTabEnabled = !autoTabEnabled;
    persistAutoTabState();
    renderAutoTabToggle();
    setStatus(autoTabEnabled ? "状态：自动 Tab 已开启" : "状态：自动 Tab 已关闭");
  });

  continueChapterBtn.addEventListener("click", async () => {
    await requestChapterContinuation();
  });

  novelTitleInput.addEventListener("input", () => {
    project.title = novelTitleInput.value;
    queueAutosave();
  });

  characterSettingInput.addEventListener("input", () => {
    project.characterSetting = characterSettingInput.value;
    queueAutosave();
    triggerDebouncedCompletion();
  });

  chapterTitleInput.addEventListener("input", () => {
    const chapter = getCurrentChapter();
    chapter.title = chapterTitleInput.value;
    chapter.updatedAt = Date.now();
    renderChapterList();
    queueAutosave();
  });

  chapterSettingInput.addEventListener("input", () => {
    const chapter = getCurrentChapter();
    chapter.setting = chapterSettingInput.value;
    chapter.updatedAt = Date.now();
    queueAutosave();
    triggerDebouncedCompletion();
  });

  editor.addEventListener("input", () => {
    const chapter = getCurrentChapter();
    chapter.content = editor.value;
    chapter.updatedAt = Date.now();
    clearSuggestion();
    queueAutosave();
    triggerDebouncedCompletion();
  });

  editor.addEventListener("compositionstart", () => {
    isComposing = true;
  });

  editor.addEventListener("compositionend", () => {
    isComposing = false;
    triggerDebouncedCompletion();
  });

  editor.addEventListener("click", clearSuggestion);
  editor.addEventListener("scroll", () => {
    if (suggestion) {
      renderSuggestion();
    }
  });
  editor.addEventListener("keyup", (event) => {
    if (
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight" ||
      event.key === "ArrowUp" ||
      event.key === "ArrowDown"
    ) {
      clearSuggestion();
    }
  });

  editor.addEventListener("keydown", (event) => {
    if (event.key === "Tab" && suggestion) {
      event.preventDefault();
      acceptSuggestion();
      return;
    }

    if (event.key === "Escape") {
      clearSuggestion();
      setStatus("状态：已取消建议");
      return;
    }

    if (event.key === " " && event.ctrlKey) {
      event.preventDefault();
      requestCompletion({ reason: "manual" });
    }
  });

  addChapterBtn.addEventListener("click", () => {
    const chapter = createChapter(`第${project.chapters.length + 1}章`);
    project.chapters.push(chapter);
    project.currentChapterId = chapter.id;
    renderChapterList();
    renderCurrentChapter();
    queueAutosave();
    setStatus("状态：已新建章节");
    editor.focus();
  });

  deleteChapterBtn.addEventListener("click", () => {
    if (project.chapters.length <= 1) {
      const chapter = getCurrentChapter();
      chapter.content = "";
      chapter.setting = "";
      chapter.title = "第1章";
      renderCurrentChapter();
      queueAutosave();
      setStatus("状态：至少保留一个章节，已清空当前章节内容");
      return;
    }

    const currentId = project.currentChapterId;
    const index = project.chapters.findIndex((item) => item.id === currentId);
    project.chapters = project.chapters.filter((item) => item.id !== currentId);

    const nextIndex = Math.max(0, index - 1);
    project.currentChapterId = project.chapters[nextIndex].id;
    renderChapterList();
    renderCurrentChapter();
    queueAutosave();
    setStatus("状态：章节已删除");
  });

  chapterListEl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-chapter-id]");
    if (!button) return;

    const nextId = button.dataset.chapterId;
    if (!nextId || nextId === project.currentChapterId) return;

    project.currentChapterId = nextId;
    renderChapterList();
    renderCurrentChapter();
    clearSuggestion();
    setStatus("状态：已切换章节");
  });

  exportTxtBtn.addEventListener("click", () => {
    const text = buildNovelText(project);
    const fileName = `${safeFileName(project.title || "novel")}.txt`;
    downloadText(fileName, text, "text/plain;charset=utf-8");
    setStatus("状态：已导出 TXT");
  });

  exportMdBtn.addEventListener("click", () => {
    const markdown = buildNovelMarkdown(project);
    const fileName = `${safeFileName(project.title || "novel")}.md`;
    downloadText(fileName, markdown, "text/markdown;charset=utf-8");
    setStatus("状态：已导出 MD");
  });

  chooseFolderBtn.addEventListener("click", async () => {
    await chooseFolder();
  });

  exportFolderBtn.addEventListener("click", async () => {
    await exportToFolder();
  });

  importFolderBtn.addEventListener("click", async () => {
    await importFromFolder();
  });

  window.addEventListener("resize", () => {
    if (suggestion) {
      renderSuggestion();
    }
  });
}

function createDefaultProject() {
  const chapter = createChapter("第1章");
  return {
    title: "未命名小说",
    characterSetting: "",
    chapters: [chapter],
    currentChapterId: chapter.id,
    updatedAt: Date.now()
  };
}

function createChapter(title) {
  return {
    id: createId(),
    title,
    setting: "",
    content: "",
    updatedAt: Date.now()
  };
}

function createId() {
  const random = Math.random().toString(36).slice(2, 8);
  return `ch_${Date.now()}_${random}`;
}

function getCurrentChapter() {
  const chapter = project.chapters.find((item) => item.id === project.currentChapterId);
  if (chapter) return chapter;

  project.currentChapterId = project.chapters[0].id;
  return project.chapters[0];
}

function renderProject() {
  novelTitleInput.value = project.title;
  characterSettingInput.value = project.characterSetting;
  renderChapterList();
  renderCurrentChapter();
}

function renderChapterList() {
  chapterListEl.innerHTML = "";

  project.chapters.forEach((chapter, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chapter-item";
    if (chapter.id === project.currentChapterId) {
      button.classList.add("active");
    }
    button.dataset.chapterId = chapter.id;
    const title = chapter.title?.trim() || `第${index + 1}章`;
    button.textContent = `${index + 1}. ${title}`;
    chapterListEl.appendChild(button);
  });
}

function renderCurrentChapter() {
  const chapter = getCurrentChapter();
  chapterTitleInput.value = chapter.title || "";
  chapterSettingInput.value = chapter.setting || "";
  editor.value = chapter.content || "";
  clearSuggestion();
}

function queueAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    saveProjectToLocal();
  }, AUTOSAVE_MS);
}

function saveProjectToLocal() {
  project.updatedAt = Date.now();
  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
  autosaveInfoEl.textContent = `自动保存：${formatTime(project.updatedAt)}`;
}

function loadProjectFromLocal() {
  const raw = localStorage.getItem(PROJECT_STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    project = sanitizeProject(parsed);
  } catch {
    project = createDefaultProject();
  }
}

function sanitizeProject(value) {
  if (!value || typeof value !== "object") return createDefaultProject();

  const chapters = Array.isArray(value.chapters)
    ? value.chapters.map((item, index) => sanitizeChapter(item, index)).filter(Boolean)
    : [];

  if (!chapters.length) {
    chapters.push(createChapter("第1章"));
  }

  let currentChapterId =
    typeof value.currentChapterId === "string" ? value.currentChapterId : chapters[0].id;

  if (!chapters.some((item) => item.id === currentChapterId)) {
    currentChapterId = chapters[0].id;
  }

  return {
    title: asText(value.title, "未命名小说"),
    characterSetting: asText(value.characterSetting),
    chapters,
    currentChapterId,
    updatedAt: Number(value.updatedAt) || Date.now()
  };
}

function sanitizeChapter(value, index) {
  if (!value || typeof value !== "object") return null;

  return {
    id: asText(value.id, createId()),
    title: asText(value.title, `第${index + 1}章`),
    setting: asText(value.setting),
    content: asText(value.content),
    updatedAt: Number(value.updatedAt) || Date.now()
  };
}

function asText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function loadAutoTabState() {
  const raw = localStorage.getItem(AUTO_TAB_ENABLED_KEY);
  autoTabEnabled = raw === "1";
}

function persistAutoTabState() {
  localStorage.setItem(AUTO_TAB_ENABLED_KEY, autoTabEnabled ? "1" : "0");
}

function renderAutoTabToggle() {
  autoTabToggleBtn.textContent = autoTabEnabled ? "自动 Tab：开" : "自动 Tab：关";
  autoTabToggleBtn.classList.toggle("auto-on", autoTabEnabled);
}

function loadApiConfigFromLocal() {
  const raw = localStorage.getItem(API_CONFIG_KEY);
  if (!raw) return;

  try {
    const config = JSON.parse(raw);
    apiBaseUrlInput.value = asText(config.apiBaseUrl);
    apiKeyInput.value = asText(config.apiKey);
    modelInput.value = asText(config.model);
    chapterModelInput.value = asText(config.chapterModel);
  } catch {
    // ignore corrupted local config
  }
}

async function loadServerDefaults() {
  try {
    const response = await fetch("/api/default-config");
    const config = await response.json();

    if (!apiBaseUrlInput.value.trim()) {
      apiBaseUrlInput.value = asText(config.apiBaseUrl, "https://api.openai.com/v1");
    }

    if (!modelInput.value.trim()) {
      modelInput.value = asText(config.model, "gpt-4o-mini");
    }

    if (!chapterModelInput.value.trim()) {
      chapterModelInput.value = asText(config.chapterModel, "gpt-4.1-mini");
    }
  } catch {
    if (!apiBaseUrlInput.value.trim()) {
      apiBaseUrlInput.value = "https://api.openai.com/v1";
    }
    if (!modelInput.value.trim()) {
      modelInput.value = "gpt-4o-mini";
    }
    if (!chapterModelInput.value.trim()) {
      chapterModelInput.value = "gpt-4.1-mini";
    }
  }
}

function saveApiConfigToLocal() {
  const config = {
    apiBaseUrl: apiBaseUrlInput.value.trim(),
    apiKey: apiKeyInput.value.trim(),
    model: modelInput.value.trim(),
    chapterModel: chapterModelInput.value.trim()
  };

  localStorage.setItem(API_CONFIG_KEY, JSON.stringify(config));
}

function triggerDebouncedCompletion() {
  if (!defaultsLoaded) return;
  if (!autoTabEnabled) return;

  clearTimeout(completionDebounceTimer);
  completionDebounceTimer = setTimeout(() => {
    requestCompletion({ reason: "auto" });
  }, COMPLETION_DEBOUNCE_MS);
}

async function requestCompletion(options = {}) {
  if (!defaultsLoaded) return;
  const reason = options.reason || "manual";
  const isAuto = reason === "auto";

  const chapter = getCurrentChapter();
  const cursor = editor.selectionStart;
  const selectionStart = editor.selectionStart;
  const selectionEnd = editor.selectionEnd;

  if (isAuto) {
    if (!autoTabEnabled) return;
    if (selectionStart !== selectionEnd) return;
    if (isComposing) return;
    if (suggestion) return;
  }

  const beforeCursor = chapter.content.slice(0, cursor);
  const context = beforeCursor.slice(-MAX_CONTEXT_CHARS);

  if (context.trim().length < MIN_CONTEXT_LENGTH) {
    clearSuggestion();
    if (!isAuto) {
      setStatus("状态：继续输入以触发补全");
    }
    return;
  }

  let contextHash = "";
  if (isAuto) {
    contextHash = hashText(
      `${project.currentChapterId}|${selectionStart}|${context.slice(-800)}|${chapter.setting.slice(-200)}|${project.characterSetting.slice(-200)}`
    );
    if (contextHash === lastAutoContextHash) return;

    const now = Date.now();
    if (now - lastAutoRequestAt < AUTO_MIN_INTERVAL_MS) return;

    autoRequestTimestamps = autoRequestTimestamps.filter(
      (item) => now - item < AUTO_WINDOW_MS
    );
    if (autoRequestTimestamps.length >= AUTO_MAX_PER_MINUTE) return;

    lastAutoRequestAt = now;
    autoRequestTimestamps.push(now);
    lastAutoContextHash = contextHash;
  }

  if (inFlightAbortController) {
    if (isAuto) return;
    inFlightAbortController.abort();
  }

  inFlightAbortController = new AbortController();
  setStatus("状态：正在生成建议...");

  try {
    const response = await fetch("/api/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: inFlightAbortController.signal,
      body: JSON.stringify({
        context,
        apiBaseUrl: apiBaseUrlInput.value.trim(),
        apiKey: apiKeyInput.value.trim(),
        model: modelInput.value.trim(),
        maxTokens: TAB_MAX_TOKENS,
        novelTitle: project.title,
        chapterTitle: chapter.title,
        chapterSetting: chapter.setting,
        characterSetting: project.characterSetting,
        paragraphMemory: collectParagraphMemory(chapter.content, cursor)
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "补全请求失败");
    }

    const normalized = normalizeSuggestion(payload.suggestion, context);
    if (!normalized) {
      clearSuggestion();
      setStatus("状态：未生成可用建议");
      return;
    }

    suggestion = normalized;
    renderSuggestion();
    setStatus("状态：建议已生成，按 Tab 接受");
  } catch (err) {
    if (err.name === "AbortError") return;
    clearSuggestion();
    setStatus(`状态：请求失败 - ${err.message}`);
  } finally {
    inFlightAbortController = null;
  }
}

async function requestChapterContinuation() {
  if (!defaultsLoaded) return;
  if (chapterAbortController) return;

  const chapter = getCurrentChapter();
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const beforeCursor = chapter.content.slice(0, start);
  const context = beforeCursor.slice(-6000);

  if (!context.trim() && !chapter.setting.trim() && !project.characterSetting.trim()) {
    setStatus("状态：请先输入正文或设定，再执行整章续写");
    return;
  }

  const targetChars = clampInt(chapterTargetCharsInput.value, 300, 5000, 1200);
  chapterTargetCharsInput.value = String(targetChars);
  chapterAbortController = new AbortController();
  setContinueChapterBusy(true);
  setStatus("状态：正在续写完整章节...");

  try {
    const response = await fetch("/api/continue-chapter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: chapterAbortController.signal,
      body: JSON.stringify({
        context,
        apiBaseUrl: apiBaseUrlInput.value.trim(),
        apiKey: apiKeyInput.value.trim(),
        chapterModel: chapterModelInput.value.trim(),
        targetChars,
        novelTitle: project.title,
        chapterTitle: chapter.title,
        chapterSetting: chapter.setting,
        characterSetting: project.characterSetting
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "整章续写失败");
    }

    const longText = normalizeLongContinuation(payload.content || "");
    if (!longText) {
      setStatus("状态：未生成可用的整章内容");
      return;
    }

    const insertText = formatChapterInsertion(beforeCursor, longText);
    editor.setRangeText(insertText, start, end, "end");
    chapter.content = editor.value;
    chapter.updatedAt = Date.now();
    clearSuggestion();
    queueAutosave();
    setStatus("状态：整章续写已插入");
  } catch (err) {
    if (err.name === "AbortError") {
      setStatus("状态：已取消整章续写");
      return;
    }
    setStatus(`状态：整章续写失败 - ${err.message}`);
  } finally {
    chapterAbortController = null;
    setContinueChapterBusy(false);
  }
}

function collectParagraphMemory(content, cursor) {
  const beforeText = content.slice(0, cursor);
  const afterText = content.slice(cursor);

  return {
    before: splitParagraphs(beforeText).slice(-4),
    after: splitParagraphs(afterText).slice(0, 2)
  };
}

function splitParagraphs(text) {
  return text
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSuggestion(raw, context) {
  let text = String(raw || "")
    .replace(/\r/g, "")
    .trim();

  if (!text) return "";

  for (let i = Math.min(40, text.length, context.length); i >= 1; i -= 1) {
    if (text.startsWith(context.slice(-i))) {
      text = text.slice(i).trimStart();
      break;
    }
  }

  return text.slice(0, 160);
}

function normalizeLongContinuation(raw) {
  return String(raw || "")
    .replace(/\r/g, "")
    .replace(/^```[\s\S]*?\n/, "")
    .replace(/```$/, "")
    .trim()
    .slice(0, 12000);
}

function formatChapterInsertion(beforeCursor, longText) {
  let prefix = "";
  if (beforeCursor && !/\s$/.test(beforeCursor)) {
    prefix = "\n";
  }
  return `${prefix}${longText}`;
}

function acceptSuggestion() {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  editor.setRangeText(suggestion, start, end, "end");

  const chapter = getCurrentChapter();
  chapter.content = editor.value;
  chapter.updatedAt = Date.now();

  clearSuggestion();
  queueAutosave();
  triggerDebouncedCompletion();
  setStatus("状态：已插入建议");
}

function clearSuggestion() {
  suggestion = "";
  renderSuggestion();
}

function renderSuggestion() {
  suggestionPreviewEl.textContent = suggestion ? `建议：${suggestion}` : "";

  if (!suggestion) {
    hideGhostSuggestion();
    return;
  }

  const caret = getCaretCoordinates(editor, editor.selectionStart);
  const style = window.getComputedStyle(editor);
  const paddingRight = Number.parseFloat(style.paddingRight) || 12;
  const left = Math.max(0, Math.round(caret.left));
  const top = Math.max(0, Math.round(caret.top));
  const maxWidth = Math.max(80, editor.clientWidth - left - paddingRight);

  ghostSuggestionEl.textContent = suggestion;
  ghostSuggestionEl.style.left = `${left}px`;
  ghostSuggestionEl.style.top = `${top}px`;
  ghostSuggestionEl.style.maxWidth = `${maxWidth}px`;
  ghostSuggestionEl.classList.add("visible");
}

function setStatus(text) {
  statusEl.textContent = text;
}

function setContinueChapterBusy(isBusy) {
  continueChapterBtn.disabled = isBusy;
  continueChapterBtn.textContent = isBusy ? "续写中..." : "续写完整章";
}

function formatTime(timeMs) {
  return new Date(timeMs).toLocaleTimeString("zh-CN", { hour12: false });
}

function safeFileName(name) {
  const cleaned = String(name || "novel")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || "novel";
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function hashText(value) {
  const input = String(value || "");
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  return (hash >>> 0).toString(16);
}

function buildNovelText(targetProject) {
  const lines = [];
  lines.push(targetProject.title || "未命名小说");
  lines.push("");
  lines.push("[人物设定]");
  lines.push(targetProject.characterSetting?.trim() || "(无)");
  lines.push("");

  targetProject.chapters.forEach((chapter, index) => {
    lines.push(`第${index + 1}章 ${chapter.title || `第${index + 1}章`}`);
    lines.push("");
    lines.push("[章节设定]");
    lines.push(chapter.setting?.trim() || "(无)");
    lines.push("");
    lines.push("[正文]");
    lines.push(chapter.content?.trim() || "");
    lines.push("");
  });

  return lines.join("\n");
}

function buildNovelMarkdown(targetProject) {
  const chunks = [];
  chunks.push(`# ${targetProject.title || "未命名小说"}`);
  chunks.push("");
  chunks.push("## Character Notes");
  chunks.push(targetProject.characterSetting?.trim() || "(empty)");
  chunks.push("");

  targetProject.chapters.forEach((chapter, index) => {
    chunks.push(`## Chapter ${index + 1}: ${chapter.title || `Chapter ${index + 1}`}`);
    chunks.push("");
    chunks.push("### Chapter Notes");
    chunks.push(chapter.setting?.trim() || "(empty)");
    chunks.push("");
    chunks.push("### Content");
    chunks.push(chapter.content?.trim() || "");
    chunks.push("");
  });

  return chunks.join("\n");
}

function buildSingleChapterMarkdown(chapter, index) {
  return [
    `# ${chapter.title || `Chapter ${index + 1}`}`,
    "",
    "## Chapter Notes",
    chapter.setting?.trim() || "(empty)",
    "",
    "## Content",
    chapter.content?.trim() || "",
    ""
  ].join("\n");
}

function downloadText(fileName, text, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function chooseFolder() {
  if (!("showDirectoryPicker" in window)) {
    setStatus("状态：当前浏览器不支持打开文件夹 API");
    return null;
  }

  try {
    selectedFolderHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    folderInfoEl.textContent = `文件夹：${selectedFolderHandle.name}`;
    setStatus("状态：已选择文件夹");
    return selectedFolderHandle;
  } catch (err) {
    if (err.name !== "AbortError") {
      setStatus(`状态：打开文件夹失败 - ${err.message}`);
    }
    return null;
  }
}

async function exportToFolder() {
  const rootHandle = selectedFolderHandle || (await chooseFolder());
  if (!rootHandle) return;

  const folderName = safeFileName(project.title || "novel");

  try {
    const novelDir = await rootHandle.getDirectoryHandle(folderName, { create: true });
    await writeTextFile(novelDir, "novel.md", buildNovelMarkdown(project));
    await writeTextFile(novelDir, "novel.txt", buildNovelText(project));

    for (let i = 0; i < project.chapters.length; i += 1) {
      const chapter = project.chapters[i];
      const fileName = `${String(i + 1).padStart(2, "0")}-${safeFileName(chapter.title || `chapter-${i + 1}`)}.md`;
      const content = buildSingleChapterMarkdown(chapter, i);
      await writeTextFile(novelDir, fileName, content);
    }

    setStatus(`状态：已导出到文件夹 ${rootHandle.name}/${folderName}`);
  } catch (err) {
    setStatus(`状态：导出到文件夹失败 - ${err.message}`);
  }
}

async function importFromFolder() {
  if (!("showDirectoryPicker" in window)) {
    setStatus("状态：当前浏览器不支持从文件夹导入");
    return;
  }

  let folderHandle;
  try {
    folderHandle = await window.showDirectoryPicker({ mode: "read" });
  } catch (err) {
    if (err.name !== "AbortError") {
      setStatus(`状态：打开文件夹失败 - ${err.message}`);
    }
    return;
  }

  selectedFolderHandle = folderHandle;
  folderInfoEl.textContent = `文件夹：${folderHandle.name}`;

  try {
    const files = await listTextFiles(folderHandle);
    if (!files.length) {
      setStatus("状态：文件夹中没有可导入的 .md/.txt 文件");
      return;
    }

    const metadata = await parseMetadataFile(files);
    const chapterFiles = pickChapterFiles(files);

    if (!chapterFiles.length) {
      setStatus("状态：未找到章节文件，请确保文件名类似 01-xxx.md");
      return;
    }

    const chapters = [];
    for (let i = 0; i < chapterFiles.length; i += 1) {
      const fileItem = chapterFiles[i];
      const file = await fileItem.handle.getFile();
      const text = await file.text();
      const chapter = parseChapterFile(fileItem.name, text, i + 1);
      chapters.push(chapter);
    }

    const normalizedChapters = chapters.length ? chapters : [createChapter("第1章")];

    project = {
      title: metadata.title || folderHandle.name || "未命名小说",
      characterSetting: metadata.characterSetting || "",
      chapters: normalizedChapters,
      currentChapterId: normalizedChapters[0].id,
      updatedAt: Date.now()
    };

    if (!project.chapters.some((item) => item.id === project.currentChapterId)) {
      project.currentChapterId = project.chapters[0].id;
    }

    renderProject();
    clearSuggestion();
    queueAutosave();
    setStatus(`状态：已从文件夹导入 ${project.chapters.length} 个章节`);
  } catch (err) {
    setStatus(`状态：导入失败 - ${err.message}`);
  }
}

async function listTextFiles(folderHandle) {
  const output = [];
  for await (const [name, handle] of folderHandle.entries()) {
    if (handle.kind !== "file") continue;
    if (!/\.(md|txt)$/i.test(name)) continue;
    output.push({ name, handle });
  }

  output.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  return output;
}

async function parseMetadataFile(files) {
  const metadataFile = files.find((item) => /^novel\.(md|txt)$/i.test(item.name));
  if (!metadataFile) {
    return { title: "", characterSetting: "" };
  }

  const file = await metadataFile.handle.getFile();
  const text = (await file.text()).replace(/\r/g, "");

  let title = "";
  let characterSetting = "";

  if (/\.md$/i.test(metadataFile.name)) {
    const titleMatch = text.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    const notesMatch = text.match(/##\s*Character Notes\s*\n([\s\S]*?)(\n##\s|$)/i);
    if (notesMatch) {
      characterSetting = notesMatch[1].trim();
      if (characterSetting === "(empty)") characterSetting = "";
    }
  } else {
    const lines = text.split("\n");
    if (lines.length) {
      title = lines[0].trim();
    }

    const notesMatch = text.match(/\[人物设定\]\n([\s\S]*?)(\n\n|$)/);
    if (notesMatch) {
      characterSetting = notesMatch[1].trim();
      if (characterSetting === "(无)") characterSetting = "";
    }
  }

  return { title, characterSetting };
}

function pickChapterFiles(files) {
  let chapterFiles = files.filter((item) => /^\d{2,3}-.+\.(md|txt)$/i.test(item.name));

  if (!chapterFiles.length) {
    chapterFiles = files.filter((item) => !/^novel\.(md|txt)$/i.test(item.name));
  }

  return chapterFiles.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}

function parseChapterFile(fileName, rawText, order) {
  const text = rawText.replace(/\r/g, "").trim();
  const ext = fileName.toLowerCase().endsWith(".md") ? "md" : "txt";

  let title = fileName.replace(/\.[^.]+$/, "");
  let setting = "";
  let content = text;

  if (ext === "md") {
    const titleMatch = text.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    const sectionMatch = text.match(
      /##\s*Chapter Notes\s*\n([\s\S]*?)\n##\s*Content\s*\n([\s\S]*)/i
    );

    if (sectionMatch) {
      setting = sectionMatch[1].trim();
      content = sectionMatch[2].trim();
      if (setting === "(empty)") setting = "";
    } else {
      content = text.replace(/^#.*\n?/, "").trim();
    }
  } else {
    const sectionMatch = text.match(/\[章节设定\]\n([\s\S]*?)\n\n\[正文\]\n([\s\S]*)/);
    if (sectionMatch) {
      setting = sectionMatch[1].trim();
      content = sectionMatch[2].trim();
      if (setting === "(无)") setting = "";
    }
  }

  title = title
    .replace(/^\d{1,3}\s*[-_.]\s*/, "")
    .trim();

  if (!title) {
    title = `第${order}章`;
  }

  return {
    id: createId(),
    title,
    setting,
    content,
    updatedAt: Date.now()
  };
}

async function writeTextFile(directoryHandle, name, content) {
  const fileHandle = await directoryHandle.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

function hideGhostSuggestion() {
  ghostSuggestionEl.classList.remove("visible");
  ghostSuggestionEl.textContent = "";
}

function getCaretCoordinates(textarea, position) {
  const mirror = document.createElement("div");
  const computed = window.getComputedStyle(textarea);

  const properties = [
    "boxSizing",
    "width",
    "height",
    "overflowX",
    "overflowY",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontStyle",
    "fontVariant",
    "fontWeight",
    "fontStretch",
    "fontSize",
    "lineHeight",
    "fontFamily",
    "textAlign",
    "textTransform",
    "textIndent",
    "textDecoration",
    "letterSpacing",
    "wordSpacing",
    "tabSize",
    "whiteSpace"
  ];

  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.left = "-9999px";
  mirror.style.top = "0";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordBreak = "break-word";
  mirror.style.overflow = "hidden";

  properties.forEach((prop) => {
    mirror.style[prop] = computed[prop];
  });

  mirror.textContent = textarea.value.slice(0, position);

  if (mirror.textContent.endsWith("\n")) {
    mirror.textContent += " ";
  }

  const marker = document.createElement("span");
  marker.textContent = textarea.value.slice(position) || "\u200b";
  mirror.appendChild(marker);

  document.body.appendChild(mirror);
  const left = marker.offsetLeft - textarea.scrollLeft;
  const top = marker.offsetTop - textarea.scrollTop;
  document.body.removeChild(mirror);

  return { left, top };
}
