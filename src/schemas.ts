import z from "zod";

/* ------------------------------------------------------------ Schemas ------------------------------------------------------------ */
export const toolParamSchemas = {
  add_to_context: z.object({
    documents: z.array(
      z.object({
        content: z.string().min(1).describe("Document content (required)")
      }).and(z.record(z.string(), z.any()))
    ).min(1).max(100).describe("Documents to add to context (min 1, max 100)"),
    source: z.string().min(1).describe("Source identifier for the documents (required)"),
    context_type: z.enum(["resource", "conversation", "instruction"]).describe("Type of context"),
    scope: z.enum(["internal", "external"]).default("internal").describe("Scope: internal or external"),
    metadata: z.object({
      fileName: z.string().optional(),
      fileType: z.string().optional(),
      lastModified: z.string().optional(),
      fileSize: z.number().optional(),
      groupName: z.array(z.string()).optional(),
    }).optional().describe("Optional metadata"),
  }),
  add_to_memory: z.object({
    sessionId: z.string().min(1).describe("The memory session ID"),
    contents: z.array(
      z.object({
        content: z.string().min(1).describe("The content to store"),
        metadata: z.object({
          source: z.string().min(1).describe("Source of the content"),
          messageId: z.string().min(1).describe("Message identifier"),
          type: z.string().min(1).describe("Type of content"),
        }).passthrough().refine(
          data => JSON.stringify(data).length < 100000,
          { message: "Metadata too large (max 100KB)" }
        ),
      }).passthrough().refine(
        data => JSON.stringify(data).length < 1000000, // 1MB per item limit
        { message: "Content item too large (max 1MB)" }
      )
    ).min(1).max(100).describe("Array of content items (min 1, max 100)"),
  }),
  delete_memory: z.object({
    memoryId: z.string().min(1).optional().describe("The memory ID to delete"),
    sessionId: z.string().min(1).optional().describe("Optional session ID alias"),
    user_id: z.string().min(1).optional().describe("Optional user ID filter"),
    organization_id: z.string().min(1).optional().describe("Optional organization ID filter"),
  }).refine(
    data => Boolean(data.memoryId || data.sessionId),
    {
      message: "Either memoryId or sessionId is required.",
      path: ["memoryId"],
    }
  ),
  search_context: z.object({
    query: z.string().min(1, "Query is required.").describe("Search query string"),
    similarity_threshold: z.number().min(0).max(1).default(0.7).describe("Similarity threshold (0-1)"),
    minimum_similarity_threshold: z.number().min(0).max(1).default(0.5).describe("Min similarity threshold (0-1)"),
    scope: z.enum(["internal", "external"]).default("internal").describe("Search scope"),
    body_metadata: z.record(z.string(), z.any()).optional().describe("Metadata filters")
      .refine(
        data => !data || JSON.stringify(data).length < 10000,
        { message: "Metadata too large (max 10KB)" }
      ),
  }).refine(
    data => data.minimum_similarity_threshold <= data.similarity_threshold,
    {
      message: "minimum_similarity_threshold must be <= similarity_threshold.",
      path: ["minimum_similarity_threshold"],
    }
  ),
  delete_context: z.object({
    source: z.string().min(1).describe("Source identifier to delete"),
    user_id: z.string().min(1).optional().describe("Optional user ID filter"),
    organization_id: z.string().min(1).optional().describe("Optional organization ID filter"),
    by_doc: z.boolean().optional().default(true).describe("Delete by document"),
    by_id: z.boolean().optional().default(false).describe("Delete by ID"),
  })
};
