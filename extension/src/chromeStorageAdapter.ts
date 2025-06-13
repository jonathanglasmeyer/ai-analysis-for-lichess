// extension/src/chromeStorageAdapter.ts

// Define the expected structure for a Supabase storage adapter
interface CustomStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const chromeStorageLocalAdapter: CustomStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    // console.log('[ChromeStorageAdapter] getItem:', key);
    const result = await chrome.storage.local.get(key);
    if (chrome.runtime.lastError) {
      console.error('[ChromeStorageAdapter] Error getting item:', key, chrome.runtime.lastError.message);
      return null;
    }
    // console.log('[ChromeStorageAdapter] getItem result for key', key, ':', result[key]);
    return result[key] ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    // console.log('[ChromeStorageAdapter] setItem:', key, 'value:', value);
    await chrome.storage.local.set({ [key]: value });
    if (chrome.runtime.lastError) {
      console.error('[ChromeStorageAdapter] Error setting item:', key, chrome.runtime.lastError.message);
    }
  },
  async removeItem(key: string): Promise<void> {
    // console.log('[ChromeStorageAdapter] removeItem:', key);
    await chrome.storage.local.remove(key);
    if (chrome.runtime.lastError) {
      console.error('[ChromeStorageAdapter] Error removing item:', key, chrome.runtime.lastError.message);
    }
  },
};
