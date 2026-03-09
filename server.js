import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WEBNOVEL_STYLE_PROMPT = `你是一名擅长番茄网文风格的中文小说写作助手。请按照商业网文的阅读习惯进行创作，要求正文流畅、节奏清晰、情节推进明确、情绪表达直接有效，保证读者容易读下去。

写作时遵循以下规则：

1. 以“剧情推进”和“情绪推动”为核心，避免空泛抒情。
2. 句子尽量简洁，少写绕弯的长句，少堆叠形容词和副词。
3. 不要对同一个动作、表情、场景、物品进行重复修饰。
4. 不要连续使用多个近义词形容同一对象。
5. 少用破折号进行补充解释，尽量直接叙述。
6. 少用“不是……而是……”这类刻意转折句式。
7. 对话要符合人物身份，短而有力，避免人人都像在讲道理。
8. 场景描写服务于剧情，不要为了描写而描写。
9. 每一段都应有信息增量、情绪变化或动作变化。
10. 保持网文感，增强可读性和继续阅读欲望。

语言风格要求：
- 叙述直给，不卖弄辞藻
- 节奏明快，重点突出
- 情绪到位，但不过度堆砌
- 适度口语化，适合连载阅读
- 保持爽点、悬念、反转、压迫感或期待感

请直接输出正文，不要解释，不要分析，不要分点，不要写创作说明。
正文要有明确的网文叙事感：

- 开头尽快给出冲突、异常、危机、压迫、好处或悬念
- 中间持续推进，不停留在原地空转
- 段落短一些，视觉上轻快，方便读者快速扫读
- 多写人物的即时反应、选择和后果
- 少写空洞感慨，多写可见动作与有效信息
- 情绪表达要直接，让读者能立刻感受到紧张、爽快、愤怒、期待、恐惧或压抑
- 每个小段尽量承担一个明确功能：推进剧情、制造悬念、强化人物、抬高冲突、释放信息
- 注重“钩子”，段尾和章尾尽量留有继续读下去的动力
- 能一句说清的，不要扩成三句
- 能用动作体现的，不要反复用抽象形容词说明

禁止或尽量避免以下问题：

1. 不要对同一动作进行重复修饰。
2. 不要对同一人物的神态、目光、语气连续使用多个近义描述。
3. 不要对同一事物进行两次以上功能相近的描写。
4. 不要堆砌形容词、副词，不要为了显得有文采而拖慢节奏。
5. 不要频繁使用破折号补充解释。
6. 不要频繁使用“不是……而是……”“并非……而是……”这类句式。
7. 不要连续使用排比、反问、感叹来强行制造气势。
8. 不要让人物说话像作者在发议论。
9. 不要出现自我重复的句子、意思相近的句子或换词重复。
10. 不要大段静态描写，不要大段空洞心理描写。
11. 不要无意义地渲染气氛，所有描写都应服务于人物、冲突和情节。
12. 不要让句式过于整齐，避免机械感。
13. 不要频繁使用“此刻、这一刻、下一瞬、紧接着、旋即”等重复连接词。
14. 不要连续写“他看着……他盯着……他望着……”这类重复动作。
15. 不要在一句话里给同一对象添加多个方向相近的修饰语。`;

const TAB_SYSTEM_PROMPT_DEFAULT = `${WEBNOVEL_STYLE_PROMPT}

补充要求（Tab 行内补全）：
1. 你只需要补全紧接光标处的后续内容。
2. 只续写下一句，必须是单句，不要分成两句。
3. 只输出可直接插入正文的内容，不要重复上文。`;

const CHAPTER_SYSTEM_PROMPT_DEFAULT = `${WEBNOVEL_STYLE_PROMPT}

补充要求（整章续写）：
1. 根据上下文持续推进情节，保证完整章内有起伏、有推进。
2. 保持人物行为和设定一致，避免跳脱。
3. 只输出正文内容，不要标题、说明或分点。`;

const POLISH_SYSTEM_PROMPT_DEFAULT = `${WEBNOVEL_STYLE_PROMPT}

补充要求（选中润色）：
1. 你的任务是润色用户选中的原文，不是续写新剧情。
2. 保留原意与关键信息，不擅自添加设定外内容。
3. 在保证语义不变的前提下，优化节奏、表达和网文可读性。
4. 只输出润色后的正文，不要解释，不要分点。`;

const defaultConfig = {
  apiBaseUrl: trimTrailingSlash(
    process.env.LLM_BASE_URL || "https://api.openai.com/v1"
  ),
  tabModel: process.env.LLM_TAB_MODEL || process.env.LLM_MODEL || "gpt-4o-mini",
  chapterModel: process.env.LLM_CHAPTER_MODEL || "gpt-4.1-mini",
  tabSystemPrompt:
    process.env.LLM_SYSTEM_PROMPT || TAB_SYSTEM_PROMPT_DEFAULT,
  chapterSystemPrompt:
    process.env.LLM_CHAPTER_SYSTEM_PROMPT || CHAPTER_SYSTEM_PROMPT_DEFAULT,
  polishSystemPrompt:
    process.env.LLM_POLISH_SYSTEM_PROMPT || POLISH_SYSTEM_PROMPT_DEFAULT,
  tabMaxTokens: clampInt(process.env.LLM_MAX_TOKENS, 48, 64, 56),
  tabTemperature: clampFloat(process.env.LLM_TEMPERATURE, 0, 2, 0.8),
  chapterMaxTokens: clampInt(process.env.LLM_CHAPTER_MAX_TOKENS, 200, 4000, 1600),
  chapterTemperature: clampFloat(process.env.LLM_CHAPTER_TEMPERATURE, 0, 2, 0.9),
  contextChars: clampInt(process.env.CONTEXT_CHARS, 300, 8000, 3000)
};

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.get("/api/default-config", (_req, res) => {
  res.json({
    apiBaseUrl: defaultConfig.apiBaseUrl,
    model: defaultConfig.tabModel,
    tabModel: defaultConfig.tabModel,
    chapterModel: defaultConfig.chapterModel,
    temperature: defaultConfig.tabTemperature,
    maxTokens: defaultConfig.tabMaxTokens,
    chapterTemperature: defaultConfig.chapterTemperature,
    chapterMaxTokens: defaultConfig.chapterMaxTokens,
    contextChars: defaultConfig.contextChars,
    hasServerApiKey: Boolean(process.env.LLM_API_KEY)
  });
});

app.post("/api/complete", async (req, res) => {
  const {
    context,
    apiBaseUrl,
    apiKey,
    model,
    tabModel,
    temperature,
    maxTokens,
    systemPrompt,
    novelTitle,
    chapterTitle,
    chapterSetting,
    characterSetting,
    paragraphMemory
  } = req.body || {};

  if (typeof context !== "string" || !context.trim()) {
    res.status(400).json({ error: "context is required" });
    return;
  }

  const finalApiBaseUrl = trimTrailingSlash(
    typeof apiBaseUrl === "string" && apiBaseUrl.trim()
      ? apiBaseUrl
      : defaultConfig.apiBaseUrl
  );
  const finalApiKey =
    typeof apiKey === "string" && apiKey.trim() ? apiKey.trim() : process.env.LLM_API_KEY;
  const finalModel =
    typeof tabModel === "string" && tabModel.trim()
      ? tabModel.trim()
      : typeof model === "string" && model.trim()
        ? model.trim()
        : defaultConfig.tabModel;
  const finalTemperature = clampFloat(temperature, 0, 2, defaultConfig.tabTemperature);
  const finalMaxTokens = clampInt(maxTokens, 48, 64, defaultConfig.tabMaxTokens);
  const finalSystemPrompt =
    typeof systemPrompt === "string" && systemPrompt.trim()
      ? systemPrompt
      : defaultConfig.tabSystemPrompt;

  if (!finalApiKey) {
    res.status(400).json({
      error:
        "API key is missing. Provide apiKey in request body or set LLM_API_KEY in .env"
    });
    return;
  }

  const completionUrl = `${finalApiBaseUrl}/chat/completions`;
  const userMessage = buildUserMessage({
    context,
    novelTitle,
    chapterTitle,
    chapterSetting,
    characterSetting,
    paragraphMemory
  });

  try {
    const upstream = await fetch(completionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${finalApiKey}`
      },
      body: JSON.stringify({
        model: finalModel,
        temperature: finalTemperature,
        max_tokens: finalMaxTokens,
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: userMessage }
        ]
      })
    });

    const text = await upstream.text();
    const data = tryParseJson(text);

    if (!upstream.ok) {
      const detail =
        data?.error?.message ||
        data?.message ||
        text ||
        `Upstream error (${upstream.status})`;
      res.status(upstream.status).json({ error: detail });
      return;
    }

    const suggestion = normalizeSuggestion(data?.choices?.[0]?.message?.content || "");
    res.json({ suggestion });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unknown server error"
    });
  }
});

app.post("/api/continue-chapter", async (req, res) => {
  const {
    context,
    apiBaseUrl,
    apiKey,
    chapterModel,
    model,
    temperature,
    maxTokens,
    systemPrompt,
    targetChars,
    novelTitle,
    chapterTitle,
    chapterSetting,
    characterSetting
  } = req.body || {};

  const safeContext = typeof context === "string" ? context : "";
  const safeChapterSetting = typeof chapterSetting === "string" ? chapterSetting : "";
  const safeCharacterSetting = typeof characterSetting === "string" ? characterSetting : "";

  if (!safeContext.trim() && !safeChapterSetting.trim() && !safeCharacterSetting.trim()) {
    res.status(400).json({ error: "context or setting is required" });
    return;
  }

  const finalApiBaseUrl = trimTrailingSlash(
    typeof apiBaseUrl === "string" && apiBaseUrl.trim()
      ? apiBaseUrl
      : defaultConfig.apiBaseUrl
  );
  const finalApiKey =
    typeof apiKey === "string" && apiKey.trim() ? apiKey.trim() : process.env.LLM_API_KEY;
  const finalModel =
    typeof chapterModel === "string" && chapterModel.trim()
      ? chapterModel.trim()
      : typeof model === "string" && model.trim()
        ? model.trim()
        : defaultConfig.chapterModel;
  const finalTemperature = clampFloat(temperature, 0, 2, defaultConfig.chapterTemperature);
  const finalTargetChars = clampInt(targetChars, 300, 5000, 1200);
  const inferredMaxTokens = estimateChapterMaxTokens(finalTargetChars, defaultConfig.chapterMaxTokens);
  const finalMaxTokens = clampInt(maxTokens, 200, 4000, inferredMaxTokens);
  const finalSystemPrompt =
    typeof systemPrompt === "string" && systemPrompt.trim()
      ? systemPrompt
      : defaultConfig.chapterSystemPrompt;

  if (!finalApiKey) {
    res.status(400).json({
      error:
        "API key is missing. Provide apiKey in request body or set LLM_API_KEY in .env"
    });
    return;
  }

  const completionUrl = `${finalApiBaseUrl}/chat/completions`;
  const userMessage = buildChapterUserMessage({
    context: safeContext,
    novelTitle,
    chapterTitle,
    chapterSetting: safeChapterSetting,
    characterSetting: safeCharacterSetting,
    targetChars: finalTargetChars
  });

  try {
    const upstream = await fetch(completionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${finalApiKey}`
      },
      body: JSON.stringify({
        model: finalModel,
        temperature: finalTemperature,
        max_tokens: finalMaxTokens,
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: userMessage }
        ]
      })
    });

    const text = await upstream.text();
    const data = tryParseJson(text);

    if (!upstream.ok) {
      const detail =
        data?.error?.message ||
        data?.message ||
        text ||
        `Upstream error (${upstream.status})`;
      res.status(upstream.status).json({ error: detail });
      return;
    }

    const content = normalizeLongContent(data?.choices?.[0]?.message?.content || "");
    res.json({ content });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unknown server error"
    });
  }
});

app.post("/api/polish", async (req, res) => {
  const {
    selectedText,
    styleRequirement,
    styleSkillPrompt,
    apiBaseUrl,
    apiKey,
    chapterModel,
    model,
    temperature,
    maxTokens,
    systemPrompt,
    novelTitle,
    chapterTitle,
    chapterSetting,
    characterSetting
  } = req.body || {};

  const safeSelectedText = typeof selectedText === "string" ? selectedText : "";
  if (!safeSelectedText.trim()) {
    res.status(400).json({ error: "selectedText is required" });
    return;
  }

  const finalApiBaseUrl = trimTrailingSlash(
    typeof apiBaseUrl === "string" && apiBaseUrl.trim()
      ? apiBaseUrl
      : defaultConfig.apiBaseUrl
  );
  const finalApiKey =
    typeof apiKey === "string" && apiKey.trim() ? apiKey.trim() : process.env.LLM_API_KEY;
  const finalModel =
    typeof chapterModel === "string" && chapterModel.trim()
      ? chapterModel.trim()
      : typeof model === "string" && model.trim()
        ? model.trim()
        : defaultConfig.chapterModel;
  const finalTemperature = clampFloat(temperature, 0, 2, defaultConfig.chapterTemperature);
  const estimatedMaxTokens = estimatePolishMaxTokens(safeSelectedText);
  const finalMaxTokens = clampInt(maxTokens, 120, 2200, estimatedMaxTokens);
  const finalSystemPrompt =
    typeof systemPrompt === "string" && systemPrompt.trim()
      ? systemPrompt
      : defaultConfig.polishSystemPrompt;

  if (!finalApiKey) {
    res.status(400).json({
      error:
        "API key is missing. Provide apiKey in request body or set LLM_API_KEY in .env"
    });
    return;
  }

  const completionUrl = `${finalApiBaseUrl}/chat/completions`;
  const userMessage = buildPolishUserMessage({
    selectedText: safeSelectedText,
    styleRequirement,
    styleSkillPrompt,
    novelTitle,
    chapterTitle,
    chapterSetting,
    characterSetting
  });

  try {
    const upstream = await fetch(completionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${finalApiKey}`
      },
      body: JSON.stringify({
        model: finalModel,
        temperature: finalTemperature,
        max_tokens: finalMaxTokens,
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: userMessage }
        ]
      })
    });

    const text = await upstream.text();
    const data = tryParseJson(text);

    if (!upstream.ok) {
      const detail =
        data?.error?.message ||
        data?.message ||
        text ||
        `Upstream error (${upstream.status})`;
      res.status(upstream.status).json({ error: detail });
      return;
    }

    const polishedText = normalizeLongContent(data?.choices?.[0]?.message?.content || "");
    res.json({ polishedText });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unknown server error"
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Novel editor is running at http://localhost:${port}`);
});

function buildUserMessage(payload) {
  const safeContext = safeText(payload.context, 8000);
  const safeNovelTitle = safeText(payload.novelTitle, 120);
  const safeChapterTitle = safeText(payload.chapterTitle, 120);
  const safeChapterSetting = safeText(payload.chapterSetting, 1600);
  const safeCharacterSetting = safeText(payload.characterSetting, 1600);
  const beforeParagraphs = normalizeParagraphArray(payload.paragraphMemory?.before, 4);
  const afterParagraphs = normalizeParagraphArray(payload.paragraphMemory?.after, 2);

  const sections = [
    "请根据以下信息在光标处续写。",
    safeNovelTitle ? `小说标题：\n${safeNovelTitle}` : "",
    safeChapterTitle ? `章节标题：\n${safeChapterTitle}` : "",
    safeCharacterSetting ? `人物设定：\n${safeCharacterSetting}` : "",
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
    `光标前正文：\n${safeContext}`,
    "请直接续写下一句，只输出一句，不要重复上文。"
  ].filter(Boolean);

  return sections.join("\n\n");
}

function buildChapterUserMessage(payload) {
  const safeContext = safeText(payload.context, 16000);
  const safeNovelTitle = safeText(payload.novelTitle, 120);
  const safeChapterTitle = safeText(payload.chapterTitle, 120);
  const safeChapterSetting = safeText(payload.chapterSetting, 2000);
  const safeCharacterSetting = safeText(payload.characterSetting, 2000);
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

function buildPolishUserMessage(payload) {
  const safeSelectedText = safeText(payload.selectedText, 16000);
  const safeNovelTitle = safeText(payload.novelTitle, 120);
  const safeChapterTitle = safeText(payload.chapterTitle, 120);
  const safeChapterSetting = safeText(payload.chapterSetting, 2000);
  const safeCharacterSetting = safeText(payload.characterSetting, 2000);
  const safeStyleSkillPrompt = safeText(payload.styleSkillPrompt, 4000);
  const safeStyleRequirement = safeText(payload.styleRequirement, 1000);

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

function trimTrailingSlash(value) {
  return String(value).replace(/\/+$/, "");
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

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeSuggestion(raw) {
  const cleaned = String(raw).replace(/\r/g, "").trim();
  if (!cleaned) return "";

  const singleSentence = takeFirstSentence(cleaned);
  return singleSentence.slice(0, 180);
}

function normalizeLongContent(raw) {
  return String(raw)
    .replace(/\r/g, "")
    .trim()
    .slice(0, 24000);
}

function safeText(value, maxLen) {
  if (typeof value !== "string") return "";
  return value.replace(/\r/g, "").trim().slice(0, maxLen);
}

function normalizeParagraphArray(value, maxItems) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => safeText(item, 360))
    .filter(Boolean)
    .slice(-maxItems);
}

function estimateChapterMaxTokens(targetChars, fallback) {
  const safeTarget = clampInt(targetChars, 300, 5000, 1200);
  const estimated = Math.ceil(safeTarget * 1.5);
  return clampInt(estimated, 200, 4000, fallback);
}

function estimatePolishMaxTokens(selectedText) {
  const sourceLength = safeText(selectedText, 20000).length;
  const estimated = Math.ceil(sourceLength * 1.4);
  return clampInt(estimated, 120, 2200, 600);
}

function takeFirstSentence(text) {
  const endMarks = new Set(["。", "！", "？", "；", "…", "!", "?", ";"]);
  let output = "";

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    output += ch;
    if (endMarks.has(ch)) {
      break;
    }
  }

  return output.trim();
}
