# Alchemyst AI — Vercel AI SDK Integration

**Alchemyst AI** is the **context layer** for your LLM applications — it remembers, reasons, and injects contextual intelligence automatically into every call.
This package provides a seamless integration with [**Vercel’s AI SDK**](https://ai-sdk.dev) to enhance your Gen-AI apps with **memory**, **retrieval**, and **context-aware toolchains** — all through a single line of configuration.

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

Here’s how to plug Alchemyst AI into your `ai` SDK call in **one line**:

```typescript
import { streamText } from 'ai';
import { alchemystTools } from '@alchemystai/aisdk';

const result = await streamText({
  model: yourModel, // Any AI SDK compatible model
  prompt: "Remember that my name is Alice",
  tools: alchemystTools({
    apiKey: "YOUR_ALCHEMYST_AI_KEY",
    useContext: true,
    useMemory: true
  })
});
```

This automatically attaches the **Alchemyst Context Engine** to your model call — enabling persistent memory and context-aware generation across sessions.

---

## 🧩 API Reference

### `alchemystTools(options: string | AlchemystToolOptions)`

**Simple usage with API key:**
```typescript
alchemystTools("YOUR_ALCHEMYST_AI_KEY")
```

**Advanced usage with options:**
```typescript
alchemystTools({
  apiKey: "YOUR_ALCHEMYST_AI_KEY",
  useContext: true,
  useMemory: true
})
```

| Parameter      | Type      | Default | Description                                             |
| -------------- | --------- | ------- | ------------------------------------------------------- |
| `apiKey`       | `string`  | —       | Your **Alchemyst AI API key**. Required.                |
| `useContext`   | `boolean` | `true`  | Enables context-aware retrieval from your sources.      |
| `useMemory`    | `boolean` | `true`  | Enables persistent memory between user sessions.        |

Returns an object compatible with the **`tools`** parameter of the `ai` SDK functions (`streamText`, `generateText`, `streamObject`, etc.).

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
import { streamText } from 'ai';
import { alchemystTools } from '@alchemystai/aisdk';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const response = await streamText({
    model: yourModel, // Your preferred AI model
    messages,
    tools: alchemystTools({
      apiKey: process.env.ALCHEMYST_API_KEY!,
      useContext: true,
      useMemory: true
    }),
  });

  return response.toDataStreamResponse();
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
// Simple usage
alchemystTools(process.env.ALCHEMYST_API_KEY!);

// Or with explicit options
alchemystTools({
  apiKey: process.env.ALCHEMYST_API_KEY!,
  useContext: true,
  useMemory: true
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

## 🧪 Example with Retrieval Off

```typescript
const result = await streamText({
  model: yourModel, // Any AI SDK compatible model
  prompt: "Hello there!",
  tools: alchemystTools({
    apiKey: "YOUR_ALCHEMYST_AI_KEY",
    useContext: false, // Disable context retrieval
    useMemory: true    // Keep memory enabled
  }),
});
```

---

## 📜 License

MIT © 2025 [Alchemyst AI](https://getalchemystai.com)

