/**
 * @file toolFactory.ts
 * Utility for creating dynamic Vercel AI `tool` objects with schema + execFn.
 */

import { tool } from "ai";
import type { ZodSchema } from "zod";

/**
 * Helper to create a named tool compatible with the `ai` package.
 * We accept a Zod schema and an execute function and adapt types to the
 * `tool` helper. The casts are intentional to bridge Zod -> ai FlexibleSchema
 * until the upstream types provide direct compatibility.
 */
export const createTool = (
  name: string,
  description: string,
  schema: ZodSchema,
  execute: (args: unknown) => Promise<unknown> | unknown
) => ({
  [name]: tool({
    description,
    // The ai.tool typings expect a FlexibleSchema; ZodSchema is compatible at runtime
    // but not assignable to the declared type. Use a safe cast here.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    inputSchema: schema as unknown as any,
    // cast execute to any to satisfy the tool signature while preserving runtime behavior
    execute: execute as any,
  }),
});
