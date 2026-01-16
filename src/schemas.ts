import z from "zod";

/* ------------------------------------------------------------ Schemas ------------------------------------------------------------ */
export const toolParamSchemas = {
  add_to_context: z.object({
    documents: z.array(
      z.object({
        content: z.string().min(1).describe("Document content (required)")
      }).and(z.record(z.string(), z.any()))
    ).min(1).describe("Documents to add to context (at least 1 required)"),
    source: z.string().min(1).describe("Source identifier for the documents (required)"),
    context_type: z.enum(["resource", "conversation", "instruction"]).describe("Type of context: resource (reference docs), conversation (chat history), or instruction (guidelines)"),
    scope: z.enum(["internal", "external"]).default("internal").describe("Scope: internal (private) or external (shared)"),
    metadata: z.object({
      fileName: z.string().optional(),
      fileType: z.string().optional(),
      lastModified: z.string().optional(),
      fileSize: z.number().optional(),
      groupName: z.array(z.string()).optional(),
    }).optional().describe("Optional metadata for the context"),
  }),
  add_to_memory: z.object({
    sessionId: z.string().describe("The memory session ID that groups related memories together"),
    contents: z.array(
      z.object({
        content: z.string().min(1).describe("The content to store in memory (required)"),
        metadata: z.object({
          source: z.string().min(1).describe("Source of the content (required)"),
          messageId: z.string().min(1).describe("Message identifier (required)"),
          type: z.string().min(1).describe("Type of content (required)"),
        }).passthrough(), // Allow additional fields
      }).passthrough()
    ).min(1).describe("Array of content items to add to memory (at least 1 required)")
  }),
  delete_memory: z.object({
    memoryId: z.string().describe("The memory ID to delete"),
    user_id: z.string().optional().describe("Optional user ID filter"),
    organization_id: z.string().optional().describe("Optional organization ID filter"),
  }),
  search_context: z.object({
    query: z.string().min(1, "Query is required.").describe("Search query string"),
    similarity_threshold: z.number().min(0).max(1).default(0.7).describe("Maximum similarity threshold (0-1, default: 0.7)"),
    minimum_similarity_threshold: z.number().min(0).max(1).default(0.5).describe("Minimum similarity threshold (0-1, default: 0.5)"),
    scope: z.enum(["internal", "external"]).default("internal").describe("Search scope: internal or external"),
    body_metadata: z.record(z.string(), z.any()).optional().describe("Optional metadata filters"),
  }).refine(
    data => data.minimum_similarity_threshold <= data.similarity_threshold,
    {
      message: "minimum_similarity_threshold must be <= similarity_threshold.",
      path: ["minimum_similarity_threshold"],
    }
  ),
  delete_context: z.object({
    source: z.string().describe("Source identifier to delete"),
    user_id: z.string().optional().describe("Optional user ID filter"),
    organization_id: z.string().optional().describe("Optional organization ID filter"),
    by_doc: z.boolean().optional().default(true).describe("Delete by document (default: true)"),
    by_id: z.boolean().optional().default(false).describe("Delete by ID (default: false)"),
  })
}