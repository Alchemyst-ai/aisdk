import { streamText } from "ai";
import { describe, expect, it } from "bun:test";
import dotenv from 'dotenv';
import { alchemystTools } from '../src';

dotenv.config();

describe('streamText', () => {
  const apiKey = process.env.ALCHEMYST_API_KEY!; // Replace with a valid key or mock

  it('should return a result for a simple prompt', async () => {
    const result = await streamText({
      model: "gpt-5-nano",
      prompt: "Remember that my name is Alice",
      tools: alchemystTools(apiKey)
    });
    expect(result).toBeDefined();
    // Optionally, check for expected properties in result
    // expect(result.text).toContain("Alice");
  });

  it('should handle an empty prompt gracefully', async () => {
    const result = await streamText({
      model: "gpt-5-nano",
      prompt: "",
      tools: alchemystTools(apiKey)
    });
    expect(result).toBeDefined();
    // Optionally, check for error or empty response handling
  });

  it('should throw or return error for invalid model', async () => {
    expect(
      streamText({
        model: "invalid-model",
        prompt: "Test prompt",
        tools: alchemystTools(apiKey)
      })
    ).rejects.toThrow();
  });

  it('should return a different result for a different prompt', async () => {
    const result1 = await streamText({
      model: "gpt-5-nano",
      prompt: "What is the capital of France?",
      tools: alchemystTools(apiKey)
    });
    const result2 = await streamText({
      model: "gpt-5-nano",
      prompt: "What is the capital of Germany?",
      tools: alchemystTools(apiKey)
    });
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
    expect(result1).not.toEqual(result2);
  });
});