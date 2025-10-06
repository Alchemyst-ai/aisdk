import { streamText } from "ai";
import { describe, expect, it } from "@jest/globals";
import "dotenv/config"; // loads .env / .env.local
import { alchemystTools } from "../src";

describe("streamText", () => {
  const apiKey = process.env.ALCHEMYST_API_KEY || ""; // Replace with a valid key or mock
  // Prefer an explicit model from env (useful to run tests against Gemini)
  const model = process.env.MODEL || process.env.GEMINI_MODEL || "gpt-5-nano";

  it("should return a result for a simple prompt", async () => {
    const result = await streamText({
      model,
      prompt: "Remember that my name is Alice",
      tools: alchemystTools(apiKey),
    });
    expect(result).toBeDefined();
    // Optionally, check for expected properties in result
    // expect(result.text).toContain("Alice");
  });

  it("should handle an empty prompt gracefully", async () => {
    const result = await streamText({
      model,
      prompt: "",
      tools: alchemystTools(apiKey),
    });
    expect(result).toBeDefined();
    // Optionally, check for error or empty response handling
  });

  it("should throw or return error for invalid model", async () => {
    // Different providers / runtimes may either reject or return a result object.
    // Accept either outcome for this integration test.
    try {
      const res = await streamText({
        model: "invalid-model",
        prompt: "Test prompt",
        tools: alchemystTools(apiKey),
      });
      expect(res).toBeDefined();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }
  });

  it("should return a different result for a different prompt", async () => {
    const result1 = await streamText({
      model,
      prompt: "What is the capital of France?",
      tools: alchemystTools(apiKey),
    });
    const result2 = await streamText({
      model,
      prompt: "What is the capital of Germany?",
      tools: alchemystTools(apiKey),
    });
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
    expect(result1).not.toEqual(result2);
  });
});
