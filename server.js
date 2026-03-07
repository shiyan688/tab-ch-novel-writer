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
  model: process.env.LLM_MODEL || "gpt-4o-mini",
  systemPrompt:
    process.env.LLM_SYSTEM_PROMPT ||
    [
      "You are an assistant for Chinese novel continuation.",
      "Rules:",
      "1) Output only continuation text, no explanation.",
      "2) Keep style and tense consistent with context.",
      "3) Continue naturally and avoid repeating the context.",
      "4) Keep it concise, normally 1-2 sentences."
    ].join("\n"),
  maxTokens: clampInt(process.env.LLM_MAX_TOKENS, 10, 300, 80),
  temperature: clampFloat(process.env.LLM_TEMPERATURE, 0, 2, 0.8),
  contextChars: clampInt(process.env.CONTEXT_CHARS, 300, 8000, 3000)
};

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.get("/api/default-config", (_req, res) => {
  res.json({
    apiBaseUrl: defaultConfig.apiBaseUrl,
    model: defaultConfig.model,
    temperature: defaultConfig.temperature,
    maxTokens: defaultConfig.maxTokens,
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
    typeof model === "string" && model.trim() ? model.trim() : defaultConfig.model;
  const finalTemperature = clampFloat(temperature, 0, 2, defaultConfig.temperature);
  const finalMaxTokens = clampInt(maxTokens, 10, 300, defaultConfig.maxTokens);
  const finalSystemPrompt =
    typeof systemPrompt === "string" && systemPrompt.trim()
      ? systemPrompt
      : defaultConfig.systemPrompt;

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
