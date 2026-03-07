import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultConfig = {
  apiBaseUrl: trimTrailingSlash(
    process.env.LLM_BASE_URL || "https://api.openai.com/v1"
  ),
  tabModel: process.env.LLM_TAB_MODEL || process.env.LLM_MODEL || "gpt-4o-mini",
  chapterModel: process.env.LLM_CHAPTER_MODEL || "gpt-4.1-mini",
  tabSystemPrompt:
    process.env.LLM_SYSTEM_PROMPT ||
    [
      "You are an assistant for Chinese novel continuation.",
      "Rules:",
      "1) Output only continuation text, no explanation.",
      "2) Keep style and tense consistent with context.",
      "3) Continue naturally and avoid repeating the context.",
      "4) Keep it concise, normally 1-2 sentences."
    ].join("\n"),
  chapterSystemPrompt:
    process.env.LLM_CHAPTER_SYSTEM_PROMPT ||
    [
      "You are an assistant for long-form Chinese fiction writing.",
      "Rules:",
      "1) Continue the chapter from the given context.",
      "2) Keep consistency with character and chapter notes.",
      "3) Output only正文内容, no title, no explanation.",
      "4) Keep narrative coherent and readable."
    ].join("\n"),
  tabMaxTokens: clampInt(process.env.LLM_MAX_TOKENS, 10, 300, 80),
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
  const finalMaxTokens = clampInt(maxTokens, 10, 300, defaultConfig.tabMaxTokens);
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
    "The user is writing a Chinese novel. Continue from cursor position.",
    safeNovelTitle ? `Novel Title:\n${safeNovelTitle}` : "",
    safeChapterTitle ? `Chapter Title:\n${safeChapterTitle}` : "",
    safeCharacterSetting ? `Character Notes:\n${safeCharacterSetting}` : "",
    safeChapterSetting ? `Chapter Notes:\n${safeChapterSetting}` : "",
    beforeParagraphs.length
      ? `Paragraph Memory (before cursor):\n${beforeParagraphs
          .map((item, index) => `${index + 1}. ${item}`)
          .join("\n")}`
      : "",
    afterParagraphs.length
      ? `Paragraph Memory (after cursor):\n${afterParagraphs
          .map((item, index) => `${index + 1}. ${item}`)
          .join("\n")}`
      : "",
    `Context Before Cursor:\n${safeContext}`,
    "Write only continuation text in Chinese, up to 2 sentences."
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
    "The user is writing a full chapter in Chinese. Continue from cursor position.",
    safeNovelTitle ? `Novel Title:\n${safeNovelTitle}` : "",
    safeChapterTitle ? `Chapter Title:\n${safeChapterTitle}` : "",
    safeCharacterSetting ? `Character Notes:\n${safeCharacterSetting}` : "",
    safeChapterSetting ? `Chapter Notes:\n${safeChapterSetting}` : "",
    safeContext ? `Existing Content Before Cursor:\n${safeContext}` : "",
    `Target Length: around ${safeTargetChars} Chinese characters.`,
    "Write only continuation prose in Chinese. Keep coherence and avoid re-printing any title."
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
  return String(raw).replace(/\r/g, "").trim().slice(0, 240);
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
