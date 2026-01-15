import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { describe, expect, it } from "bun:test";
import dotenv from 'dotenv';
import { alchemystTools } from '../src';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '.env') });

describe('streamText', () => {
  const apiKey = process.env.ALCHEMYST_API_KEY!;
  const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

  it('should return a result for a simple prompt', async () => {
    const result = streamText({
      model: google("gemini-1.5-flash"),
      prompt: "Remember that my name is Alice",
      tools: alchemystTools({apiKey})
    });
    expect(result).toBeDefined();
  });

  it('should handle an empty prompt gracefully', async () => {
    const result = streamText({
      model: google("gemini-1.5-flash"),
      prompt: "",
      tools: alchemystTools({apiKey})
    });
    expect(result).toBeDefined();
  });

  it('should return a different result for a different prompt', async () => {
    console.log("this should return different result")
    const result1 = streamText({
      model: google("gemini-1.5-flash"),
      prompt: "What is the capital of France?",
      tools: alchemystTools({apiKey})
    });
    const result2 = streamText({
      model: google("gemini-1.5-flash"),
      prompt: "What is the capital of Germany?",
      tools: alchemystTools({apiKey})
    });
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
    expect(result1).not.toEqual(result2);
  },60000);

});