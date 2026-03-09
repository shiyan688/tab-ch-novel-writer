const STYLE_SKILLS_KEY = "novel-editor-style-skills-v1";
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

const skillNameInput = document.getElementById("skillNameInput");
const skillPromptInput = document.getElementById("skillPromptInput");
const formTitle = document.getElementById("formTitle");
const saveSkillBtn = document.getElementById("saveSkillBtn");
const resetSkillBtn = document.getElementById("resetSkillBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const skillsListEl = document.getElementById("skillsList");

let skills = [];
let editingId = "";

initialize();

function initialize() {
  loadSkills();
  renderSkills();
  bindEvents();
}

function bindEvents() {
  saveSkillBtn.addEventListener("click", () => {
    saveSkill();
  });

  resetSkillBtn.addEventListener("click", () => {
    resetForm();
  });

  cancelEditBtn.addEventListener("click", () => {
    resetForm();
  });

  skillsListEl.addEventListener("click", (event) => {
    const editBtn = event.target.closest("button[data-edit-id]");
    if (editBtn) {
      startEdit(editBtn.dataset.editId);
      return;
    }

    const deleteBtn = event.target.closest("button[data-delete-id]");
    if (deleteBtn) {
      deleteSkill(deleteBtn.dataset.deleteId);
    }
  });
}

function loadSkills() {
  const raw = localStorage.getItem(STYLE_SKILLS_KEY);
  if (!raw) {
    skills = cloneDefaultSkills();
    persistSkills();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    skills = ensureDefaultSkillsPresent(sanitizeSkills(parsed));
    persistSkills();
  } catch {
    skills = cloneDefaultSkills();
    persistSkills();
  }
}

function sanitizeSkills(value) {
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

function saveSkill() {
  const name = skillNameInput.value.trim();
  const prompt = skillPromptInput.value.trim();

  if (!name) {
    alert("请填写卡片名称");
    return;
  }

  if (!prompt) {
    alert("请填写风格提示词");
    return;
  }

  if (editingId) {
    const target = skills.find((item) => item.id === editingId);
    if (!target) {
      resetForm();
      return;
    }
    target.name = name;
    target.prompt = prompt;
  } else {
    skills.unshift({
      id: createId(),
      name,
      prompt
    });
  }

  persistSkills();
  renderSkills();
  resetForm();
}

function startEdit(id) {
  const target = skills.find((item) => item.id === id);
  if (!target) return;

  editingId = id;
  skillNameInput.value = target.name;
  skillPromptInput.value = target.prompt;
  formTitle.textContent = "编辑风格卡片";
  cancelEditBtn.classList.remove("hidden");
  saveSkillBtn.textContent = "更新卡片";
  skillNameInput.focus();
}

function deleteSkill(id) {
  const target = skills.find((item) => item.id === id);
  if (!target) return;

  const ok = confirm(`确认删除风格卡片「${target.name}」吗？`);
  if (!ok) return;

  skills = skills.filter((item) => item.id !== id);
  persistSkills();
  renderSkills();

  if (editingId === id) {
    resetForm();
  }
}

function resetForm() {
  editingId = "";
  skillNameInput.value = "";
  skillPromptInput.value = "";
  formTitle.textContent = "新建风格卡片";
  cancelEditBtn.classList.add("hidden");
  saveSkillBtn.textContent = "保存卡片";
}

function persistSkills() {
  localStorage.setItem(STYLE_SKILLS_KEY, JSON.stringify(skills));
}

function renderSkills() {
  skillsListEl.innerHTML = "";

  if (!skills.length) {
    const empty = document.createElement("div");
    empty.className = "folder-info";
    empty.textContent = "还没有风格卡片，先创建一个。";
    skillsListEl.appendChild(empty);
    return;
  }

  skills.forEach((item) => {
    const card = document.createElement("article");
    card.className = "skill-card";

    const title = document.createElement("h3");
    title.textContent = item.name;
    card.appendChild(title);

    const prompt = document.createElement("pre");
    prompt.textContent = item.prompt;
    card.appendChild(prompt);

    const actions = document.createElement("div");
    actions.className = "row-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "ghost";
    editBtn.dataset.editId = item.id;
    editBtn.textContent = "编辑";
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "ghost danger";
    deleteBtn.dataset.deleteId = item.id;
    deleteBtn.textContent = "删除";
    actions.appendChild(deleteBtn);

    card.appendChild(actions);
    skillsListEl.appendChild(card);
  });
}

function createId() {
  const random = Math.random().toString(36).slice(2, 8);
  return `style_${Date.now()}_${random}`;
}

function asText(value) {
  return typeof value === "string" ? value : "";
}

function cloneDefaultSkills() {
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
