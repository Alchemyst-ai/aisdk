import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { describe, expect, it } from "bun:test";
import dotenv from 'dotenv';
import { alchemystTools } from '../src';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '.env') });

describe('streamText', () => {
  const apiKey = process.env.ALCHEMYST_API_KEY;
  const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const modelId = process.env.GOOGLE_MODEL_ID || 'gemini-2.5-flash';
  const hasIntegrationEnv = Boolean(apiKey && geminiApiKey);
  const integrationTest = hasIntegrationEnv ? it : it.skip;
  const nonErrorFinishReasons = new Set(['stop', 'tool-calls', 'length', 'content-filter']);

  it('should throw for empty Alchemyst apiKey', () => {
    expect(() => alchemystTools({ apiKey: '   ' })).toThrow('apiKey must be a non-empty string');
  });

  it('should build context-only tools by default', () => {
    const tools = alchemystTools({ apiKey: apiKey || 'test-key' });
    expect(Object.keys(tools).sort()).toEqual([
      'add_to_context',
      'delete_context',
      'search_context',
    ]);
  });

  it('should build context+memory tools when withMemory is enabled', () => {
    const tools = alchemystTools({
      apiKey: apiKey || 'test-key',
      withContext: true,
      withMemory: true,
    });
    expect(Object.keys(tools).sort()).toEqual([
      'add_to_context',
      'add_to_memory',
      'delete_context',
      'delete_memory',
      'search_context',
    ]);
  });

  integrationTest('should complete a simple prompt with text or a tool-call finish', async () => {
    const result = streamText({
      model: google(modelId),
      prompt: "Remember that my name is Alice",
      tools: alchemystTools({ apiKey: apiKey! })
    });

    expect(result).toBeDefined();
    let output = '';
    for await (const chunk of result.textStream) {
      output += chunk;
    }
    const finishReason = String(await result.finishReason);
    expect(
      output.length > 0 || nonErrorFinishReasons.has(finishReason)
    ).toBe(true);
  }, 60000);

  integrationTest('should handle an empty prompt without crashing', async () => {
    const result = streamText({
      model: google(modelId),
      prompt: "",
      tools: alchemystTools({ apiKey: apiKey! })
    });

    expect(result).toBeDefined();
    let output = '';
    for await (const chunk of result.textStream) {
      output += chunk;
    }
    expect(typeof output).toBe('string');
  }, 60000);

  integrationTest('should produce different responses for different prompts', async () => {
    const result1 = streamText({
      model: google(modelId),
      prompt: "What is the capital of France?",
      tools: alchemystTools({ apiKey: apiKey! })
    });
    const result2 = streamText({
      model: google(modelId),
      prompt: "What is the capital of Germany?",
      tools: alchemystTools({ apiKey: apiKey! })
    });

    let text1 = '';
    for await (const chunk of result1.textStream) {
      text1 += chunk;
    }
    const finishReason1 = String(await result1.finishReason);

    let text2 = '';
    for await (const chunk of result2.textStream) {
      text2 += chunk;
    }
    const finishReason2 = String(await result2.finishReason);

    expect(text1.length > 0 || nonErrorFinishReasons.has(finishReason1)).toBe(true);
    expect(text2.length > 0 || nonErrorFinishReasons.has(finishReason2)).toBe(true);
    if (text1.length > 0 && text2.length > 0) {
      expect(text1).not.toEqual(text2);
    }
  }, 60000);

});
