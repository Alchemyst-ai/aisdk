// tools.ts
import AlchemystAI from "@alchemystai/sdk";
import { tool, type ToolSet } from "ai";
import z from "zod";

/**
 * Options for configuring Alchemyst tools
 */
interface AlchemystToolsOptions {
  /**
   * API key for Alchemyst authentication
   * @default process.env.ALCHEMYST_API_KEY
   */
  apiKey?: string;
  
  /**
   * Array of group names to filter tools. Available groups: 'context', 'memory'
   * @default [] (returns all tools)
   */
  groupName?: string[];
}

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
 * // Use environment variable for API key
 * const result = await streamText({
 *   model: "gpt-4",
 *   prompt: "Remember that my name is Alice",
 *   tools: alchemystTools()
 * });
 * 
 * // Specify API key explicitly
 * const result = await streamText({
 *   model: "gpt-4",
 *   prompt: "Search my documents",
 *   tools: alchemystTools({ apiKey: "ALCHEMYST_API_KEY" })
 * });
 * 
 * // Filter by group names
 * const result = await streamText({
 *   model: "gpt-4",
 *   prompt: "Add this to memory",
 *   tools: alchemystTools({ groupName: ['memory'] })
 * });
 * 
 * // Use both parameters
 * const result = await streamText({
 *   model: "gpt-4",
 *   prompt: "Search context",
 *   tools: alchemystTools({ 
 *     apiKey: "YOUR_KEY", 
 *     groupName: ['context'] 
 *   })
 * });
 * ```
 *
 * @param options - Configuration options
 * @param options.apiKey - API key for Alchemyst authentication (defaults to ALCHEMYST_API_KEY env var)
 * @param options.groupName - Array of group names to filter tools ('context', 'memory')
 * @returns ToolSet compatible with AI SDK
 * @throws {Error} If API key is not provided or invalid
 *
 * @module
 */
export const alchemystTools = ({
  apiKey = process.env.ALCHEMYST_API_KEY,
  groupName = []
}: AlchemystToolsOptions = {}): ToolSet => {
  // Validate API key
  if (!apiKey) {
    throw new Error(
      'ALCHEMYST_API_KEY is required. Please provide it via the apiKey parameter or set the ALCHEMYST_API_KEY environment variable.'
    );
  }

  // Validate apiKey type
  if (typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new Error('apiKey must be a non-empty string');
  }

  // Validate groupName
  if (!Array.isArray(groupName)) {
    throw new Error('groupName must be an array of strings');
  }

  // Validate each group name is a string
  if (groupName.some(name => typeof name !== 'string' || name.trim() === '')) {
    throw new Error('All group names must be non-empty strings');
  }

  // Validate group names are valid
  const validGroups = ['context', 'memory'];
  const invalidGroups = groupName.filter(name => !validGroups.includes(name));
  if (invalidGroups.length > 0) {
    throw new Error(
      `Invalid group names: ${invalidGroups.join(', ')}. Valid groups are: ${validGroups.join(', ')}`
    );
  }

  const client = new AlchemystAI({
    apiKey
  });

  const memoryTools: ToolSet = {
    add_to_memory: tool({
      description: "Add memory context data to Alchemyst AI.",
      parameters: z.object({
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
      execute: async ({ memoryId: sessionId, contents }) => {
        try {
          await client.v1.context.memory.add({
            sessionId: sessionId,
            contents
          });
          return "Memory added successfully.";
        } catch (err) {
          return `Memory could not be added. Error: ${err}`;
        }
      },
    }),
    
    delete_memory: tool({
      description: "Delete memory context data in Alchemyst AI.",
      parameters: z.object({
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
  };

  const metadataSchema = z.record(z.string(), z.any());

  const contextTools: ToolSet = {
    add_to_context: tool({
      description: "Add context data to Alchemyst AI.",
      parameters: z.object({
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
            groupName: z.array(z.string()).optional(),
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
            metadata: {
              ...metadata,
              fileName: metadata?.fileName ?? `file_${Date.now()}`,
              fileSize: metadata?.fileSize ?? JSON.stringify(documents).length,  // ✅ FIXED
              fileType: metadata?.fileType ?? "text/plain",
              lastModified: metadata?.lastModified ?? new Date().toISOString()
            },
          });
          return "Context added successfully.";
        } catch (err) {
          return `Context could not be added. Error: ${err}`;
        }
      },
    }),
    
    search_context: tool({
      description: "Search stored context documents in Alchemyst AI.",
      parameters: z.object({
        query: z.string().min(1, "Query is required."),
        similarity_threshold: z.number().min(0).max(1),
        minimum_similarity_threshold: z.number().min(0).max(1),
        scope: z.enum(["internal", "external"]).default("internal"),
        body_metadata: metadataSchema.optional(),
      }).refine(
        data => data.minimum_similarity_threshold <= data.similarity_threshold,
        {
          message: "minimum_similarity_threshold must be <= similarity_threshold.",
          path: ["minimum_similarity_threshold"],
        }
      ),
      execute: async ({
        query,
        similarity_threshold,
        minimum_similarity_threshold,
        scope,
        body_metadata
      }) => {
        try {
          const response = await client.v1.context.search(
            {
              query,
              similarity_threshold,
              minimum_similarity_threshold,
              scope,
              body_metadata: body_metadata,
            },
          );

          return response?.contexts ?? [];
        } catch (err) {
          return `Context search failed. Error: ${err}`;
        }
      },
    }),
    
    delete_context: tool({
      description: "Delete context data in Alchemyst AI (v1 context delete).",
      parameters: z.object({
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
  
  // Determine which tools to include
  let finalTools: ToolSet = {};

  // If no groupName specified, include all tools
  if (groupName.length === 0) {
    finalTools = { ...contextTools, ...memoryTools };
  } else {
    // Include tools based on groupName filter
    if (groupName.includes('context')) {
      finalTools = { ...finalTools, ...contextTools };
    }
    if (groupName.includes('memory')) {
      finalTools = { ...finalTools, ...memoryTools };
    }
  }

  return finalTools;
};

/**
 * Get list of available tool groups
 * @returns Array of available group names
 */
export const getAvailableGroups = (): string[] => {
  return ['context', 'memory'];
};

/**
 * Get list of all available tool names
 * @returns Array of all tool names
 */
export const getAvailableTools = (): string[] => {
  return [
    'add_to_context',
    'search_context',
    'delete_context',
    'add_to_memory',
    'delete_memory'
  ];
};

/**
 * Get tools filtered by group
 * @param group - Group name ('context' or 'memory')
 * @returns Array of tool names in the specified group
 */
export const getToolsByGroup = (group: 'context' | 'memory'): string[] => {
  const toolGroups = {
    context: ['add_to_context', 'search_context', 'delete_context'],
    memory: ['add_to_memory', 'delete_memory']
  };
  return toolGroups[group] || [];
};

// Export types
export type { AlchemystToolsOptions };