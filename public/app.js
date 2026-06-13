const API_CONFIG_KEY = "novel-editor-api-config-v2";
const PROJECT_STORAGE_KEY = "novel-editor-project-v2";
const AUTO_TAB_ENABLED_KEY = "novel-editor-auto-tab-enabled-v1";
const TAB_SETTINGS_KEY = "novel-editor-tab-settings-v1";
const STYLE_SKILLS_KEY = "novel-editor-style-skills-v1";
const SYSTEM_PROMPTS_KEY = "novel-editor-system-prompts-v1";
const THEME_MODE_KEY = "novel-editor-theme-mode-v1";
const AUTOSAVE_MS = 600;
const FILE_AUTOSAVE_MS = 700;
const MIN_CONTEXT_LENGTH = 8;
const MAX_CONTEXT_CHARS = 3000;
const TAB_CONTEXT_CHARS = 420;
const AUTO_WINDOW_MS = 60 * 1000;
const FILE_MEMORY_SUFFIX = ".memory.json";
const MAX_CHAPTER_SNAPSHOTS = 30;
const MAX_AI_LOG_ITEMS = 120;
const MAX_RETRIEVED_CONTEXT_ITEMS = 8;
const DEFAULT_TAB_SETTINGS = {
  maxTokens: 56,
  inputPauseMs: 900,
  autoMinIntervalMs: 6000,
  autoMaxPerMinute: 5
};
const KNOWLEDGE_TYPE_LABELS = {
  character: "人物",
  world: "世界观",
  foreshadow: "伏笔",
  rule: "禁忌"
};
const SCENE_STATUS_LABELS = {
  todo: "待写",
  drafting: "草稿中",
  done: "完成"
};
const AI_SOURCE_LABELS = {
  tab: "Tab 补全",
  chapter: "整章续写",
  polish: "选中润色",
  check: "章节检查"
};
const DEFAULT_STYLE_SKILLS = [
  {
    id: "seed_high_pressure_chase",
    name: "高压追逃·短句推进",
    category: "style",
    prompt: [
      "用于高压追逐与危机段落的润色。",
      "要求：",
      "1) 句子更短，节奏更快，段落更紧凑；",
      "2) 减少抽象形容，多用动作和结果；",
      "3) 对话短促有压迫感；",
      "4) 每段必须推进局势或抬高风险；",
      "5) 段尾尽量留下钩子。"
    ].join("\n")
  },
  {
    id: "seed_task_dialogue",
    name: "任务卡·压缩对白",
    category: "task",
    prompt: [
      "用于对白段落的改写。",
      "要求：",
      "1) 保留原本信息量；",
      "2) 每句对白更短，更贴合人物身份；",
      "3) 删除解释性废话；",
      "4) 用动作或沉默补出压迫感。"
    ].join("\n")
  },
  {
    id: "seed_avoid_literary",
    name: "禁忌卡·去文艺腔",
    category: "avoid",
    prompt: [
      "用于清理过度文艺化表达。",
      "要求：",
      "1) 删除空泛抒情和抽象感慨；",
      "2) 避免连续比喻、排比、反问；",
      "3) 不反复写眼神、气氛、沉默；",
      "4) 改成可见动作、选择和后果。"
    ].join("\n")
  }
];
const API_PROVIDER_PRESETS = [
  {
    id: "custom",
    name: "自定义",
    description: "手动填写任意 OpenAI 兼容接口。",
    apiBaseUrl: "",
    model: "",
    chapterModel: ""
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "官方 OpenAI 接口，适合直接使用 GPT 系列模型。",
    apiBaseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    chapterModel: "gpt-4.1-mini"
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "聚合路由平台，模型名通常需要带提供商前缀。",
    apiBaseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o-mini",
    chapterModel: "openai/gpt-4.1-mini"
  },
  {
    id: "qwen",
    name: "Qwen",
    description: "阿里云百炼通用 Qwen 预设，适合常规中文写作。",
    apiBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen3.5-flash",
    chapterModel: "qwen-plus"
  },
  {
    id: "qwen_code",
    name: "Qwen Code",
    description: "阿里云百炼代码向 Qwen 预设，适合代码与结构化生成。",
    apiBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-coder-plus",
    chapterModel: "qwen-coder-plus"
  },
  {
    id: "qwen_plan",
    name: "Qwen Plan",
    description: "阿里云百炼规划向预设，方便先起草大纲或规划再继续手改模型。",
    apiBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    chapterModel: "qwen-max"
  }
];

const apiBaseUrlInput = document.getElementById("apiBaseUrl");
const apiKeyInput = document.getElementById("apiKey");
const modelInput = document.getElementById("model");
const chapterModelInput = document.getElementById("chapterModel");
const apiProviderPresetSelect = document.getElementById("apiProviderPreset");
const apiProviderPresetHintEl = document.getElementById("apiProviderPresetHint");
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
const exportCleanTxtBtn = document.getElementById("exportCleanTxtBtn");
const exportEpubBtn = document.getElementById("exportEpubBtn");
const chooseFolderBtn = document.getElementById("chooseFolderBtn");
const exportFolderBtn = document.getElementById("exportFolderBtn");
const importFolderBtn = document.getElementById("importFolderBtn");
const refreshExplorerBtn = document.getElementById("refreshExplorerBtn");
const explorerSection = document.getElementById("explorerSection");
const explorerListEl = document.getElementById("explorerList");

const statusEl = document.getElementById("status");
const autosaveInfoEl = document.getElementById("autosaveInfo");
const paperStatsEl = document.getElementById("paperStats");
const suggestionPreviewEl = document.getElementById("suggestionPreview");
const folderInfoEl = document.getElementById("folderInfo");
const apiTracePanel = document.getElementById("apiTracePanel");
const apiPromptTraceEl = document.getElementById("apiPromptTrace");
const apiMetricsTraceEl = document.getElementById("apiMetricsTrace");
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
const openStyleSkillsQuickBtn = document.getElementById("openStyleSkillsQuickBtn");
const refreshStatsBtn = document.getElementById("refreshStatsBtn");
const statsPanel = document.getElementById("statsPanel");
const createSnapshotBtn = document.getElementById("createSnapshotBtn");
const snapshotSelect = document.getElementById("snapshotSelect");
const restoreSnapshotBtn = document.getElementById("restoreSnapshotBtn");
const snapshotInfo = document.getElementById("snapshotInfo");
const sceneTitleInput = document.getElementById("sceneTitleInput");
const sceneStatusInput = document.getElementById("sceneStatusInput");
const sceneNoteInput = document.getElementById("sceneNoteInput");
const addSceneBtn = document.getElementById("addSceneBtn");
const sceneList = document.getElementById("sceneList");
const knowledgeTypeInput = document.getElementById("knowledgeTypeInput");
const knowledgeTitleInput = document.getElementById("knowledgeTitleInput");
const knowledgeBodyInput = document.getElementById("knowledgeBodyInput");
const addKnowledgeCardBtn = document.getElementById("addKnowledgeCardBtn");
const knowledgeCardList = document.getElementById("knowledgeCardList");
const checkChapterBtn = document.getElementById("checkChapterBtn");
const chapterCheckResult = document.getElementById("chapterCheckResult");
const aiLogSummary = document.getElementById("aiLogSummary");
const aiLogList = document.getElementById("aiLogList");

const settingsModal = document.getElementById("settingsModal");
const closeSettingsModalBtn = document.getElementById("closeSettingsModalBtn");
const themeOptionsEl = document.getElementById("themeOptions");
const tabSystemPromptInput = document.getElementById("tabSystemPromptInput");
const chapterSystemPromptInput = document.getElementById("chapterSystemPromptInput");
const polishSystemPromptInput = document.getElementById("polishSystemPromptInput");
const saveSystemPromptsBtn = document.getElementById("saveSystemPromptsBtn");
const resetSystemPromptsBtn = document.getElementById("resetSystemPromptsBtn");

const styleSkillsModal = document.getElementById("styleSkillsModal");
const closeStyleSkillsModalBtn = document.getElementById("closeStyleSkillsModalBtn");
const styleSkillsCardsEl = document.getElementById("styleSkillsCards");
const styleSkillEditorTitleEl = document.getElementById("styleSkillEditorTitle");
const styleSkillNameInput = document.getElementById("styleSkillNameInput");
const styleSkillPromptInput = document.getElementById("styleSkillPromptInput");
const styleSkillSaveBtn = document.getElementById("styleSkillSaveBtn");
const styleSkillCancelBtn = document.getElementById("styleSkillCancelBtn");
const styleSkillDeleteBtn = document.getElementById("styleSkillDeleteBtn");

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
let systemPromptOverrides = { tab: "", chapter: "", polish: "" };
let editingStyleSkillId = "";
let apiMetricsState = {};
let themeMode = "dark";
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
  loadThemeMode();
  applyThemeMode();
  bindEvents();
  loadAutoTabState();
  renderAutoTabToggle();
  loadTabSettings();
  renderTabSettingsInputs();
  renderTabSettingsPanel(false);
  loadSystemPromptOverrides();
  loadStyleSkills();
  renderThemeOptions();
  renderStyleSkillSelect();
  renderApiProviderPresetOptions();
  loadApiConfigFromLocal();
  await loadServerDefaults();
  renderSystemPromptInputs();
  renderStyleSkillEditor();
  renderStyleSkillCards();
  loadProjectFromLocal();
  renderProject();
  renderWorkbench();
  openStyleSkillsFromLegacyLink();
  defaultsLoaded = true;
  setStatus("状态：就绪");
  autosaveInfoEl.textContent = "自动保存：就绪";
}

function bindEvents() {
  themeOptionsEl?.addEventListener("click", (event) => {
    const origin = event.target instanceof Element ? event.target : null;
    if (!origin) return;
    const button = origin.closest("button[data-theme-mode]");
    if (!(button instanceof HTMLButtonElement)) return;
    const nextMode = button.dataset.themeMode;
    if (!nextMode) return;
    setThemeMode(nextMode);
  });

  saveApiConfigBtn.addEventListener("click", () => {
    saveApiConfigToLocal();
    setStatus("状态：API 配置已保存");
  });

  clearApiConfigBtn.addEventListener("click", () => {
    apiKeyInput.value = "";
    saveApiConfigToLocal();
    setStatus("状态：API Key 已清空");
  });

  apiProviderPresetSelect?.addEventListener("change", () => {
    const presetId = apiProviderPresetSelect.value;
    if (presetId === "custom") {
      renderApiProviderPresetHint("custom");
      saveApiConfigToLocal();
      setStatus("状态：已切换为自定义接口配置");
      return;
    }

    applyApiProviderPreset(presetId, { persist: true });
  });

  [apiBaseUrlInput, modelInput, chapterModelInput].forEach((input) => {
    input?.addEventListener("input", () => {
      syncApiProviderPresetSelection();
    });
  });

  autoTabToggleBtn.addEventListener("click", () => {
    autoTabEnabled = !autoTabEnabled;
    persistAutoTabState();
    renderAutoTabToggle();
    setStatus(autoTabEnabled ? "状态：自动 Tab 已开启" : "状态：自动 Tab 已关闭");
  });

  tabSettingsToggleBtn?.addEventListener("click", () => {
    openSettingsModal();
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

  openStyleSkillsBtn?.addEventListener("click", () => {
    openStyleSkillsModal();
  });
  openStyleSkillsQuickBtn?.addEventListener("click", () => {
    openStyleSkillsModal();
  });
  closeSettingsModalBtn?.addEventListener("click", () => {
    closeSettingsModal();
  });
  closeStyleSkillsModalBtn?.addEventListener("click", () => {
    closeStyleSkillsModal();
  });
  saveSystemPromptsBtn?.addEventListener("click", () => {
    saveSystemPrompts();
  });
  resetSystemPromptsBtn?.addEventListener("click", () => {
    resetSystemPrompts();
  });
  styleSkillSaveBtn?.addEventListener("click", () => {
    saveStyleSkillFromModal();
  });
  styleSkillCancelBtn?.addEventListener("click", () => {
    renderStyleSkillEditor();
  });
  styleSkillDeleteBtn?.addEventListener("click", () => {
    deleteStyleSkillFromModal();
  });
  styleSkillsCardsEl?.addEventListener("click", (event) => {
    const origin = event.target instanceof Element ? event.target : null;
    if (!origin) return;
    const button = origin.closest("button[data-style-skill-id]");
    if (!button) return;
    const styleSkillId = button.dataset.styleSkillId;
    if (!styleSkillId) return;
    startEditStyleSkill(styleSkillId);
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
    renderStats();
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
    renderWorkbench();
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
      renderWorkbench();
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
    renderWorkbench();
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
    renderWorkbench();
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

  exportCleanTxtBtn?.addEventListener("click", () => {
    const text = buildCleanNovelText(project);
    const fileName = `${safeFileName(project.title || "novel")}-正文.txt`;
    downloadText(fileName, text, "text/plain;charset=utf-8");
    setStatus("状态：已导出纯正文 TXT");
  });

  exportEpubBtn?.addEventListener("click", async () => {
    try {
      const blob = buildEpubBlob(project);
      const fileName = `${safeFileName(project.title || "novel")}.epub`;
      downloadBlob(fileName, blob);
      setStatus("状态：已导出 EPUB");
    } catch (err) {
      setStatus(`状态：EPUB 导出失败 - ${err.message}`);
    }
  });

  refreshStatsBtn?.addEventListener("click", () => {
    renderStats();
    setStatus("状态：统计已刷新");
  });

  createSnapshotBtn?.addEventListener("click", () => {
    createChapterSnapshot("手动快照", "manual");
    queueAutosave();
    renderSnapshots();
    setStatus("状态：已保存当前章节快照");
  });

  restoreSnapshotBtn?.addEventListener("click", () => {
    restoreSelectedSnapshot();
  });

  snapshotSelect?.addEventListener("change", () => {
    renderSnapshots();
  });

  addSceneBtn?.addEventListener("click", () => {
    addSceneFromInputs();
  });

  sceneList?.addEventListener("click", (event) => {
    const origin = event.target instanceof Element ? event.target : null;
    if (!origin) return;
    const deleteButton = origin.closest("button[data-delete-scene-id]");
    if (deleteButton) {
      deleteScene(deleteButton.dataset.deleteSceneId);
    }
  });

  addKnowledgeCardBtn?.addEventListener("click", () => {
    addKnowledgeCardFromInputs();
  });

  knowledgeCardList?.addEventListener("click", (event) => {
    const origin = event.target instanceof Element ? event.target : null;
    if (!origin) return;
    const deleteButton = origin.closest("button[data-delete-knowledge-id]");
    if (deleteButton) {
      deleteKnowledgeCard(deleteButton.dataset.deleteKnowledgeId);
    }
  });

  checkChapterBtn?.addEventListener("click", async () => {
    await checkCurrentChapter();
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
    renderStyleSkillCards();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === STYLE_SKILLS_KEY) {
      loadStyleSkills();
      renderStyleSkillSelect();
      renderStyleSkillCards();
    }
    if (event.key === SYSTEM_PROMPTS_KEY) {
      loadSystemPromptOverrides();
      renderSystemPromptInputs();
    }
    if (event.key === THEME_MODE_KEY) {
      loadThemeMode();
      applyThemeMode();
      renderThemeOptions();
    }
  });

  window.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.closeModal === "settings") {
      closeSettingsModal();
    }
    if (target.dataset.closeModal === "skills") {
      closeStyleSkillsModal();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (styleSkillsModal && !styleSkillsModal.classList.contains("hidden")) {
      closeStyleSkillsModal();
      return;
    }
    if (settingsModal && !settingsModal.classList.contains("hidden")) {
      closeSettingsModal();
    }
  });
}

function createDefaultProject() {
  const chapter = createChapter("第1章");
  return {
    title: "未命名小说",
    characterSetting: "",
    knowledgeCards: [],
    aiLog: [],
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
    scenes: [],
    snapshots: [],
    aiMarks: [],
    checkReport: "",
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
  renderWorkbench();
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
  renderWorkbench();
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
  autosaveInfoEl.textContent = "自动保存：保存中";
  autosaveTimer = setTimeout(() => {
    saveProjectToLocal();
  }, AUTOSAVE_MS);
}

function saveProjectToLocal() {
  project.updatedAt = Date.now();
  try {
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    autosaveInfoEl.textContent = `自动保存：已保存 ${formatTime(project.updatedAt)}`;
  } catch (err) {
    autosaveInfoEl.textContent = "自动保存：保存失败";
    setStatus(`状态：自动保存失败 - ${err.message}`);
  }
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
    knowledgeCards: sanitizeKnowledgeCards(value.knowledgeCards),
    aiLog: sanitizeAiLog(value.aiLog),
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
    scenes: sanitizeScenes(value.scenes),
    snapshots: sanitizeSnapshots(value.snapshots),
    aiMarks: sanitizeAiMarks(value.aiMarks),
    checkReport: asText(value.checkReport),
    updatedAt: Number(value.updatedAt) || Date.now()
  };
}

function asText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function sanitizeScenes(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      id: asText(item?.id, createId()),
      title: asText(item?.title).trim(),
      note: asText(item?.note).trim(),
      status: sanitizeSceneStatus(item?.status),
      updatedAt: Number(item?.updatedAt) || Date.now()
    }))
    .filter((item) => item.title || item.note)
    .slice(0, 80);
}

function sanitizeSceneStatus(value) {
  return Object.hasOwn(SCENE_STATUS_LABELS, value) ? value : "todo";
}

function sanitizeKnowledgeCards(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      id: asText(item?.id, createId()),
      type: sanitizeKnowledgeType(item?.type),
      title: asText(item?.title).trim(),
      body: asText(item?.body).trim(),
      updatedAt: Number(item?.updatedAt) || Date.now()
    }))
    .filter((item) => item.title || item.body)
    .slice(0, 240);
}

function sanitizeKnowledgeType(value) {
  return Object.hasOwn(KNOWLEDGE_TYPE_LABELS, value) ? value : "world";
}

function sanitizeSnapshots(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      id: asText(item?.id, createId()),
      label: asText(item?.label, "快照"),
      source: asText(item?.source, "manual"),
      title: asText(item?.title),
      setting: asText(item?.setting),
      content: asText(item?.content),
      scenes: sanitizeScenes(item?.scenes),
      createdAt: Number(item?.createdAt) || Date.now()
    }))
    .slice(0, MAX_CHAPTER_SNAPSHOTS);
}

function sanitizeAiMarks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      id: asText(item?.id, createId()),
      source: sanitizeAiSource(item?.source),
      start: Math.max(0, Number(item?.start) || 0),
      end: Math.max(0, Number(item?.end) || 0),
      preview: asText(item?.preview).slice(0, 200),
      createdAt: Number(item?.createdAt) || Date.now()
    }))
    .filter((item) => item.end >= item.start)
    .slice(-MAX_AI_LOG_ITEMS);
}

function sanitizeAiLog(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      id: asText(item?.id, createId()),
      chapterId: asText(item?.chapterId),
      chapterTitle: asText(item?.chapterTitle),
      source: sanitizeAiSource(item?.source),
      chars: Math.max(0, Number(item?.chars) || 0),
      preview: asText(item?.preview).slice(0, 240),
      createdAt: Number(item?.createdAt) || Date.now()
    }))
    .filter((item) => item.chapterId && item.preview)
    .slice(-MAX_AI_LOG_ITEMS);
}

function sanitizeAiSource(value) {
  return Object.hasOwn(AI_SOURCE_LABELS, value) ? value : "tab";
}

function renderWorkbench() {
  renderStats();
  renderSnapshots();
  renderScenes();
  renderKnowledgeCards();
  renderChapterCheck();
  renderAiLog();
}

function renderStats() {
  if (!statsPanel) return;
  const currentChapter = getCurrentChapter();
  const totalChars = project.chapters.reduce(
    (sum, chapter) => sum + countWritingChars(chapter.content),
    0
  );
  const currentChars = countWritingChars(currentChapter.content);
  const aiChars = project.aiLog.reduce((sum, item) => sum + item.chars, 0);
  const sceneCount = project.chapters.reduce(
    (sum, chapter) => sum + (chapter.scenes?.length || 0),
    0
  );
  const doneScenes = project.chapters.reduce(
    (sum, chapter) => sum + (chapter.scenes || []).filter((item) => item.status === "done").length,
    0
  );
  const stats = [
    ["全书字数", formatNumber(totalChars)],
    ["当前章", formatNumber(currentChars)],
    ["章节数", formatNumber(project.chapters.length)],
    ["场景进度", `${doneScenes}/${sceneCount || 0}`],
    ["设定卡", formatNumber(project.knowledgeCards.length)],
    ["AI 生成字数", formatNumber(aiChars)]
  ];

  if (paperStatsEl) {
    paperStatsEl.textContent = `${formatNumber(currentChars)} 字`;
  }

  statsPanel.innerHTML = "";
  stats.forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "stat-item";
    const strong = document.createElement("strong");
    strong.textContent = value;
    const span = document.createElement("span");
    span.textContent = label;
    item.append(strong, span);
    statsPanel.appendChild(item);
  });
}

function countWritingChars(text) {
  return String(text || "").replace(/\s/g, "").length;
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(Number(value) || 0);
}

function renderSnapshots() {
  if (!snapshotSelect || !snapshotInfo) return;
  const chapter = getCurrentChapter();
  const currentValue = snapshotSelect.value;
  snapshotSelect.innerHTML = "";

  if (!chapter.snapshots.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "暂无快照";
    snapshotSelect.appendChild(option);
    snapshotInfo.textContent = "手动保存快照，或接受 AI 改动前自动生成。";
    return;
  }

  chapter.snapshots.forEach((snapshot) => {
    const option = document.createElement("option");
    option.value = snapshot.id;
    option.textContent = `${formatTime(snapshot.createdAt)} · ${snapshot.label}`;
    snapshotSelect.appendChild(option);
  });

  if (currentValue && chapter.snapshots.some((item) => item.id === currentValue)) {
    snapshotSelect.value = currentValue;
  }

  const selected = chapter.snapshots.find((item) => item.id === snapshotSelect.value);
  snapshotInfo.textContent = selected
    ? `${selected.label}，${countWritingChars(selected.content)} 字`
    : `共 ${chapter.snapshots.length} 个快照`;
}

function createChapterSnapshot(label, source = "manual") {
  const chapter = getCurrentChapter();
  const snapshot = {
    id: createId(),
    label,
    source,
    title: chapter.title,
    setting: chapter.setting,
    content: chapter.content,
    scenes: (chapter.scenes || []).map((item) => ({ ...item })),
    createdAt: Date.now()
  };
  chapter.snapshots = [snapshot, ...(chapter.snapshots || [])].slice(0, MAX_CHAPTER_SNAPSHOTS);
  return snapshot;
}

function restoreSelectedSnapshot() {
  const chapter = getCurrentChapter();
  const snapshot = chapter.snapshots.find((item) => item.id === snapshotSelect?.value);
  if (!snapshot) {
    setStatus("状态：没有可恢复的快照");
    return;
  }

  createChapterSnapshot("恢复前自动备份", "restore");
  chapter.title = snapshot.title || chapter.title;
  chapter.setting = snapshot.setting || "";
  chapter.content = snapshot.content || "";
  chapter.scenes = sanitizeScenes(snapshot.scenes);
  chapter.updatedAt = Date.now();
  renderChapterList();
  renderCurrentChapter();
  queueAutosave();
  setStatus("状态：已恢复快照");
}

function renderScenes() {
  if (!sceneList) return;
  const chapter = getCurrentChapter();
  sceneList.innerHTML = "";

  if (!chapter.scenes.length) {
    const empty = document.createElement("div");
    empty.className = "workbench-note";
    empty.textContent = "还没有场景卡。";
    sceneList.appendChild(empty);
    return;
  }

  chapter.scenes.forEach((scene) => {
    const card = document.createElement("article");
    card.className = "mini-card";
    const head = document.createElement("div");
    head.className = "mini-card-head";
    const title = document.createElement("strong");
    title.textContent = scene.title || "(未命名场景)";
    const badge = document.createElement("span");
    badge.className = "mini-badge";
    badge.textContent = SCENE_STATUS_LABELS[scene.status] || "待写";
    const del = document.createElement("button");
    del.type = "button";
    del.className = "ghost danger";
    del.dataset.deleteSceneId = scene.id;
    del.textContent = "删除";
    head.append(title, badge, del);
    const pre = document.createElement("pre");
    pre.textContent = scene.note || "(无备注)";
    card.append(head, pre);
    sceneList.appendChild(card);
  });
}

function addSceneFromInputs() {
  const title = sceneTitleInput?.value.trim() || "";
  const note = sceneNoteInput?.value.trim() || "";
  if (!title && !note) {
    setStatus("状态：请先填写场景名或备注");
    return;
  }

  const chapter = getCurrentChapter();
  chapter.scenes.unshift({
    id: createId(),
    title,
    note,
    status: sanitizeSceneStatus(sceneStatusInput?.value),
    updatedAt: Date.now()
  });
  chapter.updatedAt = Date.now();
  if (sceneTitleInput) sceneTitleInput.value = "";
  if (sceneNoteInput) sceneNoteInput.value = "";
  renderScenes();
  renderStats();
  queueAutosave();
  setStatus("状态：已添加场景卡片");
}

function deleteScene(sceneId) {
  if (!sceneId) return;
  const chapter = getCurrentChapter();
  chapter.scenes = chapter.scenes.filter((item) => item.id !== sceneId);
  chapter.updatedAt = Date.now();
  renderScenes();
  renderStats();
  queueAutosave();
  setStatus("状态：已删除场景卡片");
}

function renderKnowledgeCards() {
  if (!knowledgeCardList) return;
  knowledgeCardList.innerHTML = "";

  if (!project.knowledgeCards.length) {
    const empty = document.createElement("div");
    empty.className = "workbench-note";
    empty.textContent = "还没有人物、世界观或伏笔卡。";
    knowledgeCardList.appendChild(empty);
    return;
  }

  project.knowledgeCards.forEach((card) => {
    const item = document.createElement("article");
    item.className = "mini-card";
    const head = document.createElement("div");
    head.className = "mini-card-head";
    const title = document.createElement("strong");
    title.textContent = card.title || "(未命名设定)";
    const badge = document.createElement("span");
    badge.className = "mini-badge";
    badge.textContent = KNOWLEDGE_TYPE_LABELS[card.type] || "设定";
    const del = document.createElement("button");
    del.type = "button";
    del.className = "ghost danger";
    del.dataset.deleteKnowledgeId = card.id;
    del.textContent = "删除";
    head.append(title, badge, del);
    const pre = document.createElement("pre");
    pre.textContent = card.body || "(无内容)";
    item.append(head, pre);
    knowledgeCardList.appendChild(item);
  });
}

function addKnowledgeCardFromInputs() {
  const title = knowledgeTitleInput?.value.trim() || "";
  const body = knowledgeBodyInput?.value.trim() || "";
  if (!title && !body) {
    setStatus("状态：请先填写设定卡片名称或内容");
    return;
  }

  project.knowledgeCards.unshift({
    id: createId(),
    type: sanitizeKnowledgeType(knowledgeTypeInput?.value),
    title,
    body,
    updatedAt: Date.now()
  });
  if (knowledgeTitleInput) knowledgeTitleInput.value = "";
  if (knowledgeBodyInput) knowledgeBodyInput.value = "";
  renderKnowledgeCards();
  renderStats();
  queueAutosave();
  setStatus("状态：已添加设定卡片");
}

function deleteKnowledgeCard(cardId) {
  if (!cardId) return;
  project.knowledgeCards = project.knowledgeCards.filter((item) => item.id !== cardId);
  renderKnowledgeCards();
  renderStats();
  queueAutosave();
  setStatus("状态：已删除设定卡片");
}

function renderChapterCheck() {
  if (!chapterCheckResult) return;
  const chapter = getCurrentChapter();
  chapterCheckResult.textContent = chapter.checkReport || "尚未检查当前章节。";
}

function renderAiLog() {
  if (!aiLogList || !aiLogSummary) return;
  const chapter = getCurrentChapter();
  const chapterLog = project.aiLog.filter((item) => item.chapterId === chapter.id);
  aiLogSummary.textContent = `当前章 ${chapterLog.length} 条，全书 ${project.aiLog.length} 条`;
  aiLogList.innerHTML = "";

  if (!chapterLog.length) {
    const empty = document.createElement("div");
    empty.className = "workbench-note";
    empty.textContent = "当前章还没有 AI 改动记录。";
    aiLogList.appendChild(empty);
    return;
  }

  chapterLog.slice(-8).reverse().forEach((item) => {
    const card = document.createElement("article");
    card.className = "mini-card";
    const head = document.createElement("div");
    head.className = "mini-card-head";
    const title = document.createElement("strong");
    title.textContent = AI_SOURCE_LABELS[item.source] || "AI";
    const badge = document.createElement("span");
    badge.className = "mini-badge";
    badge.textContent = `${formatNumber(item.chars)} 字`;
    const time = document.createElement("span");
    time.className = "mini-time";
    time.textContent = formatTime(item.createdAt);
    head.append(title, badge, time);
    const pre = document.createElement("pre");
    pre.textContent = item.preview;
    card.append(head, pre);
    aiLogList.appendChild(card);
  });
}

function recordAiEdit(payload) {
  const chapter = getCurrentChapter();
  const source = sanitizeAiSource(payload.source);
  const preview = asText(payload.preview || payload.text).trim().slice(0, 240);
  const chars = source === "check" ? 0 : countWritingChars(payload.text || payload.preview);
  const start = Math.max(0, Number(payload.start) || 0);
  const end = Math.max(start, Number(payload.end) || start);
  const item = {
    id: createId(),
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    source,
    chars,
    preview,
    createdAt: Date.now()
  };

  if (preview) {
    project.aiLog.push(item);
    project.aiLog = project.aiLog.slice(-MAX_AI_LOG_ITEMS);
    chapter.aiMarks.push({
      id: item.id,
      source,
      start,
      end,
      preview,
      createdAt: item.createdAt
    });
    chapter.aiMarks = chapter.aiMarks.slice(-MAX_AI_LOG_ITEMS);
  }
  renderStats();
  renderAiLog();
}

function normalizeApiProviderUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "")
    .toLowerCase();
}

function getApiProviderPresetById(presetId) {
  return API_PROVIDER_PRESETS.find((item) => item.id === presetId) || API_PROVIDER_PRESETS[0];
}

function inferApiProviderPresetId(config = {}) {
  const normalizedApiBaseUrl = normalizeApiProviderUrl(config.apiBaseUrl);
  const normalizedModel = String(config.model || "").trim().toLowerCase();
  const normalizedChapterModel = String(config.chapterModel || "").trim().toLowerCase();

  if (!normalizedApiBaseUrl) return "custom";

  if (normalizedApiBaseUrl === normalizeApiProviderUrl("https://api.openai.com/v1")) {
    return "openai";
  }

  if (normalizedApiBaseUrl === normalizeApiProviderUrl("https://openrouter.ai/api/v1")) {
    return "openrouter";
  }

  if (normalizedApiBaseUrl === normalizeApiProviderUrl("https://dashscope.aliyuncs.com/compatible-mode/v1")) {
    if (normalizedModel.includes("coder") || normalizedChapterModel.includes("coder")) {
      return "qwen_code";
    }
    if (normalizedChapterModel.includes("max") || normalizedModel.includes("plan")) {
      return "qwen_plan";
    }
    return "qwen";
  }

  return "custom";
}

function renderApiProviderPresetOptions() {
  if (!apiProviderPresetSelect) return;

  apiProviderPresetSelect.innerHTML = "";
  API_PROVIDER_PRESETS.forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    apiProviderPresetSelect.appendChild(option);
  });

  syncApiProviderPresetSelection();
}

function renderApiProviderPresetHint(presetId = "custom") {
  if (!apiProviderPresetHintEl) return;

  const preset = getApiProviderPresetById(presetId);
  if (!preset || preset.id === "custom") {
    apiProviderPresetHintEl.textContent =
      "手动填写任意 OpenAI 兼容接口。平台预设只负责帮你快速带出常用 URL 和推荐模型。";
    return;
  }

  apiProviderPresetHintEl.textContent = `${preset.description} URL：${preset.apiBaseUrl}；Tab：${preset.model}；续写/润色：${preset.chapterModel}。`;
}

function syncApiProviderPresetSelection(preferredPresetId = "") {
  if (!apiProviderPresetSelect) return;

  const nextPresetId = preferredPresetId || inferApiProviderPresetId({
    apiBaseUrl: apiBaseUrlInput?.value,
    model: modelInput?.value,
    chapterModel: chapterModelInput?.value
  });

  apiProviderPresetSelect.value = getApiProviderPresetById(nextPresetId).id;
  renderApiProviderPresetHint(apiProviderPresetSelect.value);
}

function applyApiProviderPreset(presetId, options = {}) {
  const preset = getApiProviderPresetById(presetId);
  if (!preset || preset.id === "custom") {
    syncApiProviderPresetSelection("custom");
    return;
  }

  apiBaseUrlInput.value = preset.apiBaseUrl;
  modelInput.value = preset.model;
  chapterModelInput.value = preset.chapterModel;
  syncApiProviderPresetSelection(preset.id);

  if (options.persist !== false) {
    saveApiConfigToLocal();
  }

  setStatus(`状态：已套用 ${preset.name} 预设`);
}

function loadAutoTabState() {
  const raw = localStorage.getItem(AUTO_TAB_ENABLED_KEY);
  autoTabEnabled = raw === "1";
}

function loadThemeMode() {
  const raw = localStorage.getItem(THEME_MODE_KEY);
  themeMode = sanitizeThemeMode(raw);
}

function persistThemeMode() {
  localStorage.setItem(THEME_MODE_KEY, themeMode);
}

function sanitizeThemeMode(value) {
  return value === "light" || value === "beige" || value === "dark" ? value : "beige";
}

function applyThemeMode() {
  document.body.dataset.theme = themeMode;
}

function renderThemeOptions() {
  if (!themeOptionsEl) return;

  const buttons = themeOptionsEl.querySelectorAll("button[data-theme-mode]");
  buttons.forEach((button) => {
    const mode = sanitizeThemeMode(button.getAttribute("data-theme-mode"));
    const isActive = mode === themeMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-checked", isActive ? "true" : "false");
  });
}

function getThemeLabel(mode) {
  if (mode === "light") return "白色模式";
  if (mode === "beige") return "米色模式";
  return "专注模式";
}

function setThemeMode(nextMode) {
  const safeMode = sanitizeThemeMode(nextMode);
  if (safeMode === themeMode) {
    renderThemeOptions();
    return;
  }

  themeMode = safeMode;
  persistThemeMode();
  applyThemeMode();
  renderThemeOptions();
  setStatus(`状态：已切换为${getThemeLabel(themeMode)}`);
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
  if (tabSettingsPanel) {
    tabSettingsPanel.classList.toggle("hidden", !isOpen);
  }
  if (tabSettingsToggleBtn) {
    tabSettingsToggleBtn.textContent = "设置";
  }
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
    styleSkills = ensureDefaultStyleSkills(sanitizeStyleSkills(parsed));
    if (!styleSkills.length) {
      styleSkills = cloneDefaultStyleSkills();
      persistStyleSkills();
    }
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
      category: asText(item?.category, "style").trim() || "style",
      prompt: asText(item?.prompt).trim()
    }))
    .filter((item) => item.id && item.name && item.prompt)
    .slice(0, 200);
}

function cloneDefaultStyleSkills() {
  return DEFAULT_STYLE_SKILLS.map((item) => ({ ...item }));
}

function ensureDefaultStyleSkills(items) {
  const existingIds = new Set(items.map((item) => item.id));
  const missingDefaults = cloneDefaultStyleSkills().filter((item) => !existingIds.has(item.id));
  return [...items, ...missingDefaults];
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
    option.textContent = `${getStyleSkillCategoryLabel(item.category)} · ${item.name}`;
    styleSkillSelect.appendChild(option);
  });

  if (currentValue && styleSkills.some((item) => item.id === currentValue)) {
    styleSkillSelect.value = currentValue;
  }
}

function loadSystemPromptOverrides() {
  const raw = localStorage.getItem(SYSTEM_PROMPTS_KEY);
  if (!raw) {
    systemPromptOverrides = { tab: "", chapter: "", polish: "" };
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    systemPromptOverrides = {
      tab: asText(parsed?.tab),
      chapter: asText(parsed?.chapter),
      polish: asText(parsed?.polish)
    };
  } catch {
    systemPromptOverrides = { tab: "", chapter: "", polish: "" };
  }
}

function persistSystemPromptOverrides() {
  localStorage.setItem(SYSTEM_PROMPTS_KEY, JSON.stringify(systemPromptOverrides));
}

function getSystemPrompt(kind) {
  if (kind === "tab") {
    return systemPromptOverrides.tab.trim() || promptDefaults.tabSystemPrompt || "";
  }
  if (kind === "chapter") {
    return systemPromptOverrides.chapter.trim() || promptDefaults.chapterSystemPrompt || "";
  }
  return systemPromptOverrides.polish.trim() || promptDefaults.polishSystemPrompt || "";
}

function renderSystemPromptInputs() {
  if (!tabSystemPromptInput || !chapterSystemPromptInput || !polishSystemPromptInput) return;
  tabSystemPromptInput.value = systemPromptOverrides.tab || promptDefaults.tabSystemPrompt || "";
  chapterSystemPromptInput.value =
    systemPromptOverrides.chapter || promptDefaults.chapterSystemPrompt || "";
  polishSystemPromptInput.value =
    systemPromptOverrides.polish || promptDefaults.polishSystemPrompt || "";
}

function saveSystemPrompts() {
  if (!tabSystemPromptInput || !chapterSystemPromptInput || !polishSystemPromptInput) return;
  systemPromptOverrides = {
    tab: tabSystemPromptInput.value.trim(),
    chapter: chapterSystemPromptInput.value.trim(),
    polish: polishSystemPromptInput.value.trim()
  };
  persistSystemPromptOverrides();
  renderSystemPromptInputs();
  setStatus("状态：系统提示词已保存");
}

function resetSystemPrompts() {
  systemPromptOverrides = { tab: "", chapter: "", polish: "" };
  persistSystemPromptOverrides();
  renderSystemPromptInputs();
  setStatus("状态：系统提示词已恢复默认");
}

function openSettingsModal() {
  if (!settingsModal) return;
  renderThemeOptions();
  syncApiProviderPresetSelection();
  settingsModal.classList.remove("hidden");
  settingsModal.setAttribute("aria-hidden", "false");
}

function closeSettingsModal() {
  if (!settingsModal) return;
  settingsModal.classList.add("hidden");
  settingsModal.setAttribute("aria-hidden", "true");
}

function openStyleSkillsModal() {
  if (!styleSkillsModal) return;
  renderStyleSkillCards();
  renderStyleSkillEditor();
  styleSkillsModal.classList.remove("hidden");
  styleSkillsModal.setAttribute("aria-hidden", "false");
}

function openStyleSkillsFromLegacyLink() {
  if (sessionStorage.getItem("novel-editor-open-style-skills") !== "1") return;
  sessionStorage.removeItem("novel-editor-open-style-skills");
  openStyleSkillsModal();
}

function closeStyleSkillsModal() {
  if (!styleSkillsModal) return;
  styleSkillsModal.classList.add("hidden");
  styleSkillsModal.setAttribute("aria-hidden", "true");
}

function renderStyleSkillCards() {
  if (!styleSkillsCardsEl) return;
  styleSkillsCardsEl.innerHTML = "";

  if (!styleSkills.length) {
    const empty = document.createElement("div");
    empty.className = "style-skill-empty";
    empty.textContent = "当前没有风格卡片，先创建一张。";
    styleSkillsCardsEl.appendChild(empty);
    return;
  }

  styleSkills.forEach((item) => {
    const card = document.createElement("article");
    card.className = "style-skill-card";

    const head = document.createElement("div");
    head.className = "style-skill-card-head";

    const title = document.createElement("strong");
    title.textContent = item.name;
    head.appendChild(title);

    const badge = document.createElement("span");
    badge.className = "mini-badge";
    badge.textContent = getStyleSkillCategoryLabel(item.category);
    head.appendChild(badge);

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "ghost";
    editBtn.dataset.styleSkillId = item.id;
    editBtn.textContent = "编辑";
    head.appendChild(editBtn);

    const content = document.createElement("pre");
    content.textContent = item.prompt;

    card.appendChild(head);
    card.appendChild(content);
    styleSkillsCardsEl.appendChild(card);
  });
}

function getStyleSkillCategoryLabel(category) {
  if (category === "task") return "任务卡";
  if (category === "avoid") return "禁忌卡";
  return "风格卡";
}

function renderStyleSkillEditor(skillId = "") {
  editingStyleSkillId = skillId || "";

  if (!styleSkillEditorTitleEl || !styleSkillNameInput || !styleSkillPromptInput) return;
  if (!editingStyleSkillId) {
    styleSkillEditorTitleEl.textContent = "新建风格卡片";
    styleSkillNameInput.value = "";
    styleSkillPromptInput.value = "";
    styleSkillDeleteBtn?.classList.add("hidden");
    return;
  }

  const target = styleSkills.find((item) => item.id === editingStyleSkillId);
  if (!target) {
    editingStyleSkillId = "";
    renderStyleSkillEditor("");
    return;
  }

  styleSkillEditorTitleEl.textContent = `编辑：${target.name}`;
  styleSkillNameInput.value = target.name;
  styleSkillPromptInput.value = target.prompt;
  styleSkillDeleteBtn?.classList.remove("hidden");
}

function startEditStyleSkill(skillId) {
  if (!skillId) return;
  renderStyleSkillEditor(skillId);
}

function saveStyleSkillFromModal() {
  if (!styleSkillNameInput || !styleSkillPromptInput) return;
  const name = styleSkillNameInput.value.trim();
  const prompt = styleSkillPromptInput.value.trim();
  if (!name || !prompt) {
    setStatus("状态：请填写卡片名称和风格提示词");
    return;
  }

  if (editingStyleSkillId) {
    styleSkills = styleSkills.map((item) =>
      item.id === editingStyleSkillId ? { ...item, name, prompt } : item
    );
    setStatus("状态：风格卡片已更新");
  } else {
    styleSkills.unshift({
      id: `style_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      category: "style",
      prompt
    });
    setStatus("状态：风格卡片已创建");
  }

  styleSkills = sanitizeStyleSkills(styleSkills);
  persistStyleSkills();
  renderStyleSkillSelect();
  renderStyleSkillCards();
  renderStyleSkillEditor("");
}

function deleteStyleSkillFromModal() {
  if (!editingStyleSkillId) return;
  styleSkills = styleSkills.filter((item) => item.id !== editingStyleSkillId);
  if (!styleSkills.length) {
    styleSkills = cloneDefaultStyleSkills();
  }
  persistStyleSkills();
  renderStyleSkillSelect();
  renderStyleSkillCards();
  renderStyleSkillEditor("");
  setStatus("状态：风格卡片已删除");
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
    syncApiProviderPresetSelection(asText(config.providerPreset));
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
    syncApiProviderPresetSelection();
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
    syncApiProviderPresetSelection();
  }
}

function saveApiConfigToLocal() {
  const config = {
    apiBaseUrl: apiBaseUrlInput.value.trim(),
    apiKey: apiKeyInput.value.trim(),
    model: modelInput.value.trim(),
    chapterModel: chapterModelInput.value.trim(),
    providerPreset: inferApiProviderPresetId({
      apiBaseUrl: apiBaseUrlInput.value,
      model: modelInput.value,
      chapterModel: chapterModelInput.value
    })
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
  const relevantMemory = buildRelevantMemory(chapter.content, cursor);
  const tabTrace = prefillTabPromptTrace({
    context,
    chapterContent: chapter.content,
    cursor,
    chapterTitle: activeChapterTitle,
    chapterSetting: activeChapterSetting,
    characterSetting: activeCharacterSetting,
    relevantMemory
  });
  const clientTimingContext = createClientTimingContext("Tab 补全");
  mergeApiMetricsTrace({
    requestKind: tabTrace.requestKind || clientTimingContext.requestKind,
    requestPhase: "请求已发送",
    clientStartedAt: clientTimingContext.startedAtIso
  });
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
        systemPrompt: getSystemPrompt("tab"),
        maxTokens: tabSettings.maxTokens,
        novelTitle: project.title,
        chapterTitle: activeChapterTitle,
        chapterSetting: activeChapterSetting,
        characterSetting: activeCharacterSetting,
        relevantMemory,
        paragraphMemory: collectParagraphMemory(chapter.content, cursor)
      })
    });

    mergeApiMetricsTrace({
      clientHeadersLatencyMs: elapsedMs(clientTimingContext.startedAtMs),
      requestPhase: "已收到代理响应头"
    });

    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "补全请求失败");
    }

    if (!response.body) {
      throw new Error("流式响应为空");
    }

    const streamResult = await readCompletionStream(response.body, clientTimingContext);
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
      mergeApiMetricsTrace({
        clientTotalMs: elapsedMs(clientTimingContext.startedAtMs),
        requestPhase: "请求已取消"
      });
      if (isAuto) {
        setAutoStatus("状态：自动 Tab 请求已取消", "auto_abort");
      }
      return;
    }
    clearSuggestion();
    mergeApiMetricsTrace({
      clientTotalMs: elapsedMs(clientTimingContext.startedAtMs),
      requestPhase: "请求失败"
    });
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
  const relevantMemory = buildRelevantMemory(chapter.content, start);
  const chapterTrace = prefillChapterPromptTrace({
    context,
    targetChars,
    chapterTitle: activeChapterTitle,
    chapterSetting: activeChapterSetting,
    characterSetting: activeCharacterSetting,
    relevantMemory
  });
  const clientTimingContext = createClientTimingContext("整章续写");
  mergeApiMetricsTrace({
    requestKind: chapterTrace.requestKind || clientTimingContext.requestKind,
    requestPhase: "请求已发送",
    clientStartedAt: clientTimingContext.startedAtIso
  });
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
        systemPrompt: getSystemPrompt("chapter"),
        targetChars,
        novelTitle: project.title,
        chapterTitle: activeChapterTitle,
        chapterSetting: activeChapterSetting,
        characterSetting: activeCharacterSetting,
        relevantMemory,
        debugTrace: true
      })
    });

    mergeApiMetricsTrace({
      clientHeadersLatencyMs: elapsedMs(clientTimingContext.startedAtMs),
      requestPhase: "已收到响应"
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

    applyDebugTraceToPanel(payload.trace, longText, {
      requestKind: clientTimingContext.requestKind,
      clientStartedAt: clientTimingContext.startedAtIso,
      clientHeadersLatencyMs: elapsedMs(clientTimingContext.startedAtMs),
      clientTotalMs: elapsedMs(clientTimingContext.startedAtMs),
      requestPhase: "已完成"
    });
    const insertText = formatChapterInsertion(beforeCursor, longText);
    showPendingEdit({
      typeLabel: "续写建议",
      hint: `将插入约 ${longText.length} 字内容`,
      preview: insertText,
      source: "chapter",
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
      mergeApiMetricsTrace({
        clientTotalMs: elapsedMs(clientTimingContext.startedAtMs),
        requestPhase: "请求已取消"
      });
      setStatus("状态：已取消整章续写");
      return;
    }
    mergeApiMetricsTrace({
      clientTotalMs: elapsedMs(clientTimingContext.startedAtMs),
      requestPhase: "请求失败"
    });
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
  const relevantMemory = buildRelevantMemory(editor.value, start);
  const polishTrace = prefillPolishPromptTrace({
    selectedText,
    styleRequirement,
    styleSkillPrompt,
    chapterTitle: chapterTitleInput.value || chapter.title,
    chapterSetting: chapterSettingInput.value,
    characterSetting: characterSettingInput.value,
    relevantMemory
  });
  const clientTimingContext = createClientTimingContext("选中润色");
  mergeApiMetricsTrace({
    requestKind: polishTrace.requestKind || clientTimingContext.requestKind,
    requestPhase: "请求已发送",
    clientStartedAt: clientTimingContext.startedAtIso
  });
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
        systemPrompt: getSystemPrompt("polish"),
        novelTitle: project.title,
        chapterTitle: chapterTitleInput.value || chapter.title,
        chapterSetting: chapterSettingInput.value,
        characterSetting: characterSettingInput.value,
        relevantMemory,
        debugTrace: true
      })
    });

    mergeApiMetricsTrace({
      clientHeadersLatencyMs: elapsedMs(clientTimingContext.startedAtMs),
      requestPhase: "已收到响应"
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

    applyDebugTraceToPanel(payload.trace, polishedText, {
      requestKind: clientTimingContext.requestKind,
      clientStartedAt: clientTimingContext.startedAtIso,
      clientHeadersLatencyMs: elapsedMs(clientTimingContext.startedAtMs),
      clientTotalMs: elapsedMs(clientTimingContext.startedAtMs),
      requestPhase: "已完成"
    });
    showPendingEdit({
      typeLabel: "润色建议",
      hint: `将替换选中的 ${selectedText.length} 字`,
      preview: polishedText,
      source: "polish",
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
    mergeApiMetricsTrace({
      clientTotalMs: elapsedMs(clientTimingContext.startedAtMs),
      requestPhase: "请求失败"
    });
    setStatus(`状态：润色失败 - ${err.message}`);
  } finally {
    setPolishSelectionBusy(false);
  }
}

async function checkCurrentChapter() {
  if (!defaultsLoaded) return;
  const chapter = getCurrentChapter();
  if (!chapter.content.trim()) {
    setStatus("状态：当前章没有正文，无法检查");
    return;
  }

  checkChapterBtn.disabled = true;
  if (chapterCheckResult) {
    chapterCheckResult.textContent = "正在检查当前章节...";
  }
  setStatus("状态：正在检查章节目标、重复、人物一致性和伏笔...");

  try {
    const response = await fetch("/api/check-chapter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: chapter.content,
        apiBaseUrl: apiBaseUrlInput.value.trim(),
        apiKey: apiKeyInput.value.trim(),
        chapterModel: chapterModelInput.value.trim(),
        novelTitle: project.title,
        chapterTitle: chapterTitleInput.value || chapter.title,
        chapterSetting: chapterSettingInput.value,
        characterSetting: characterSettingInput.value,
        scenes: chapter.scenes,
        knowledgeCards: project.knowledgeCards,
        relevantMemory: buildRelevantMemory(chapter.content, chapter.content.length)
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "章节检查失败");
    }

    chapter.checkReport = normalizePolishedText(payload.report || "");
    chapter.updatedAt = Date.now();
    recordAiEdit({
      source: "check",
      text: chapter.checkReport,
      preview: chapter.checkReport,
      start: 0,
      end: 0
    });
    renderChapterCheck();
    queueAutosave();
    setStatus("状态：章节检查完成");
  } catch (err) {
    if (chapterCheckResult) {
      chapterCheckResult.textContent = `检查失败：${err.message}`;
    }
    setStatus(`状态：章节检查失败 - ${err.message}`);
  } finally {
    checkChapterBtn.disabled = false;
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

function buildRelevantMemory(content, cursor = 0) {
  const chapter = getCurrentChapter();
  const anchor = [
    chapter.title,
    chapter.setting,
    String(content || "").slice(Math.max(0, cursor - 1200), cursor + 400)
  ].join("\n");
  const terms = extractSearchTerms(anchor);
  const candidates = [];

  project.knowledgeCards.forEach((card) => {
    candidates.push({
      type: KNOWLEDGE_TYPE_LABELS[card.type] || "设定",
      title: card.title,
      body: card.body,
      score: scoreTextByTerms(`${card.title}\n${card.body}`, terms) + 2
    });
  });

  (chapter.scenes || []).forEach((scene) => {
    candidates.push({
      type: "当前章场景",
      title: scene.title,
      body: `${SCENE_STATUS_LABELS[scene.status] || "待写"}\n${scene.note}`,
      score: scoreTextByTerms(`${scene.title}\n${scene.note}`, terms) + 1
    });
  });

  project.chapters.forEach((item) => {
    if (item.id === chapter.id || !item.content?.trim()) return;
    const text = `${item.title}\n${item.setting}\n${item.content}`;
    const score = scoreTextByTerms(text, terms);
    if (score <= 0) return;
    candidates.push({
      type: "旧章节片段",
      title: item.title,
      body: item.content.slice(0, 420),
      score
    });
  });

  return candidates
    .filter((item) => item.title || item.body)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RETRIEVED_CONTEXT_ITEMS)
    .map((item) => ({
      type: item.type,
      title: asText(item.title).slice(0, 80),
      body: asText(item.body).slice(0, 600)
    }));
}

function extractSearchTerms(text) {
  const source = String(text || "");
  const cjkTerms = source.match(/[\u4e00-\u9fa5]{2,8}/g) || [];
  const latinTerms = source.match(/[A-Za-z][A-Za-z0-9_-]{2,}/g) || [];
  return Array.from(new Set([...cjkTerms, ...latinTerms]))
    .filter((term) => !/^(这个|那个|一种|一下|他们|我们|自己|已经|不是|没有|什么|因为|所以|但是|然后)$/.test(term))
    .slice(-80);
}

function scoreTextByTerms(text, terms) {
  const haystack = String(text || "").toLowerCase();
  return terms.reduce((score, term) => {
    const needle = term.toLowerCase();
    if (!needle || !haystack.includes(needle)) return score;
    return score + Math.min(4, Math.ceil(needle.length / 2));
  }, 0);
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
    source: sanitizeAiSource(payload.source),
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
  createChapterSnapshot(`${proposal.typeLabel}前`, proposal.source);
  editor.setRangeText(proposal.replacement, proposal.start, proposal.end, proposal.selectMode);

  const chapter = getCurrentChapter();
  chapter.content = editor.value;
  chapter.updatedAt = Date.now();
  recordAiEdit({
    source: proposal.source,
    text: proposal.replacement,
    preview: proposal.replacement,
    start: proposal.start,
    end: proposal.start + proposal.replacement.length
  });

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
  createChapterSnapshot("Tab 补全前", "tab");
  editor.setRangeText(suggestion, start, end, "end");

  const chapter = getCurrentChapter();
  chapter.content = editor.value;
  chapter.updatedAt = Date.now();
  recordAiEdit({
    source: "tab",
    text: suggestion,
    preview: suggestion,
    start,
    end: start + suggestion.length
  });

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
  apiMetricsState = {};
  if (apiPromptTraceEl) apiPromptTraceEl.textContent = "";
  if (apiMetricsTraceEl) apiMetricsTraceEl.textContent = "";
  if (apiStreamTraceEl) apiStreamTraceEl.textContent = "";
}

function prefillTabPromptTrace(payload) {
  const paragraphMemory = collectParagraphMemory(payload.chapterContent || "", payload.cursor || 0);
  const trace = buildApiTraceMeta({
    requestKind: "Tab 补全",
    model: modelInput.value.trim() || "",
    temperature: promptDefaults.tabTemperature,
    maxTokens: tabSettings.maxTokens,
    systemPrompt: resolveSystemPrompt("tab"),
    userPrompt: buildTabUserPromptForTrace({
      context: payload.context,
      novelTitle: project.title,
      chapterTitle: payload.chapterTitle,
      chapterSetting: payload.chapterSetting,
      characterSetting: payload.characterSetting,
      relevantMemory: payload.relevantMemory,
      paragraphMemory
    })
  });
  resetApiTrace();
  setApiPromptTrace(trace);
  setApiMetricsTrace({
    requestKind: trace.requestKind,
    requestPhase: "提示词已就绪",
    ...trace.metrics
  });
  return trace;
}

function prefillChapterPromptTrace(payload) {
  const targetChars = clampInt(payload.targetChars, 300, 5000, 1200);
  const inferredMaxTokens = estimateChapterMaxTokensForTrace(targetChars);
  const trace = buildApiTraceMeta({
    requestKind: "整章续写",
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
      relevantMemory: payload.relevantMemory,
      targetChars
    })
  });
  resetApiTrace();
  setApiPromptTrace(trace);
  setApiMetricsTrace({
    requestKind: trace.requestKind,
    requestPhase: "提示词已就绪",
    ...trace.metrics
  });
  return trace;
}

function prefillPolishPromptTrace(payload) {
  const trace = buildApiTraceMeta({
    requestKind: "选中润色",
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
      characterSetting: payload.characterSetting,
      relevantMemory: payload.relevantMemory
    })
  });
  resetApiTrace();
  setApiPromptTrace(trace);
  setApiMetricsTrace({
    requestKind: trace.requestKind,
    requestPhase: "提示词已就绪",
    ...trace.metrics
  });
  return trace;
}

function buildApiTraceMeta(payload) {
  const metrics = buildPromptTokenMetrics(payload.systemPrompt, payload.userPrompt);
  return {
    requestKind: payload.requestKind,
    model: payload.model || "",
    temperature: payload.temperature,
    maxTokens: payload.maxTokens,
    systemPrompt: payload.systemPrompt || "",
    userPrompt: payload.userPrompt || "",
    metrics
  };
}

function buildPromptTokenMetrics(systemPrompt, userPrompt) {
  const systemPromptTokensEstimated = estimateTraceTextTokens(systemPrompt);
  const userPromptTokensEstimated = estimateTraceTextTokens(userPrompt);
  return {
    systemPromptTokensEstimated,
    userPromptTokensEstimated,
    promptTokensEstimated: systemPromptTokensEstimated + userPromptTokensEstimated + 6
  };
}

function resolveSystemPrompt(kind) {
  const value = getSystemPrompt(kind);
  return value || "（系统提示词由服务端配置，当前未下发）";
}

function buildTabUserPromptForTrace(payload) {
  const safeContext = safeTraceText(payload.context, 420);
  const safeNovelTitle = safeTraceText(payload.novelTitle, 120);
  const safeChapterTitle = safeTraceText(payload.chapterTitle, 120);
  const safeChapterSetting = safeTraceText(payload.chapterSetting, 1600);
  const safeCharacterSetting = safeTraceText(payload.characterSetting, 1600);
  const relevantMemory = normalizeTraceMemoryItems(payload.relevantMemory, 5);
  const beforeParagraphs = normalizeTraceParagraphArray(payload.paragraphMemory?.before, 2);
  const afterParagraphs = normalizeTraceParagraphArray(payload.paragraphMemory?.after, 1);

  const sections = [
    "请根据以下信息在光标处续写。",
    safeNovelTitle ? `小说标题：\n${safeNovelTitle}` : "",
    safeChapterTitle ? `章节标题：\n${safeChapterTitle}` : "",
    safeCharacterSetting ? `人物设定：\n${safeCharacterSetting}` : "",
    safeChapterSetting ? `章节设定：\n${safeChapterSetting}` : "",
    relevantMemory.length ? `检索到的相关设定/旧文：\n${formatTraceMemoryItems(relevantMemory)}` : "",
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
  const relevantMemory = normalizeTraceMemoryItems(payload.relevantMemory, 8);

  const sections = [
    "请根据以下信息续写完整章节内容。",
    safeNovelTitle ? `小说标题：\n${safeNovelTitle}` : "",
    safeChapterTitle ? `章节标题：\n${safeChapterTitle}` : "",
    safeCharacterSetting ? `人物设定：\n${safeCharacterSetting}` : "",
    safeChapterSetting ? `章节设定：\n${safeChapterSetting}` : "",
    relevantMemory.length ? `检索到的相关设定/旧文：\n${formatTraceMemoryItems(relevantMemory)}` : "",
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
  const relevantMemory = normalizeTraceMemoryItems(payload.relevantMemory, 8);

  const sections = [
    "请润色下面这段已写好的正文。",
    safeNovelTitle ? `小说标题：\n${safeNovelTitle}` : "",
    safeChapterTitle ? `章节标题：\n${safeChapterTitle}` : "",
    safeCharacterSetting ? `人物设定：\n${safeCharacterSetting}` : "",
    safeChapterSetting ? `章节设定：\n${safeChapterSetting}` : "",
    relevantMemory.length ? `检索到的相关设定/旧文：\n${formatTraceMemoryItems(relevantMemory)}` : "",
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

function normalizeTraceMemoryItems(value, maxItems) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      type: safeTraceText(item?.type, 40),
      title: safeTraceText(item?.title, 100),
      body: safeTraceText(item?.body, 800)
    }))
    .filter((item) => item.title || item.body)
    .slice(0, maxItems);
}

function formatTraceMemoryItems(items) {
  return items
    .map((item, index) => {
      const type = item.type ? `[${item.type}]` : "[相关]";
      const title = item.title ? `《${item.title}》` : "未命名";
      return `${index + 1}. ${type}${title}\n${item.body}`;
    })
    .join("\n");
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

function estimateTraceTextTokens(text) {
  const source = String(text || "").replace(/\r/g, "");
  if (!source.trim()) return 0;

  let tokens = 0;
  let asciiBufferLength = 0;

  const flushAscii = () => {
    if (!asciiBufferLength) return;
    tokens += Math.ceil(asciiBufferLength / 4);
    asciiBufferLength = 0;
  };

  for (const ch of source) {
    if (/\s/.test(ch)) {
      flushAscii();
      continue;
    }

    if (isTraceCjkChar(ch)) {
      flushAscii();
      tokens += 1.3;
      continue;
    }

    if (/[A-Za-z0-9]/.test(ch)) {
      asciiBufferLength += 1;
      continue;
    }

    flushAscii();
    tokens += 0.6;
  }

  flushAscii();
  return Math.max(1, Math.round(tokens));
}

function isTraceCjkChar(ch) {
  const code = ch.codePointAt(0) || 0;
  return (
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xf900 && code <= 0xfaff)
  );
}

function createClientTimingContext(requestKind) {
  return {
    requestKind,
    startedAtMs: performance.now(),
    startedAtIso: new Date().toISOString()
  };
}

function elapsedMs(startedAtMs) {
  return Math.max(0, Math.round(performance.now() - startedAtMs));
}

function setApiStreamTrace(text) {
  if (!apiStreamTraceEl) return;
  apiStreamTraceEl.textContent = String(text || "");
}

function setApiMetricsTrace(metrics) {
  apiMetricsState = metrics && typeof metrics === "object" ? { ...metrics } : {};
  renderApiMetricsTrace();
}

function mergeApiMetricsTrace(patch) {
  if (!patch || typeof patch !== "object") return;
  apiMetricsState = {
    ...apiMetricsState,
    ...patch
  };
  renderApiMetricsTrace();
}

function renderApiMetricsTrace() {
  if (!apiMetricsTraceEl) return;

  const metrics = apiMetricsState || {};
  const lines = [];
  appendMetricLine(lines, "请求类型", metrics.requestKind);
  appendMetricLine(lines, "阶段", metrics.requestPhase);
  appendMetricLine(lines, "客户端发起时间", metrics.clientStartedAt);
  appendMetricLine(lines, "API 发起时间", metrics.apiRequestStartedAt);
  appendMetricLine(lines, "客户端首包延迟", formatMetricMs(metrics.clientHeadersLatencyMs));
  appendMetricLine(lines, "客户端首个流事件延迟", formatMetricMs(metrics.clientFirstEventLatencyMs));
  appendMetricLine(lines, "客户端首个 reasoning 延迟", formatMetricMs(metrics.clientFirstReasoningLatencyMs));
  appendMetricLine(lines, "客户端首个可见正文延迟", formatMetricMs(metrics.clientFirstVisibleTokenLatencyMs ?? metrics.clientFirstTokenLatencyMs));
  appendMetricLine(lines, "客户端总耗时", formatMetricMs(metrics.clientTotalMs));
  appendMetricLine(lines, "API 首包延迟", formatMetricMs(metrics.upstreamHeadersLatencyMs));
  appendMetricLine(lines, "API 首个流事件延迟", formatMetricMs(metrics.upstreamFirstEventLatencyMs));
  appendMetricLine(lines, "API 首个 reasoning 延迟", formatMetricMs(metrics.upstreamFirstReasoningLatencyMs));
  appendMetricLine(lines, "API 首个可见正文延迟", formatMetricMs(metrics.upstreamFirstTokenLatencyMs));
  appendMetricLine(lines, "API 总耗时", formatMetricMs(metrics.upstreamTotalMs));
  appendMetricLine(lines, "提示词 tokens（估算）", formatMetricInteger(metrics.promptTokensEstimated));
  appendMetricLine(lines, "System tokens（估算）", formatMetricInteger(metrics.systemPromptTokensEstimated));
  appendMetricLine(lines, "User tokens（估算）", formatMetricInteger(metrics.userPromptTokensEstimated));
  appendMetricLine(lines, "提示词 tokens（API）", formatMetricInteger(metrics.promptTokensActual));
  appendMetricLine(lines, "输出 tokens（估算）", formatMetricInteger(metrics.completionTokensEstimated));
  appendMetricLine(lines, "输出 tokens（API）", formatMetricInteger(metrics.completionTokensActual));
  appendMetricLine(lines, "总 tokens（API）", formatMetricInteger(metrics.totalTokensActual));
  appendMetricLine(lines, "输出字符数", formatMetricInteger(metrics.outputChars));
  appendMetricLine(lines, "流式块数", formatMetricInteger(metrics.streamChunkCount));
  appendMetricLine(lines, "输出速率", formatMetricRate(metrics.outputTokensPerSecond));
  appendMetricLine(lines, "用量来源", formatUsageSource(metrics.usageSource));

  apiMetricsTraceEl.textContent = lines.length ? lines.join("\n") : "暂无调用指标";
  if (apiTracePanel) {
    apiTracePanel.open = true;
  }
}

function appendMetricLine(lines, label, value) {
  if (value === "" || value === null || value === undefined) return;
  lines.push(`${label}：${value}`);
}

function formatMetricMs(value) {
  return Number.isFinite(value) ? `${Math.round(value)} ms` : "";
}

function formatMetricInteger(value) {
  return Number.isFinite(value) ? String(Math.round(value)) : "";
}

function formatMetricRate(value) {
  return Number.isFinite(value) ? `${value.toFixed(2)} tokens/s` : "";
}

function formatUsageSource(value) {
  if (value === "provider") return "API 实际返回";
  if (value === "estimated") return "本地估算";
  if (value === "provider_with_estimated_fallback") return "API + 本地补全估算";
  return "";
}

function formatThinkingMode(value) {
  if (value === "disabled") return "disabled";
  if (value === "provider_default") return "provider_default";
  return "";
}

function setApiPromptTrace(meta) {
  if (!apiPromptTraceEl) return;

  const metrics = meta?.metrics && typeof meta.metrics === "object" ? meta.metrics : {};
  const parts = [
    `model: ${meta.model || ""}`,
    `temperature: ${meta.temperature ?? ""}`,
    `max_tokens: ${meta.maxTokens ?? ""}`,
    `thinking: ${formatThinkingMode(meta.thinkingMode)}`,
    metrics.promptTokensEstimated != null
      ? `estimated_prompt_tokens: ${metrics.promptTokensEstimated}`
      : "",
    metrics.systemPromptTokensEstimated != null
      ? `estimated_system_tokens: ${metrics.systemPromptTokensEstimated}`
      : "",
    metrics.userPromptTokensEstimated != null
      ? `estimated_user_tokens: ${metrics.userPromptTokensEstimated}`
      : "",
    "",
    "[System Prompt]",
    meta.systemPrompt || "",
    "",
    "[User Prompt]",
    meta.userPrompt || ""
  ].filter((item) => item !== "");
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

function applyDebugTraceToPanel(trace, outputText, extraMetrics = {}) {
  if (trace && typeof trace === "object") {
    setApiPromptTrace(trace);
    if (trace.metrics && typeof trace.metrics === "object") {
      mergeApiMetricsTrace(trace.metrics);
    }
  }
  if (extraMetrics && typeof extraMetrics === "object") {
    mergeApiMetricsTrace(extraMetrics);
  }
  setApiStreamTrace(outputText || "");
}

async function readCompletionStream(bodyStream, clientTimingContext) {
  const reader = bodyStream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamText = "";
  let doneSuggestion = "";
  let firstEventSeen = false;
  let firstReasoningSeen = false;
  let firstDeltaSeen = false;

  const markClientFirstEvent = () => {
    if (!clientTimingContext || firstEventSeen) return;
    firstEventSeen = true;
    mergeApiMetricsTrace({
      clientFirstEventLatencyMs: elapsedMs(clientTimingContext.startedAtMs)
    });
  };

  const markClientFirstReasoning = () => {
    if (!clientTimingContext || firstReasoningSeen) return;
    firstReasoningSeen = true;
    mergeApiMetricsTrace({
      clientFirstReasoningLatencyMs: elapsedMs(clientTimingContext.startedAtMs)
    });
  };

  const markClientFirstVisible = () => {
    if (!clientTimingContext || firstDeltaSeen) return;
    firstDeltaSeen = true;
    const latency = elapsedMs(clientTimingContext.startedAtMs);
    mergeApiMetricsTrace({
      clientFirstVisibleTokenLatencyMs: latency,
      clientFirstTokenLatencyMs: latency,
      requestPhase: "流式输出中"
    });
  };

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
        mergeApiMetricsTrace(event.metrics || {});
        continue;
      }

      if (event.type === "metrics") {
        const eventMetrics = event.metrics || {};
        if (eventMetrics.upstreamFirstEventLatencyMs != null) {
          markClientFirstEvent();
        }
        if (eventMetrics.upstreamFirstReasoningLatencyMs != null) {
          markClientFirstReasoning();
        }
        mergeApiMetricsTrace(eventMetrics);
        continue;
      }

      if (event.type === "delta") {
        const text = String(event.text || "");
        if (text) {
          markClientFirstEvent();
          markClientFirstVisible();
        }
        streamText += text;
        appendApiStreamTrace(text);
        continue;
      }

      if (event.type === "done") {
        doneSuggestion = String(event.suggestion || "");
        if (event.metrics && typeof event.metrics === "object") {
          mergeApiMetricsTrace(event.metrics);
        }
        if (!streamText && doneSuggestion) {
          markClientFirstEvent();
          markClientFirstVisible();
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
    if (tailEvent.metrics && typeof tailEvent.metrics === "object") {
      mergeApiMetricsTrace(tailEvent.metrics);
    }
    if (!streamText && doneSuggestion) {
      markClientFirstEvent();
      markClientFirstVisible();
      appendApiStreamTrace(doneSuggestion);
    }
  } else if (tailEvent?.type === "delta") {
    const text = String(tailEvent.text || "");
    if (text) {
      markClientFirstEvent();
      markClientFirstVisible();
    }
    streamText += text;
    appendApiStreamTrace(text);
  } else if (tailEvent?.type === "metrics") {
    const eventMetrics = tailEvent.metrics || {};
    if (eventMetrics.upstreamFirstEventLatencyMs != null) {
      markClientFirstEvent();
    }
    if (eventMetrics.upstreamFirstReasoningLatencyMs != null) {
      markClientFirstReasoning();
    }
    mergeApiMetricsTrace(eventMetrics);
  }

  if (clientTimingContext) {
    mergeApiMetricsTrace({
      clientTotalMs: elapsedMs(clientTimingContext.startedAtMs),
      requestPhase: "已完成"
    });
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

function buildCleanNovelText(targetProject) {
  const chunks = [targetProject.title || "未命名小说", ""];
  targetProject.chapters.forEach((chapter, index) => {
    chunks.push(chapter.title || `第${index + 1}章`);
    chunks.push("");
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

function buildEpubBlob(targetProject) {
  const title = targetProject.title || "未命名小说";
  const files = [
    {
      path: "mimetype",
      content: "application/epub+zip"
    },
    {
      path: "META-INF/container.xml",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
    },
    {
      path: "OEBPS/nav.xhtml",
      content: buildEpubNav(title, targetProject.chapters)
    },
    {
      path: "OEBPS/content.opf",
      content: buildEpubOpf(title, targetProject.chapters)
    },
    ...targetProject.chapters.map((chapter, index) => ({
      path: `OEBPS/chapter-${index + 1}.xhtml`,
      content: buildEpubChapter(chapter, index)
    }))
  ];

  return new Blob([createZipStore(files)], { type: "application/epub+zip" });
}

function buildEpubOpf(title, chapters) {
  const manifestItems = chapters
    .map(
      (_chapter, index) =>
        `<item id="chapter-${index + 1}" href="chapter-${index + 1}.xhtml" media-type="application/xhtml+xml"/>`
    )
    .join("\n    ");
  const spineItems = chapters
    .map((_chapter, index) => `<itemref idref="chapter-${index + 1}"/>`)
    .join("\n    ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">novel-${Date.now()}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>zh-CN</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    ${manifestItems}
  </manifest>
  <spine>
    ${spineItems}
  </spine>
</package>`;
}

function buildEpubNav(title, chapters) {
  const items = chapters
    .map(
      (chapter, index) =>
        `<li><a href="chapter-${index + 1}.xhtml">${escapeXml(chapter.title || `第${index + 1}章`)}</a></li>`
    )
    .join("\n      ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN">
  <head><title>${escapeXml(title)}</title></head>
  <body>
    <nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops">
      <h1>${escapeXml(title)}</h1>
      <ol>
      ${items}
      </ol>
    </nav>
  </body>
</html>`;
}

function buildEpubChapter(chapter, index) {
  const paragraphs = String(chapter.content || "")
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeXml(paragraph)}</p>`)
    .join("\n    ");
  const title = chapter.title || `第${index + 1}章`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN">
  <head>
    <title>${escapeXml(title)}</title>
  </head>
  <body>
    <h1>${escapeXml(title)}</h1>
    ${paragraphs || "<p></p>"}
  </body>
</html>`;
}

function createZipStore(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.path);
    const data = typeof file.content === "string" ? encoder.encode(file.content) : file.content;
    const crc = crc32(data);
    const local = buildZipLocalHeader(nameBytes, data.length, crc);
    chunks.push(local, data);
    central.push(buildZipCentralHeader(nameBytes, data.length, crc, offset));
    offset += local.length + data.length;
  });

  const centralSize = central.reduce((sum, item) => sum + item.length, 0);
  const end = buildZipEndRecord(files.length, centralSize, offset);
  return concatUint8Arrays([...chunks, ...central, end]);
}

function buildZipLocalHeader(nameBytes, size, crc) {
  const header = new Uint8Array(30 + nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, size, true);
  view.setUint32(22, size, true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true);
  header.set(nameBytes, 30);
  return header;
}

function buildZipCentralHeader(nameBytes, size, crc, offset) {
  const header = new Uint8Array(46 + nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, size, true);
  view.setUint32(24, size, true);
  view.setUint16(28, nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, offset, true);
  header.set(nameBytes, 46);
  return header;
}

function buildZipEndRecord(fileCount, centralSize, centralOffset) {
  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, fileCount, true);
  view.setUint16(10, fileCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  view.setUint16(20, 0, true);
  return end;
}

function concatUint8Arrays(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc ^= data[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadText(fileName, text, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  downloadBlob(fileName, blob);
}

function downloadBlob(fileName, blob) {
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

  const visibleFiles = explorerFiles.filter((item) => item && item.name);

  if (!visibleFiles.length) {
    const empty = document.createElement("div");
    empty.className = "folder-info";
    empty.textContent = "当前文件夹没有可编辑的 .md/.txt 文件";
    explorerListEl.appendChild(empty);
    return;
  }

  visibleFiles.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "explorer-item";
    button.dataset.fileName = item.name;
    const icon = document.createElement("span");
    icon.className = "file-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = item.name.toLowerCase().endsWith(".md") ? "MD" : "TXT";
    const name = document.createElement("span");
    name.className = "file-name";
    name.textContent = item.name;
    button.append(icon, name);
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
  autosaveInfoEl.textContent = "自动保存：保存中";
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

    autosaveInfoEl.textContent = `自动保存：已保存 ${formatTime(Date.now())}（文件）`;
  } catch (err) {
    autosaveInfoEl.textContent = "自动保存：保存失败";
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

  output.sort(compareChapterFileItems);
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
      knowledgeCards: [],
      aiLog: [],
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

  output.sort(compareChapterFileItems);
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

  return chapterFiles.sort(compareChapterFileItems);
}

function compareChapterFileItems(a, b) {
  const aName = asText(a?.name);
  const bName = asText(b?.name);
  const aNo = extractChapterSortNumber(aName);
  const bNo = extractChapterSortNumber(bName);

  if (aNo !== null && bNo !== null && aNo !== bNo) {
    return aNo - bNo;
  }

  if (aNo !== null && bNo === null) return -1;
  if (aNo === null && bNo !== null) return 1;

  return aName.localeCompare(bName, "zh-CN", { numeric: true, sensitivity: "base" });
}

function extractChapterSortNumber(fileName) {
  const baseName = String(fileName || "").replace(/\.[^.]+$/, "");
  const patterns = [
    /^(\d{1,4})(?:[-_.\s]|$)/,
    /第\s*(\d{1,4})\s*[章节回卷集]/,
    /(?:chapter|chap)\s*(\d{1,4})/i,
    /(?:^|[-_\s])(\d{1,4})(?:[-_\s]|$)/
  ];

  for (const pattern of patterns) {
    const match = baseName.match(pattern);
    if (!match) continue;
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
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




