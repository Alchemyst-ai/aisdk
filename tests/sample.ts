import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { withAlchemyst } from '../src';
import dotenv from 'dotenv';

dotenv.config();

// Validate environment variables
if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY not set');
  process.exit(1);
}
if (!process.env.ALCHEMYST_API_KEY) {
  console.error('❌ ALCHEMYST_API_KEY not set');
  process.exit(1);
}

const generateTextWithMemory = withAlchemyst(generateText, {
  apiKey: process.env.ALCHEMYST_API_KEY,
  source: "api_sdk_sample"
});

const { text } = await generateTextWithMemory({
  model: google("gemini-2.0-flash-exp"),
  prompt: 'What is love?',
  userId: "user-12345",
  sessionId: `session-${Date.now()}`
});

console.log(text);
