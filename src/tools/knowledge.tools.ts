/**
 * @file knowledge.tools.ts
 * Knowledge base management tools for Alchemyst AI integration.
 * Provides semantic search, document management, and knowledge retrieval.
 */

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type {
  EnhancedAlchemystClient,
  KnowledgeSearchOptions,
  KnowledgeDocument,
  ToolExecutionContext,
} from "../types";
import { knowledgeSearchSchema, contentInputSchema } from "../types";
import {
  handleError,
  handleErrorDetailed,
  ValidationError,
} from "../utils/errors";
import { generateMemoryId } from "../utils/ids";
import { normalizeContents } from "../utils/normalize";

/**
 * Create knowledge base management tools
 */
export function createKnowledgeTools(client: EnhancedAlchemystClient): ToolSet {
  return {
    search_knowledge: tool({
      description:
        "Search the knowledge base for relevant information using semantic search.",
      inputSchema: knowledgeSearchSchema,
      execute: async (params: KnowledgeSearchOptions) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          const result = await client.executeWithContext(
            async (alchemystClient) => {
              return await alchemystClient.v1.knowledge.search({
                query: params.query,
                limit: params.limit || 10,
                threshold: params.threshold || 0.7,
                ...(params.tags && { tags: params.tags }),
                ...(params.source && { source: params.source }),
                include_metadata: params.includeMetadata !== false,
              });
            },
            context
          );

          if (result && result.length > 0) {
            return `✅ Found ${
              result.length
            } relevant knowledge entries:\n\n${result
              .map(
                (doc: any, index: number) =>
                  `${index + 1}. **${doc.title || "Untitled"}**\n` +
                  `   ${doc.content?.substring(0, 200)}${
                    doc.content?.length > 200 ? "..." : ""
                  }\n` +
                  `   Relevance: ${(doc.score * 100).toFixed(1)}%\n` +
                  (doc.source ? `   Source: ${doc.source}\n` : "") +
                  (doc.tags?.length ? `   Tags: ${doc.tags.join(", ")}\n` : "")
              )
              .join("\n")}`;
          }

          return "ℹ️ No relevant knowledge found for your query. Try different keywords or check if the knowledge base has been populated.";
        } catch (error) {
          return handleError(error);
        }
      },
    }),

    add_knowledge: tool({
      description: "Add a document or information to the knowledge base.",
      inputSchema: z.object({
        title: z.string().min(1, "Title is required"),
        content: z.string().min(10, "Content must be at least 10 characters"),
        tags: z.array(z.string()).optional(),
        source: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          if (!params.title || !params.content) {
            throw new ValidationError("Both title and content are required");
          }

          const result = await client.executeWithContext(
            async (alchemystClient) => {
              return await alchemystClient.v1.knowledge.add({
                title: params.title,
                content: params.content,
                ...(params.tags && { tags: params.tags }),
                ...(params.source && { source: params.source }),
                ...(params.metadata && { metadata: params.metadata }),
              });
            },
            context
          );

          return (
            `✅ Knowledge document added successfully: "${params.title}"` +
            (params.tags?.length ? `\nTags: ${params.tags.join(", ")}` : "") +
            (params.source ? `\nSource: ${params.source}` : "")
          );
        } catch (error) {
          return handleError(error);
        }
      },
    }),

    update_knowledge: tool({
      description: "Update an existing knowledge base document.",
      inputSchema: z.object({
        documentId: z.string().min(1, "Document ID is required"),
        title: z.string().optional(),
        content: z.string().optional(),
        tags: z.array(z.string()).optional(),
        source: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          if (!params.documentId) {
            throw new ValidationError("Document ID is required");
          }

          // Build update object with only provided fields
          const updateData: any = {};
          if (params.title) updateData.title = params.title;
          if (params.content) updateData.content = params.content;
          if (params.tags) updateData.tags = params.tags;
          if (params.source) updateData.source = params.source;
          if (params.metadata) updateData.metadata = params.metadata;

          if (Object.keys(updateData).length === 0) {
            throw new ValidationError(
              "At least one field must be provided for update"
            );
          }

          const result = await client.executeWithContext(
            async (alchemystClient) => {
              return await alchemystClient.v1.knowledge.update({
                documentId: params.documentId,
                ...updateData,
              });
            },
            context
          );

          return (
            `✅ Knowledge document updated successfully (ID: ${params.documentId})` +
            (params.title ? `\nNew title: ${params.title}` : "") +
            (params.tags?.length ? `\nTags: ${params.tags.join(", ")}` : "")
          );
        } catch (error) {
          return handleError(error);
        }
      },
    }),

    delete_knowledge: tool({
      description: "Delete a document from the knowledge base.",
      inputSchema: z.object({
        documentId: z.string().min(1, "Document ID is required"),
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          const result = await client.executeWithContext(
            async (alchemystClient) => {
              return await alchemystClient.v1.knowledge.delete({
                documentId: params.documentId,
              });
            },
            context
          );

          return `✅ Knowledge document deleted successfully (ID: ${params.documentId})`;
        } catch (error) {
          return handleError(error);
        }
      },
    }),

    list_knowledge: tool({
      description:
        "List documents in the knowledge base with optional filtering.",
      inputSchema: z.object({
        limit: z.number().int().positive().max(100).default(20),
        offset: z.number().int().min(0).default(0),
        tags: z.array(z.string()).optional(),
        source: z.string().optional(),
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          const result = await client.executeWithContext(
            async (alchemystClient) => {
              return await alchemystClient.v1.knowledge.list({
                limit: params.limit,
                offset: params.offset,
                ...(params.tags && { tags: params.tags }),
                ...(params.source && { source: params.source }),
              });
            },
            context
          );

          if (result && result.documents?.length > 0) {
            return (
              `✅ Found ${
                result.documents.length
              } knowledge documents:\n\n${result.documents
                .map(
                  (doc: any, index: number) =>
                    `${index + 1}. **${doc.title}** (ID: ${doc.id})\n` +
                    `   ${doc.content?.substring(0, 150)}${
                      doc.content?.length > 150 ? "..." : ""
                    }\n` +
                    (doc.source ? `   Source: ${doc.source}\n` : "") +
                    (doc.tags?.length
                      ? `   Tags: ${doc.tags.join(", ")}\n`
                      : "") +
                    `   Updated: ${doc.lastUpdated || "Unknown"}\n`
                )
                .join("\n")}` +
              (result.total > result.documents.length
                ? `\n📄 Showing ${result.documents.length} of ${result.total} total documents`
                : "")
            );
          }

          return "ℹ️ No knowledge documents found matching your criteria.";
        } catch (error) {
          return handleError(error);
        }
      },
    }),

    bulk_add_knowledge: tool({
      description: "Add multiple documents to the knowledge base at once.",
      inputSchema: z.object({
        documents: z
          .array(
            z.object({
              title: z.string().min(1),
              content: z.string().min(10),
              tags: z.array(z.string()).optional(),
              source: z.string().optional(),
              metadata: z.record(z.string(), z.unknown()).optional(),
            })
          )
          .min(1)
          .max(50), // Limit to 50 documents per batch
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          let successCount = 0;
          let errorCount = 0;
          const errors: string[] = [];

          // Process documents in batches (could be optimized with parallel processing)
          for (let i = 0; i < params.documents.length; i++) {
            const doc = params.documents[i];

            try {
              await client.executeWithContext(async (alchemystClient) => {
                return await alchemystClient.v1.knowledge.add({
                  title: doc?.title,
                  content: doc?.content,
                  ...(doc?.tags && { tags: doc.tags }),
                  ...(doc?.source && { source: doc.source }),
                  ...(doc?.metadata && { metadata: doc.metadata }),
                });
              }, context);

              successCount++;
            } catch (error) {
              errorCount++;
              errors.push(
                `Document ${i + 1} ("${doc?.title || "unknown"}"): ${error}`
              );
            }
          }

          let result = `📊 Bulk knowledge import completed:\n`;
          result += `✅ Successfully added: ${successCount} documents\n`;

          if (errorCount > 0) {
            result += `❌ Failed: ${errorCount} documents\n`;
            if (errors.length > 0) {
              result += `\nErrors:\n${errors.slice(0, 5).join("\n")}`;
              if (errors.length > 5) {
                result += `\n... and ${errors.length - 5} more errors`;
              }
            }
          }

          return result;
        } catch (error) {
          return handleError(error);
        }
      },
    }),
  };
}
