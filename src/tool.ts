// ...existing code...

import AlchemystAI from "@alchemystai/sdk";
import { tool } from "ai";
import type z from "zod";
import { toolParamSchemas } from "./schemas";

export type ToolGroup = 'context' | 'memory';

export type AddToContextResult =
  | { success: true; message: string }
  | { success: false; message: string };

export type SearchContextResult =
  | { success: true; data: any[] }
  | { success: false; message: string };

export type DeleteContextResult =
  | { success: true; message: string }
  | { success: false; message: string };

export type AddToMemoryResult =
  | { success: true; message: string }
  | { success: false; message: string };

export type DeleteMemoryResult =
  | { success: true; message: string }
  | { success: false; message: string };

// Tool function shapes (match how tests call them directly)

type ToolEntry<Params, Result> = {
  description: string;
  parameters: unknown; // zod schema, but keep `unknown` to avoid tight coupling
  execute: (params: Params) => Promise<Result>;
};

export type ContextTools = {
  add_to_context: ToolEntry<z.infer<typeof toolParamSchemas.add_to_context>, AddToContextResult>;
  search_context: ToolEntry<z.infer<typeof toolParamSchemas.search_context>, SearchContextResult & { message?: string }>;
  delete_context: ToolEntry<z.infer<typeof toolParamSchemas.delete_context>, DeleteContextResult>;
};

export type MemoryTools = {
  add_to_memory: ToolEntry<z.infer<typeof toolParamSchemas.add_to_memory>, AddToMemoryResult>;
  delete_memory: ToolEntry<z.infer<typeof toolParamSchemas.delete_memory>, DeleteMemoryResult>;
};

export type AlchemystTools = ContextTools & MemoryTools;

// Helper: build return type from flags (your 4 cases)
export type ToolsFromFlags<
  WithContext extends boolean,
  WithMemory extends boolean,
> =
  (WithContext extends true ? ContextTools : {}) &
  (WithMemory extends true ? MemoryTools : {});

// IMPORTANT: default generics here reflect your runtime defaults:
// withContext defaults to true, withMemory defaults to false
export type AlchemystToolsOptions<
  WithContext extends boolean = true,
  WithMemory extends boolean = false,
> = {
  apiKey?: string;
  groupName?: string[];
  withContext?: WithContext;
  withMemory?: WithMemory;
};

// ...existing code...

export const alchemystTools = <
  WithContext extends boolean = true,
  WithMemory extends boolean = false,
>({
  apiKey = process.env.ALCHEMYST_API_KEY,
  groupName = [],
  withMemory = false as WithMemory,
  withContext = true as WithContext
}: AlchemystToolsOptions<WithContext, WithMemory> = {} as any): ToolsFromFlags<WithContext, WithMemory> => {
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

  const client = new AlchemystAI({ apiKey });

  const memoryTools = {
    add_to_memory: tool<z.infer<typeof toolParamSchemas.add_to_memory>, AddToMemoryResult>({
      description: "Add memory context data to Alchemyst AI. Use this to store conversation history, user preferences, or important context that should be remembered across sessions.",
      parameters: toolParamSchemas.add_to_memory,
      execute: async (params: z.infer<typeof toolParamSchemas.add_to_memory>) => {
        const { sessionId, contents } = params;
        try {
          await client.v1.context.memory.add({
            sessionId,
            contents: contents.map(item => ({
              content: item.content,
              metadata: item.metadata
            }))
          });
          return {
            success: true,
            message: `Successfully added ${contents.length} item(s) to memory with session ID: ${sessionId}`
          };
        } catch (err) {
          return {
            success: false,
            message: err instanceof Error ? err.message : String(err)
          };
        }
      },
    } as any), // Type assertion for v5/v6 compatibility

    delete_memory: tool<z.infer<typeof toolParamSchemas.delete_memory>, DeleteMemoryResult>({
      description: "Delete memory context data from Alchemyst AI. Use this to remove outdated or unwanted memories.",
      parameters: toolParamSchemas.delete_memory,
      execute: async (params: z.infer<typeof toolParamSchemas.delete_memory>) => {
        const { memoryId, user_id, organization_id } = params;
        try {
          await client.v1.context.memory.delete({
            memoryId,
            user_id: user_id ?? undefined,
            organization_id: organization_id ?? undefined,
          });
          return {
            success: true,
            message: `Successfully deleted memory with ID: ${memoryId}`
          };
        } catch (err) {
          return {
            success: false,
            message: err instanceof Error ? err.message : String(err)
          };
        }
      },
    } as any), // Type assertion for v5/v6 compatibility
  };

  const contextTools = {
    add_to_context: tool<z.infer<typeof toolParamSchemas.add_to_context>>({
      description: "Add context documents to Alchemyst AI. Use this to provide the AI with additional knowledge, documentation, or reference materials.",
      parameters: toolParamSchemas.add_to_context,
      execute: async (params: z.infer<typeof toolParamSchemas.add_to_context>) => {
        const { documents, source, context_type, scope, metadata } = params;
        try {
          const timestamp = new Date().toISOString();
          const contentSize = JSON.stringify(documents).length;

          await client.v1.context.add({
            documents: documents,
            source,
            context_type,
            scope,
            metadata: {
              ...metadata,
              fileName: metadata?.fileName ?? `file_${Date.now()}`,
              fileSize: metadata?.fileSize ?? contentSize,
              fileType: metadata?.fileType ?? "text/plain",
              lastModified: metadata?.lastModified ?? timestamp
            },
          });
          return {
            success: true,
            message: `Successfully added ${documents.length} document(s) to context from source: ${source}`
          };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err)
          };
        }
      },
    } as any), // Type assertion for v5/v6 compatibility

    search_context: tool<z.infer<typeof toolParamSchemas.search_context>>({
      description: "Search stored context documents in Alchemyst AI. Use this to retrieve relevant information based on a query.",
      parameters: toolParamSchemas.search_context,
      execute: async (params: z.infer<typeof toolParamSchemas.search_context>) => {
        const { query, similarity_threshold, minimum_similarity_threshold, scope, body_metadata } = params;
        try {
          const response = await client.v1.context.search({
            query,
            similarity_threshold,
            minimum_similarity_threshold,
            scope,
            body_metadata,
          });

          const contexts = response?.contexts ?? [];
          return {
            success: true,
            message: `Found ${contexts.length} matching context(s)`,
            data: contexts
          };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err)
          };
        }
      },
    } as any), // Type assertion for v5/v6 compatibility

    delete_context: tool<z.infer<typeof toolParamSchemas.delete_context>>({
      description: "Delete context data from Alchemyst AI. Use this to remove outdated or unwanted context documents.",
      parameters: toolParamSchemas.delete_context,
      execute: async (params: z.infer<typeof toolParamSchemas.delete_context>) => {
        const { source, user_id, organization_id, by_doc, by_id } = params;
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
            message: `Successfully deleted context from source: ${source}`
          };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err)
          };
        }
      },
    } as any), // Type assertion for v5/v6 compatibility
  };

  // Determine which tools to include based on parameters
  // Priority: groupName > withMemory/withContext > defaults

  let flag: "all" | "context" | "memory" | "none" = withContext && withMemory ? "all" : withContext ? "context" : withMemory ? "memory" : "none";

  let selectedTools = {
    "none": {},
    "context": contextTools,
    "memory": memoryTools,
    "all": { ...memoryTools, ...contextTools }
  }

  return selectedTools[flag] as ToolsFromFlags<WithContext, WithMemory>;
};

/**
 * Get list of available tool groups
 */
export const getAvailableGroups = (): string[] => ['context', 'memory'];

/**
 * Get list of all available tools
 */
export const getAvailableTools = (): string[] => [
  'add_to_context',
  'search_context',
  'delete_context',
  'add_to_memory',
  'delete_memory'
];

/**
 * Get tools by group name
 */
export const getToolsByGroup = (group: 'context' | 'memory'): string[] => {
  const toolGroups = {
    context: ['add_to_context', 'search_context', 'delete_context'],
    memory: ['add_to_memory', 'delete_memory'],
    all: ['add_to_context', 'search_context', 'delete_context', 'add_to_memory', 'delete_memory']
  };
  return toolGroups[group] || [];
};
