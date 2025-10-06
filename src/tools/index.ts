/**
 * @file tools/index.ts
 * Production-level tool orchestration for Alchemyst AI SDK.
 * Combines all tool sets based on user configuration.
 */

import type { ToolSet } from "ai";
import type { 
  AlchemystToolOptions, 
  EnhancedAlchemystClient 
} from "../types";
import { createMemoryTools } from "./memory.tools";
import { createContextTools } from "./context.tools";
import { createKnowledgeTools } from "./knowledge.tools";
import { createAgentTools } from "./agent.tools";
import { createWorkflowTools } from "./workflow.tools";
import { defaultLogger, logError } from "../utils/errors";

/**
 * Build comprehensive Alchemyst AI tool set based on configuration.
 * 
 * @param client - Enhanced Alchemyst AI client
 * @param options - Tool configuration options
 * @returns Combined tool set compatible with Vercel AI SDK
 */
export function buildAlchemystTools(
  client: EnhancedAlchemystClient,
  options: AlchemystToolOptions
): ToolSet {
  let tools: ToolSet = {};
  const config = client.config;
  
  try {
    // Memory management tools
    if (options.useMemory) {
      const memoryTools = createMemoryTools(client);
      tools = { ...tools, ...memoryTools };
      
      if (config.debug) {
        defaultLogger.info('Memory tools loaded', {
          count: Object.keys(memoryTools).length,
          tools: Object.keys(memoryTools)
        });
      }
    }
    
    // Context management tools
    if (options.useContext) {
      const contextTools = createContextTools(client);
      tools = { ...tools, ...contextTools };
      
      if (config.debug) {
        defaultLogger.info('Context tools loaded', {
          count: Object.keys(contextTools).length,
          tools: Object.keys(contextTools)
        });
      }
    }
    
    // Knowledge base tools
    if (options.useKnowledge) {
      const knowledgeTools = createKnowledgeTools(client);
      tools = { ...tools, ...knowledgeTools };
      
      if (config.debug) {
        defaultLogger.info('Knowledge tools loaded', {
          count: Object.keys(knowledgeTools).length,
          tools: Object.keys(knowledgeTools)
        });
      }
    }
    
    // Agent interaction tools
    if (options.useAgents) {
      const agentTools = createAgentTools(client);
      tools = { ...tools, ...agentTools };
      
      if (config.debug) {
        defaultLogger.info('Agent tools loaded', {
          count: Object.keys(agentTools).length,
          tools: Object.keys(agentTools)
        });
      }
    }
    
    // Workflow tools
    if (options.useWorkflows) {
      const workflowTools = createWorkflowTools(client);
      tools = { ...tools, ...workflowTools };
      
      if (config.debug) {
        defaultLogger.info('Workflow tools loaded', {
          count: Object.keys(workflowTools).length,
          tools: Object.keys(workflowTools)
        });
      }
    }
    
    const totalToolCount = Object.keys(tools).length;
    
    if (totalToolCount === 0) {
      defaultLogger.warn('No tools enabled. Enable at least one tool type in options.');
    }
    
    if (config.debug) {
      defaultLogger.info('All tools loaded successfully', {
        totalCount: totalToolCount,
        enabledFeatures: [
          ...(options.useMemory ? ['memory'] : []),
          ...(options.useContext ? ['context'] : []),
          ...(options.useKnowledge ? ['knowledge'] : []),
          ...(options.useAgents ? ['agents'] : []),
          ...(options.useWorkflows ? ['workflows'] : [])
        ]
      });
    }
    
    return tools;
    
  } catch (error) {
    logError(error, 'buildAlchemystTools');
    
    // Return minimal tool set in case of error
    if (options.useMemory) {
      try {
        return createMemoryTools(client);
      } catch {
        // Return empty set if even memory tools fail
      }
    }
    
    return {};
  }
}

// Re-export tool creators for individual use
export { createMemoryTools } from "./memory.tools";
export { createContextTools } from "./context.tools";
export { createKnowledgeTools } from "./knowledge.tools";
export { createAgentTools } from "./agent.tools";
export { createWorkflowTools } from "./workflow.tools";
