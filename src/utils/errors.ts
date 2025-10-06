/**
 * @file errors.ts
 * Production-level error handling system for Alchemyst AI SDK.
 * Provides comprehensive error types, handling, retry logic, and logging.
 */

import type { AlchemystError, ErrorCode } from '../types';

// ===== ERROR CLASSES =====

/**
 * Base Alchemyst AI error class
 */
export class AlchemystAIError extends Error implements AlchemystError {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly details?: Record<string, unknown>;
  public readonly retryable: boolean;
  public readonly timestamp: string;
  
  constructor(
    message: string,
    code: string,
    statusCode?: number,
    details?: Record<string, unknown>,
    retryable = false
  ) {
    super(message);
    this.name = 'AlchemystAIError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.retryable = retryable;
    this.timestamp = new Date().toISOString();
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AlchemystAIError);
    }
  }
  
  /**
   * Convert to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      retryable: this.retryable,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
  
  /**
   * Create user-friendly message
   */
  toUserMessage(): string {
    switch (this.code) {
      case 'AUTHENTICATION':
        return 'Authentication failed. Please check your API key.';
      case 'AUTHORIZATION':
        return 'Access denied. Please check your permissions.';
      case 'RATE_LIMIT':
        return 'Rate limit exceeded. Please try again later.';
      case 'NETWORK':
        return 'Network error. Please check your connection.';
      case 'VALIDATION':
        return `Invalid input: ${this.message}`;
      case 'NOT_FOUND':
        return 'Requested resource not found.';
      case 'TIMEOUT':
        return 'Request timed out. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AlchemystAIError {
  constructor(message = 'Invalid API key or authentication failed') {
    super(message, 'AUTHENTICATION', 401, undefined, false);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AlchemystAIError {
  constructor(message = 'Insufficient permissions for this operation') {
    super(message, 'AUTHORIZATION', 403, undefined, false);
    this.name = 'AuthorizationError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AlchemystAIError {
  constructor(
    message = 'Rate limit exceeded', 
    retryAfter?: number
  ) {
    super(
      message, 
      'RATE_LIMIT', 
      429, 
      { retryAfter }, 
      true
    );
    this.name = 'RateLimitError';
  }
}

/**
 * Network error
 */
export class NetworkError extends AlchemystAIError {
  constructor(message = 'Network request failed') {
    super(message, 'NETWORK', undefined, undefined, true);
    this.name = 'NetworkError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends AlchemystAIError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION', 400, details, false);
    this.name = 'ValidationError';
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends AlchemystAIError {
  constructor(message = 'Request timed out') {
    super(message, 'TIMEOUT', 408, undefined, true);
    this.name = 'TimeoutError';
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AlchemystAIError {
  constructor(message = 'Resource not found') {
    super(message, 'NOT_FOUND', 404, undefined, false);
    this.name = 'NotFoundError';
  }
}

// ===== ERROR DETECTION =====

/**
 * Detect error type from HTTP response
 */
export function detectErrorFromResponse(
  status: number, 
  responseText?: string
): AlchemystAIError {
  let details: Record<string, unknown> | undefined;
  
  try {
    if (responseText) {
      details = JSON.parse(responseText);
    }
  } catch {
    // Ignore JSON parse errors
  }
  
  const message = details?.message as string || 
                 details?.error as string || 
                 'Unknown error';
  
  switch (status) {
    case 401:
      return new AuthenticationError(message);
    case 403:
      return new AuthorizationError(message);
    case 404:
      return new NotFoundError(message);
    case 408:
      return new TimeoutError(message);
    case 429:
      return new RateLimitError(
        message,
        details?.retryAfter as number
      );
    case 400:
      return new ValidationError(message, details);
    default:
      if (status >= 500) {
        return new AlchemystAIError(
          message,
          'INTERNAL',
          status,
          details,
          true
        );
      }
      return new AlchemystAIError(
        message,
        'UNKNOWN',
        status,
        details,
        false
      );
  }
}

/**
 * Detect error type from generic error
 */
export function detectErrorFromException(error: unknown): AlchemystAIError {
  if (error instanceof AlchemystAIError) {
    return error;
  }
  
  if (error instanceof Error) {
    // Check for common error patterns
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return new NetworkError(error.message);
    }
    
    if (message.includes('timeout')) {
      return new TimeoutError(error.message);
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return new ValidationError(error.message);
    }
    
    if (message.includes('auth') || message.includes('key')) {
      return new AuthenticationError(error.message);
    }
    
    // Generic error
    return new AlchemystAIError(
      error.message,
      'INTERNAL',
      undefined,
      { originalError: error.name },
      false
    );
  }
  
  // Unknown error type
  return new AlchemystAIError(
    String(error),
    'UNKNOWN',
    undefined,
    { originalError: typeof error },
    false
  );
}

// ===== ERROR HANDLING UTILITIES =====

/**
 * Handle error and return user-friendly message
 */
export function handleError(error: unknown): string {
  const alchemystError = detectErrorFromException(error);
  return `❌ ${alchemystError.toUserMessage()}`;
}

/**
 * Handle error and return detailed result
 */
export function handleErrorDetailed(error: unknown): {
  success: false;
  error: AlchemystAIError;
  userMessage: string;
} {
  const alchemystError = detectErrorFromException(error);
  return {
    success: false,
    error: alchemystError,
    userMessage: alchemystError.toUserMessage(),
  };
}

/**
 * Check if error is retryable
 */
export function isRetryable(error: unknown): boolean {
  const alchemystError = detectErrorFromException(error);
  return alchemystError.retryable;
}

/**
 * Get retry delay based on error type
 */
export function getRetryDelay(error: unknown, attempt: number): number {
  const alchemystError = detectErrorFromException(error);
  
  if (alchemystError instanceof RateLimitError && alchemystError.details?.retryAfter) {
    return (alchemystError.details.retryAfter as number) * 1000;
  }
  
  // Exponential backoff: 1s, 2s, 4s, 8s, etc.
  return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
}

// ===== RETRY LOGIC =====

/**
 * Retry options
 */
export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  retryableErrorCodes?: string[];
  onRetry?: (error: AlchemystAIError, attempt: number) => void;
}

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableErrorCodes: ['NETWORK', 'TIMEOUT', 'RATE_LIMIT', 'INTERNAL'],
};

/**
 * Retry function with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: AlchemystAIError;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = detectErrorFromException(error);
      
      // Don't retry if error is not retryable
      if (!lastError.retryable) {
        throw lastError;
      }
      
      // Don't retry if we've reached max attempts
      if (attempt >= opts.maxAttempts) {
        throw lastError;
      }
      
      // Calculate delay
      const delay = Math.min(
        opts.baseDelay * Math.pow(2, attempt - 1),
        opts.maxDelay
      );
      
      // Call retry callback
      if (opts.onRetry) {
        opts.onRetry(lastError, attempt);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// ===== LOGGING =====

/**
 * Error logger interface
 */
export interface ErrorLogger {
  error(message: string, error?: AlchemystAIError): void;
  warn(message: string, details?: Record<string, unknown>): void;
  info(message: string, details?: Record<string, unknown>): void;
}

/**
 * Default console logger
 */
export const defaultLogger: ErrorLogger = {
  error: (message: string, error?: AlchemystAIError) => {
    console.error(message, error?.toJSON());
  },
  warn: (message: string, details?: Record<string, unknown>) => {
    console.warn(message, details);
  },
  info: (message: string, details?: Record<string, unknown>) => {
    console.info(message, details);
  },
};

/**
 * Log error with context
 */
export function logError(
  error: unknown,
  context: string,
  logger: ErrorLogger = defaultLogger
): void {
  const alchemystError = detectErrorFromException(error);
  logger.error(`[${context}] ${alchemystError.message}`, alchemystError);
}
