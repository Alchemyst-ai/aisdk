import { alchemystTools, getAvailableGroups, getAvailableTools, getToolsByGroup } from '../src/tool';
const AlchemystAI = require('@alchemystai/sdk');

// Mock the AlchemystAI SDK
jest.mock('@alchemystai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    v1: {
      context: {
        add: jest.fn().mockResolvedValue({}),
        search: jest.fn().mockResolvedValue({ contexts: [{ id: '1', content: 'test' }] }),
        delete: jest.fn().mockResolvedValue({}),
        memory: {
          add: jest.fn().mockResolvedValue({}),
          delete: jest.fn().mockResolvedValue({}),
        },
      },
    },
  }));
});

// Helper to extract execute function from tool
// const getExecute = (tool: any) => tool.execute ?? tool;

describe('alchemystTools', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
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
      expect(() => alchemystTools({ apiKey: 'test-key', groupName: ['context'] })).toThrow(
        'All group names must be non-empty strings'
      );
    });

    it('should throw error when groupName contains invalid group names', () => {
      expect(() => alchemystTools({ apiKey: 'test-key', groupName: ['invalid'] })).toThrow(
        'Invalid group names: invalid. Valid groups are: context, memory'
      );
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
      const tools = alchemystTools({ apiKey: 'test-key', groupName: ['context'] });
      expect(Object.keys(tools)).toContain('add_to_context');
      expect(Object.keys(tools)).toContain('search_context');
      expect(Object.keys(tools)).toContain('delete_context');
      expect(Object.keys(tools)).not.toContain('add_to_memory');
      expect(Object.keys(tools)).not.toContain('delete_memory');
    });

    it('should return only memory tools when groupName is ["memory"]', () => {
      const tools = alchemystTools({ apiKey: 'test-key', groupName: ['memory'] });
      expect(Object.keys(tools)).not.toContain('add_to_context');
      expect(Object.keys(tools)).not.toContain('search_context');
      expect(Object.keys(tools)).not.toContain('delete_context');
      expect(Object.keys(tools)).toContain('add_to_memory');
      expect(Object.keys(tools)).toContain('delete_memory');
    });

    it('should return both context and memory tools when groupName includes both', () => {
      const tools = alchemystTools({ apiKey: 'test-key', groupName: ['context', 'memory'] });
      expect(Object.keys(tools)).toContain('add_to_context');
      expect(Object.keys(tools)).toContain('search_context');
      expect(Object.keys(tools)).toContain('delete_context');
      expect(Object.keys(tools)).toContain('add_to_memory');
      expect(Object.keys(tools)).toContain('delete_memory');
    });
  });

  describe('context tools', () => {
    let tools = alchemystTools({ apiKey: 'test-key', groupName: ['context'], withContext: true });

    beforeEach(() => {
      // tools = alchemystTools({ apiKey: 'test-key', groupName: ['context'], withContext: true });
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
        expect(result.success).toBe(true);
        expect(result.message).toContain('Successfully added 1 document(s)');
      });

      it('should handle errors gracefully', async () => {
        AlchemystAI.mockImplementationOnce(() => ({
          v1: {
            context: {
              add: jest.fn().mockRejectedValue(new Error('API Error')),
              search: jest.fn(),
              delete: jest.fn(),
              memory: { add: jest.fn(), delete: jest.fn() },
            },
          },
        }));

        const errorTools = alchemystTools({ apiKey: 'test-key', groupName: ['context'], withContext: true });
        const execute = errorTools.add_to_context.execute;
        const result = await execute({
          documents: [{ content: 'test content' }],
          source: 'test-source',
          context_type: 'resource',
          scope: 'internal',
        });
        expect(result.success).toBe(false);
        expect(result.message).toBe('API Error');
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
        });
        expect(result.success).toBe(true);
        expect(result.message).toBeDefined();
      });

      it('should handle empty results', async () => {
        AlchemystAI.mockImplementationOnce(() => ({
          v1: {
            context: {
              add: jest.fn(),
              search: jest.fn().mockResolvedValue({ contexts: [] }),
              delete: jest.fn(),
              memory: { add: jest.fn(), delete: jest.fn() },
            },
          },
        }));

        const emptyTools = alchemystTools({ apiKey: 'test-key', groupName: ['context'] });
        const execute = emptyTools.search_context.execute;
        const result = await execute({
          query: 'test query',
          similarity_threshold: 0.7,
          minimum_similarity_threshold: 0.5,
          scope: 'internal',
        });
        expect(result.success).toBe(true);
        expect(result.message).toEqual([]);
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
    let tools = alchemystTools({ apiKey: 'test-key', groupName: ['memory'], withMemory: true });;

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

      it('should handle errors gracefully', async () => {
        AlchemystAI.mockImplementationOnce(() => ({
          v1: {
            context: {
              add: jest.fn(),
              search: jest.fn(),
              delete: jest.fn(),
              memory: {
                add: jest.fn().mockRejectedValue(new Error('Memory Error')),
                delete: jest.fn(),
              },
            },
          },
        }));

        const errorTools = alchemystTools({ apiKey: 'test-key', groupName: ['memory'], withMemory: true });
        const execute = errorTools.add_to_memory.execute;
        const result = await execute({
          sessionId: 'session-123',
          contents: [
            {
              content: 'test',
              metadata: { source: 'src', messageId: 'msg', type: 'type' },
            },
          ],
        });
        expect(result.success).toBe(false);
        expect(result.message).toBe('Memory Error');
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
    });
  });

  describe('error handling with non-Error objects', () => {
    it('should handle string errors', async () => {
      AlchemystAI.mockImplementationOnce(() => ({
        v1: {
          context: {
            add: jest.fn().mockRejectedValue('String error'),
            search: jest.fn(),
            delete: jest.fn(),
            memory: { add: jest.fn(), delete: jest.fn() },
          },
        },
      }));

      const tools = alchemystTools({ apiKey: 'test-key', groupName: ['context'], withContext: true });
      const execute = tools.add_to_context.execute;
      const result = await execute({
        documents: [{ content: 'test' }],
        source: 'test',
        context_type: 'resource',
        scope: 'internal',
      });
      expect(result.success).toBe(false);
      expect(result.message).toBe('String error');
    });
  });
});

// ...existing code for getAvailableGroups, getAvailableTools, getToolsByGroup tests...

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