/**
 * @file workflow.tools.ts
 * Workflow management tools for Alchemyst AI integration.
 * Provides workflow creation, execution, and management capabilities.
 */

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type {
  EnhancedAlchemystClient,
  WorkflowConfig,
  WorkflowStep,
  ToolExecutionContext,
} from "../types";
import { handleError, ValidationError } from "../utils/errors";
import { generateMemoryId } from "../utils/ids";

/**
 * Create workflow management tools
 */
export function createWorkflowTools(client: EnhancedAlchemystClient): ToolSet {
  return {
    execute_workflow: tool({
      description: "Execute a predefined workflow with given parameters.",
      inputSchema: z.object({
        workflowId: z.string().min(1, "Workflow ID is required"),
        parameters: z.record(z.string(), z.unknown()).optional(),
        sessionId: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
          sessionId: params.sessionId,
        };

        try {
          const result = await client.executeWithContext(
            async (alchemystClient: any) => {
              return await alchemystClient.v1.workflows.execute({
                workflowId: params.workflowId,
                parameters: params.parameters || {},
                sessionId: params.sessionId,
                metadata: params.metadata,
              });
            },
            context
          );

          if (result) {
            let response = `🔄 **Workflow Executed** (ID: ${params.workflowId})\\n\\n`;

            if (result.status) {
              response += `Status: ${result.status}\\n`;
            }

            if (result.steps && Array.isArray(result.steps)) {
              response += `Steps completed: ${result.steps.length}\\n`;
              response += `\\n**Step Results:**\\n`;

              result.steps.forEach((step: any, index: number) => {
                response += `${index + 1}. ${
                  step.name || step.type || "Unknown"
                }: `;
                response += `${step.status || "completed"}`;
                if (step.result) {
                  response += ` - ${step.result}`;
                }
                response += `\\n`;
              });
            }

            if (result.output) {
              response += `\\n**Final Output:**\\n${result.output}`;
            }

            return response;
          }

          return "❌ Workflow execution failed. No result returned.";
        } catch (error) {
          return handleError(error);
        }
      },
    }),

    create_workflow: tool({
      description:
        "Create a new workflow with defined steps and configuration.",
      inputSchema: z.object({
        name: z.string().min(1, "Workflow name is required"),
        description: z.string().optional(),
        steps: z
          .array(
            z.object({
              id: z.string(),
              type: z.enum([
                "memory",
                "context",
                "knowledge",
                "agent",
                "custom",
              ]),
              action: z.string(),
              parameters: z.record(z.string(), z.unknown()).optional(),
              conditions: z.record(z.string(), z.unknown()).optional(),
            })
          )
          .min(1, "At least one step is required"),
        triggers: z.array(z.string()).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          const workflowConfig: WorkflowConfig = {
            id: generateMemoryId(),
            name: params.name,
            description: params.description,
            steps: params.steps as WorkflowStep[],
            triggers: params.triggers,
            metadata: params.metadata,
          };

          const result = await client.executeWithContext(
            async (alchemystClient: any) => {
              return await alchemystClient.v1.workflows.create(workflowConfig);
            },
            context
          );

          return (
            `✅ Workflow created successfully!\\n\\n` +
            `**Name:** ${params.name}\\n` +
            `**ID:** ${result.id || workflowConfig.id}\\n` +
            (params.description
              ? `**Description:** ${params.description}\\n`
              : "") +
            `**Steps:** ${params.steps.length}\\n` +
            (params.triggers?.length
              ? `**Triggers:** ${params.triggers.join(", ")}\\n`
              : "") +
            `\\n**Step Overview:**\\n` +
            params.steps
              .map(
                (step, index) => `${index + 1}. ${step.type}: ${step.action}`
              )
              .join("\\n")
          );
        } catch (error) {
          return handleError(error);
        }
      },
    }),

    list_workflows: tool({
      description: "List available workflows with optional filtering.",
      inputSchema: z.object({
        limit: z.number().int().positive().max(100).default(20),
        offset: z.number().int().min(0).default(0),
        type: z.string().optional(),
        status: z.string().optional(),
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          const result = await client.executeWithContext(
            async (alchemystClient) => {
              return await alchemystClient.v1.workflows.list({
                limit: params.limit,
                offset: params.offset,
                ...(params.type && { type: params.type }),
                ...(params.status && { status: params.status }),
              });
            },
            context
          );

          if (result && result.workflows?.length > 0) {
            return (
              `🔄 Available Workflows:\\n\\n${result.workflows
                .map(
                  (workflow: any, index: number) =>
                    `${index + 1}. **${workflow.name}** (ID: ${
                      workflow.id
                    })\\n` +
                    `   ${
                      workflow.description || "No description available"
                    }\\n` +
                    `   Steps: ${workflow.steps?.length || 0}\\n` +
                    `   Status: ${workflow.status || "Active"}\\n` +
                    (workflow.triggers?.length
                      ? `   Triggers: ${workflow.triggers.join(", ")}\\n`
                      : "") +
                    `   Created: ${workflow.createdAt || "Unknown"}\\n`
                )
                .join("\\n")}` +
              (result.total > result.workflows.length
                ? `\\n📄 Showing ${result.workflows.length} of ${result.total} total workflows`
                : "")
            );
          }

          return "ℹ️ No workflows found matching your criteria.";
        } catch (error) {
          return handleError(error);
        }
      },
    }),

    get_workflow: tool({
      description: "Get detailed information about a specific workflow.",
      inputSchema: z.object({
        workflowId: z.string().min(1, "Workflow ID is required"),
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          const result = await client.executeWithContext(
            async (alchemystClient) => {
              return await alchemystClient.v1.workflows.get({
                workflowId: params.workflowId,
              });
            },
            context
          );

          if (result) {
            let response = `🔄 **Workflow Details** (ID: ${params.workflowId})\\n\\n`;
            response += `**Name:** ${result.name}\\n`;
            if (result.description) {
              response += `**Description:** ${result.description}\\n`;
            }
            response += `**Status:** ${result.status || "Active"}\\n`;
            response += `**Created:** ${result.createdAt || "Unknown"}\\n`;

            if (result.triggers?.length) {
              response += `**Triggers:** ${result.triggers.join(", ")}\\n`;
            }

            if (result.steps?.length) {
              response += `\\n**Steps (${result.steps.length}):**\\n`;
              result.steps.forEach((step: any, index: number) => {
                response += `${index + 1}. **${step.type}** - ${
                  step.action
                }\\n`;
                if (
                  step.parameters &&
                  Object.keys(step.parameters).length > 0
                ) {
                  response += `   Parameters: ${JSON.stringify(
                    step.parameters,
                    null,
                    2
                  )}\\n`;
                }
                if (
                  step.conditions &&
                  Object.keys(step.conditions).length > 0
                ) {
                  response += `   Conditions: ${JSON.stringify(
                    step.conditions,
                    null,
                    2
                  )}\\n`;
                }
              });
            }

            return response;
          }

          return `❌ Workflow not found (ID: ${params.workflowId})`;
        } catch (error) {
          return handleError(error);
        }
      },
    }),

    update_workflow: tool({
      description: "Update an existing workflow's configuration.",
      inputSchema: z.object({
        workflowId: z.string().min(1, "Workflow ID is required"),
        name: z.string().optional(),
        description: z.string().optional(),
        steps: z
          .array(
            z.object({
              id: z.string(),
              type: z.enum([
                "memory",
                "context",
                "knowledge",
                "agent",
                "custom",
              ]),
              action: z.string(),
              parameters: z.record(z.string(), z.unknown()).optional(),
              conditions: z.record(z.string(), z.unknown()).optional(),
            })
          )
          .optional(),
        triggers: z.array(z.string()).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
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
          if (params.steps) updateData.steps = params.steps;
          if (params.triggers) updateData.triggers = params.triggers;
          if (params.metadata) updateData.metadata = params.metadata;

          if (Object.keys(updateData).length === 0) {
            throw new ValidationError(
              "At least one field must be provided for update"
            );
          }

          const result = await client.executeWithContext(
            async (alchemystClient: any) => {
              return await alchemystClient.v1.workflows.update({
                workflowId: params.workflowId,
                ...updateData,
              });
            },
            context
          );

          return (
            `✅ Workflow updated successfully (ID: ${params.workflowId})\\n` +
            (params.name ? `New name: ${params.name}\\n` : "") +
            (params.description
              ? `New description: ${params.description}\\n`
              : "") +
            (params.steps ? `Updated steps: ${params.steps.length}\\n` : "") +
            (params.triggers?.length
              ? `New triggers: ${params.triggers.join(", ")}\\n`
              : "")
          );
        } catch (error) {
          return handleError(error);
        }
      },
    }),

    delete_workflow: tool({
      description: "Delete a workflow.",
      inputSchema: z.object({
        workflowId: z.string().min(1, "Workflow ID is required"),
        confirm: z.boolean().default(false),
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          if (!params.confirm) {
            return `⚠️ Workflow deletion requires confirmation. Set 'confirm: true' to proceed with deleting workflow ${params.workflowId}.`;
          }

          const result = await client.executeWithContext(
            async (alchemystClient: any) => {
              return await alchemystClient.v1.workflows.delete({
                workflowId: params.workflowId,
              });
            },
            context
          );

          return `✅ Workflow deleted successfully (ID: ${params.workflowId})`;
        } catch (error) {
          return handleError(error);
        }
      },
    }),

    get_workflow_executions: tool({
      description: "Get execution history for a workflow.",
      inputSchema: z.object({
        workflowId: z.string().min(1, "Workflow ID is required"),
        limit: z.number().int().positive().max(100).default(20),
        offset: z.number().int().min(0).default(0),
        status: z.string().optional(),
      }),
      execute: async (params) => {
        const context: ToolExecutionContext = {
          requestId: generateMemoryId(),
          timestamp: new Date().toISOString(),
        };

        try {
          const result = await client.executeWithContext(
            async (alchemystClient: any) => {
              return await alchemystClient.v1.workflows.executions({
                workflowId: params.workflowId,
                limit: params.limit,
                offset: params.offset,
                ...(params.status && { status: params.status }),
              });
            },
            context
          );

          if (result && result.executions?.length > 0) {
            return (
              `📊 Workflow Executions (${
                params.workflowId
              }):\\n\\n${result.executions
                .map(
                  (execution: any, index: number) =>
                    `${index + 1}. **Execution ${execution.id}**\\n` +
                    `   Status: ${execution.status}\\n` +
                    `   Started: ${execution.startTime || "Unknown"}\\n` +
                    `   Duration: ${execution.duration || "Unknown"}\\n` +
                    (execution.error ? `   Error: ${execution.error}\\n` : "") +
                    `   Steps completed: ${execution.stepsCompleted || 0}/${
                      execution.totalSteps || 0
                    }\\n`
                )
                .join("\\n")}` +
              (result.total > result.executions.length
                ? `\\n📄 Showing ${result.executions.length} of ${result.total} total executions`
                : "")
            );
          }

          return `ℹ️ No executions found for workflow ${params.workflowId}.`;
        } catch (error) {
          return handleError(error);
        }
      },
    }),
  };
}
