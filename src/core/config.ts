/**
 * @file config.ts
 * Production-level configuration management for Alchemyst AI SDK.
 * Handles environment variables, validation, and default settings.
 */

import { z, ZodError } from "zod";
import type { AlchemystConfig, AlchemystToolOptions } from "../types";

// ===== ENVIRONMENT SCHEMA =====

/**
 * Zod schema for environment variable validation
 */
const envSchema = z.object({
  ALCHEMYST_API_KEY: z.string().optional(),
  ALCHEMYST_AI_API_KEY: z.string().optional(),
  ALCHEMYSTAI_API_KEY: z.string().optional(),
  ALCHEMYST_ENDPOINT: z.string().url().optional(),
  ALCHEMYST_TIMEOUT: z.coerce.number().int().positive().optional(),
  ALCHEMYST_MAX_RETRIES: z.coerce.number().int().min(0).max(10).optional(),
  ALCHEMYST_CACHE_TTL: z.coerce.number().int().positive().optional(),
  ALCHEMYST_DEBUG: z.enum(["true", "false", "1", "0"]).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
});

/**
 * Configuration schema with defaults
 */
const configSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  endpoint: z.string().url().default("https://api.getalchemystai.com"),
  timeout: z.number().int().positive().default(30000), // 30 seconds
  maxRetries: z.number().int().min(0).max(10).default(3),
  enableCache: z.boolean().default(true),
  cacheTtl: z.number().int().positive().default(300), // 5 minutes
  debug: z.boolean().default(false),
  headers: z.record(z.string(), z.string()).default({}),
  // correct record signature: z.record(keyType, valueType)
  // Use string->string mapping for headers
});

// ===== INTERFACES =====

/**
 * SDK configuration interface
 */
export interface SDKConfig extends z.infer<typeof configSchema> {
  environment: "development" | "test" | "production";
  version: string;
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  config?: SDKConfig;
  errors?: string[];
  warnings?: string[];
}

// ===== CONSTANTS =====

/**
 * SDK version
 */
export const SDK_VERSION = "0.0.1-alpha";

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<AlchemystConfig> = {
  timeout: 30000,
  maxRetries: 3,
  enableCache: true,
  cacheTtl: 300,
  debug: false,
  headers: {
    "User-Agent": `alchemyst-aisdk/${SDK_VERSION}`,
    "Content-Type": "application/json",
  },
};

/**
 * Environment-specific overrides
 */
const ENV_OVERRIDES = {
  development: {
    debug: true,
    timeout: 60000, // Longer timeout for dev
  },
  test: {
    enableCache: false,
    timeout: 10000, // Shorter timeout for tests
  },
  production: {
    debug: false,
    enableCache: true,
    maxRetries: 5, // More retries in prod
  },
} as const;

// ===== UTILITY FUNCTIONS =====

/**
 * Safely parse environment variables
 */
function parseEnv(): z.infer<typeof envSchema> {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.warn("Invalid environment variables detected:", error);
    return {};
  }
}

/**
 * Get environment type
 */
function getEnvironment(): "development" | "test" | "production" {
  const env = process.env.NODE_ENV;
  if (env === "development" || env === "test" || env === "production") {
    return env;
  }
  return "development"; // Default fallback
}

/**
 * Extract API key from environment
 */
function extractApiKey(env: z.infer<typeof envSchema>): string {
  return (
    env.ALCHEMYST_API_KEY ||
    env.ALCHEMYST_AI_API_KEY ||
    env.ALCHEMYSTAI_API_KEY ||
    ""
  );
}

/**
 * Parse boolean from string
 */
function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  return value === "true" || value === "1";
}

// ===== MAIN FUNCTIONS =====

/**
 * Load and validate configuration from environment
 */
export function loadConfig(): ConfigValidationResult {
  const env = parseEnv();
  const environment = getEnvironment();
  const apiKey = extractApiKey(env);

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for API key
  if (!apiKey) {
    errors.push(
      "Missing Alchemyst API key. Set ALCHEMYST_API_KEY environment variable."
    );
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Build configuration
  const baseConfig = {
    ...DEFAULT_CONFIG,
    apiKey,
    endpoint: env.ALCHEMYST_ENDPOINT,
    timeout: env.ALCHEMYST_TIMEOUT,
    maxRetries: env.ALCHEMYST_MAX_RETRIES,
    cacheTtl: env.ALCHEMYST_CACHE_TTL,
    debug: parseBoolean(env.ALCHEMYST_DEBUG),
  };

  // Apply environment overrides
  const envOverrides = ENV_OVERRIDES[environment] || {};
  const finalConfig = { ...baseConfig, ...envOverrides };

  // Validate final configuration
  try {
    const validatedConfig = configSchema.parse(finalConfig);

    const sdkConfig: SDKConfig = {
      ...validatedConfig,
      environment,
      version: SDK_VERSION,
    };

    // Add warnings for production
    if (environment === "production") {
      if (sdkConfig.debug) {
        warnings.push("Debug mode is enabled in production");
      }
      if (sdkConfig.timeout > 30000) {
        warnings.push(
          "High timeout value in production may affect performance"
        );
      }
    }

    return {
      valid: true,
      config: sdkConfig,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        valid: false,
        errors: error.issues.map(
          (e: any) =>
            `Configuration error: ${e.path
              .map((p: any) => String(p))
              .join(".")} - ${e.message}`
        ),
      };
    }

    return {
      valid: false,
      errors: [`Unknown configuration error: ${error}`],
    };
  }
}

/**
 * Merge user options with loaded configuration
 */
export function mergeConfig(
  userOptions: AlchemystToolOptions,
  loadedConfig?: SDKConfig
): AlchemystConfig {
  const base = loadedConfig || loadConfig().config || {};
  const userConfig = userOptions.config || {};

  return {
    ...DEFAULT_CONFIG,
    ...base,
    ...userConfig,
    // User-provided API key always takes precedence
    ...(userOptions.apiKey && { apiKey: userOptions.apiKey }),
  };
}

/**
 * Validate configuration at runtime
 */
export function validateConfig(
  config: AlchemystConfig
): ConfigValidationResult {
  try {
    const validated = configSchema.parse(config);
    return {
      valid: true,
      config: {
        ...validated,
        environment: getEnvironment(),
        version: SDK_VERSION,
      },
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        valid: false,
        errors: error.issues.map(
          (e: any) =>
            `${e.path.map((p: any) => String(p)).join(".")}: ${e.message}`
        ),
      };
    }

    return {
      valid: false,
      errors: [`Configuration validation failed: ${error}`],
    };
  }
}

/**
 * Get configuration summary for debugging
 */
export function getConfigSummary(config: SDKConfig): Record<string, unknown> {
  const { apiKey, ...safeConfig } = config;
  return {
    ...safeConfig,
    apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : "NOT_SET",
  };
}

/**
 * Check if configuration is ready for production
 */
export function isProductionReady(config: SDKConfig): {
  ready: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!config.apiKey) {
    issues.push("API key is required");
  }

  if (config.debug && config.environment === "production") {
    issues.push("Debug mode should be disabled in production");
  }

  if (!config.enableCache && config.environment === "production") {
    issues.push("Caching should be enabled in production");
  }

  if (config.timeout > 60000) {
    issues.push("Timeout is too high (>60s)");
  }

  return {
    ready: issues.length === 0,
    issues,
  };
}
