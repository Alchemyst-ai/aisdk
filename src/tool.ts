import AlchemystAI from "@alchemystai/sdk";
import { tool } from "ai";
import { z } from "zod";

/**
 * Options for configuring Alchemyst tools
 */
interface AlchemystToolsOptions {
  apiKey?: string;
  groupName?: string[];
  withMemory?: boolean;
  withContext?: boolean;
}

/**
 * Standard tool response types
 */
type ToolSuccessResponse<T = void> = {
  success: true;
  message?: string;
  data?: T;
};

type ToolErrorResponse = {
  success: false;
  error: string;
};

type ToolResponse<T = void> = ToolSuccessResponse<T> | ToolErrorResponse;

/**
 * Create Alchemyst tools for use with Vercel AI SDK v5 and v6
 * Compatible with both versions v5 and v6
 */
export const alchemystTools = ({
  apiKey = process.env.ALCHEMYST_API_KEY,
  groupName = [],
  withMemory = false,
  withContext = true
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

  const client = new AlchemystAI({ apiKey });

  const memoryTools = {
    add_to_memory: tool({
      description: "Add memory context data to Alchemyst AI. Use this to store conversation history, user preferences, or important context that should be remembered across sessions.",
      parameters: z.object({
        memoryId: z.string().describe("The memory session ID that groups related memories together"),
        contents: z.array(
          z.object({
            content: z.string().min(1).describe("The content to store in memory (required)"),
            metadata: z.object({
              source: z.string().min(1).describe("Source of the content (required)"),
              messageId: z.string().min(1).describe("Message identifier (required)"),
              type: z.string().min(1).describe("Type of content (required)"),
            }).passthrough(), // Allow additional fields
          }).passthrough()
        ).min(1).describe("Array of content items to add to memory (at least 1 required)")
      }),
      execute: async (params: any) => {
        const { memoryId, contents } = params;
        try {
          await client.v1.context.memory.add({
            sessionId: memoryId,
            contents: contents as any
          });
          return { 
            success: true, 
            message: `Successfully added ${contents.length} item(s) to memory with session ID: ${memoryId}` 
          };
        } catch (err) {
          return { 
            success: false, 
            error: err instanceof Error ? err.message : String(err)
          };
        }
      },
    } as any), // Type assertion for v5/v6 compatibility
    
    delete_memory: tool({
      description: "Delete memory context data from Alchemyst AI. Use this to remove outdated or unwanted memories.",
      parameters: z.object({
        memoryId: z.string().describe("The memory ID to delete"),
        user_id: z.string().optional().describe("Optional user ID filter"),
        organization_id: z.string().optional().describe("Optional organization ID filter"),
      }),
      execute: async (params: any) => {
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
            error: err instanceof Error ? err.message : String(err)
          };
        }
      },
    } as any), // Type assertion for v5/v6 compatibility
  } as const;

  const contextTools = {
    add_to_context: tool({
      description: "Add context documents to Alchemyst AI. Use this to provide the AI with additional knowledge, documentation, or reference materials.",
      parameters: z.object({
        documents: z.array(
          z.object({ 
            content: z.string().min(1).describe("Document content (required)")
          }).passthrough()
        ).min(1).describe("Documents to add to context (at least 1 required)"),
        source: z.string().min(1).describe("Source identifier for the documents (required)"),
        context_type: z.enum(["resource", "conversation", "instruction"]).describe("Type of context: resource (reference docs), conversation (chat history), or instruction (guidelines)"),
        scope: z.enum(["internal", "external"]).default("internal").describe("Scope: internal (private) or external (shared)"),
        metadata: z.object({
          fileName: z.string().optional(),
          fileType: z.string().optional(),
          lastModified: z.string().optional(),
          fileSize: z.number().optional(),
          groupName: z.array(z.string()).optional(),
        }).optional().describe("Optional metadata for the context"),
      }),
      execute: async (params: any) => {
        const { documents, source, context_type, scope, metadata } = params;
        try {
          const timestamp = new Date().toISOString();
          const contentSize = JSON.stringify(documents).length;
          
          await client.v1.context.add({
            documents: documents as any,
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
    
    search_context: tool({
      description: "Search stored context documents in Alchemyst AI. Use this to retrieve relevant information based on a query.",
      parameters: z.object({
        query: z.string().min(1, "Query is required.").describe("Search query string"),
        similarity_threshold: z.number().min(0).max(1).default(0.7).describe("Maximum similarity threshold (0-1, default: 0.7)"),
        minimum_similarity_threshold: z.number().min(0).max(1).default(0.5).describe("Minimum similarity threshold (0-1, default: 0.5)"),
        scope: z.enum(["internal", "external"]).default("internal").describe("Search scope: internal or external"),
        body_metadata: z.record(z.string(), z.any()).optional().describe("Optional metadata filters"),
      }).refine(
        data => data.minimum_similarity_threshold <= data.similarity_threshold,
        {
          message: "minimum_similarity_threshold must be <= similarity_threshold.",
          path: ["minimum_similarity_threshold"],
        }
      ),
      execute: async (params: any) => {
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
    
    delete_context: tool({
      description: "Delete context data from Alchemyst AI. Use this to remove outdated or unwanted context documents.",
      parameters: z.object({
        source: z.string().describe("Source identifier to delete"),
        user_id: z.string().optional().describe("Optional user ID filter"),
        organization_id: z.string().optional().describe("Optional organization ID filter"),
        by_doc: z.boolean().optional().default(true).describe("Delete by document (default: true)"),
        by_id: z.boolean().optional().default(false).describe("Delete by ID (default: false)"),
      }),
      execute: async (params: any) => {
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
  } as const;

  // Determine which tools to include based on parameters
  // Priority: groupName > withMemory/withContext > defaults
  let includeContext = withContext;
  let includeMemory = withMemory;
  
  // If groupName is provided and not empty, use it to override
  if (groupName.length > 0) {
    includeContext = groupName.includes('context');
    includeMemory = groupName.includes('memory');
  }
  
  // Safety check: ensure at least one tool group is selected
  if (!includeContext && !includeMemory) {
    console.warn('No tools selected, enabling context tools by default');
    includeContext = true;
  }
  
  const selectedTools = {
    ...(includeContext ? contextTools : {}),
    ...(includeMemory ? memoryTools : {}),
  };
  
  return selectedTools;
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
    memory: ['add_to_memory', 'delete_memory']
  };
  return toolGroups[group] || [];
};

export type { AlchemystToolsOptions, ToolResponse, ToolSuccessResponse, ToolErrorResponse };