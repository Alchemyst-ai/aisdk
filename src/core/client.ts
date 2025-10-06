/**
 * @file client.ts
 * Production-level Alchemyst AI client management.
 * Handles initialization, connection pooling, caching, and advanced features.
 */

import dotenv from "dotenv";
import AlchemystAI from "@alchemystai/sdk";
import type {
  AlchemystConfig,
  AlchemystToolOptions,
  ApiResponse,
  PerformanceMetrics,
  ToolExecutionContext,
} from "../types";
import {
  loadConfig,
  mergeConfig,
  validateConfig,
  getConfigSummary,
  type SDKConfig,
} from "./config";
import {
  withRetry,
  logError,
  defaultLogger,
  type ErrorLogger,
  AuthenticationError,
} from "../utils/errors";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config();

// ===== INTERFACES =====

/**
 * Enhanced Alchemyst AI client with advanced features
 */
interface EnhancedAlchemystClient {
  readonly client: AlchemystAI;
  readonly config: SDKConfig;
  readonly metrics: ClientMetrics;

  // Core methods
  execute<T>(operation: (client: AlchemystAI) => Promise<T>): Promise<T>;
  executeWithContext<T>(
    operation: (client: AlchemystAI) => Promise<T>,
    context: ToolExecutionContext
  ): Promise<T>;

  // Health and monitoring
  healthCheck(): Promise<boolean>;
  getMetrics(): ClientMetrics;
  resetMetrics(): void;

  // Cache management
  clearCache(): void;
  getCacheStats(): CacheStats;

  // Cleanup
  dispose(): void;
}

/**
 * Client metrics tracking
 */
interface ClientMetrics {
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

/**
 * Cache statistics
 */
interface CacheStats {
  size: number;
  hitRate: number;
  missRate: number;
  evictions: number;
}

// ===== CACHE IMPLEMENTATION =====

/**
 * Simple LRU cache for API responses
 */
class LRUCache<T> {
  private cache = new Map<
    string,
    { value: T; timestamp: number; hits: number }
  >();
  private maxSize: number;
  private ttl: number;
  private stats = { hits: 0, misses: 0, evictions: 0 };

  constructor(maxSize: number = 100, ttlSeconds: number = 300) {
    this.maxSize = maxSize;
    this.ttl = ttlSeconds * 1000;
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);

    if (!item) {
      this.stats.misses++;
      return undefined;
    }

    // Check TTL
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Update access time and hit count
    item.hits++;
    this.stats.hits++;

    return item.value;
  }

  set(key: string, value: T): void {
    // Remove expired entries
    this.cleanup();

    // If at capacity, remove least recently used
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value as string | undefined;
      if (firstKey) {
        this.cache.delete(firstKey);
        this.stats.evictions++;
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      missRate: total > 0 ? this.stats.misses / total : 0,
      evictions: this.stats.evictions,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// ===== CLIENT IMPLEMENTATION =====

/**
 * Production-level Alchemyst AI client
 */
class AlchemystClientImpl implements EnhancedAlchemystClient {
  public readonly client: AlchemystAI;
  public readonly config: SDKConfig;

  private cache: LRUCache<any>;
  private logger: ErrorLogger;
  private metricsData: ClientMetrics;
  public readonly metrics: ClientMetrics;
  private disposed = false;

  constructor(config: SDKConfig, logger: ErrorLogger = defaultLogger) {
    this.config = config;
    this.logger = logger;

    // Initialize metrics
    this.metricsData = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      retryCount: 0,
      uptime: 0,
      startTime: new Date(),
    };
    this.metrics = this.metricsData;

    // Initialize cache
    this.cache = new LRUCache(
      100, // max 100 items
      config.cacheTtl
    );

    // Initialize client
    try {
      this.client = new AlchemystAI({
        apiKey: config.apiKey,
        ...(config.endpoint && { endpoint: config.endpoint }),
        ...(config.timeout && { timeout: config.timeout }),
        ...(config.headers && { headers: config.headers }),
      });

      if (config.debug) {
        this.logger.info(
          "Alchemyst AI client initialized",
          getConfigSummary(config)
        );
      }
    } catch (error) {
      this.logger.error(
        "Failed to initialize Alchemyst AI client",
        error as any
      );
      throw new AuthenticationError("Failed to initialize client");
    }
  }

  async execute<T>(operation: (client: AlchemystAI) => Promise<T>): Promise<T> {
    if (this.disposed) {
      throw new Error("Client has been disposed");
    }

    const startTime = Date.now();
    this.metricsData.totalRequests++;

    try {
      const result = await withRetry(() => operation(this.client), {
        maxAttempts: this.config.maxRetries,
        onRetry: (error, attempt) => {
          this.metricsData.retryCount++;
          if (this.config.debug) {
            this.logger.warn(`Retry attempt ${attempt}`, {
              error: error.message,
            });
          }
        },
      });

      this.metricsData.successfulRequests++;
      this.updateResponseTime(Date.now() - startTime);

      return result;
    } catch (error) {
      this.metricsData.failedRequests++;
      this.metricsData.lastError = error as Error;
      this.updateResponseTime(Date.now() - startTime);

      logError(error, "AlchemystClient.execute", this.logger);
      throw error;
    }
  }

  async executeWithContext<T>(
    operation: (client: AlchemystAI) => Promise<T>,
    context: ToolExecutionContext
  ): Promise<T> {
    if (this.config.debug) {
      this.logger.info("Executing with context", {
        requestId: context.requestId,
        userId: context.userId,
        sessionId: context.sessionId,
      });
    }

    return this.execute(operation);
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - attempt to access client
      if (!this.client) {
        return false;
      }

      // You could add a ping endpoint here if available
      return true;
    } catch (error) {
      this.logger.error("Health check failed", error as any);
      return false;
    }
  }

  getMetrics(): ClientMetrics {
    return {
      ...this.metricsData,
      uptime: Date.now() - this.metricsData.startTime.getTime(),
      cacheHits:
        this.cache.getStats().hitRate *
        (this.metricsData.cacheHits + this.metricsData.cacheMisses),
      cacheMisses:
        this.cache.getStats().missRate *
        (this.metricsData.cacheHits + this.metricsData.cacheMisses),
    };
  }

  resetMetrics(): void {
    this.metricsData = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      retryCount: 0,
      uptime: 0,
      startTime: new Date(),
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): CacheStats {
    return this.cache.getStats();
  }

  dispose(): void {
    if (this.disposed) return;

    this.cache.clear();
    this.disposed = true;

    if (this.config.debug) {
      this.logger.info("Alchemyst AI client disposed");
    }
  }

  private updateResponseTime(responseTime: number): void {
    const total =
      this.metricsData.successfulRequests + this.metricsData.failedRequests;
    if (total === 1) {
      this.metricsData.averageResponseTime = responseTime;
    } else {
      this.metricsData.averageResponseTime =
        (this.metricsData.averageResponseTime * (total - 1) + responseTime) /
        total;
    }
  }
}

// ===== CLIENT FACTORY =====

/**
 * Client registry for reusing clients
 */
const clientRegistry = new Map<string, EnhancedAlchemystClient>();

/**
 * Generate client key for registry
 */
function getClientKey(config: SDKConfig): string {
  return `${config.apiKey.substring(0, 8)}-${config.endpoint}-${
    config.timeout
  }`;
}

/**
 * Initialize or get cached Alchemyst AI client
 */
export function initAlchemystClient(
  options: string | AlchemystToolOptions,
  logger: ErrorLogger = defaultLogger
): EnhancedAlchemystClient {
  // Handle string input (just API key)
  if (typeof options === "string") {
    options = { apiKey: options };
  }

  // Load and merge configuration
  const configResult = loadConfig();
  if (!configResult.valid) {
    throw new AuthenticationError(
      `Configuration error: ${configResult.errors?.join(", ")}`
    );
  }

  const config = mergeConfig(options, configResult.config!);

  // Validate final configuration
  const validationResult = validateConfig(config);
  if (!validationResult.valid) {
    throw new AuthenticationError(
      `Invalid configuration: ${validationResult.errors?.join(", ")}`
    );
  }

  const finalConfig = validationResult.config!;
  const clientKey = getClientKey(finalConfig);

  // Check if client already exists
  let client = clientRegistry.get(clientKey) as
    | EnhancedAlchemystClient
    | undefined;
  if (client && !(client.config as any)?.debug) {
    // Reuse existing client (except in debug mode)
    return client;
  }

  // Create new client
  const newClient = new AlchemystClientImpl(finalConfig, logger);
  clientRegistry.set(clientKey, newClient);

  return newClient;
}

/**
 * Initialize a basic Alchemyst AI client (legacy compatibility)
 */
export function initBasicAlchemystClient(apiKey?: string): AlchemystAI {
  const resolvedKey =
    (apiKey && apiKey.trim()) ||
    process.env.ALCHEMYST_API_KEY ||
    process.env.ALCHEMYST_AI_API_KEY ||
    process.env.ALCHEMYSTAI_API_KEY ||
    "";

  if (!resolvedKey || resolvedKey.trim() === "")
    throw new AuthenticationError(
      "Missing Alchemyst API key. Provide it as an argument or set ALCHEMYST_API_KEY / ALCHEMYST_AI_API_KEY in env."
    );

  return new AlchemystAI({ apiKey: resolvedKey });
}

/**
 * Cleanup all registered clients
 */
export function disposeAllClients(): void {
  for (const client of clientRegistry.values()) {
    client.dispose();
  }
  clientRegistry.clear();
}

/**
 * Get all registered clients (for monitoring)
 */
export function getAllClients(): EnhancedAlchemystClient[] {
  return Array.from(clientRegistry.values());
}
