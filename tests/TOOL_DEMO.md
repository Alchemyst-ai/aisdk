# Alchemyst Tools Demo

A demonstration script showcasing the core functionality of the Alchemyst AI SDK, including memory and context management operations.

## Overview

This example demonstrates how to use the Alchemyst AI tools to:

- Store information in memory sessions
- Add documents to context
- Search the stored context.
- Clean up memory and context resources

## Prerequisites

- Node.js (v14 or higher recommended)
- An Alchemyst AI API key

## Installation

```bash
npm install dotenv
npm install @alchemystai/sdk //integrated-ai-sdk 
```

## Configuration

Create a `.env` file in your project root:

```env
ALCHEMYST_API_KEY=your_api_key_here
```


## Examples and Request Bodies

### add_to_memory

Stores content in a memory session.

Request body:

```json
{
  "memoryId": "<sessionId>",
  "contents": [
    {
      "content": "Hi, my name is pavan.",
      "metadata": {
        "source": "<sessionId>",
        "messageId": "<timestamp>",
        "type": "text"
      }
    },
    {
      "content": "pavan is from Hyderabad.",
      "metadata": {
        "source": "<sessionId>",
        "messageId": "<timestamp+1>",
        "type": "text"
      }
    }
  ]
}
```

Code:

```javascript
await tools.add_to_memory.execute({ memoryId, contents });
```

---

### add_to_context

Adds documents to the context store.

Request body:

```json
{
  "documents": [
    { "content": "User: pavan. City: Hyderabad." }
  ],
  "source": "tool-demo",
  "context_type": "conversation",
  "scope": "internal",
  "metadata": {
    "fileName": "tool-demo.txt",
    "fileType": "text/plain",
    "lastModified": "2025-01-01T00:00:00.000Z",
    "fileSize": 64,
    "groupName": ["tooling", "demo"]
  }
}
```

Code:

```javascript
await tools.add_to_context.execute({ documents, source, context_type, scope, metadata });
```

---

### search_context

Retrieves context snippets that match a semantic query.

Request body:

```json
{
  "query": "What did the customer ask about pricing for the Scale plan?",
  "similarity_threshold": 0.8,
  "minimum_similarity_threshold": 0.5,
  "scope": "internal",
  "body_metadata": {
    "fileName": "support_thread_TCK-1234.txt",
    "groupName": ["support", "pricing"],
    "lastModifiedAt": "2025-01-10T12:34:56.000Z"
  }
}
```

Code:

```javascript
await tools.search_context.execute({
  query,
  similarity_threshold,
  minimum_similarity_threshold,
  scope,
  body_metadata: {
    fileName: 'support_thread_TCK-1234.txt',
    groupName: ['support', 'pricing'],
    lastModifiedAt: '2025-01-10T12:34:56.000Z'
  }
});
```

---

### delete_context

Deletes context by source. Use when you need to remove context documents for a given source.

Request body:

```json
{
  "source": "tool-demo",
  "by_doc": true,
  "by_id": false
}
```

Code:

```javascript
await tools.delete_context.execute({ source: 'tool-demo', by_doc: true, by_id: false });
```

---

### delete_memory

Deletes a memory session by its ID.

Request body:

```json
{
  "memoryId": "<sessionId>",
  "user_id": null,
  "organization_id": null
}
```

Code:

```javascript
await tools.delete_memory.execute({ memoryId });
```

Notes:
- `delete_memory` accepts `memoryId` (and optionally `user_id`, `organization_id`).

## Troubleshooting

**Missing API Key Error**:

```
Missing ALCHEMYST_API_KEY in environment.
```

**Solution**: Ensure your `.env` file contains a valid API key.

**TypeScript Errors**:

If you encounter type errors, ensure you have the correct type definitions or adjust the tool access pattern.

## License

Refer to your project's license file.