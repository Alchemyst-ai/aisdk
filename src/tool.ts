import AlchemystAI from "@alchemystai/sdk";
import { tool, type ToolSet } from "ai"; // Assuming Vercel AI SDK's streamText import
import z from "zod";

// Usage example
/**
 * Executes a streaming text generation request using the specified model and prompt,
 * with integrated Alchemyst tools for enhanced capabilities.
 *
 * @remarks
 * This module demonstrates how to use the `streamText` function to interact with a language model,
 * providing a prompt and integrating external tools via the `alchemystTools` helper.
 *
 * @example
 * ```typescript
 * import { streamText } from 'ai';
 * import { alchemystTools } from '@alchemystai/aisdk';
 *
 * const result = await streamText({
 *   model: "gpt-5-nano",
 *   prompt: "Remember that my name is Alice",
 *   tools: alchemystTools("YOUR_ALCHEMYST_AI_KEY", true, true)
 * });
 * ```
 *
 * @module
 */

export const alchemystTools = (apiKey: string, useContext: boolean = true, useMemory: boolean = true) => {
  const client = new AlchemystAI({
    apiKey
  });

  const memoryTools: ToolSet = {
    "add_to_memory": tool({
      description: "Add memories to the Alchemyst AI Platform. Invoke this when you would want to add some relevant bits of conversation to remember, use this.",
      inputSchema: z.object({
        "contents": z.array(
          z.union([
            z.object({ content: z.string() }),
            z.string()
          ])
        )
      }),
      execute: async ({ contents }) => {
        const memoryId = crypto.randomUUID();
        const normalizedContents = contents.map((item: string | { content: string }) =>
          typeof item === "string" ? { content: item } : item
        );
        try {
          const response = await client.v1.context.memory.add({
            memoryId,
            contents: normalizedContents
          });
          return "Memory added successfully."
        } catch (err) {
          return `Memory could not be added. Error: ${err}`
        }
      },
    }),
    "update_memory": tool({
      description: "Add memories to the Alchemyst AI Platform. Invoke this when you would want to add some relevant bits of conversation to remember, use this.",
      inputSchema: z.object({
        "contents": z.array(
          z.union([
            z.object({ content: z.string() }),
            z.string()
          ])
        )
      }),
      execute: async ({ contents }) => {
        const memoryId = crypto.randomUUID();
        const normalizedContents = contents.map((item: string | { content: string }) =>
          typeof item === "string" ? { content: item } : item
        );
        try {
          const response = await client.v1.context.memory.add({
            memoryId,
            contents: normalizedContents
          });
          return "Memory added successfully."
        } catch (err) {
          return `Memory could not be added. Error: ${err}`
        }
      },
    }),
    "delete_memory": tool({
      description: "Add memories to the Alchemyst AI Platform. Invoke this when you would want to add some relevant bits of conversation to remember, use this.",
      inputSchema: z.object({
        "contents": z.array(
          z.union([
            z.object({ content: z.string() }),
            z.string()
          ])
        )
      }),
      execute: async ({ contents }) => {
        const memoryId = crypto.randomUUID();
        const normalizedContents = contents.map((item: string | { content: string }) =>
          typeof item === "string" ? { content: item } : item
        );
        try {
          const response = await client.v1.context.memory.add({
            memoryId,
            contents: normalizedContents
          });
          return "Memory added successfully."
        } catch (err) {
          return `Memory could not be added. Error: ${err}`
        }
      },
    }),
  }

  const contextTools: ToolSet = {
    "add_to_context": tool({
      description: "Add memories to the Alchemyst AI Platform. Invoke this when you would want to add some relevant bits of conversation to remember, use this.",
      inputSchema: z.object({
        "contents": z.array(
          z.union([
            z.object({ content: z.string() }),
            z.string()
          ])
        )
      }),
      execute: async ({ contents }) => {
        const memoryId = crypto.randomUUID();
        const normalizedContents = contents.map((item: string | { content: string }) =>
          typeof item === "string" ? { content: item } : item
        );
        try {
          const response = await client.v1.context.memory.add({
            memoryId,
            contents: normalizedContents
          });
          return "Memory added successfully."
        } catch (err) {
          return `Memory could not be added. Error: ${err}`
        }
      },
    }),
    "delete_context": tool({
      description: "Add memories to the Alchemyst AI Platform. Invoke this when you would want to add some relevant bits of conversation to remember, use this.",
      inputSchema: z.object({
        "contents": z.array(
          z.union([
            z.object({ content: z.string() }),
            z.string()
          ])
        )
      }),
      execute: async ({ contents }) => {
        const memoryId = crypto.randomUUID();
        const normalizedContents = contents.map((item: string | { content: string }) =>
          typeof item === "string" ? { content: item } : item
        );
        try {
          const response = await client.v1.context.memory.add({
            memoryId,
            contents: normalizedContents
          });
          return "Memory added successfully."
        } catch (err) {
          return `Memory could not be added. Error: ${err}`
        }
      },
    }),
  };

  let finalTools: ToolSet = {};

  if (useContext) {
    finalTools = { ...finalTools, ...contextTools }
  }

  if (useMemory) {
    finalTools = { ...finalTools, ...memoryTools }
  }

  return finalTools;
}

// const result = await streamText({
//   model: "gpt-5-nano", // Replace with your model name
//   prompt: "Remember that my name is Alice",
//   tools: alchemystTools("YOUR_ALCHEMYST_AI_KEY", true, true)
// });