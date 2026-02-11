import type { ToolExecutionOptions } from 'ai';
import { alchemystTools, createAlchemystTools, getAvailableGroups, getAvailableTools, getToolsByGroup } from '../src/tool';

const Options: ToolExecutionOptions = {
  toolCallId: '',
  messages: []
};

describe('alchemystTools', () => {
  const originalApiKey = process.env.ALCHEMYST_API_KEY;

  afterEach(() => {
    if (typeof originalApiKey === 'undefined') {
      delete process.env.ALCHEMYST_API_KEY;
    } else {
      process.env.ALCHEMYST_API_KEY = originalApiKey;
    }
  });

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
      expect(() => alchemystTools({ apiKey: 'test-key', groupName: [''] })).toThrow(
        'All group names must be non-empty strings'
      );
    });

    it('should throw error when groupName contains whitespace-only strings', () => {
      expect(() => alchemystTools({ apiKey: 'test-key', groupName: ['  '] })).toThrow(
        'All group names must be non-empty strings'
      );
    });

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
      expect(Object.keys(tools).sort()).toEqual([
        'add_to_context',
        'add_to_memory',
        'delete_context',
        'delete_memory',
        'search_context',
      ]);
    });

    it('should return empty toolset when withMemory and withContext are false', () => {
      const tools = alchemystTools({ apiKey: 'test-key', withMemory: false, withContext: false });
      expect(Object.keys(tools)).toHaveLength(0);
    });

    it('createAlchemystTools should match alchemystTools behavior', () => {
      const tools = createAlchemystTools({ apiKey: 'test-key', withMemory: true, withContext: false });
      expect(Object.keys(tools)).toEqual(['add_to_memory', 'delete_memory']);
    });

    it('createAlchemystTools should return empty toolset when both flags are false', () => {
      const tools = createAlchemystTools({ apiKey: 'test-key', withMemory: false, withContext: false });
      expect(Object.keys(tools)).toHaveLength(0);
    });

    it('should return only context tools by default', () => {
      const tools = alchemystTools({ apiKey: 'test-key' });
      expect(Object.keys(tools).sort()).toEqual([
        'add_to_context',
        'delete_context',
        'search_context',
      ]);
    });

    it('createAlchemystTools should return only context tools by default', () => {
      const tools = createAlchemystTools({ apiKey: 'test-key' });
      expect(Object.keys(tools).sort()).toEqual([
        'add_to_context',
        'delete_context',
        'search_context',
      ]);
    });

    it('should return only context tools when groupName is ["context"]', () => {
      const tools = alchemystTools({ apiKey: 'test-key', groupName: ['context'], withContext: true ,withMemory:false});
      expect(Object.keys(tools).sort()).toEqual([
        'add_to_context',
        'delete_context',
        'search_context',
      ]);
    });

    it('should return only memory tools when groupName is ["memory"]', () => {
      const tools = alchemystTools({ apiKey: 'test-key', groupName: ['memory'], withMemory: true,withContext:false });
      expect(Object.keys(tools).sort()).toEqual([
        'add_to_memory',
        'delete_memory',
      ]);
    });

    it('should return both context and memory tools when groupName includes both', () => {
      const tools = alchemystTools({ apiKey: 'test-key', groupName: ['context', 'memory'], withContext: true, withMemory: true });
      expect(Object.keys(tools).sort()).toEqual([
        'add_to_context',
        'add_to_memory',
        'delete_context',
        'delete_memory',
        'search_context',
      ]);
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

        if (result && typeof (result as any)[Symbol.asyncIterator] === 'function') {
          throw new Error('Expected non-streaming result, got AsyncIterable');
        }

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.message).toContain('Successfully added 1 document(s)');
        }
      });



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
        }, Options);
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
        }, Options);

        if(Symbol.asyncIterator in result){
          throw new Error("Expected non-streaming result, got AsyncIterable")
        }
        expect(result.success).toBe(true);
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

      it('should accept sessionId as memoryId alias', async () => {
        const execute = tools.delete_memory.execute;
        const result = await execute({
          sessionId: 'session-123',
        });
        expect(result.success).toBe(true);
        expect(result.message).toContain('session-123');
      });

      it('should return failure if memoryId and sessionId mismatch', async () => {
        const execute = tools.delete_memory.execute;
        const result = await execute({
          memoryId: 'memory-123',
          sessionId: 'session-123',
        });
        expect(result.success).toBe(false);
        expect(result.message).toContain('do not match');
      });

      it('should accept matching memoryId and sessionId', async () => {
        const execute = tools.delete_memory.execute;
        const result = await execute({
          memoryId: 'same-id',
          sessionId: 'same-id',
        });
        expect(result.success).toBe(true);
      });
    });
  });



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
