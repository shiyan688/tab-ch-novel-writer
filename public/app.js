const API_CONFIG_KEY = "novel-editor-api-config-v2";
const PROJECT_STORAGE_KEY = "novel-editor-project-v2";
const AUTO_TAB_ENABLED_KEY = "novel-editor-auto-tab-enabled-v1";
const TAB_SETTINGS_KEY = "novel-editor-tab-settings-v1";
const STYLE_SKILLS_KEY = "novel-editor-style-skills-v1";
const AUTOSAVE_MS = 600;
const FILE_AUTOSAVE_MS = 700;
const MIN_CONTEXT_LENGTH = 8;
const MAX_CONTEXT_CHARS = 3000;
const TAB_CONTEXT_CHARS = 420;
const AUTO_WINDOW_MS = 60 * 1000;
const FILE_MEMORY_SUFFIX = ".memory.json";
const DEFAULT_TAB_SETTINGS = {
  maxTokens: 56,
  inputPauseMs: 900,
  autoMinIntervalMs: 6000,
  autoMaxPerMinute: 5
};
const DEFAULT_STYLE_SKILLS = [
  {
    id: "seed_high_pressure_chase",
    name: "高压追逃·短句推进",
    prompt: [
      "用于高压追逐与危机段落的润色。",
      "要求：",
      "1) 句子更短，节奏更快，段落更紧凑；",
      "2) 减少抽象形容，多用动作和结果；",
      "3) 对话短促有压迫感；",
      "4) 每段必须推进局势或抬高风险；",
      "5) 段尾尽量留下钩子。"
    ].join("\n")
  }
];

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
const refreshExplorerBtn = document.getElementById("refreshExplorerBtn");
const explorerSection = document.getElementById("explorerSection");
const explorerListEl = document.getElementById("explorerList");

const statusEl = document.getElementById("status");
const autosaveInfoEl = document.getElementById("autosaveInfo");
const suggestionPreviewEl = document.getElementById("suggestionPreview");
const folderInfoEl = document.getElementById("folderInfo");
const apiTracePanel = document.getElementById("apiTracePanel");
const apiPromptTraceEl = document.getElementById("apiPromptTrace");
const apiStreamTraceEl = document.getElementById("apiStreamTrace");
const pendingEditPanel = document.getElementById("pendingEditPanel");
const pendingEditTypeEl = document.getElementById("pendingEditType");
const pendingEditHintEl = document.getElementById("pendingEditHint");
const pendingEditPreviewEl = document.getElementById("pendingEditPreview");
const acceptPendingEditBtn = document.getElementById("acceptPendingEditBtn");
const rejectPendingEditBtn = document.getElementById("rejectPendingEditBtn");
const chapterTargetCharsInput = document.getElementById("chapterTargetChars");
const continueChapterBtn = document.getElementById("continueChapterBtn");
const autoTabToggleBtn = document.getElementById("autoTabToggleBtn");
const tabSettingsToggleBtn = document.getElementById("tabSettingsToggleBtn");
const tabSettingsPanel = document.getElementById("tabSettingsPanel");
const tabMaxTokensInput = document.getElementById("tabMaxTokensInput");
const tabInputPauseMsInput = document.getElementById("tabInputPauseMsInput");
const tabAutoMinIntervalMsInput = document.getElementById("tabAutoMinIntervalMsInput");
const tabAutoMaxPerMinuteInput = document.getElementById("tabAutoMaxPerMinuteInput");
const saveTabSettingsBtn = document.getElementById("saveTabSettingsBtn");
const resetTabSettingsBtn = document.getElementById("resetTabSettingsBtn");
const styleSkillSelect = document.getElementById("styleSkillSelect");
const polishRequirementInput = document.getElementById("polishRequirementInput");
const polishSelectionBtn = document.getElementById("polishSelectionBtn");
const openStyleSkillsBtn = document.getElementById("openStyleSkillsBtn");

let project = createDefaultProject();
let suggestion = "";
let completionDebounceTimer = null;
let autosaveTimer = null;
let inFlightAbortController = null;
let chapterAbortController = null;
let defaultsLoaded = false;
let selectedFolderHandle = null;
let fileAutosaveTimer = null;
let explorerFiles = [];
let activeFileName = "";
let autoTabEnabled = false;
let isComposing = false;
let lastAutoRequestAt = 0;
let autoRequestTimestamps = [];
let lastAutoContextHash = "";
let tabSettings = { ...DEFAULT_TAB_SETTINGS };
let styleSkills = [];
let isPolishingSelection = false;
let pendingEdit = null;
let autoStatusCooldownUntil = 0;
let lastAutoStatusKey = "";
let promptDefaults = {
  tabSystemPrompt: "",
  chapterSystemPrompt: "",
  polishSystemPrompt: "",
  tabTemperature: 0.8,
  chapterTemperature: 0.9,
  tabMaxTokens: DEFAULT_TAB_SETTINGS.maxTokens,
  chapterMaxTokens: 1600,
  contextChars: MAX_CONTEXT_CHARS
};

initialize().catch((err) => {
  setStatus(`状态：初始化失败 - ${err.message}`);
});

async function initialize() {
  bindEvents();
  loadAutoTabState();
  renderAutoTabToggle();
  loadTabSettings();
  renderTabSettingsInputs();
  renderTabSettingsPanel(false);
  loadStyleSkills();
  renderStyleSkillSelect();
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

  tabSettingsToggleBtn.addEventListener("click", () => {
    const isHidden = tabSettingsPanel.classList.contains("hidden");
    renderTabSettingsPanel(isHidden);
  });

  saveTabSettingsBtn.addEventListener("click", () => {
    tabSettings = sanitizeTabSettings({
      maxTokens: tabMaxTokensInput.value,
      inputPauseMs: tabInputPauseMsInput.value,
      autoMinIntervalMs: tabAutoMinIntervalMsInput.value,
      autoMaxPerMinute: tabAutoMaxPerMinuteInput.value
    });
    persistTabSettings();
    renderTabSettingsInputs();
    setStatus("状态：Tab 设置已保存");
  });

  resetTabSettingsBtn.addEventListener("click", () => {
    tabSettings = { ...DEFAULT_TAB_SETTINGS };
    persistTabSettings();
    renderTabSettingsInputs();
    setStatus("状态：Tab 设置已恢复默认");
  });

  continueChapterBtn.addEventListener("click", async () => {
    await requestChapterContinuation();
  });

  polishSelectionBtn.addEventListener("click", async () => {
    await polishSelectedText();
  });

  openStyleSkillsBtn.addEventListener("click", () => {
    window.open("/style-skills.html", "_blank", "noopener");
  });

  acceptPendingEditBtn?.addEventListener("click", () => {
    acceptPendingEdit();
  });

  rejectPendingEditBtn?.addEventListener("click", () => {
    rejectPendingEdit();
  });

  novelTitleInput.addEventListener("input", () => {
    project.title = novelTitleInput.value;
    queueAutosave();
  });

  characterSettingInput.addEventListener("input", () => {
    project.characterSetting = characterSettingInput.value;
    if (isFileMode()) {
      queueFileAutosave();
    } else {
      queueAutosave();
    }
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
    if (isFileMode()) {
      queueFileAutosave();
    } else {
      queueAutosave();
    }
    triggerDebouncedCompletion();
  });

  editor.addEventListener("input", () => {
    const chapter = getCurrentChapter();
    chapter.content = editor.value;
    chapter.updatedAt = Date.now();
    if (pendingEdit && editor.value !== pendingEdit.baseContent) {
      clearPendingEdit({ silent: true });
    }
    clearSuggestion();
    if (isFileMode()) {
      queueFileAutosave();
    } else {
      queueAutosave();
    }
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
    if (event.key === "Enter" && event.ctrlKey && pendingEdit) {
      event.preventDefault();
      acceptPendingEdit();
      return;
    }

    if (event.key === "Tab" && suggestion) {
      event.preventDefault();
      acceptSuggestion();
      return;
    }

    if (event.key === "Escape") {
      if (pendingEdit) {
        event.preventDefault();
        rejectPendingEdit();
        return;
      }
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
    deactivateFileMode();
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
    deactivateFileMode();
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
    deactivateFileMode();
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
    const handle = await chooseFolder();
    if (handle) {
      await loadExplorerFiles();
    }
  });

  exportFolderBtn.addEventListener("click", async () => {
    await exportToFolder();
  });

  importFolderBtn.addEventListener("click", async () => {
    await importFromFolder();
  });

  refreshExplorerBtn.addEventListener("click", async () => {
    await loadExplorerFiles();
  });

  explorerListEl.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-file-name]");
    if (!button) return;
    const fileName = button.dataset.fileName;
    if (!fileName) return;
    await openFileFromExplorer(fileName);
  });

  window.addEventListener("resize", () => {
    if (suggestion) {
      renderSuggestion();
    }
  });

  window.addEventListener("focus", () => {
    loadStyleSkills();
    renderStyleSkillSelect();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === STYLE_SKILLS_KEY) {
      loadStyleSkills();
      renderStyleSkillSelect();
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
  setFileModeUI(false);
  clearPendingEdit({ silent: true });
  clearSuggestion();
}

function isFileMode() {
  return Boolean(activeFileName && selectedFolderHandle);
}

function setFileModeUI(enabled) {
  chapterTitleInput.disabled = enabled;
  chapterTitleInput.title = enabled ? "文件模式下章节标题来自文件名" : "";
}

function deactivateFileMode() {
  if (!activeFileName) return;
  void flushPendingFileAutosave();
  activeFileName = "";
  setFileModeUI(false);
  renderExplorerList();
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

function loadTabSettings() {
  const raw = localStorage.getItem(TAB_SETTINGS_KEY);
  if (!raw) {
    tabSettings = { ...DEFAULT_TAB_SETTINGS };
    return;
  }

  try {
    tabSettings = sanitizeTabSettings(JSON.parse(raw));
  } catch {
    tabSettings = { ...DEFAULT_TAB_SETTINGS };
  }
}

function persistTabSettings() {
  localStorage.setItem(TAB_SETTINGS_KEY, JSON.stringify(tabSettings));
}

function sanitizeTabSettings(value) {
  const maxTokens = clampInt(value?.maxTokens, 48, 64, DEFAULT_TAB_SETTINGS.maxTokens);
  const inputPauseMs = clampInt(
    value?.inputPauseMs,
    300,
    3000,
    DEFAULT_TAB_SETTINGS.inputPauseMs
  );
  const autoMinIntervalMs = clampInt(
    value?.autoMinIntervalMs,
    1000,
    30000,
    DEFAULT_TAB_SETTINGS.autoMinIntervalMs
  );
  const autoMaxPerMinute = clampInt(
    value?.autoMaxPerMinute,
    1,
    30,
    DEFAULT_TAB_SETTINGS.autoMaxPerMinute
  );

  return { maxTokens, inputPauseMs, autoMinIntervalMs, autoMaxPerMinute };
}

function renderTabSettingsInputs() {
  tabMaxTokensInput.value = String(tabSettings.maxTokens);
  tabInputPauseMsInput.value = String(tabSettings.inputPauseMs);
  tabAutoMinIntervalMsInput.value = String(tabSettings.autoMinIntervalMs);
  tabAutoMaxPerMinuteInput.value = String(tabSettings.autoMaxPerMinute);
}

function renderTabSettingsPanel(isOpen) {
  tabSettingsPanel.classList.toggle("hidden", !isOpen);
  tabSettingsToggleBtn.textContent = isOpen ? "收起设置" : "Tab 设置";
}

function loadStyleSkills() {
  const raw = localStorage.getItem(STYLE_SKILLS_KEY);
  if (!raw) {
    styleSkills = cloneDefaultStyleSkills();
    persistStyleSkills();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    styleSkills = ensureDefaultSkillsPresent(sanitizeStyleSkills(parsed));
    persistStyleSkills();
  } catch {
    styleSkills = cloneDefaultStyleSkills();
    persistStyleSkills();
  }
}

function sanitizeStyleSkills(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => ({
      id: asText(item?.id),
      name: asText(item?.name).trim(),
      prompt: asText(item?.prompt).trim()
    }))
    .filter((item) => item.id && item.name && item.prompt)
    .slice(0, 200);
}

function cloneDefaultStyleSkills() {
  return DEFAULT_STYLE_SKILLS.map((item) => ({ ...item }));
}

function ensureDefaultSkillsPresent(list) {
  const output = Array.isArray(list) ? [...list] : [];
  DEFAULT_STYLE_SKILLS.forEach((seed) => {
    if (!output.some((item) => item.id === seed.id)) {
      output.unshift({ ...seed });
    }
  });
  return output.slice(0, 200);
}

function persistStyleSkills() {
  localStorage.setItem(STYLE_SKILLS_KEY, JSON.stringify(styleSkills));
}

function renderStyleSkillSelect() {
  const currentValue = styleSkillSelect.value;
  styleSkillSelect.innerHTML = "";

  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "不使用预设";
  styleSkillSelect.appendChild(emptyOption);

  styleSkills.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    styleSkillSelect.appendChild(option);
  });

  if (currentValue && styleSkills.some((item) => item.id === currentValue)) {
    styleSkillSelect.value = currentValue;
  }
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

    promptDefaults = {
      tabSystemPrompt: asText(config.tabSystemPrompt),
      chapterSystemPrompt: asText(config.chapterSystemPrompt),
      polishSystemPrompt: asText(config.polishSystemPrompt),
      tabTemperature:
        typeof config.temperature === "number"
          ? config.temperature
          : clampFloat(config.temperature, 0, 2, 0.8),
      chapterTemperature:
        typeof config.chapterTemperature === "number"
          ? config.chapterTemperature
          : clampFloat(config.chapterTemperature, 0, 2, 0.9),
      tabMaxTokens: clampInt(config.maxTokens, 48, 64, DEFAULT_TAB_SETTINGS.maxTokens),
      chapterMaxTokens: clampInt(config.chapterMaxTokens, 200, 4000, 1600),
      contextChars: clampInt(config.contextChars, 300, 8000, MAX_CONTEXT_CHARS)
    };

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
    promptDefaults = {
      tabSystemPrompt: "",
      chapterSystemPrompt: "",
      polishSystemPrompt: "",
      tabTemperature: 0.8,
      chapterTemperature: 0.9,
      tabMaxTokens: DEFAULT_TAB_SETTINGS.maxTokens,
      chapterMaxTokens: 1600,
      contextChars: MAX_CONTEXT_CHARS
    };
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

  setAutoStatus("状态：自动 Tab 等待中，暂停输入后将检查触发条件", "auto_waiting");
  clearTimeout(completionDebounceTimer);
  completionDebounceTimer = setTimeout(() => {
    requestCompletion({ reason: "auto" });
  }, tabSettings.inputPauseMs);
}

async function requestCompletion(options = {}) {
  if (!defaultsLoaded) return;
  const reason = options.reason || "manual";
  const isAuto = reason === "auto";
  if (pendingEdit) {
    if (!isAuto) {
      setStatus("状态：请先接受或拒绝当前续写/润色建议");
    } else {
      setAutoStatus("状态：自动 Tab 未触发：有待处理的续写/润色建议", "auto_block_pending");
    }
    return;
  }

  const chapter = getCurrentChapter();
  const cursor = editor.selectionStart;
  const selectionStart = editor.selectionStart;
  const selectionEnd = editor.selectionEnd;
  const activeChapterSetting = chapterSettingInput.value;
  const activeCharacterSetting = characterSettingInput.value;
  const activeChapterTitle = chapterTitleInput.value || chapter.title;

  if (isAuto) {
    if (!autoTabEnabled) {
      setAutoStatus("状态：自动 Tab 未触发：开关为关闭", "auto_block_toggle");
      return;
    }
    if (selectionStart !== selectionEnd) {
      setAutoStatus("状态：自动 Tab 未触发：当前有选中文本", "auto_block_selection");
      return;
    }
    if (isComposing) {
      setAutoStatus("状态：自动 Tab 未触发：输入法组合中", "auto_block_composing");
      return;
    }
    if (suggestion) {
      setAutoStatus("状态：自动 Tab 未触发：存在未接受的建议", "auto_block_existing_suggestion");
      return;
    }
  }

  const beforeCursor = chapter.content.slice(0, cursor);
  const context = beforeCursor.slice(-TAB_CONTEXT_CHARS);

  if (context.trim().length < MIN_CONTEXT_LENGTH) {
    clearSuggestion();
    if (!isAuto) {
      setStatus("状态：继续输入以触发补全");
    } else {
      setAutoStatus(
        `状态：自动 Tab 未触发：上下文不足（至少 ${MIN_CONTEXT_LENGTH} 字）`,
        "auto_block_context_short"
      );
    }
    return;
  }

  let contextHash = "";
  if (isAuto) {
    contextHash = hashText(
      `${project.currentChapterId}|${selectionStart}|${context.slice(-800)}|${activeChapterSetting.slice(-200)}|${activeCharacterSetting.slice(-200)}|${activeFileName}`
    );
    if (contextHash === lastAutoContextHash) {
      setAutoStatus("状态：自动 Tab 跳过：上下文未变化", "auto_skip_same_context");
      return;
    }

    const now = Date.now();
    if (now - lastAutoRequestAt < tabSettings.autoMinIntervalMs) {
      const remain = tabSettings.autoMinIntervalMs - (now - lastAutoRequestAt);
      setAutoStatus(
        `状态：自动 Tab 限速中：还需等待 ${Math.ceil(remain / 1000)} 秒`,
        "auto_skip_min_interval"
      );
      return;
    }

    autoRequestTimestamps = autoRequestTimestamps.filter(
      (item) => now - item < AUTO_WINDOW_MS
    );
    if (autoRequestTimestamps.length >= tabSettings.autoMaxPerMinute) {
      setAutoStatus(
        `状态：自动 Tab 限流中：1 分钟最多 ${tabSettings.autoMaxPerMinute} 次`,
        "auto_skip_rate_limit"
      );
      return;
    }

    lastAutoRequestAt = now;
    autoRequestTimestamps.push(now);
    lastAutoContextHash = contextHash;
  }

  if (inFlightAbortController) {
    if (isAuto) {
      setAutoStatus("状态：自动 Tab 跳过：已有请求进行中", "auto_skip_inflight");
      return;
    }
    inFlightAbortController.abort();
  }

  inFlightAbortController = new AbortController();
  prefillTabPromptTrace({
    context,
    chapterContent: chapter.content,
    cursor,
    chapterTitle: activeChapterTitle,
    chapterSetting: activeChapterSetting
  });
  setApiStreamTrace("（提示词已更新，准备发送请求）");
  if (isAuto) {
    setStatus("状态：自动 Tab 已触发，提示词已更新，正在发送 API 请求...");
  } else {
    setStatus("状态：提示词已更新，正在发送 API 请求...");
  }
  setApiStreamTrace("（请求已发送，等待流式输出）");
  if (apiTracePanel) {
    apiTracePanel.open = true;
  }

  try {
    const response = await fetch("/api/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: inFlightAbortController.signal,
      body: JSON.stringify({
        stream: true,
        context,
        apiBaseUrl: apiBaseUrlInput.value.trim(),
        apiKey: apiKeyInput.value.trim(),
        model: modelInput.value.trim(),
        maxTokens: tabSettings.maxTokens,
        novelTitle: project.title,
        chapterTitle: activeChapterTitle,
        chapterSetting: activeChapterSetting,
        paragraphMemory: collectParagraphMemory(chapter.content, cursor)
      })
    });

    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "补全请求失败");
    }

    if (!response.body) {
      throw new Error("流式响应为空");
    }

    const streamResult = await readCompletionStream(response.body);
    const normalized = normalizeSuggestion(streamResult.suggestion, context);
    if (!normalized) {
      clearSuggestion();
      setStatus("状态：未生成可用建议");
      return;
    }

    suggestion = normalized;
    renderSuggestion();
    setStatus("状态：建议已生成，按 Tab 接受");
  } catch (err) {
    if (err.name === "AbortError") {
      if (isAuto) {
        setAutoStatus("状态：自动 Tab 请求已取消", "auto_abort");
      }
      return;
    }
    clearSuggestion();
    setStatus(`状态：请求失败 - ${err.message}`);
  } finally {
    inFlightAbortController = null;
  }
}

async function requestChapterContinuation() {
  if (!defaultsLoaded) return;
  if (chapterAbortController) return;
  if (pendingEdit) {
    setStatus("状态：请先接受或拒绝当前建议");
    return;
  }

  const chapter = getCurrentChapter();
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const beforeCursor = chapter.content.slice(0, start);
  const context = beforeCursor.slice(-6000);
  const activeChapterSetting = chapterSettingInput.value;
  const activeCharacterSetting = characterSettingInput.value;
  const activeChapterTitle = chapterTitleInput.value || chapter.title;

  if (!context.trim() && !activeChapterSetting.trim() && !activeCharacterSetting.trim()) {
    setStatus("状态：请先输入正文或设定，再执行整章续写");
    return;
  }

  const targetChars = clampInt(chapterTargetCharsInput.value, 300, 5000, 1200);
  chapterTargetCharsInput.value = String(targetChars);
  chapterAbortController = new AbortController();
  setContinueChapterBusy(true);
  setStatus("状态：正在续写完整章节...");
  prefillChapterPromptTrace({
    context,
    targetChars,
    chapterTitle: activeChapterTitle,
    chapterSetting: activeChapterSetting,
    characterSetting: activeCharacterSetting
  });
  setApiStreamTrace("（提示词已更新，准备发送请求）");
  setStatus("状态：提示词已更新，正在发送续写请求...");
  setApiStreamTrace("（请求已发送，等待返回）");

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
        chapterTitle: activeChapterTitle,
        chapterSetting: activeChapterSetting,
        characterSetting: activeCharacterSetting,
        debugTrace: true
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

    applyDebugTraceToPanel(payload.trace, longText);
    const insertText = formatChapterInsertion(beforeCursor, longText);
    showPendingEdit({
      typeLabel: "续写建议",
      hint: `将插入约 ${longText.length} 字内容`,
      preview: insertText,
      start,
      end,
      replacement: insertText,
      baseContent: editor.value,
      selectMode: "end",
      acceptStatus: "状态：已接受续写建议",
      rejectStatus: "状态：已拒绝续写建议"
    });
    clearSuggestion();
    setStatus("状态：续写建议已生成，请选择接受或拒绝");
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

async function polishSelectedText() {
  if (!defaultsLoaded) return;
  if (isPolishingSelection) return;
  if (pendingEdit) {
    setStatus("状态：请先接受或拒绝当前建议");
    return;
  }

  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  if (start === end) {
    setStatus("状态：请先选中需要润色的文本");
    return;
  }

  const selectedText = editor.value.slice(start, end);
  if (!selectedText.trim()) {
    setStatus("状态：选中文本为空，无法润色");
    return;
  }

  const chapter = getCurrentChapter();
  const styleRequirement = polishRequirementInput.value.trim();
  const skillId = styleSkillSelect.value;
  const selectedSkill = styleSkills.find((item) => item.id === skillId);
  const styleSkillPrompt = selectedSkill?.prompt || "";

  setPolishSelectionBusy(true);
  setStatus("状态：正在润色选中文本...");
  prefillPolishPromptTrace({
    selectedText,
    styleRequirement,
    styleSkillPrompt,
    chapterTitle: chapterTitleInput.value || chapter.title,
    chapterSetting: chapterSettingInput.value,
    characterSetting: characterSettingInput.value
  });
  setApiStreamTrace("（提示词已更新，准备发送请求）");
  setStatus("状态：提示词已更新，正在发送润色请求...");
  setApiStreamTrace("（请求已发送，等待返回）");

  try {
    const response = await fetch("/api/polish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selectedText,
        styleRequirement,
        styleSkillPrompt,
        apiBaseUrl: apiBaseUrlInput.value.trim(),
        apiKey: apiKeyInput.value.trim(),
        chapterModel: chapterModelInput.value.trim(),
        novelTitle: project.title,
        chapterTitle: chapterTitleInput.value || chapter.title,
        chapterSetting: chapterSettingInput.value,
        characterSetting: characterSettingInput.value,
        debugTrace: true
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "润色请求失败");
    }

    const polishedText = normalizePolishedText(payload.polishedText || payload.content || "");
    if (!polishedText) {
      setStatus("状态：润色结果为空");
      return;
    }

    applyDebugTraceToPanel(payload.trace, polishedText);
    showPendingEdit({
      typeLabel: "润色建议",
      hint: `将替换选中的 ${selectedText.length} 字`,
      preview: polishedText,
      start,
      end,
      replacement: polishedText,
      baseContent: editor.value,
      selectMode: "select",
      acceptStatus: "状态：已接受润色建议",
      rejectStatus: "状态：已拒绝润色建议"
    });
    clearSuggestion();
    setStatus("状态：润色建议已生成，请选择接受或拒绝");
  } catch (err) {
    setStatus(`状态：润色失败 - ${err.message}`);
  } finally {
    setPolishSelectionBusy(false);
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

function normalizePolishedText(raw) {
  return String(raw || "")
    .replace(/\r/g, "")
    .replace(/^```[\s\S]*?\n/, "")
    .replace(/```$/, "")
    .trim()
    .slice(0, 20000);
}

function formatChapterInsertion(beforeCursor, longText) {
  let prefix = "";
  if (beforeCursor && !/\s$/.test(beforeCursor)) {
    prefix = "\n";
  }
  return `${prefix}${longText}`;
}

function showPendingEdit(payload) {
  const baseContent =
    typeof payload.baseContent === "string" ? payload.baseContent : editor.value;
  const start = clampInt(payload.start, 0, baseContent.length, editor.selectionStart);
  const end = clampInt(payload.end, start, baseContent.length, editor.selectionEnd);
  pendingEdit = {
    typeLabel: asText(payload.typeLabel, "建议"),
    hint: asText(payload.hint),
    preview: asText(payload.preview || payload.replacement),
    replacement: asText(payload.replacement),
    start,
    end,
    baseContent,
    selectMode: asText(payload.selectMode, "end"),
    acceptStatus: asText(payload.acceptStatus, "状态：已接受建议"),
    rejectStatus: asText(payload.rejectStatus, "状态：已拒绝建议")
  };
  renderPendingEdit();
}

function renderPendingEdit() {
  if (!pendingEditPanel || !pendingEditTypeEl || !pendingEditHintEl || !pendingEditPreviewEl) {
    return;
  }

  if (!pendingEdit) {
    pendingEditPanel.classList.add("hidden");
    pendingEditTypeEl.textContent = "建议";
    pendingEditHintEl.textContent = "";
    pendingEditPreviewEl.textContent = "";
    return;
  }

  pendingEditPanel.classList.remove("hidden");
  pendingEditTypeEl.textContent = pendingEdit.typeLabel;
  pendingEditHintEl.textContent = pendingEdit.hint;
  pendingEditPreviewEl.textContent = formatPendingPreview(pendingEdit.preview);
}

function acceptPendingEdit() {
  if (!pendingEdit) return;
  const proposal = pendingEdit;

  if (editor.value !== proposal.baseContent) {
    pendingEdit = null;
    renderPendingEdit();
    setStatus("状态：正文已发生变化，当前建议已失效，请重新生成");
    return;
  }

  pendingEdit = null;
  renderPendingEdit();
  editor.setRangeText(proposal.replacement, proposal.start, proposal.end, proposal.selectMode);

  const chapter = getCurrentChapter();
  chapter.content = editor.value;
  chapter.updatedAt = Date.now();

  clearSuggestion();
  if (isFileMode()) {
    queueFileAutosave();
  } else {
    queueAutosave();
  }
  triggerDebouncedCompletion();
  setStatus(proposal.acceptStatus);
  editor.focus();
}

function rejectPendingEdit(options = {}) {
  if (!pendingEdit) return;
  const status = pendingEdit.rejectStatus;
  pendingEdit = null;
  renderPendingEdit();
  if (!options.silent) {
    setStatus(status);
  }
}

function clearPendingEdit(options = {}) {
  if (!pendingEdit) return;
  pendingEdit = null;
  renderPendingEdit();
  if (!options.silent) {
    setStatus("状态：已取消建议");
  }
}

function formatPendingPreview(text) {
  const cleaned = String(text || "").replace(/\r/g, "").trim();
  if (!cleaned) return "(建议内容为空)";
  if (cleaned.length <= 520) return cleaned;
  return `${cleaned.slice(0, 520)}...`;
}

function acceptSuggestion() {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  editor.setRangeText(suggestion, start, end, "end");

  const chapter = getCurrentChapter();
  chapter.content = editor.value;
  chapter.updatedAt = Date.now();

  clearSuggestion();
  if (isFileMode()) {
    queueFileAutosave();
  } else {
    queueAutosave();
  }
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

function resetApiTrace() {
  if (apiPromptTraceEl) apiPromptTraceEl.textContent = "";
  if (apiStreamTraceEl) apiStreamTraceEl.textContent = "";
}

function prefillTabPromptTrace(payload) {
  const paragraphMemory = collectParagraphMemory(payload.chapterContent || "", payload.cursor || 0);
  const trace = {
    model: modelInput.value.trim() || "",
    temperature: promptDefaults.tabTemperature,
    maxTokens: tabSettings.maxTokens,
    systemPrompt: resolveSystemPrompt("tab"),
    userPrompt: buildTabUserPromptForTrace({
      context: payload.context,
      novelTitle: project.title,
      chapterTitle: payload.chapterTitle,
      chapterSetting: payload.chapterSetting,
      paragraphMemory
    })
  };
  setApiPromptTrace(trace);
}

function prefillChapterPromptTrace(payload) {
  const targetChars = clampInt(payload.targetChars, 300, 5000, 1200);
  const inferredMaxTokens = estimateChapterMaxTokensForTrace(targetChars);
  const trace = {
    model: chapterModelInput.value.trim() || "",
    temperature: promptDefaults.chapterTemperature,
    maxTokens: inferredMaxTokens,
    systemPrompt: resolveSystemPrompt("chapter"),
    userPrompt: buildChapterUserPromptForTrace({
      context: payload.context,
      novelTitle: project.title,
      chapterTitle: payload.chapterTitle,
      chapterSetting: payload.chapterSetting,
      characterSetting: payload.characterSetting,
      targetChars
    })
  };
  setApiPromptTrace(trace);
}

function prefillPolishPromptTrace(payload) {
  const trace = {
    model: chapterModelInput.value.trim() || "",
    temperature: promptDefaults.chapterTemperature,
    maxTokens: estimatePolishMaxTokensForTrace(payload.selectedText),
    systemPrompt: resolveSystemPrompt("polish"),
    userPrompt: buildPolishUserPromptForTrace({
      selectedText: payload.selectedText,
      styleRequirement: payload.styleRequirement,
      styleSkillPrompt: payload.styleSkillPrompt,
      novelTitle: project.title,
      chapterTitle: payload.chapterTitle,
      chapterSetting: payload.chapterSetting,
      characterSetting: payload.characterSetting
    })
  };
  setApiPromptTrace(trace);
}

function resolveSystemPrompt(kind) {
  const value =
    kind === "tab"
      ? promptDefaults.tabSystemPrompt
      : kind === "chapter"
        ? promptDefaults.chapterSystemPrompt
        : promptDefaults.polishSystemPrompt;
  return value || "（系统提示词由服务端配置，当前未下发）";
}

function buildTabUserPromptForTrace(payload) {
  const safeContext = safeTraceText(payload.context, 420);
  const safeNovelTitle = safeTraceText(payload.novelTitle, 120);
  const safeChapterTitle = safeTraceText(payload.chapterTitle, 120);
  const safeChapterSetting = safeTraceText(payload.chapterSetting, 1600);
  const beforeParagraphs = normalizeTraceParagraphArray(payload.paragraphMemory?.before, 2);
  const afterParagraphs = normalizeTraceParagraphArray(payload.paragraphMemory?.after, 1);

  const sections = [
    "请根据以下信息在光标处续写。",
    safeNovelTitle ? `小说标题：\n${safeNovelTitle}` : "",
    safeChapterTitle ? `章节标题：\n${safeChapterTitle}` : "",
    safeChapterSetting ? `章节设定：\n${safeChapterSetting}` : "",
    beforeParagraphs.length
      ? `光标前段落记忆：\n${beforeParagraphs
          .map((item, index) => `${index + 1}. ${item}`)
          .join("\n")}`
      : "",
    afterParagraphs.length
      ? `光标后段落记忆：\n${afterParagraphs
          .map((item, index) => `${index + 1}. ${item}`)
          .join("\n")}`
      : "",
    `最近正文片段（光标前）：\n${safeContext}`,
    "请直接续写下一句，只输出一句，不要重复上文。"
  ].filter(Boolean);

  return sections.join("\n\n");
}

function buildChapterUserPromptForTrace(payload) {
  const safeContext = safeTraceText(payload.context, 16000);
  const safeNovelTitle = safeTraceText(payload.novelTitle, 120);
  const safeChapterTitle = safeTraceText(payload.chapterTitle, 120);
  const safeChapterSetting = safeTraceText(payload.chapterSetting, 2000);
  const safeCharacterSetting = safeTraceText(payload.characterSetting, 2000);
  const safeTargetChars = clampInt(payload.targetChars, 300, 5000, 1200);

  const sections = [
    "请根据以下信息续写完整章节内容。",
    safeNovelTitle ? `小说标题：\n${safeNovelTitle}` : "",
    safeChapterTitle ? `章节标题：\n${safeChapterTitle}` : "",
    safeCharacterSetting ? `人物设定：\n${safeCharacterSetting}` : "",
    safeChapterSetting ? `章节设定：\n${safeChapterSetting}` : "",
    safeContext ? `已有正文（光标前）：\n${safeContext}` : "",
    `目标长度：约 ${safeTargetChars} 字。`,
    "请直接输出续写正文。"
  ].filter(Boolean);

  return sections.join("\n\n");
}

function buildPolishUserPromptForTrace(payload) {
  const safeSelectedText = safeTraceText(payload.selectedText, 16000);
  const safeNovelTitle = safeTraceText(payload.novelTitle, 120);
  const safeChapterTitle = safeTraceText(payload.chapterTitle, 120);
  const safeChapterSetting = safeTraceText(payload.chapterSetting, 2000);
  const safeCharacterSetting = safeTraceText(payload.characterSetting, 2000);
  const safeStyleSkillPrompt = safeTraceText(payload.styleSkillPrompt, 4000);
  const safeStyleRequirement = safeTraceText(payload.styleRequirement, 1000);

  const sections = [
    "请润色下面这段已写好的正文。",
    safeNovelTitle ? `小说标题：\n${safeNovelTitle}` : "",
    safeChapterTitle ? `章节标题：\n${safeChapterTitle}` : "",
    safeCharacterSetting ? `人物设定：\n${safeCharacterSetting}` : "",
    safeChapterSetting ? `章节设定：\n${safeChapterSetting}` : "",
    safeStyleSkillPrompt ? `风格预设：\n${safeStyleSkillPrompt}` : "",
    safeStyleRequirement ? `额外风格要求：\n${safeStyleRequirement}` : "",
    `原文：\n${safeSelectedText}`,
    "请只输出润色后的正文，不要解释。"
  ].filter(Boolean);

  return sections.join("\n\n");
}

function safeTraceText(value, maxLen) {
  if (typeof value !== "string") return "";
  return value.replace(/\r/g, "").trim().slice(0, maxLen);
}

function normalizeTraceParagraphArray(value, maxItems) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => safeTraceText(item, 360))
    .filter(Boolean)
    .slice(-maxItems);
}

function estimateChapterMaxTokensForTrace(targetChars) {
  const safeTarget = clampInt(targetChars, 300, 5000, 1200);
  const estimated = Math.ceil(safeTarget * 1.5);
  return clampInt(estimated, 200, 4000, promptDefaults.chapterMaxTokens);
}

function estimatePolishMaxTokensForTrace(selectedText) {
  const sourceLength = safeTraceText(selectedText, 20000).length;
  const estimated = Math.ceil(sourceLength * 1.4);
  return clampInt(estimated, 120, 2200, 600);
}

function setApiStreamTrace(text) {
  if (!apiStreamTraceEl) return;
  apiStreamTraceEl.textContent = String(text || "");
}

function setApiPromptTrace(meta) {
  if (!apiPromptTraceEl) return;

  const parts = [
    `model: ${meta.model || ""}`,
    `temperature: ${meta.temperature ?? ""}`,
    `max_tokens: ${meta.maxTokens ?? ""}`,
    "",
    "[System Prompt]",
    meta.systemPrompt || "",
    "",
    "[User Prompt]",
    meta.userPrompt || ""
  ];
  apiPromptTraceEl.textContent = parts.join("\n");
  if (apiTracePanel) {
    apiTracePanel.open = true;
  }
}

function appendApiStreamTrace(text) {
  if (!apiStreamTraceEl || !text) return;
  apiStreamTraceEl.textContent += text;

  if (apiStreamTraceEl.textContent.length > 12000) {
    apiStreamTraceEl.textContent = apiStreamTraceEl.textContent.slice(-12000);
  }
}

function applyDebugTraceToPanel(trace, outputText) {
  if (trace && typeof trace === "object") {
    setApiPromptTrace(trace);
  }
  setApiStreamTrace(outputText || "");
}

async function readCompletionStream(bodyStream) {
  const reader = bodyStream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamText = "";
  let doneSuggestion = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const event = safeParseJson(line);
      if (!event) continue;

      if (event.type === "meta") {
        setApiPromptTrace(event);
        continue;
      }

      if (event.type === "delta") {
        const text = String(event.text || "");
        streamText += text;
        appendApiStreamTrace(text);
        continue;
      }

      if (event.type === "done") {
        doneSuggestion = String(event.suggestion || "");
        if (!streamText && doneSuggestion) {
          appendApiStreamTrace(doneSuggestion);
        }
        continue;
      }

      if (event.type === "error") {
        throw new Error(event.error || "流式补全失败");
      }
    }
  }

  const tailEvent = safeParseJson(buffer.trim());
  if (tailEvent?.type === "done") {
    doneSuggestion = String(tailEvent.suggestion || doneSuggestion);
    if (!streamText && doneSuggestion) {
      appendApiStreamTrace(doneSuggestion);
    }
  } else if (tailEvent?.type === "delta") {
    const text = String(tailEvent.text || "");
    streamText += text;
    appendApiStreamTrace(text);
  }

  return { suggestion: doneSuggestion || streamText };
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}

function setAutoStatus(text, key) {
  const now = Date.now();
  const safeKey = String(key || "auto");
  if (safeKey === lastAutoStatusKey && now < autoStatusCooldownUntil) {
    return;
  }
  lastAutoStatusKey = safeKey;
  autoStatusCooldownUntil = now + 1200;
  setStatus(text);
}

function setContinueChapterBusy(isBusy) {
  continueChapterBtn.disabled = isBusy;
  continueChapterBtn.textContent = isBusy ? "续写中..." : "续写完整章";
}

function setPolishSelectionBusy(isBusy) {
  isPolishingSelection = isBusy;
  polishSelectionBtn.disabled = isBusy;
  polishSelectionBtn.textContent = isBusy ? "润色中..." : "选中润色";
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

function clampFloat(value, min, max, fallback) {
  const parsed = Number.parseFloat(String(value));
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

function buildSingleChapterMarkdown(novelTitle, chapter, index) {
  const safeNovelTitle = (novelTitle || "未命名小说").trim();
  const safeChapterTitle = (chapter.title || `Chapter ${index + 1}`).trim();
  const combinedTitle = `${safeNovelTitle} - ${safeChapterTitle}`;

  return [
    `# ${combinedTitle}`,
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

function renderExplorerSection(isVisible) {
  explorerSection.classList.toggle("hidden", !isVisible);
}

async function loadExplorerFiles() {
  if (!selectedFolderHandle) {
    renderExplorerSection(false);
    return;
  }

  explorerFiles = await listEditableFiles(selectedFolderHandle);
  renderExplorerSection(true);
  renderExplorerList();
}

function renderExplorerList() {
  explorerListEl.innerHTML = "";

  if (!explorerFiles.length) {
    const empty = document.createElement("div");
    empty.className = "folder-info";
    empty.textContent = "当前文件夹没有可编辑的 .md/.txt 文件";
    explorerListEl.appendChild(empty);
    return;
  }

  explorerFiles.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "explorer-item";
    button.dataset.fileName = item.name;
    button.textContent = item.name;
    if (item.name === activeFileName) {
      button.classList.add("active");
    }
    explorerListEl.appendChild(button);
  });
}

async function openFileFromExplorer(fileName) {
  if (!selectedFolderHandle) return;

  await flushPendingFileAutosave();

  const target = explorerFiles.find((item) => item.name === fileName);
  if (!target) {
    setStatus(`状态：未找到文件 ${fileName}`);
    return;
  }

  try {
    const text = await readFileText(target.handle);
    const memory = await readMemoryForFile(fileName);

    activeFileName = fileName;
    setFileModeUI(true);
    renderExplorerList();

    const chapter = getCurrentChapter();
    chapter.title = extractFileTitle(fileName);
    chapter.setting = memory.chapterSetting || "";
    chapter.content = text;
    chapter.updatedAt = Date.now();
    project.characterSetting = memory.characterSetting || "";

    chapterTitleInput.value = chapter.title;
    chapterSettingInput.value = chapter.setting;
    characterSettingInput.value = project.characterSetting;
    editor.value = chapter.content;

    clearPendingEdit({ silent: true });
    clearSuggestion();
    setStatus(`状态：已打开文件 ${fileName}`);
  } catch (err) {
    setStatus(`状态：打开文件失败 - ${err.message}`);
  }
}

function queueFileAutosave() {
  if (!isFileMode()) return;
  clearTimeout(fileAutosaveTimer);
  fileAutosaveTimer = setTimeout(() => {
    fileAutosaveTimer = null;
    saveActiveFileNow();
  }, FILE_AUTOSAVE_MS);
}

async function flushPendingFileAutosave() {
  if (!fileAutosaveTimer) return;
  clearTimeout(fileAutosaveTimer);
  fileAutosaveTimer = null;
  await saveActiveFileNow();
}

async function saveActiveFileNow() {
  if (!isFileMode() || !selectedFolderHandle) return;

  try {
    await writeTextFile(selectedFolderHandle, activeFileName, editor.value);

    const memory = {
      characterSetting: characterSettingInput.value,
      chapterSetting: chapterSettingInput.value,
      updatedAt: new Date().toISOString()
    };
    await writeTextFile(
      selectedFolderHandle,
      getMemoryFileName(activeFileName),
      JSON.stringify(memory, null, 2)
    );

    const chapter = getCurrentChapter();
    chapter.content = editor.value;
    chapter.setting = chapterSettingInput.value;
    chapter.updatedAt = Date.now();
    project.characterSetting = characterSettingInput.value;

    autosaveInfoEl.textContent = `自动保存：${formatTime(Date.now())}（文件）`;
  } catch (err) {
    setStatus(`状态：文件自动保存失败 - ${err.message}`);
  }
}

async function listEditableFiles(folderHandle) {
  const output = [];

  for await (const [name, handle] of folderHandle.entries()) {
    if (handle.kind !== "file") continue;
    if (!/\.(md|txt)$/i.test(name)) continue;
    if (name.endsWith(FILE_MEMORY_SUFFIX)) continue;
    output.push({ name, handle });
  }

  output.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  return output;
}

async function readFileText(fileHandle) {
  const file = await fileHandle.getFile();
  return file.text();
}

async function readMemoryForFile(fileName) {
  if (!selectedFolderHandle) {
    return { characterSetting: "", chapterSetting: "" };
  }

  try {
    const memoryHandle = await selectedFolderHandle.getFileHandle(
      getMemoryFileName(fileName)
    );
    const raw = await readFileText(memoryHandle);
    const parsed = JSON.parse(raw);
    return {
      characterSetting: asText(parsed.characterSetting),
      chapterSetting: asText(parsed.chapterSetting)
    };
  } catch {
    return { characterSetting: "", chapterSetting: "" };
  }
}

function getMemoryFileName(fileName) {
  return `${fileName}${FILE_MEMORY_SUFFIX}`;
}

function extractFileTitle(fileName) {
  return String(fileName).replace(/\.[^.]+$/, "");
}

async function chooseFolder() {
  if (!("showDirectoryPicker" in window)) {
    setStatus("状态：当前浏览器不支持打开文件夹 API");
    return null;
  }

  try {
    selectedFolderHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    activeFileName = "";
    explorerFiles = [];
    folderInfoEl.textContent = `文件夹：${selectedFolderHandle.name}`;
    renderExplorerSection(true);
    setFileModeUI(false);
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
      const novelPart = safeFileName(project.title || "novel");
      const chapterPart = safeFileName(chapter.title || `chapter-${i + 1}`);
      const fileName = `${String(i + 1).padStart(2, "0")}-${novelPart}-${chapterPart}.md`;
      const content = buildSingleChapterMarkdown(project.title, chapter, i);
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
  await loadExplorerFiles();

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
