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
      description: "Add memory context data to Alchemyst AI.",
      inputSchema: z.object({
        memoryId: z.string(),
        contents: z.array(
          z.object({
            content: z.string(),
            metadata: z.object({
              source: z.string(),
              messageId: z.string(),
              type: z.string(),
            }),
          })
        )
      }),
      execute: async ({ memoryId, contents }) => {
        try {
          await client.v1.context.memory.add({
            memoryId,
            contents
          });
          return "Memory added successfully."
        } catch (err) {
          return `Memory could not be added. Error: ${err}`;
        }
      },
    }),
    "delete_memory": tool({
      description: "Delete memory context data in Alchemyst AI.",
      inputSchema: z.object({
        memoryId: z.string(),
        user_id: z.string().nullable().optional(),
        organization_id: z.string().nullable().optional(),
      }),
      execute: async ({ memoryId, user_id, organization_id }) => {
        try {
          await client.v1.context.memory.delete({
            memoryId,
            user_id: user_id ?? undefined,
            organization_id: organization_id ?? undefined,
          });
          return "Memory deleted successfully.";
        } catch (err) {
          return `Memory could not be deleted. Error: ${err}`;
        }
      },
    }),
  }

  const contextTools: ToolSet = {
    "add_to_context": tool({
      description: "Add context data to Alchemyst AI.",
      inputSchema: z.object({
        documents: z.array(
          z.object({ content: z.string() }).catchall(z.string())
        ),
        source: z.string(),
        context_type: z.enum(["resource", "conversation", "instruction"]),
        scope: z.enum(["internal", "external"]).default("internal"),
        metadata: z
          .object({
            fileName: z.string().optional(),
            fileType: z.string().optional(),
            lastModified: z.string().optional(),
            fileSize: z.number().optional(),
          })
          .optional(),
      }),
      execute: async ({ documents, source, context_type, scope, metadata }) => {
        try {
          await client.v1.context.add({
            documents,
            source,
            context_type,
            scope,
            metadata,
          });
          return "Context added successfully.";
        } catch (err) {
          return `Context could not be added. Error: ${err}`;
        }
      },
    }),
    "delete_context": tool({
      description: "Delete context data in Alchemyst AI (v1 context delete).",
      inputSchema: z.object({
        source: z.string(),
        user_id: z.string().nullable().optional(),
        organization_id: z.string().nullable().optional(),
        by_doc: z.boolean().optional(),
        by_id: z.boolean().optional(),
      }),
      execute: async ({ source, user_id, organization_id, by_doc, by_id }) => {
        try {
          await client.v1.context.delete({
            source,
            user_id: user_id ?? undefined,
            organization_id: organization_id ?? undefined,
            by_doc: by_doc ?? true,
            by_id: by_id ?? false,
          });
          return "Context deleted successfully.";
        } catch (err) {
          return `Context could not be deleted. Error: ${err}`;
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