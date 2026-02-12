import { describe, expect, it } from '@jest/globals';
import { toolParamSchemas } from '../src/schemas';

describe('toolParamSchemas', () => {
  describe('add_to_context', () => {
    it('accepts valid minimal payload and applies scope default', () => {
      const result = toolParamSchemas.add_to_context.safeParse({
        documents: [{ content: 'doc-1' }],
        source: 'source-1',
        context_type: 'resource',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.scope).toBe('internal');
      }
    });

    it('accepts extra document fields via passthrough', () => {
      const result = toolParamSchemas.add_to_context.safeParse({
        documents: [{ content: 'doc-1', section: 'intro', priority: 1 }],
        source: 'source-1',
        context_type: 'conversation',
      });
      expect(result.success).toBe(true);
    });

    it('accepts metadata object when provided', () => {
      const result = toolParamSchemas.add_to_context.safeParse({
        documents: [{ content: 'doc-1' }],
        source: 'source-1',
        context_type: 'instruction',
        metadata: {
          fileName: 'guide.md',
          fileType: 'text/markdown',
          lastModified: new Date().toISOString(),
          fileSize: 1024,
          groupName: ['docs'],
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty documents array', () => {
      const result = toolParamSchemas.add_to_context.safeParse({
        documents: [],
        source: 'source-1',
        context_type: 'resource',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty document content', () => {
      const result = toolParamSchemas.add_to_context.safeParse({
        documents: [{ content: '' }],
        source: 'source-1',
        context_type: 'resource',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty source', () => {
      const result = toolParamSchemas.add_to_context.safeParse({
        documents: [{ content: 'doc-1' }],
        source: '',
        context_type: 'resource',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('add_to_memory', () => {
    it('accepts valid minimal payload', () => {
      const result = toolParamSchemas.add_to_memory.safeParse({
        sessionId: 'session-1',
        contents: [
          {
            content: 'hello',
            metadata: {
              source: 'user',
              messageId: 'msg-1',
              type: 'message',
            },
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('accepts metadata passthrough fields', () => {
      const result = toolParamSchemas.add_to_memory.safeParse({
        sessionId: 'session-1',
        contents: [
          {
            content: 'hello',
            metadata: {
              source: 'assistant',
              messageId: 'msg-2',
              type: 'message',
              timestamp: new Date().toISOString(),
              role: 'assistant',
            },
            extra: 'allowed',
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty contents array', () => {
      const result = toolParamSchemas.add_to_memory.safeParse({
        sessionId: 'session-1',
        contents: [],
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty sessionId', () => {
      const result = toolParamSchemas.add_to_memory.safeParse({
        sessionId: '',
        contents: [
          {
            content: 'hello',
            metadata: {
              source: 'user',
              messageId: 'msg-1',
              type: 'message',
            },
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('rejects metadata without source', () => {
      const result = toolParamSchemas.add_to_memory.safeParse({
        sessionId: 'session-1',
        contents: [
          {
            content: 'hello',
            metadata: {
              messageId: 'msg-1',
              type: 'message',
            },
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('rejects metadata without messageId', () => {
      const result = toolParamSchemas.add_to_memory.safeParse({
        sessionId: 'session-1',
        contents: [
          {
            content: 'hello',
            metadata: {
              source: 'user',
              type: 'message',
            },
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('rejects metadata without type', () => {
      const result = toolParamSchemas.add_to_memory.safeParse({
        sessionId: 'session-1',
        contents: [
          {
            content: 'hello',
            metadata: {
              source: 'user',
              messageId: 'msg-1',
            },
          },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('delete_memory', () => {
    it('accepts memoryId', () => {
      const result = toolParamSchemas.delete_memory.safeParse({ memoryId: 'memory-1' });
      expect(result.success).toBe(true);
    });

    it('accepts sessionId alias', () => {
      const result = toolParamSchemas.delete_memory.safeParse({ sessionId: 'session-1' });
      expect(result.success).toBe(true);
    });

    it('rejects empty ids', () => {
      const result = toolParamSchemas.delete_memory.safeParse({ memoryId: '' });
      expect(result.success).toBe(false);
    });

    it('rejects empty sessionId alias', () => {
      const result = toolParamSchemas.delete_memory.safeParse({ sessionId: '' });
      expect(result.success).toBe(false);
    });

    it('rejects payload without memoryId/sessionId', () => {
      const result = toolParamSchemas.delete_memory.safeParse({});
      expect(result.success).toBe(false);
    });

    it('accepts payload containing both memoryId and sessionId', () => {
      const result = toolParamSchemas.delete_memory.safeParse({
        memoryId: 'memory-1',
        sessionId: 'session-1',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('search_context', () => {
    it('applies threshold defaults', () => {
      const result = toolParamSchemas.search_context.safeParse({ query: 'hello' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.similarity_threshold).toBe(0.7);
        expect(result.data.minimum_similarity_threshold).toBe(0.5);
        expect(result.data.scope).toBe('internal');
      }
    });

    it('rejects when minimum threshold is greater than maximum threshold', () => {
      const result = toolParamSchemas.search_context.safeParse({
        query: 'hello',
        similarity_threshold: 0.4,
        minimum_similarity_threshold: 0.5,
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty query', () => {
      const result = toolParamSchemas.search_context.safeParse({
        query: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects similarity_threshold > 1', () => {
      const result = toolParamSchemas.search_context.safeParse({
        query: 'hello',
        similarity_threshold: 1.1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects minimum_similarity_threshold < 0', () => {
      const result = toolParamSchemas.search_context.safeParse({
        query: 'hello',
        minimum_similarity_threshold: -0.1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('delete_context', () => {
    it('applies boolean defaults', () => {
      const result = toolParamSchemas.delete_context.safeParse({ source: 'source-1' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.by_doc).toBe(true);
        expect(result.data.by_id).toBe(false);
      }
    });

    it('rejects missing source', () => {
      const result = toolParamSchemas.delete_context.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects empty source', () => {
      const result = toolParamSchemas.delete_context.safeParse({ source: '' });
      expect(result.success).toBe(false);
    });
  });
});
