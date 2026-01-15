# Alchemyst AI — Vercel AI SDK Integration

**Alchemyst AI** is the **context layer** for your LLM applications — it remembers, reasons, and injects contextual intelligence automatically into every call.
This package provides a seamless integration with [**Vercel's AI SDK**](https://ai-sdk.dev) to enhance your Gen-AI apps with **memory**, **retrieval**, and **context-aware toolchains** — all through a single line of configuration.

---

## 🚀 Installation

```bash
npm install @alchemystai/aisdk
# or
yarn add @alchemystai/aisdk
#or
pnpm add @alchemystai/aisdk
# or
bun add @alchemystai/aisdk

```

---

## ⚡ Quick Start

Here's how to plug Alchemyst AI into your `ai` SDK call using the `withAlchemyst` middleware:

```typescript
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { withAlchemyst } from '@alchemystai/aisdk';

const generateTextWithMemory = withAlchemyst(generateText, {
  source: "my_app", // optional
  apiKey: "YOUR_ALCHEMYST_API_KEY", // optional, can be left if you have ALCHEMYST_AI_API_KEY
  debug: true // optional, defaults to false
});

const result = await generateTextWithMemory({
  model: google("gemini-2.5-flash"),
  prompt: "Remember that my name is Alice",
  userId: "user-123",
  conversationId: "conversation-abc",
});
```

This automatically attaches the **Alchemyst Context Engine** to your model call — enabling persistent memory and context-aware generation across sessions.

---

## 🧩 API Reference

### `withAlchemyst(fn, options)`

| Parameter        | Type       | Default | Description                                         |
| ---------------- | ---------- | ------- | --------------------------------------------------- |
| `fn`             | `Function` | —       | The AI SDK function to wrap (e.g., `generateText`). |
| `options.source` | `string`   | —       | Identifier for your application source.             |
| `options.apiKey` | `string`   | —       | Your **Alchemyst AI API key**. Required.            |
| `options.debug`  | `boolean`  | `false` | Enables debug logging.                              |

The wrapped function accepts additional parameters:

| Parameter        | Type     | Description                                     |
| ---------------- | -------- | ----------------------------------------------- |
| `userId`         | `string` | Unique identifier for the user.                 |
| `conversationId` | `string` | Unique identifier for the conversation/session. |

Returns the result from the wrapped AI SDK function.

---

## 🧠 What It Does

Once integrated, Alchemyst AI automatically:

* Persists **context** across user sessions.
* Augments prompts with **retrieved knowledge** from your Alchemyst AI workspace.
* Supports **custom tool functions** for domain-specific reasoning.
* Runs entirely **server-side** — no extra infrastructure required.

---

## 💡 Example: Contextual Chatbot

```typescript
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { withAlchemyst } from '@alchemystai/aisdk';

const generateTextWithMemory = withAlchemyst(generateText, {
  source: "chatbot",
  apiKey: process.env.ALCHEMYST_API_KEY!,
  debug: false
});

export async function POST(req: Request) {
  const { prompt, userId, conversationId } = await req.json();

  const result = await generateTextWithMemory({
    model: google("gemini-2.5-flash"),
    prompt,
    userId,
    conversationId,
  });

  return new Response(result.text);
}
```

With this, your AI app will:

* Remember previous user messages (via Alchemyst context memory)
* Retrieve relevant knowledge chunks
* Enrich every prompt dynamically before sending it to the model

---

## 🔒 Environment Variables

Set your API key in your environment:

```bash
ALCHEMYST_API_KEY=sk-xxxxxx
```

Then reference it in your code as:

```typescript
const generateTextWithMemory = withAlchemyst(generateText, {
  source: "my_app",
  apiKey: process.env.ALCHEMYST_API_KEY!,
});
```

---

## 🧰 Supported SDK Methods

Alchemyst AI integrates with all Vercel AI SDK entry points:

| SDK Function     | Supported | Notes                           |
| ---------------- | --------- | ------------------------------- |
| `streamText`     | ✅         | Real-time streaming generation  |
| `generateText`   | ✅         | Synchronous generation          |
| `streamObject`   | ✅         | Structured JSON output          |
| `generateObject` | ✅         | Non-streaming structured output |

---

## 🧪 Example with Different Conversations

```typescript
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { withAlchemyst } from '@alchemystai/aisdk';

const generateTextWithMemory = withAlchemyst(generateText, {
  source: "api_sdk_test",
  apiKey: "YOUR_ALCHEMYST_API_KEY",
  debug: true
});

// First conversation
const result1 = await generateTextWithMemory({
  model: google("gemini-2.5-flash"),
  prompt: "What is the capital of France?",
  userId: "12345",
  conversationId: "test-convo-1",
});

// Second conversation
const result2 = await generateTextWithMemory({
  model: google("gemini-2.5-flash"),
  prompt: "What is the capital of Germany?",
  userId: "12345",
  conversationId: "test-convo-2",
});
```

---

## 📜 License

MIT © 2025 [Alchemyst AI](https://getalchemystai.com)
