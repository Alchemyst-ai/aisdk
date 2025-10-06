/**
 * @file types/index.ts
 * Comprehensive type definitions for the Alchemyst AI SDK wrapper.
 * Provides full TypeScript support for all Alchemyst AI and Vercel AI SDK features.
 */

import { z } from "zod";
import type { ToolSet } from "ai";

// ===== CORE TYPES =====

/**
 * Normalized content structure used throughout the SDK
 */
export type NormalizedContent = {
  content: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
};

// ===== CLIENT / METRICS TYPES =====

/**
 * Lightweight client metrics exposed to consumers.
 */
export interface ClientMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  cacheHits: number;
  cacheMisses: number;
  retryCount: number;
  lastError?: Error;
  uptime: number;
  startTime: Date;
}

export interface CacheStats {
  size: number;
  hitRate: number;
  missRate: number;
  evictions: number;
}

/**
 * Minimal client interface used by tool implementations.
 * Kept intentionally light to avoid tight coupling with the concrete client
 * implementation while still enabling contextual typing in tools.
 */
export interface EnhancedAlchemystClient {
  client?: unknown;
  config?: any;
  metrics?: ClientMetrics;
  execute<T>(operation: (client: any) => Promise<T>): Promise<T>;
  executeWithContext<T>(
    operation: (client: any) => Promise<T>,
    context: any
  ): Promise<T>;
  getMetrics(): ClientMetrics;
  resetMetrics(): void;
  clearCache(): void;
  getCacheStats(): CacheStats;
  dispose(): void;
}

/**
 * Content input types - flexible input for users
 */
export type ContentInput =
  | string
  | { content: string; metadata?: Record<string, unknown> }
  | { text: string; metadata?: Record<string, unknown> };

/**
 * Configuration options for initializing Alchemyst AI tools
 */
export interface AlchemystToolOptions {
  /** Alchemyst AI API key */
  apiKey: string;

  /** Enable context management tools */
  useContext?: boolean;

  /** Enable memory management tools */
  useMemory?: boolean;

  /** Enable knowledge base tools */
  useKnowledge?: boolean;

  /** Enable agent interaction tools */
  useAgents?: boolean;

  /** Enable workflow tools */
  useWorkflows?: boolean;

  /** Custom configuration options */
  config?: AlchemystConfig;
}

/**
 * Advanced configuration for Alchemyst AI client
 */
export interface AlchemystConfig {
  /** API endpoint override */
  endpoint?: string;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Maximum retry attempts */
  maxRetries?: number;

  /** Enable caching */
  enableCache?: boolean;

  /** Cache TTL in seconds */
  cacheTtl?: number;

  /** Enable debug logging */
  debug?: boolean;

  /** Custom headers */
  headers?: Record<string, string>;
}

// ===== MEMORY TYPES =====

/**
 * Memory entry structure
 */
export interface MemoryEntry {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  importance?: number;
  tags?: string[];
}

/**
 * Memory search filters
 */
export interface MemorySearchOptions {
  query?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  minImportance?: number;
  dateRange?: {
    start?: string;
    end?: string;
  };
}

// ===== CONTEXT TYPES =====

/**
 * Context entry structure
 */
export interface ContextEntry {
  id: string;
  content: string;
  role?: "system" | "user" | "assistant";
  metadata?: Record<string, unknown>;
  timestamp: string;
  sessionId?: string;
}

/**
 * Context management options
 */
export interface ContextOptions {
  sessionId?: string;
  maxEntries?: number;
  retentionDays?: number;
  autoSummarize?: boolean;
}

// ===== KNOWLEDGE BASE TYPES =====

/**
 * Knowledge base document
 */
export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  source?: string;
  lastUpdated: string;
}

/**
 * Knowledge search options
 */
export interface KnowledgeSearchOptions {
  query: string;
  tags?: string[];
  source?: string;
  limit?: number;
  threshold?: number;
  includeMetadata?: boolean;
}

// ===== AGENT TYPES =====

/**
 * Agent configuration
 */
export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  capabilities?: string[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Agent interaction options
 */
export interface AgentInteractionOptions {
  sessionId?: string;
  context?: string[];
  metadata?: Record<string, unknown>;
  streaming?: boolean;
}

// ===== WORKFLOW TYPES =====

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  id: string;
  type: "memory" | "context" | "knowledge" | "agent" | "custom";
  action: string;
  parameters?: Record<string, unknown>;
  conditions?: Record<string, unknown>;
}

/**
 * Workflow configuration
 */
export interface WorkflowConfig {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  triggers?: string[];
  metadata?: Record<string, unknown>;
}

// ===== ERROR TYPES =====

/**
 * Alchemyst AI error types
 */
export interface AlchemystError extends Error {
  code: string;
  statusCode?: number;
  details?: Record<string, unknown>;
  retryable?: boolean;
}

/**
 * Error categories
 */
export enum ErrorCode {
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  RATE_LIMIT = "RATE_LIMIT",
  NETWORK = "NETWORK",
  VALIDATION = "VALIDATION",
  NOT_FOUND = "NOT_FOUND",
  INTERNAL = "INTERNAL",
  TIMEOUT = "TIMEOUT",
}

// ===== RESPONSE TYPES =====

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
    usage?: {
      tokens?: number;
      cost?: number;
    };
  };
}

// ===== ZOD SCHEMAS =====

/**
 * Zod schema for content validation
 */
export const contentInputSchema = z.union([
  z.string(),
  z.object({
    content: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    text: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
]);

/**
 * Memory operations schema
 */
export const memorySchema = z.object({
  contents: z.array(contentInputSchema),
  tags: z.array(z.string()).optional(),
  importance: z.number().min(0).max(10).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Context operations schema
 */
export const contextSchema = z.object({
  contents: z.array(contentInputSchema),
  sessionId: z.string().optional(),
  role: z.enum(["system", "user", "assistant"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Knowledge search schema
 */
export const knowledgeSearchSchema = z.object({
  query: z.string().min(1),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  limit: z.number().int().positive().max(100).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
  includeMetadata: z.boolean().default(true),
});

/**
 * Agent interaction schema
 */
export const agentInteractionSchema = z.object({
  message: z.string().min(1),
  agentId: z.string(),
  sessionId: z.string().optional(),
  context: z.array(z.string()).optional(),
  streaming: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ===== UTILITY TYPES =====

/**
 * Tool creation result
 */
export type AlchemystToolSet = ToolSet & {
  _meta: {
    version: string;
    features: string[];
    client: unknown;
  };
};

/**
 * Tool execution context
 */
export interface ToolExecutionContext {
  requestId: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  executionTime: number;
  tokensUsed?: number;
  cacheHit?: boolean;
  retryCount?: number;
}

// ===== EXPORT CONSOLIDATED TYPES =====

export type { ToolSet } from "ai";
