import AlchemystAI from "@alchemystai/sdk";
import type { GenerateTextResult } from "ai";

/** Base text generation function */
export type GenerateTextFn = (args: {
  model: any;
  prompt: string;
}) => Promise<GenerateTextResult<any, any>>;

/** Input with memory context */
export type WithMemoryInput = {
  model: any;
  prompt: string;
  userId: string;
  sessionId: string;
};

/** Options for withAlchemyst */
export type WithAlchemystOptions = {
  apiKey: string;
  maxMemories?: number; // default 5
  similarityThreshold?: number; // default 0.7
  minimumSimilarityThreshold?: number; // default 0.5
  saveMemories?: boolean; // default true
};

/**
 * Wraps a text generation function with Alchemyst Memory.
 * - Retrieves past memories
 * - Injects them into prompt
 * - Stores user & assistant messages
 */
export function withAlchemyst(
  generateText: GenerateTextFn,
  options: WithAlchemystOptions
) {
  const client = new AlchemystAI({
    apiKey: options.apiKey,
  });
  
  const maxMemories = options.maxMemories ?? 5;
  const similarityThreshold = options.similarityThreshold ?? 0.7;
  const minimumSimilarityThreshold = options.minimumSimilarityThreshold ?? 0.5;
  const saveMemories = options.saveMemories ?? true;

  return async function generateTextWithMemory(
    args: WithMemoryInput
  ): Promise<GenerateTextResult<any, any>> {
    const { model, prompt, userId, sessionId } = args;
    //const sessionId = `${userId}::${sessionId}`;
    const timestamp = new Date().toISOString();

    /**
     * Retrieve relevant memories                      
     */
    let enhancedPrompt = prompt;
    try {
      const searchRes = await client.v1.context.search({
        query: prompt,
        similarity_threshold: similarityThreshold,
        minimum_similarity_threshold: minimumSimilarityThreshold,
        scope: "internal",
        body_metadata: {
          sessionId,
        },
      });

      const memories = (searchRes.contexts || [])
        .slice(0, maxMemories)
        .map((ctx) => ctx.content)
        .filter(Boolean);

      if (memories.length > 0) {
        const memoryBlock = memories
          .map((m, i) => `[Memory ${i + 1}]: ${m}`)
          .join("\n");
        enhancedPrompt = `${memoryBlock}\n\n---\n\nUser: ${prompt}`;
      }
    } catch (err) {
      // Retrieval must never break generation
      console.warn("Failed to retrieve memories:", err);
    }

    /**
     * Generate response                               
     */
    const result = await generateText({
      model,
      prompt: enhancedPrompt,
    });

    const generatedTimeStamp = new Date().toISOString();

    /**
     * Store user & assistant messages                 
     */
    if (saveMemories) {
      try {
        await client.v1.context.memory.add({
          sessionId,
          contents: [
            {
              content: `[user]: ${prompt}`,
              metadata: {
                messageId: `${sessionId}::${timestamp}::user`,
              },
              source: "user",
              type: "message",
              userId,
              sessionId,
            },
            {
              content: `[assistant]: ${result.text}`,
              timestamp,
              metadata: {
                messageId: `${sessionId}::${timestamp}::assistant`,
              },
              source: "assistant",
              type: "message",
              userId,
              sessionId,
            },
          ],
        });
      } catch (err) {
        console.error("Failed to write to memory:", err);
      }
    }

    return result;
  };
}