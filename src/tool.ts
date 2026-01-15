import AlchemystAI from "@alchemystai/sdk";
import { tool } from "ai";
import { z } from "zod";

/**
 * Options for configuring Alchemyst tools
 */
interface AlchemystToolsOptions {
  apiKey?: string;
  groupName?: string[];
}

export const alchemystTools = ({
  apiKey = process.env.ALCHEMYST_API_KEY,
  groupName = []
}: AlchemystToolsOptions = {}) => {
  // Validations
  if (!apiKey) {
    throw new Error(
      'ALCHEMYST_API_KEY is required. Please provide it via the apiKey parameter or set the ALCHEMYST_API_KEY environment variable.'
    );
  }

  if (typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new Error('apiKey must be a non-empty string');
  }

  if (!Array.isArray(groupName)) {
    throw new Error('groupName must be an array of strings');
  }

  if (groupName.some(name => typeof name !== 'string' || name.trim() === '')) {
    throw new Error('All group names must be non-empty strings');
  }

  const validGroups = ['context', 'memory'];
  const invalidGroups = groupName.filter(name => !validGroups.includes(name));
  if (invalidGroups.length > 0) {
    throw new Error(
      `Invalid group names: ${invalidGroups.join(', ')}. Valid groups are: ${validGroups.join(', ')}`
    );
  }

  const client = new AlchemystAI({ apiKey });

  const memoryTools = {
    add_to_memory: tool({
      description: "Add memory context data to Alchemyst AI.",
      inputSchema: z.object({
        memoryId: z.string().describe("The memory session ID"),
        contents: z.array(
          z.object({
            content: z.string().min(1).describe("The content to store in memory (required)"),
            metadata: z.object({
              source: z.string().min(1).describe("Source of the content (required)"),
              messageId: z.string().min(1).describe("Message identifier (required)"),
              type: z.string().min(1).describe("Type of content (required)"),
            }).strict(),
          }).strict()
        ).min(1).describe("Array of content items to add to memory (at least 1 required)")
      }),
      execute: async ({ memoryId, contents }) => {
        try {
          await client.v1.context.memory.add({
            sessionId: memoryId,
            contents: contents as any
          });
          return { 
            success: true, 
            message: "Memory added successfully." 
          };
        } catch (err) {
          return { 
            success: false, 
            error: err instanceof Error ? err.message : String(err)
          };
        }
      },
    }),
    
    delete_memory: tool({
      description: "Delete memory context data in Alchemyst AI.",
      inputSchema: z.object({
        memoryId: z.string().describe("The memory ID to delete"),
        user_id: z.string().nullable().optional().describe("Optional user ID filter"),
        organization_id: z.string().nullable().optional().describe("Optional organization ID filter"),
      }),
      execute: async ({ memoryId, user_id, organization_id }) => {
        try {
          await client.v1.context.memory.delete({
            memoryId,
            user_id: user_id ?? undefined,
            organization_id: organization_id ?? undefined,
          });
          return { 
            success: true, 
            message: "Memory deleted successfully." 
          };
        } catch (err) {
          return { 
            success: false, 
            error: err instanceof Error ? err.message : String(err)
          };
        }
      },
    }),
  } as const;

  const contextTools = {
    add_to_context: tool({
      description: "Add context data to Alchemyst AI.",
      inputSchema: z.object({
        documents: z.array(
          z.object({ 
            content: z.string().min(1).describe("Document content (required)")
          }).passthrough()
        ).min(1).describe("Documents to add to context (at least 1 required)"),
        source: z.string().min(1).describe("Source identifier for the documents (required)"),
        context_type: z.enum(["resource", "conversation", "instruction"]).describe("Type of context"),
        scope: z.enum(["internal", "external"]).default("internal").describe("Scope of the context"),
        metadata: z.object({
          fileName: z.string().optional(),
          fileType: z.string().optional(),
          lastModified: z.string().optional(),
          fileSize: z.number().optional(),
          groupName: z.array(z.string()).optional(),
        }).optional().describe("Optional metadata for the context"),
      }),
      execute: async ({ documents, source, context_type, scope, metadata }) => {
        try {
          await client.v1.context.add({
            documents: documents as any,
            source,
            context_type,
            scope,
            metadata: {
              ...metadata,
              fileName: metadata?.fileName ?? `file_${Date.now()}`,
              fileSize: JSON.stringify(documents).length,
              fileType: metadata?.fileType ?? "text/plain",
              lastModified: metadata?.lastModified ?? new Date().toISOString()
            },
          });
          return { 
            success: true, 
            message: "Context added successfully." 
          };
        } catch (err) {
          return { 
            success: false, 
            error: err instanceof Error ? err.message : String(err)
          };
        }
      },
    }),
    
    search_context: tool({
      description: "Search stored context documents in Alchemyst AI.",
      inputSchema: z.object({
        query: z.string().min(1, "Query is required.").describe("Search query string"),
        similarity_threshold: z.number().min(0).max(1).describe("Maximum similarity threshold (0-1)"),
        minimum_similarity_threshold: z.number().min(0).max(1).describe("Minimum similarity threshold (0-1)"),
        scope: z.enum(["internal", "external"]).default("internal").describe("Search scope"),
        body_metadata: z.record(z.string(), z.any()).optional().describe("Optional metadata filters"),
      }).refine(
        data => data.minimum_similarity_threshold <= data.similarity_threshold,
        {
          message: "minimum_similarity_threshold must be <= similarity_threshold.",
          path: ["minimum_similarity_threshold"],
        }
      ),
      execute: async ({ query, similarity_threshold, minimum_similarity_threshold, scope, body_metadata }) => {
        try {
          const response = await client.v1.context.search({
            query,
            similarity_threshold,
            minimum_similarity_threshold,
            scope,
            body_metadata,
          });
          return { 
            success: true,
            contexts: response?.contexts ?? [] 
          };
        } catch (err) {
          return { 
            success: false,
            error: err instanceof Error ? err.message : String(err)
          };
        }
      },
    }),
    
    delete_context: tool({
      description: "Delete context data in Alchemyst AI.",
      inputSchema: z.object({
        source: z.string().describe("Source identifier to delete"),
        user_id: z.string().nullable().optional().describe("Optional user ID filter"),
        organization_id: z.string().nullable().optional().describe("Optional organization ID filter"),
        by_doc: z.boolean().optional().describe("Delete by document"),
        by_id: z.boolean().optional().describe("Delete by ID"),
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
          return { 
            success: true, 
            message: "Context deleted successfully." 
          };
        } catch (err) {
          return { 
            success: false, 
            error: err instanceof Error ? err.message : String(err)
          };
        }
      },
    }),
  } as const;

  let finalTools = {};

  if (groupName.length === 0) {
    finalTools = { ...contextTools, ...memoryTools };
  } else {
    if (groupName.includes('context')) {
      finalTools = { ...finalTools, ...contextTools };
    }
    if (groupName.includes('memory')) {
      finalTools = { ...finalTools, ...memoryTools };
    }
  }

  return finalTools;
};

export const getAvailableGroups = (): string[] => ['context', 'memory'];

export const getAvailableTools = (): string[] => [
  'add_to_context',
  'search_context',
  'delete_context',
  'add_to_memory',
  'delete_memory'
];

export const getToolsByGroup = (group: 'context' | 'memory'): string[] => {
  const toolGroups = {
    context: ['add_to_context', 'search_context', 'delete_context'],
    memory: ['add_to_memory', 'delete_memory']
  };
  return toolGroups[group] || [];
};

export type { AlchemystToolsOptions };