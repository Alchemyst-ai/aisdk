/**
 * @file index.ts
 * Production-level entrypoint for @alchemystai/aisdk package.
 * Provides comprehensive Alchemyst AI integration with Vercel AI SDK.
 */

import { initAlchemystClient } from "./core/client";
import { buildAlchemystTools } from "./tools";
import type {
  AlchemystToolOptions,
  AlchemystToolSet,
  AlchemystConfig,
  PerformanceMetrics,
} from "./types";
import { defaultLogger } from "./utils/errors";
import { SDK_VERSION } from "./core/config";

/**
 * Main API to create configured Alchemyst AI toolsets for Vercel AI SDK.
 *
 * @param options - Configuration options (API key string or options object)
 * @returns Tool set compatible with Vercel AI SDK
 *
 * @example
 * ```typescript
 * // Simple usage
 * const tools = alchemystTools("your-api-key");
 *
 * // Advanced usage
 * const tools = alchemystTools({
 *   apiKey: "your-api-key",
 *   useMemory: true,
 *   useContext: true,
 *   useKnowledge: true,
 *   config: {
 *     timeout: 30000,
 *     maxRetries: 3,
 *     debug: true
 *   }
 * });
 *
 * // Use with Vercel AI SDK
 * import { streamText } from 'ai';
 *
 * const result = await streamText({
 *   model: yourModel,
 *   messages: [...],
 *   tools: alchemystTools({
 *     apiKey: process.env.ALCHEMYST_API_KEY!,
 *     useMemory: true,
 *     useContext: true
 *   })
 * });
 * ```
 */
export function alchemystTools(
  options: string | AlchemystToolOptions
): AlchemystToolSet {
  // Normalize options
  const opts: AlchemystToolOptions =
    typeof options === "string"
      ? {
          apiKey: options,
          useContext: true,
          useMemory: true,
          useKnowledge: false,
          useAgents: false,
          useWorkflows: false,
        }
      : {
          useContext: true,
          useMemory: true,
          useKnowledge: false,
          useAgents: false,
          useWorkflows: false,
          ...options,
        };

  // Initialize enhanced client
  const client = initAlchemystClient(opts);

  // Build tool set
  const toolSet = buildAlchemystTools(client, opts);

  // Add metadata to tool set
  const enhancedToolSet = toolSet as AlchemystToolSet;
  enhancedToolSet._meta = {
    version: SDK_VERSION,
    features: [
      ...(opts.useContext ? ["context"] : []),
      ...(opts.useMemory ? ["memory"] : []),
      ...(opts.useKnowledge ? ["knowledge"] : []),
      ...(opts.useAgents ? ["agents"] : []),
      ...(opts.useWorkflows ? ["workflows"] : []),
    ],
    client: client,
  };

  return enhancedToolSet;
}

/**
 * Get performance metrics for all active clients
 */
export function getGlobalMetrics(): {
  totalClients: number;
  metrics: PerformanceMetrics[];
  aggregated: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    cacheHitRate: number;
  };
} {
  const clients = require("./core/client").getAllClients();
  const metrics = clients.map((client: any) => client.getMetrics());

  const aggregated = metrics.reduce(
    (
      acc: {
        totalRequests: number;
        successRate: number;
        averageResponseTime: number;
        cacheHitRate: number;
      },
      metric: any
    ) => {
      acc.totalRequests += metric.totalRequests;
      acc.successRate +=
        metric.successfulRequests / Math.max(metric.totalRequests, 1);
      acc.averageResponseTime += metric.averageResponseTime;
      acc.cacheHitRate +=
        metric.cacheHits / Math.max(metric.cacheHits + metric.cacheMisses, 1);
      return acc;
    },
    {
      totalRequests: 0,
      successRate: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
    }
  );

  const clientCount = clients.length || 1;
  return {
    totalClients: clientCount,
    metrics,
    aggregated: {
      totalRequests: aggregated.totalRequests,
      successRate: aggregated.successRate / clientCount,
      averageResponseTime: aggregated.averageResponseTime / clientCount,
      cacheHitRate: aggregated.cacheHitRate / clientCount,
    },
  };
}

/**
 * Cleanup all resources (call this when shutting down your app)
 */
export function cleanup(): void {
  const { disposeAllClients } = require("./core/client");
  disposeAllClients();
}

/**
 * Get SDK version and build information
 */
export function getVersion(): {
  version: string;
  buildDate: string;
  features: string[];
} {
  return {
    version: SDK_VERSION,
    buildDate: new Date().toISOString(),
    features: [
      "memory-management",
      "context-management",
      "knowledge-base",
      "agents",
      "workflows",
      "caching",
      "retry-logic",
      "metrics",
      "error-handling",
    ],
  };
}

// ===== CONVENIENCE EXPORTS =====

/**
 * Create memory-only tools
 */
export const memoryTools = (
  apiKey: string,
  config?: Partial<AlchemystConfig>
) =>
  alchemystTools({
    apiKey,
    useMemory: true,
    useContext: false,
    useKnowledge: false,
    useAgents: false,
    useWorkflows: false,
    config,
  });

/**
 * Create context-only tools
 */
export const contextTools = (
  apiKey: string,
  config?: Partial<AlchemystConfig>
) =>
  alchemystTools({
    apiKey,
    useMemory: false,
    useContext: true,
    useKnowledge: false,
    useAgents: false,
    useWorkflows: false,
    config,
  });

/**
 * Create knowledge-only tools
 */
export const knowledgeTools = (
  apiKey: string,
  config?: Partial<AlchemystConfig>
) =>
  alchemystTools({
    apiKey,
    useMemory: false,
    useContext: false,
    useKnowledge: true,
    useAgents: false,
    useWorkflows: false,
    config,
  });

// ===== PUBLIC EXPORTS =====

// Core functionality
export * from "./core";
export * from "./tools";
export * from "./utils";
export * from "./types";

// Re-export common types for convenience
export type { ToolSet } from "ai";

// Version info
export { SDK_VERSION } from "./core/config";

// Default export
export default alchemystTools;
