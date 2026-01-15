import { google } from '@ai-sdk/google';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { generateText } from 'ai';
import dotenv from 'dotenv';
import { withAlchemyst } from '../src/middleware';

dotenv.config({
  path: __dirname + "/.env"
});

describe('withAlchemyst middleware', () => {
  const apiKey = process.env.ALCHEMYST_API_KEY || 'test-api-key';
  console.log("API Key = ", process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  console.log("Alchemyst API Key = ", process.env.ALCHEMYST_API_KEY);
  const googleClient = google("gemini-2.5-flash");

  beforeEach(() => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || 'test-gemini-key';
  });

  it('should wrap generateText and return a result', async () => {
    console.log("Waiting for 30s to not hit rate limit")
    await new Promise(resolve => setTimeout(resolve, 30000));
    console.log("should wrap generateText and return a result");
    console.log("API Key = ", process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    console.log("Alchemyst API Key = ", process.env.ALCHEMYST_API_KEY);
    const generateTextWithMemory = withAlchemyst(generateText, {
      source: "api_sdk_test",
      apiKey,
      debug: true
    });

    const result = await generateTextWithMemory({
      model: googleClient,
      prompt: 'What is love?',
      userId: "12345",
      conversationId: "test-convo-id",
    });

    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
    return true;

  }, 60_000);

  it('should handle different prompts', async () => {
    console.log("Waiting for 30s to not hit rate limit")
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log("should handle different prompts");
    console.log("API Key = ", process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    console.log("Alchemyst API Key = ", process.env.ALCHEMYST_API_KEY); const generateTextWithMemory = withAlchemyst(generateText, {
      source: "api_sdk_test",
      apiKey,
      debug: true
    });

    const result1 = await generateTextWithMemory({
      model: googleClient,
      prompt: 'What is the capital of France?',
      userId: "12345",
      conversationId: "test-convo-1",
    });

    const result2 = await generateTextWithMemory({
      model: googleClient,
      prompt: 'What is the capital of Germany?',
      userId: "12345",
      conversationId: "test-convo-2",
    });

    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
    expect(result1.text).not.toEqual(result2.text);

    return true;
  }, 60_000);

  it('should work with different userId and conversationId', async () => {
    console.log("Waiting for 30s to not hit rate limit")
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log("should work with different userId and conversationId");
    console.log("API Key = ", process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    console.log("Alchemyst API Key = ", process.env.ALCHEMYST_API_KEY);
    const generateTextWithMemory = withAlchemyst(generateText, {
      source: "api_sdk_test",
      apiKey,
      debug: false
    });

    const result = await generateTextWithMemory({
      model: googleClient,
      prompt: 'Hello',
      userId: "user-abc",
      conversationId: "convo-xyz",
    });

    expect(result).toBeDefined();
    expect(result.text).toBeDefined();

    return true;
  }, 60_000);

  it('should handle empty prompt', async () => {
    console.log("Waiting for 30s to not hit rate limit")
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log("should handle empty prompt");
    console.log("API Key = ", process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    console.log("Alchemyst API Key = ", process.env.ALCHEMYST_API_KEY);
    const generateTextWithMemory = withAlchemyst(generateText, {
      source: "api_sdk_test",
      apiKey,
      debug: true
    });

    const result = await generateTextWithMemory({
      model: googleClient,
      prompt: '',
      userId: "12345",
      conversationId: "test-convo-empty",
    });

    expect(result).toBeDefined();

    return true;
  }, 60_000);

  it('should throw error for invalid apiKey', async () => {
    console.log("Waiting for 30s to not hit rate limit")
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log("should throw error for invalid apiKey");
    console.log("API Key = ", process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    console.log("Alchemyst API Key = ", process.env.ALCHEMYST_API_KEY);
    const generateTextWithMemory = withAlchemyst(generateText, {
      source: "api_sdk_test",
      apiKey: "invalid-api-key",
      debug: true
    });

    await expect(
      generateTextWithMemory({
        model: googleClient,
        prompt: 'Test prompt',
        userId: "12345",
        conversationId: "test-convo-invalid",
      })
    ).rejects.toThrow();
  }, 60_000);
});