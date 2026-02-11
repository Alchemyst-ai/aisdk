import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { generateText } from 'ai';
import dotenv from 'dotenv';
import { withAlchemyst } from '../src';

dotenv.config({
  path: __dirname + "/../.env"
});

describe('withAlchemyst middleware', () => {
  const apiKey = process.env.ALCHEMYST_API_KEY || 'test-api-key';
  const hasIntegrationEnv = Boolean(process.env.ALCHEMYST_API_KEY && process.env.OPENAI_API_KEY);
  const integrationTest = hasIntegrationEnv ? it : it.skip;
  const openaiClient = openai("gpt-4o-mini");
  const googleClient = google(process.env.GOOGLE_MODEL_ID || "gemini-2.5-flash");

  beforeEach(() => {
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';
  });

  it('should throw immediately for empty apiKey', () => {
    expect(() =>
      withAlchemyst(generateText, {
        apiKey: '   ',
      })
    ).toThrow(
      'ALCHEMYST_API_KEY is required. Please provide it via options.apiKey or set the ALCHEMYST_API_KEY environment variable.'
    );
  });

  integrationTest('should wrap generateText and return a result', async () => {
    const generateTextWithMemory = withAlchemyst(generateText, {
      source: "api_sdk_test",
      apiKey,
      debug: true
    });

    const result = await generateTextWithMemory({
      model: openaiClient,
      prompt: 'What is love?',
      userId: "12345",
      sessionId: "test-convo-id",
    });

    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
  }, 60_000);

  integrationTest('should handle different prompts', async () => {
    const generateTextWithMemory = withAlchemyst(generateText, {
      source: "api_sdk_test",
      apiKey,
      debug: true
    });

    const result1 = await generateTextWithMemory({
      model: openaiClient,
      prompt: 'What is the capital of France?',
      userId: "12345",
      sessionId: "test-convo-1",
    });

    const result2 = await generateTextWithMemory({
      model: openaiClient,
      prompt: 'What is the capital of Germany?',
      userId: "12345",
      sessionId: "test-convo-2",
    });

    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
    expect(result1.text).not.toEqual(result2.text);
  }, 60_000);

  integrationTest('should work with different userId and sessionId', async () => {
    const generateTextWithMemory = withAlchemyst(generateText, {
      source: "api_sdk_test",
      apiKey,
      debug: false
    });

    const result = await generateTextWithMemory({
      model: openaiClient,
      prompt: 'Hello',
      userId: "user-abc",
      sessionId: "convo-xyz",
    });

    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
  }, 60_000);

  integrationTest('should handle empty prompt', async () => {
    const generateTextWithMemory = withAlchemyst(generateText, {
      source: "api_sdk_test",
      apiKey,
      debug: true
    });

    const result = await generateTextWithMemory({
      model: openaiClient,
      prompt: '',
      userId: "12345",
      sessionId: "test-convo-empty",
    });

    expect(result).toBeDefined();
  }, 60_000);

  integrationTest('should not crash hard for non-empty invalid apiKey', async () => {
    const generateTextWithMemory = withAlchemyst(generateText, {
      source: "api_sdk_test",
      apiKey: "invalid-api-key",
      debug: true
    });

    const result = await generateTextWithMemory({
      model: googleClient,
      prompt: 'Test prompt',
      userId: "12345",
      sessionId: "test-convo-invalid",
    });

    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
  }, 60_000);
});
