import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import dotenv from 'dotenv';
import { withAlchemyst } from '../src/middleware';

dotenv.config();

process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'YOUR_GEMINI_API_KEY';

const googleClient = google("gemini-2.5-flash")

const generateTextWithMemory = withAlchemyst(generateText, { source: "api_sdk_test", apiKey: "YOUR_ALCHEMYST_API_KEY", debug: true });

const { text } = await generateTextWithMemory({
  model: googleClient,
  prompt: 'What is love?',
  userId: "12345",
  conversationId: "YOUR_CONVO_ID",
});

console.log(text)