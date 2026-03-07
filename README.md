# Chinese Novel Editor

一个面向中文写作场景的 Web 小说编辑器，支持 LLM 续写补全（`Tab` 接受）、分章节管理、设定记忆、自动保存、文件夹导入导出。

## Features

- `Tab` 接受补全，`Esc` 取消，`Ctrl + Space` 手动触发
- 一键“续写完整章”（独立模型，不与 Tab 模型共用）
- 段落级上下文记忆（光标前后段落）
- 人物设定（全书）+ 章节设定（当前章）
- 分章节存储（新建、切换、删除）
- 本地自动保存（`localStorage`）
- 一键导出整本 `TXT` / `MD`
- 打开文件夹，导出章节文件，按文件夹导入章节
- 后端代理 OpenAI 兼容 `chat/completions` 接口

## Tech Stack

- Frontend: Vanilla JS + HTML + CSS
- Backend: Node.js + Express
- LLM API: OpenAI-compatible API

## Quick Start

### 1) Prerequisites

- Node.js `>= 18`

### 2) Install

```bash
npm install
```

### 3) Configure env

Linux/macOS:

```bash
cp .env.example .env
```

Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

### 4) Run

```bash
npm start
```

Open `http://localhost:3000`.

## Environment Variables

| Name | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | Server port |
| `LLM_BASE_URL` | No | `https://api.openai.com/v1` | Upstream API base URL |
| `LLM_API_KEY` | No | empty | Server-side API key fallback |
| `LLM_MODEL` | No | `gpt-4o-mini` | Default model name |
| `LLM_TAB_MODEL` | No | `gpt-4o-mini` | Tab completion model |
| `LLM_CHAPTER_MODEL` | No | `gpt-4.1-mini` | Full chapter continuation model |
| `LLM_MAX_TOKENS` | No | `80` | Max generated tokens |
| `LLM_TEMPERATURE` | No | `0.8` | Sampling temperature |
| `LLM_CHAPTER_MAX_TOKENS` | No | `1600` | Max tokens for full chapter continuation |
| `LLM_CHAPTER_TEMPERATURE` | No | `0.9` | Temperature for full chapter continuation |
| `CONTEXT_CHARS` | No | `3000` | Max context chars before cursor |
| `LLM_SYSTEM_PROMPT` | No | built-in | System prompt override |

## Usage

1. 在左侧管理章节（新增/切换/删除）。
2. 在右侧填写小说标题、人物设定、章节设定。
3. 在正文编辑区写作，系统会自动生成补全建议。
4. 按 `Tab` 接受建议。
5. 点击“续写完整章”生成长段内容并插入当前光标位置。
6. 使用导出按钮下载整本 `TXT` 或 `MD`。
7. 使用“打开文件夹”后可“导出到文件夹”或“从文件夹导入”。

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Tab` | 接受补全建议 |
| `Esc` | 取消当前建议 |
| `Ctrl + Space` | 手动触发补全 |

## Folder Import/Export Format

导出到文件夹会生成：

- `novel.md`
- `novel.txt`
- `01-章节名.md`
- `02-章节名.md`
- ...

导入时支持读取 `.md/.txt`，优先识别章节文件名模式 `NN-*.md`。

## API

### `POST /api/complete`

Request body:

```json
{
  "context": "光标前正文",
  "apiBaseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-xxx",
  "model": "gpt-4o-mini",
  "novelTitle": "雾海城",
  "chapterTitle": "第一章 雨夜来信",
  "chapterSetting": "本章目标与冲突",
  "characterSetting": "人物关系与说话风格",
  "paragraphMemory": {
    "before": ["前文段落1", "前文段落2"],
    "after": ["后文段落1"]
  }
}
```

Response:

```json
{
  "suggestion": "续写建议文本"
}
```

### `GET /api/default-config`

返回服务端默认配置（不会返回明文 key）。

### `POST /api/continue-chapter`

Request body:

```json
{
  "context": "光标前正文",
  "apiBaseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-xxx",
  "chapterModel": "gpt-4.1-mini",
  "targetChars": 1200,
  "novelTitle": "雾海城",
  "chapterTitle": "第一章 雨夜来信",
  "chapterSetting": "本章目标与冲突",
  "characterSetting": "人物关系与说话风格"
}
```

Response:

```json
{
  "content": "整章续写正文"
}
```

### `GET /api/health`

健康检查接口。

## Project Structure

```text
.
├── public
│   ├── app.js
│   ├── index.html
│   └── style.css
├── server.js
├── .env.example
└── package.json
```

## Security Notes

- 不要把真实 API Key 提交到 GitHub。
- `.env` 已在 `.gitignore` 中忽略，请只提交 `.env.example`。
- 如果在前端输入 API Key，请仅在受信任环境使用。



## FAQ

### 1) 为什么点了“打开文件夹”没反应？

该功能依赖 File System Access API，建议使用 Chromium 内核浏览器（Chrome/Edge）。

### 2) 接口返回 401 / 403？

通常是 API Key 无效、权限不足或模型不可用。

### 3) 没有补全建议？

请先确认：

- 上下文长度足够
- 模型支持中文生成
- API 地址是 OpenAI 兼容 `chat/completions`

## License

当前仓库未附带许可证。若计划公开分发，建议添加 `MIT` 或其他合适许可证。

