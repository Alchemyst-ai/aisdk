/**
 * @file normalize.ts
 * Normalizes mixed string/object content inputs for the Alchemyst SDK.
 */

import type { NormalizedContent, ContentInput } from "../types";

export const normalizeContents = (
  contents: Array<ContentInput>
): NormalizedContent[] =>
  contents.map((item) => {
    if (typeof item === "string") return { content: item };
    if ((item as any).text) return { content: (item as any).text };
    return item as NormalizedContent;
  });
