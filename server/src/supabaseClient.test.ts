// server/src/supabaseClient.test.ts
import { describe, test, expect, mock, beforeEach, spyOn, beforeAll } from 'bun:test';
import type { UserUsageRow } from './supabaseClient';

// Mock the supabase client before importing the functions that use it
const mockSingle = mock();
const mockEq = mock(() => ({ single: mockSingle }));
const mockSelect = mock(() => ({ eq: mockEq }));
const mockFrom = mock(() => ({ select: mockSelect }));
const mockRpc = mock(() => ({ single: mockSingle }));

const mockSupabaseClient = {
  from: mockFrom,
  rpc: mockRpc,
};

mock.module('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseClient,
}));

// Dynamically import the module to ensure mocks are applied first
let getUsage: typeof import('./supabaseClient').getUsage;
let incrementOrInsertUsage: typeof import('./supabaseClient').incrementOrInsertUsage;
let supabase: typeof import('./supabaseClient').supabase;

beforeAll(async () => {
  const module = await import('./supabaseClient');
  getUsage = module.getUsage;
  incrementOrInsertUsage = module.incrementOrInsertUsage;
  supabase = module.supabase;
});

describe('Supabase Client Initialization', () => {
  test('should be initialized and exported correctly', () => {
    expect(supabase).toBeDefined();
    expect(supabase).toBe(mockSupabaseClient as any);
  });
});

describe('Database Functions', () => {
  beforeEach(() => {
    mockFrom.mockClear();
    mockSelect.mockClear();
    mockEq.mockClear();
    mockSingle.mockClear();
    mockRpc.mockClear();
  });

  describe('getUsage', () => {
    test('should return user usage data if user exists', async () => {
      const fakeUsage: UserUsageRow = {
        user_key: 'test-key',
        is_anonymous: true,
        analysis_count: 3,
        first_analysis_timestamp: new Date().toISOString(),
        last_analysis_timestamp: new Date().toISOString(),
      };
      mockSingle.mockResolvedValueOnce({ data: fakeUsage, error: null });

      const result = await getUsage('test-key');

      expect(mockFrom).toHaveBeenCalledWith('user_usage');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_key', 'test-key');
      expect(result).toEqual(fakeUsage);
    });

    test('should return null if user does not exist (PGRST116)', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'No rows found' } });

      const result = await getUsage('non-existent-key');

      expect(result).toBeNull();
    });

    test('should return null and log error on other database errors', async () => {
      const consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
      mockSingle.mockResolvedValueOnce({ data: null, error: new Error('DB Error') });

      const result = await getUsage('any-key');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching user usage:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('incrementOrInsertUsage', () => {
    test('should call the RPC function and return data on success', async () => {
      const fakeUsage: UserUsageRow = {
        user_key: 'test-key',
        is_anonymous: true,
        analysis_count: 4,
        first_analysis_timestamp: new Date().toISOString(),
        last_analysis_timestamp: new Date().toISOString(),
      };
      mockSingle.mockResolvedValueOnce({ data: fakeUsage, error: null });

      const { data, error } = await incrementOrInsertUsage('test-key', true);

      expect(mockRpc).toHaveBeenCalledWith('increment_or_insert_user_usage', {
        p_user_key: 'test-key',
        p_is_anonymous: true,
      });
      expect(data).toEqual(fakeUsage);
      expect(error).toBeNull();
    });

    test('should return error and log on RPC failure', async () => {
      const consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
      const dbError = new Error('RPC failed');
      mockSingle.mockResolvedValueOnce({ data: null, error: dbError });

      const { data, error } = await incrementOrInsertUsage('test-key', true);

      expect(data).toBeNull();
      expect(error).toEqual(dbError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error incrementing or inserting user usage:', dbError);
      consoleErrorSpy.mockRestore();
    });
  });
});

