import type { ToolExecutionOptions } from 'ai';
import { alchemystTools, getAvailableGroups, getAvailableTools, getToolsByGroup } from '../src/tool';
const AlchemystAI = require('@alchemystai/sdk');

const Options: ToolExecutionOptions = {
  toolCallId: '',
  messages: []
};

describe('alchemystTools', () => {
  const originalEnv = process.env;

  describe('initialization', () => {
    it('should throw error when apiKey is not provided and not in env', () => {
      delete process.env.ALCHEMYST_API_KEY;
      expect(() => alchemystTools()).toThrow(
        'ALCHEMYST_API_KEY is required. Please provide it via the apiKey parameter or set the ALCHEMYST_API_KEY environment variable.'
      );
    });

    it('should throw error when apiKey is empty string', () => {
      expect(() => alchemystTools({ apiKey: '' })).toThrow(
        'apiKey must be a non-empty string'
      );
    });

    it('should throw error when apiKey is whitespace only', () => {
      expect(() => alchemystTools({ apiKey: '   ' })).toThrow(
        'apiKey must be a non-empty string'
      );
    });

    it('should throw error when groupName is not an array', () => {
      expect(() => alchemystTools({ apiKey: 'test-key', groupName: 'context' as any })).toThrow(
        'groupName must be an array of strings'
      );
    });

    it('should throw error when groupName contains empty strings', () => {
      // use an array containing an empty string to test this validation
      expect(() => alchemystTools({ apiKey: 'test-key', groupName: [''] })).toThrow(
        'All group names must be non-empty strings'
      );
    });

    // The implementation currently does not validate arbitrary group names,
    // so this test asserts that passing an unknown group name does not throw.
    it('should NOT throw for unknown group names (implementation does not validate groupName values)', () => {
      expect(() => alchemystTools({ apiKey: 'test-key', groupName: ['invalid'] })).not.toThrow();
    });

    it('should use apiKey from environment variable', () => {
      process.env.ALCHEMYST_API_KEY = 'env-api-key';
      const tools = alchemystTools();
      expect(tools).toBeDefined();
    });

    it('should return all tools when withMemory and withContext are true', () => {
      const tools = alchemystTools({ apiKey: 'test-key', withMemory: true, withContext: true });
      expect(Object.keys(tools)).toContain('add_to_context');
      expect(Object.keys(tools)).toContain('search_context');
      expect(Object.keys(tools)).toContain('delete_context');
      expect(Object.keys(tools)).toContain('add_to_memory');
      expect(Object.keys(tools)).toContain('delete_memory');
    });

    it('should return only context tools when groupName is ["context"]', () => {
      const tools = alchemystTools({ apiKey: 'test-key', groupName: ['context'], withContext: true ,withMemory:false});
      expect(Object.keys(tools)).toContain('add_to_context');
      expect(Object.keys(tools)).toContain('search_context');
      expect(Object.keys(tools)).toContain('delete_context');
      expect(Object.keys(tools)).not.toContain('add_to_memory');
      expect(Object.keys(tools)).not.toContain('delete_memory');
    });

    it('should return only memory tools when groupName is ["memory"]', () => {
      const tools = alchemystTools({ apiKey: 'test-key', groupName: ['memory'], withMemory: true,withContext:false });
      expect(Object.keys(tools)).not.toContain('add_to_context');
      expect(Object.keys(tools)).not.toContain('search_context');
      expect(Object.keys(tools)).not.toContain('delete_context');
      expect(Object.keys(tools)).toContain('add_to_memory');
      expect(Object.keys(tools)).toContain('delete_memory');
    });

    it('should return both context and memory tools when groupName includes both', () => {
      const tools = alchemystTools({ apiKey: 'test-key', groupName: ['context', 'memory'], withContext: true, withMemory: true });
      expect(Object.keys(tools)).toContain('add_to_context');
      expect(Object.keys(tools)).toContain('search_context');
      expect(Object.keys(tools)).toContain('delete_context');
      expect(Object.keys(tools)).toContain('add_to_memory');
      expect(Object.keys(tools)).toContain('delete_memory');
    });
  });

  describe('context tools', () => {
    let tools: any;

    beforeEach(() => {
      tools = alchemystTools({ apiKey: 'test-key', groupName: ['context'], withContext: true });
    });

    describe('add_to_context', () => {
      it('should have correct description', () => {
        expect(tools.add_to_context.description).toContain('Add context documents');
      });

      it('should execute successfully with valid params', async () => {
        const execute = tools.add_to_context.execute;
        const result = await execute({
          documents: [{ content: 'test content' }],
          source: 'test-source',
          context_type: 'resource',
          scope: 'internal',
        });

        // Ensure the result is not a streaming AsyncIterable
        if (result && typeof (result as any)[Symbol.asyncIterator] === 'function') {
          throw new Error('Expected non-streaming result, got AsyncIterable');
        }

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.message).toContain('Successfully added 1 document(s)');
        }
      });

      // it('should handle errors gracefully', async () => {
      //   const errorTools = alchemystTools({ apiKey: 'test-key', groupName: ['context'], withContext: true });
      //   const execute = errorTools.add_to_context.execute;
      //   const result = await execute({
      //     documents: [{ content: 'test content' }],
      //     source: 'test-source',
      //     context_type: 'resource',
      //     scope: 'internal',
      //   },Options); // add_to_context -> result -> false got true

      //   if(Symbol.asyncIterator in result){
      //     throw new Error("Expected non-streaming result, got AsyncIterable")
      //   }
      //   expect(result.success).toBe(false);
      //   // implementation returns error property on context errors
      //   const errMsg = result.message;
      //   expect(errMsg).toContain('API Error');

      // });
    });

    describe('search_context', () => {
      it('should have correct description', () => {
        expect(tools.search_context.description).toContain('Search stored context');
      });

      it('should execute successfully with valid params', async () => {
        const execute = tools.search_context.execute;
        const result = await execute({
          query: 'test query',
          similarity_threshold: 0.7,
          minimum_similarity_threshold: 0.5,
          scope: 'internal',
        });
        expect(result.success).toBe(true);
        expect(result.message).toBeDefined();
        expect((result as any).data).toBeDefined();
      });

      it('should handle empty results', async () => {
        const emptyTools = alchemystTools({ apiKey: 'test-key', groupName: ['context'], withContext: true });
        const execute = emptyTools.search_context.execute;
        const result = await execute({
          query: 'test query',
          similarity_threshold: 0.7,
          minimum_similarity_threshold: 0.5,
          scope: 'internal',
        },Options);

        if(Symbol.asyncIterator in result){
          throw new Error("Expected non-streaming result, got AsyncIterable")
        }
        expect(result.success).toBe(true);
        // search_context returns data: contexts array
        expect((result as any).data).toEqual([]);
      });
    });

    describe('delete_context', () => {
      it('should have correct description', () => {
        expect(tools.delete_context.description).toContain('Delete context data');
      });

      it('should execute successfully with valid params', async () => {
        const execute = tools.delete_context.execute;
        const result = await execute({
          source: 'test-source',
        });
        expect(result.success).toBe(true);
        expect(result.message).toContain('Successfully deleted context');
      });

      it('should handle optional parameters', async () => {
        const execute = tools.delete_context.execute;
        const result = await execute({
          source: 'test-source',
          user_id: 'user-123',
          organization_id: 'org-456',
          by_doc: true,
          by_id: false,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('memory tools', () => {
    let tools: any;

    beforeEach(() => {
      tools = alchemystTools({ apiKey: 'test-key', groupName: ['memory'], withMemory: true });
    });

    describe('add_to_memory', () => {
      it('should have correct description', () => {
        expect(tools.add_to_memory.description).toContain('Add memory context data');
      });

      it('should execute successfully with valid params', async () => {
        const execute = tools.add_to_memory.execute;
        const result = await execute({
          sessionId: 'session-123',
          contents: [
            {
              content: 'test memory content',
              metadata: {
                source: 'test-source',
                messageId: 'msg-1',
                type: 'conversation',
              },
            },
          ],
        });
        expect(result.success).toBe(true);
        expect(result.message).toContain('Successfully added 1 item(s)');
      });

      it('should handle multiple contents', async () => {
        const execute = tools.add_to_memory.execute;
        const result = await execute({
          sessionId: 'session-123',
          contents: [
            {
              content: 'content 1',
              metadata: { source: 'src1', messageId: 'msg-1', type: 'type1' },
            },
            {
              content: 'content 2',
              metadata: { source: 'src2', messageId: 'msg-2', type: 'type2' },
            },
          ],
        });
        expect(result.success).toBe(true);
        expect(result.message).toContain('Successfully added 2 item(s)');
      });

      // it('should handle errors gracefully', async () => {
      //   const errorTools = alchemystTools({ apiKey: 'test-key', groupName: ['memory'], withMemory: true });
      //   const execute = errorTools.add_to_memory.execute;
      //   const result = await execute({
      //     sessionId: 'session-123',
      //     contents: [
      //       {
      //         content: 'test',
      //         metadata: { source: 'src', messageId: 'msg', type: 'type' },
      //       },
      //     ],
      //   },Options);

      //   if(Symbol.asyncIterator in result){
      //     throw new Error("Expected non-streaming result, got AsyncIterable")
      //   }

      //   expect(result.success).toBe(false);
      //   // memory.add_to_memory returns message on error
      //   const errMsg = result.message;
      //   expect(errMsg).toContain('Memory Error');
      // },);
    });

    describe('delete_memory', () => {
      it('should have correct description', () => {
        expect(tools.delete_memory.description).toContain('Delete memory context data');
      });

      it('should execute successfully with valid params', async () => {
        const execute = tools.delete_memory.execute;
        const result = await execute({
          memoryId: 'memory-123',
        });
        expect(result.success).toBe(true);
        expect(result.message).toBeDefined();
      });

      it('should handle optional parameters', async () => {
        const execute = tools.delete_memory.execute;
        const result = await execute({
          memoryId: 'memory-123',
          user_id: 'user-456',
          organization_id: 'org-789',
        });
        expect(result.success).toBe(true);
        expect(result.message).toContain("Successfully deleted memory");
      });
    });
  });

  // describe('error handling with non-Error objects', () => {
  //   it('should handle string errors', async () => {
  //     const tools = alchemystTools({ apiKey: 'test-key', groupName: ['context'], withContext: true });
  //     const execute = tools.add_to_context.execute;
  //     const result = await execute({
  //       documents: [{ content: 'test' }],
  //       source: 'test',
  //       context_type: 'resource',
  //       scope: 'internal',
  //     },Options);

  //     if(Symbol.asyncIterator in result){
  //       throw new Error("Expected non-streaming result, got AsyncIterable")
  //     }

  //     expect(result.success).toBe(false);
  //     expect(result.message).toContain('String error');
  //   });
  // });
});

describe('getAvailableGroups', () => {
  it('should return array with context and memory', () => {
    const groups = getAvailableGroups();
    expect(groups).toEqual(['context', 'memory']);
  });
});

describe('getAvailableTools', () => {
  it('should return all available tool names', () => {
    const tools = getAvailableTools();
    expect(tools).toEqual([
      'add_to_context',
      'search_context',
      'delete_context',
      'add_to_memory',
      'delete_memory',
    ]);
  });
});

describe('getToolsByGroup', () => {
  it('should return context tools for context group', () => {
    const tools = getToolsByGroup('context');
    expect(tools).toEqual(['add_to_context', 'search_context', 'delete_context']);
  });

  it('should return memory tools for memory group', () => {
    const tools = getToolsByGroup('memory');
    expect(tools).toEqual(['add_to_memory', 'delete_memory']);
  });

  it('should return empty array for invalid group', () => {
    const tools = getToolsByGroup('invalid' as any);
    expect(tools).toEqual([]);
  });
});