/**
 * @file memory.tools.ts
 * Production-level memory management tools for Alchemyst AI integration.
 * Provides comprehensive memory operations with enhanced features.
 */

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type {
  EnhancedAlchemystClient,
  MemoryEntry,
  MemorySearchOptions,
  ToolExecutionContext,
} from "../types";
import { memorySchema, contentInputSchema } from "../types";
import { handleError, ValidationError } from "../utils/errors";
import { generateMemoryId } from "../utils/ids";
import { normalizeContents } from "../utils/normalize";

/**
 * Create comprehensive memory management tools
 */
export function createMemoryTools(client: EnhancedAlchemystClient): ToolSet {
  return {
    add_to_memory: tool({
      description:
        "Add memory entries to Alchemyst AI memory store with enhanced metadata support.",
      inputSchema: memorySchema,
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          const memoryId = generateMemoryId();
          const normalized = normalizeContents(params.contents);

          const result = await client.executeWithContext(
            async (alchemystClient: any) => {
              return await alchemystClient.v1.context.memory.add({
                memoryId,
                contents: normalized,
                ...(params.tags && { tags: params.tags }),
                ...(params.importance && { importance: params.importance }),
                ...(params.metadata && { metadata: params.metadata }),
              });
            },
            context
          );

          return (
            `✅ Memory added successfully (ID: ${memoryId})` +
            (params.tags?.length ? `\nTags: ${params.tags.join(", ")}` : "") +
            (params.importance ? `\nImportance: ${params.importance}/10` : "") +
            `\nEntries: ${params.contents.length}`
          );
        } catch (error) {
          return handleError(error);
        }
      },
    }),

    search_memory: tool({
      description:
        "Search memory entries using semantic search with advanced filtering.",
      inputSchema: z.object({
        query: z.string().min(1, "Search query is required"),
        tags: z.array(z.string()).optional(),
        limit: z.number().int().positive().max(100).default(10),
        offset: z.number().int().min(0).default(0),
        minImportance: z.number().min(0).max(10).optional(),
        dateRange: z
          .object({
            start: z.string().optional(),
            end: z.string().optional(),
          })
          .optional(),
      }),
      execute: async (params: MemorySearchOptions) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          const result = await client.executeWithContext(
            async (alchemystClient: any) => {
              return await alchemystClient.v1.context.memory.search({
                query: params.query,
                limit: params.limit || 10,
                offset: params.offset || 0,
                ...(params.tags && { tags: params.tags }),
                ...(params.minImportance && {
                  minImportance: params.minImportance,
                }),
                ...(params.dateRange && { dateRange: params.dateRange }),
              });
            },
            context
          );

          if (result && result.length > 0) {
            return `🧠 Found ${result.length} relevant memories:\n\n${result
              .map(
                (memory: any, index: number) =>
                  `${index + 1}. ${memory.content?.substring(0, 200)}${
                    memory.content?.length > 200 ? "..." : ""
                  }\n` +
                  `   Relevance: ${(memory.score * 100).toFixed(1)}%\n` +
                  (memory.importance
                    ? `   Importance: ${memory.importance}/10\n`
                    : "") +
                  (memory.tags?.length
                    ? `   Tags: ${memory.tags.join(", ")}\n`
                    : "") +
                  `   Created: ${memory.timestamp || "Unknown"}\n`
              )
              .join("\n")}`;
          }

          return "ℹ️ No relevant memories found for your query. Try different keywords or broader search terms.";
        } catch (error) {
          return handleError(error);
        }
      },
    }),

    list_memories: tool({
      description: "List recent memory entries with optional filtering.",
      inputSchema: z.object({
        limit: z.number().int().positive().max(100).default(20),
        offset: z.number().int().min(0).default(0),
        tags: z.array(z.string()).optional(),
        minImportance: z.number().min(0).max(10).optional(),
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          const result = await client.executeWithContext(
            async (alchemystClient: any) => {
              return await alchemystClient.v1.context.memory.list({
                limit: params.limit,
                offset: params.offset,
                ...(params.tags && { tags: params.tags }),
                ...(params.minImportance && {
                  minImportance: params.minImportance,
                }),
              });
            },
            context
          );

          if (result && result.memories?.length > 0) {
            return (
              `🧠 Recent Memories (${
                result.memories.length
              }):\n\n${result.memories
                .map(
                  (memory: any, index: number) =>
                    `${index + 1}. ${memory.content?.substring(0, 150)}${
                      memory.content?.length > 150 ? "..." : ""
                    }\n` +
                    (memory.importance
                      ? `   Importance: ${memory.importance}/10\n`
                      : "") +
                    (memory.tags?.length
                      ? `   Tags: ${memory.tags.join(", ")}\n`
                      : "") +
                    `   Created: ${memory.timestamp || "Unknown"}\n`
                )
                .join("\n")}` +
              (result.total > result.memories.length
                ? `\n📄 Showing ${result.memories.length} of ${result.total} total memories`
                : "")
            );
          }

          return "ℹ️ No memories found matching your criteria.";
        } catch (error) {
          return handleError(error);
        }
      },
    }),

    delete_memory: tool({
      description: "Delete a specific memory entry by ID.",
      inputSchema: z.object({
        memoryId: z.string().min(1, "Memory ID is required"),
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          const result = await client.executeWithContext(
            async (alchemystClient: any) => {
              return await alchemystClient.v1.context.memory.delete({
                memoryId: params.memoryId,
              });
            },
            context
          );

          return `✅ Memory deleted successfully (ID: ${params.memoryId})`;
        } catch (error) {
          return handleError(error);
        }
      },
    }),

    update_memory_importance: tool({
      description: "Update the importance score of a memory entry.",
      inputSchema: z.object({
        memoryId: z.string().min(1, "Memory ID is required"),
        importance: z
          .number()
          .min(0)
          .max(10, "Importance must be between 0 and 10"),
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          const result = await client.executeWithContext(
            async (alchemystClient: any) => {
              return await alchemystClient.v1.context.memory.update({
                memoryId: params.memoryId,
                importance: params.importance,
              });
            },
            context
          );

          return `✅ Memory importance updated to ${params.importance}/10 (ID: ${params.memoryId})`;
        } catch (error) {
          return handleError(error);
        }
      },
    }),

    clear_old_memories: tool({
      description: "Clear old or low-importance memories based on criteria.",
      inputSchema: z.object({
        olderThan: z.string().optional(), // ISO date string
        maxImportance: z.number().min(0).max(10).optional(),
        limit: z.number().int().positive().max(1000).default(100),
        confirm: z.boolean().default(false),
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          if (!params.confirm) {
            return `⚠️ Memory deletion requires confirmation. Set 'confirm: true' to proceed with clearing memories.`;
          }

          const result = await client.executeWithContext(
            async (alchemystClient: any) => {
              return await alchemystClient.v1.context.memory.clear({
                ...(params.olderThan && { olderThan: params.olderThan }),
                ...(params.maxImportance && {
                  maxImportance: params.maxImportance,
                }),
                limit: params.limit,
              });
            },
            context
          );

          return (
            `✅ Cleared ${result.deletedCount || 0} old memories` +
            (params.olderThan ? `\nOlder than: ${params.olderThan}` : "") +
            (params.maxImportance
              ? `\nMax importance: ${params.maxImportance}/10`
              : "")
          );
        } catch (error) {
          return handleError(error);
        }
      },
    }),
  };
}
