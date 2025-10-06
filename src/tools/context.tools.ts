/**
 * @file context.tools.ts
 * Context tools to manage conversation context in Alchemyst AI.
 */

import { tool, type ToolSet } from "ai";
import z from "zod";
import type { EnhancedAlchemystClient } from "../types";
import { normalizeContents } from "../utils/normalize";
import { handleError } from "../utils/errors";
import { generateMemoryId } from "../utils/ids";

/**
 * Creates tools for context management (add/delete context).
 * Accepts the enhanced client wrapper and uses its underlying SDK client.
 */
export const createContextTools = (
  client: EnhancedAlchemystClient
): ToolSet => ({
  add_to_context: tool({
    description: "Add items to Alchemyst AI context.",
    inputSchema: z.object({
      contents: z.array(
        z.union([z.string(), z.object({ content: z.string() })])
      ),
    }),
    execute: async ({ contents }) => {
      const contextId = generateMemoryId();
      const normalized = normalizeContents(contents);
      try {
        const sdkClient: any = (client as any).client || client;
        await sdkClient.v1.context.memory.add({
          memoryId: contextId,
          contents: normalized,
        });
        return " Context added successfully.";
      } catch (err) {
        return handleError(err);
      }
    },
  }),
});
