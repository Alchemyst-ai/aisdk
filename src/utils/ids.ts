/**
 * @file ids.ts
 * UUID and identifier helpers for memory/context entries.
 */

export const generateMemoryId = (): string => crypto.randomUUID();
