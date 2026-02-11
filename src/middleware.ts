import { AlchemystAI } from '@alchemystai/sdk';
import type { generateText as GenerateTextFn, streamText as StreamTextFn } from 'ai';

interface AlchemystOptions {
  apiKey?: string;
  baseUrl?: string;
  source?: string;
  debug?: boolean;

  // Memory retrieval settings
  withMemory?: boolean;
  similarityThreshold?: number;
  minimumSimilarityThreshold?: number;
  scope?: 'internal' | 'external';

  // Storage settings
  contextType?: 'resource' | 'conversation' | 'instruction';

  // Advanced options
  metadata?: {
    groupName?: string[];
    version?: string;
    [key: string]: unknown;
  };
}

interface ExtendedParams {
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

type GenerateTextParams = Parameters<typeof GenerateTextFn>[0];
type GenerateTextResult = Awaited<ReturnType<typeof GenerateTextFn>>;
type StreamTextParams = Parameters<typeof StreamTextFn>[0];
type StreamTextResult = Awaited<ReturnType<typeof StreamTextFn>>;

type AnyAIFunction = typeof GenerateTextFn | typeof StreamTextFn;
type AnyParams = GenerateTextParams | StreamTextParams;
type AnyResult = GenerateTextResult | StreamTextResult;

export function withAlchemyst<T extends AnyAIFunction>(
  aiFunction: T,
  options: AlchemystOptions = {}
): (params: Parameters<T>[0] & ExtendedParams) => Promise<Awaited<ReturnType<T>>> {
  const {
    apiKey = process.env.ALCHEMYST_API_KEY,
    baseUrl,
    source = `memory_conversation_${Date.now()}`,
    withMemory = true,
    similarityThreshold = 0.7,
    minimumSimilarityThreshold = 0.5,
    scope = 'internal',
    contextType = 'conversation',
    metadata: globalMetadata = {},
  } = options;

  if (typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new Error(
      'ALCHEMYST_API_KEY is required. Please provide it via options.apiKey or set the ALCHEMYST_API_KEY environment variable.'
    );
  }

  const alchemyst = new AlchemystAI({
    apiKey,
    ...(baseUrl ? { baseUrl } : {}),
  });

  const wrappedFn = async (params: AnyParams & ExtendedParams): Promise<AnyResult> => {
    const { userId, sessionId, metadata: callMetadata, ...aiFunctionParams } = params;
    const resolvedSessionId = sessionId || userId || 'default';

    let enhancedParams = { ...aiFunctionParams } as AnyParams;

    // Pre-processing: Retrieve relevant memory context
    if (withMemory && (userId || sessionId)) {
      try {
        const userMessage = Array.isArray(aiFunctionParams.messages)
          ? aiFunctionParams.messages.find((m: { role: string }) => m.role === 'user')?.content
          : aiFunctionParams.prompt;

        const query = typeof userMessage === 'string' ? userMessage : JSON.stringify(userMessage);
        if (!query || query.trim() === '') {
          throw new Error('Cannot retrieve memory context without a query.');
        }

        // Use context.search API to retrieve memory context
        const memoryResults = await alchemyst.v1.context.search({
          query,
          similarity_threshold: similarityThreshold,
          minimum_similarity_threshold: minimumSimilarityThreshold,
          scope,
        });

        // Inject retrieved context into the system prompt or messages
        if (memoryResults.contexts && memoryResults.contexts.length > 0) {
          const contextString = memoryResults.contexts
            .map((r: { content?: string }) => r.content)
            .filter(Boolean)
            .join('\n');

          const systemContext = `Relevant context from previous conversations:\n${contextString}\n\n`;

          if (Array.isArray(aiFunctionParams.messages)) {
            const messages = [...aiFunctionParams.messages] as Array<{ role: string; content: unknown }>;
            const systemIndex = messages.findIndex((m) => m.role === 'system');

            if (systemIndex >= 0) {
              const existingContent = messages[systemIndex].content;
              const existingContentStr = typeof existingContent === 'string' ? existingContent : '';
              messages[systemIndex] = {
                role: 'system',
                content: systemContext + existingContentStr,
              };
            } else {
              messages.unshift({ role: 'system', content: systemContext });
            }

            enhancedParams = { ...aiFunctionParams, messages } as AnyParams;
          } else if ('system' in aiFunctionParams && aiFunctionParams.system) {
            enhancedParams = {
              ...aiFunctionParams,
              system: systemContext + aiFunctionParams.system,
            } as AnyParams;
          } else {
            enhancedParams = {
              ...aiFunctionParams,
              system: systemContext,
            } as AnyParams;
          }
        }
      } catch {
        // Continue without memory context if retrieval fails
      }
    }

    // Call the original AI function
    const userMessageSentAt = new Date().toISOString();
    const result = await (aiFunction as (params: AnyParams) => Promise<AnyResult>)(enhancedParams);
    const aiMessageSentAt = new Date().toISOString();

    // Post-processing: Store the conversation turn in Alchemyst memory
    if (userId || sessionId) {
      const userMessage = Array.isArray(aiFunctionParams.messages)
        ? aiFunctionParams.messages.find((m: { role: string }) => m.role === 'user')?.content
        : aiFunctionParams.prompt;

      const storeMemory = async (responseText: string) => {
        const userContentRaw =
          typeof userMessage === 'string' ? userMessage : JSON.stringify(userMessage);
        const userContent = userContentRaw ?? '';
        const groupName = [
          ...(Array.isArray(globalMetadata.groupName) ? globalMetadata.groupName : ['default']),
          sessionId,
        ].filter((value): value is string => typeof value === 'string' && value.trim() !== '');
        const sharedMetadata = {
          userId,
          sessionId: resolvedSessionId,
          contextType,
          scope,
          appSource: source,
          groupName,
          ...globalMetadata,
          ...callMetadata,
        };

        const memoryPayload = {
          sessionId: resolvedSessionId,
          contents: [
            {
              content: `[user:] ${userContent}`,
              metadata: {
                role: 'user',
                messageId: crypto.randomUUID(),
                source: 'user',
                type: 'message',
                timestamp: userMessageSentAt,
                ...sharedMetadata,
              },
            },
            {
              content: `[assistant:] ${responseText}`,
              metadata: {
                messageId: crypto.randomUUID(),
                role: 'assistant',
                source: 'assistant',
                type: 'message',
                model: String(aiFunctionParams.model),
                timestamp: aiMessageSentAt,
                ...sharedMetadata,
              },
            },
          ],
        };

        // SDK typings currently only expose messageId in content.metadata, so cast at boundary.
        await alchemyst.v1.context.memory.add(memoryPayload as any);
      };

      // Handle both generateText (has .text) and streamText (need to consume stream)
      if ('text' in result) {
        const textValue = result.text;
        const responseText = typeof textValue === 'string' ? textValue : await textValue;
        if (responseText) {
          await storeMemory(responseText);
        }
      } else if ('textStream' in result) {
        // For streaming, we store after the stream is consumed
        // The caller will need to handle this, or we wrap the stream
        const streamResult = result as StreamTextResult;
        const originalStream = streamResult.textStream;
        let fullText = '';

        // Create a ReadableStream that wraps the original stream
        const wrappedStream = new ReadableStream<string>({
          async start(controller) {
            try {
              for await (const chunk of originalStream) {
                fullText += chunk;
                controller.enqueue(chunk);
              }
              // Store memory after stream completes
              if (fullText) {
                await storeMemory(fullText);
              }
              controller.close();
            } catch (err) {
              controller.error(err);
            }
          },
        });

        // Make it async iterable to match AsyncIterableStream
        const asyncIterableStream = Object.assign(wrappedStream, {
          [Symbol.asyncIterator]() {
            const reader = wrappedStream.getReader();
            return {
              async next() {
                const { done, value } = await reader.read();
                return { done, value: value as string };
              },
              async return() {
                reader.releaseLock();
                return { done: true, value: undefined };
              },
            };
          },
        });

        return { ...streamResult, textStream: asyncIterableStream } as AnyResult;
      }
    }

    return result;
  };

  return wrappedFn as (params: Parameters<T>[0] & ExtendedParams) => Promise<Awaited<ReturnType<T>>>;
}
