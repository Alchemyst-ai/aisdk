/**
 * @file agent.tools.ts
 * Agent interaction tools for Alchemyst AI integration.
 * Provides AI agent communication, management, and execution capabilities.
 */

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { 
  EnhancedAlchemystClient,
  AgentConfig,
  AgentInteractionOptions,
  ToolExecutionContext
} from "../types";
import { agentInteractionSchema } from "../types";
import { 
  handleError, 
  ValidationError 
} from "../utils/errors";
import { generateMemoryId } from "../utils/ids";

/**
 * Create agent interaction tools
 */
export function createAgentTools(client: EnhancedAlchemystClient): ToolSet {
  return {
    chat_with_agent: tool({
      description: "Interact with an AI agent for specialized tasks and conversations.",
      inputSchema: agentInteractionSchema,
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
          sessionId: params.sessionId,
        };

        try {
          const result = await client.executeWithContext(
            async (alchemystClient) => {
              return await alchemystClient.v1.agents.chat({
                agentId: params.agentId,
                message: params.message,
                sessionId: params.sessionId,
                context: params.context,
                streaming: params.streaming || false,
                metadata: params.metadata
              });
            },
            context
          );

          if (result) {
            return `🤖 **Agent Response** (${params.agentId}):\n\n${result.message || result.response || result}`;
          }

          return "❌ No response received from agent. Please try again.";

        } catch (error) {
          return handleError(error);
        }
      }
    }),

    list_agents: tool({
      description: "List available AI agents and their capabilities.",
      inputSchema: z.object({
        limit: z.number().int().positive().max(100).default(20),
        capabilities: z.array(z.string()).optional()
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          const result = await client.executeWithContext(
            async (alchemystClient) => {
              return await alchemystClient.v1.agents.list({
                limit: params.limit,
                ...(params.capabilities && { capabilities: params.capabilities })
              });
            },
            context
          );

          if (result && result.agents?.length > 0) {
            return `🤖 Available AI Agents:\n\n${
              result.agents.map((agent: any, index: number) => 
                `${index + 1}. **${agent.name}** (ID: ${agent.id})\n` +
                `   ${agent.description || 'No description available'}\n` +
                (agent.capabilities?.length ? 
                  `   Capabilities: ${agent.capabilities.join(', ')}\n` : '') +
                (agent.model ? `   Model: ${agent.model}\n` : '') +
                `   Status: ${agent.status || 'Active'}\n`
              ).join('\n')
            }`;
          }

          return "ℹ️ No agents found matching your criteria.";

        } catch (error) {
          return handleError(error);
        }
      }
    }),

    create_agent: tool({
      description: "Create a new AI agent with custom configuration.",
      inputSchema: z.object({
        name: z.string().min(1, "Agent name is required"),
        description: z.string().optional(),
        instructions: z.string().optional(),
        capabilities: z.array(z.string()).optional(),
        model: z.string().optional(),
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().int().positive().optional()
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          const agentConfig: AgentConfig = {
            id: generateMemoryId(),
            name: params.name,
            description: params.description,
            instructions: params.instructions,
            capabilities: params.capabilities,
            model: params.model,
            temperature: params.temperature,
            maxTokens: params.maxTokens
          };

          const result = await client.executeWithContext(
            async (alchemystClient) => {
              return await alchemystClient.v1.agents.create(agentConfig);
            },
            context
          );

          return `✅ Agent created successfully!\n\n` +
                 `**Name:** ${params.name}\n` +
                 `**ID:** ${result.id || agentConfig.id}\n` +
                 (params.description ? `**Description:** ${params.description}\n` : '') +
                 (params.capabilities?.length ? 
                   `**Capabilities:** ${params.capabilities.join(', ')}\n` : '') +
                 (params.model ? `**Model:** ${params.model}\n` : '');

        } catch (error) {
          return handleError(error);
        }
      }
    }),

    update_agent: tool({
      description: "Update an existing AI agent's configuration.",
      inputSchema: z.object({
        agentId: z.string().min(1, "Agent ID is required"),
        name: z.string().optional(),
        description: z.string().optional(),
        instructions: z.string().optional(),
        capabilities: z.array(z.string()).optional(),
        model: z.string().optional(),
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().int().positive().optional()
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          // Build update object with only provided fields
          const updateData: any = {};
          if (params.name) updateData.name = params.name;
          if (params.description) updateData.description = params.description;
          if (params.instructions) updateData.instructions = params.instructions;
          if (params.capabilities) updateData.capabilities = params.capabilities;
          if (params.model) updateData.model = params.model;
          if (params.temperature !== undefined) updateData.temperature = params.temperature;
          if (params.maxTokens) updateData.maxTokens = params.maxTokens;

          if (Object.keys(updateData).length === 0) {
            throw new ValidationError("At least one field must be provided for update");
          }

          const result = await client.executeWithContext(
            async (alchemystClient) => {
              return await alchemystClient.v1.agents.update({
                agentId: params.agentId,
                ...updateData
              });
            },
            context
          );

          return `✅ Agent updated successfully (ID: ${params.agentId})\n` +
                 (params.name ? `New name: ${params.name}\n` : '') +
                 (params.description ? `New description: ${params.description}\n` : '') +
                 (params.capabilities?.length ? 
                   `New capabilities: ${params.capabilities.join(', ')}\n` : '');

        } catch (error) {
          return handleError(error);
        }
      }
    }),

    delete_agent: tool({
      description: "Delete an AI agent.",
      inputSchema: z.object({
        agentId: z.string().min(1, "Agent ID is required"),
        confirm: z.boolean().default(false)
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          if (!params.confirm) {
            return `⚠️ Agent deletion requires confirmation. Set 'confirm: true' to proceed with deleting agent ${params.agentId}.`;
          }

          const result = await client.executeWithContext(
            async (alchemystClient) => {
              return await alchemystClient.v1.agents.delete({
                agentId: params.agentId
              });
            },
            context
          );

          return `✅ Agent deleted successfully (ID: ${params.agentId})`;

        } catch (error) {
          return handleError(error);
        }
      }
    }),

    get_agent_sessions: tool({
      description: "Get conversation sessions for an agent.",
      inputSchema: z.object({
        agentId: z.string().min(1, "Agent ID is required"),
        limit: z.number().int().positive().max(100).default(20),
        offset: z.number().int().min(0).default(0)
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          const result = await client.executeWithContext(
            async (alchemystClient) => {
              return await alchemystClient.v1.agents.sessions({
                agentId: params.agentId,
                limit: params.limit,
                offset: params.offset
              });
            },
            context
          );

          if (result && result.sessions?.length > 0) {
            return `💬 Agent Sessions (${params.agentId}):\n\n${
              result.sessions.map((session: any, index: number) => 
                `${index + 1}. **Session ${session.id}**\n` +
                `   Started: ${session.createdAt || 'Unknown'}\n` +
                `   Last activity: ${session.lastActivity || 'Unknown'}\n` +
                `   Messages: ${session.messageCount || 0}\n` +
                (session.status ? `   Status: ${session.status}\n` : '')
              ).join('\n')
            }` +
            (result.total > result.sessions.length ? 
              `\n📄 Showing ${result.sessions.length} of ${result.total} total sessions` : '');
          }

          return `ℹ️ No sessions found for agent ${params.agentId}.`;

        } catch (error) {
          return handleError(error);
        }
      }
    }),

    get_agent_conversation: tool({
      description: "Get conversation history for an agent session.",
      inputSchema: z.object({
        agentId: z.string().min(1, "Agent ID is required"),
        sessionId: z.string().min(1, "Session ID is required"),
        limit: z.number().int().positive().max(100).default(50)
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
          sessionId: params.sessionId,
        };

        try {
          const result = await client.executeWithContext(
            async (alchemystClient) => {
              return await alchemystClient.v1.agents.conversation({
                agentId: params.agentId,
                sessionId: params.sessionId,
                limit: params.limit
              });
            },
            context
          );

          if (result && result.messages?.length > 0) {
            return `💬 Conversation History (Agent: ${params.agentId}, Session: ${params.sessionId}):\n\n${
              result.messages.map((msg: any, index: number) => 
                `**${msg.role || 'Unknown'}:** ${msg.content || msg.message}\n` +
                `   ⏰ ${msg.timestamp || 'Unknown time'}\n`
              ).join('\n')
            }`;
          }

          return `ℹ️ No conversation history found for session ${params.sessionId}.`;

        } catch (error) {
          return handleError(error);
        }
      }
    })
  };
}