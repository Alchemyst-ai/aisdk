import 'dotenv/config';
import { alchemystTools } from '../src';

async function main() {
  const apiKey = process.env.ALCHEMYST_API_KEY;
  if (!apiKey) {
    console.error('Missing ALCHEMYST_API_KEY in environment.');
    process.exit(1);
  }

    console.log('Boot: starting tool demo with env:', {
    ALCHEMYST_API_KEY: apiKey ? 'set' : 'missing',
    });

    const tools = alchemystTools(apiKey, true, true);

  console.log('Invoke add_to_memory ->');
  const now = Date.now();
  const sessionId = `${now}`;
  const addMem = await (tools as any).add_to_memory.execute({
    memoryId: sessionId,
    contents: [
      { content: 'Hi, my name is pavan.', metadata: { source: sessionId, messageId: String(now), type: 'text' }},
      { content: 'pavan is from Hyderabad.', metadata: { source: sessionId, messageId: String(now + 1), type: 'text' }},
    ],
  });
  console.log('add_to_memory result:', addMem);

  console.log('Invoke add_to_context ->');
  const addCtx = await (tools as any).add_to_context.execute({
    documents: [
      { content: 'User: pavan. City: Hyderabad.' },
    ],
    source: 'tool-demo',
    context_type: 'conversation',
    scope: 'internal',
    metadata: {
      fileName: 'tool-demo.txt',
      fileType: 'text/plain',
      lastModified: new Date().toISOString(),
      fileSize: 64,
    },
  });
  console.log('add_to_context result:', addCtx);

  console.log('Cleanup delete_context ->');
  const delCtx = await (tools as any).delete_context.execute({
    source: 'tool-demo',
    by_doc: true,
    by_id: false,
  });
  console.log('delete_context result:', delCtx);

  console.log('Cleanup delete_memory ->');
  const delMem = await (tools as any).delete_memory.execute({
    memoryId: sessionId,
  });
  console.log('delete_memory result:', delMem);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
