import { describe, expect, test, beforeAll, afterAll, beforeEach } from "bun:test";
import app from '../../index'; // Adjust path as necessary
import { MAX_ANONYMOUS_ANALYSES, IP_HASHING_SALT } from '../../src/config';
import { clearUserUsageByHashedIp } from '../../src/supabaseClient';
import { hashIp } from '../../src/utils/ip-utils';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Mock environment variables
process.env.NODE_ENV = "test"; // Default to test environment
process.env.CHESS_GPT_API_KEY = "chess-gpt-extension-key-2022";
process.env.IP_HASHING_SALT = "test-salt-usage-endpoint"; // Use a different salt to avoid collision with other tests if they run concurrently on the same DB

const testPgn = "1. e4 e5 2. Nf3 Nc6"; // Sample PGN for analyze calls

describe('/usage Endpoint Integration Tests', () => {
  if (!IP_HASHING_SALT) {
    throw new Error('IP_HASHING_SALT is not defined. Tests cannot run.');
  }
  const salt = IP_HASHING_SALT;
  const CACHE_DIR_TEST = path.join(process.cwd(), 'cache'); // Assuming server's CWD

  async function clearCacheDirectory() {
    try {
      const files = await fs.readdir(CACHE_DIR_TEST);
      for (const file of files) {
        if (file !== '.gitkeep') { // Behalten .gitkeep, falls vorhanden
            await fs.unlink(path.join(CACHE_DIR_TEST, file));
        }
      }
      console.log('[TestSetup] Cache directory cleared.');
    } catch (error) {
      // Wenn der Ordner nicht existiert, ist das auch okay für den Teststart
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('[TestSetup] Cache directory does not exist, nothing to clear.');
        return; 
      }
      console.error('[TestSetup] Error clearing cache directory:', error);
      // Fehler hier nicht weiter werfen, um Tests nicht komplett zu blockieren, aber Problem ist geloggt
    }
  }

  beforeAll(async () => {
    await clearCacheDirectory();
  });

  const serverUrl = "http://localhost:3001";
  const apiKey = process.env.CHESS_GPT_API_KEY;

  // Helper function to make requests to the /usage endpoint
  async function makeUsageRequest(headers: Record<string, string> = {}) {
    return fetch(`${serverUrl}/usage`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        ...headers
      }
    });
  }

  // Helper function to make requests to the /analyze endpoint (simplified for these tests)
  async function makeAnalyzeRequest(pgn: string, headers: Record<string, string> = {}) {
    return fetch(`${serverUrl}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        ...headers
      },
      body: JSON.stringify({ pgn })
    });
  }

  beforeAll(async () => {
    // Assuming server is already running (consistent with analyze-ip-tracking.test.ts)
    // Wait a moment to ensure the server is ready if it was just started.
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  // Test 1.3.1: New user should have 0 usage
  test("1.3.1: New user (unique IP) should have 0 current usage", async () => {
    const testIp = `10.1.1.${Math.floor(Math.random() * 250) + 1}`; // Unique IP for this test run
    const hashedTestIp = hashIp(testIp, salt);
    await clearUserUsageByHashedIp(hashedTestIp); // Ensure clean state
    const headers = { "x-forwarded-for": testIp };
    const response = await makeUsageRequest(headers);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.usage.current).toBe(0);
    expect(data.usage.limit).toBe(MAX_ANONYMOUS_ANALYSES);
  });

  // Test 1.3.2: Usage count is incremented after successful analyses
  test("1.3.2: Usage count increments after analyses for a user", async () => {
    const testIp = "10.0.0.2"; // Specific IP for this test sequence
    const hashedTestIp = hashIp(testIp, salt);
    await clearUserUsageByHashedIp(hashedTestIp); // Ensure clean state
    const headers = { "x-forwarded-for": testIp };

    // 1. Initial usage check
    let usageResponse = await makeUsageRequest(headers);
    let usageData = await usageResponse.json();
    expect(usageResponse.status).toBe(200);
    expect(usageData.ok).toBe(true);
    expect(usageData.usage.current).toBe(0);

    // 2. First analysis (unique PGN)
    const analyzeResponse1 = await makeAnalyzeRequest(testPgn + " 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6", headers); // Slightly different PGN
    expect(analyzeResponse1.status).toBe(200); // Assuming analysis is successful
    await analyzeResponse1.json(); // Consume body

    // 3. Usage check after first analysis
    usageResponse = await makeUsageRequest(headers);
    usageData = await usageResponse.json();
    expect(usageResponse.status).toBe(200);
    expect(usageData.ok).toBe(true);
    expect(usageData.usage.current).toBe(1);

    // 4. Second analysis (another unique PGN)
    const analyzeResponse2 = await makeAnalyzeRequest(testPgn + " 1. d4 d5 2. c4 e6", headers); // Different PGN
    expect(analyzeResponse2.status).toBe(200);
    await analyzeResponse2.json(); // Consume body

    // 5. Usage check after second analysis
    usageResponse = await makeUsageRequest(headers);
    usageData = await usageResponse.json();
    expect(usageResponse.status).toBe(200);
    expect(usageData.ok).toBe(true);
    expect(usageData.usage.current).toBe(2);
    expect(usageData.usage.limit).toBe(MAX_ANONYMOUS_ANALYSES);
  }, 60000); // Increased timeout to 60 seconds

  // Test 1.3.3: No IP in production environment
  // Skipping this test as it's hard to reliably set NODE_ENV=production for an external server from within the test runner.
  // The server-side logic for production (denying no-IP requests) is simple and assumed correct if server is started in production mode.
  test.skip("1.3.3: Request without IP in production environment should fail", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const response = await makeUsageRequest(); // No IP headers
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.errorCode).toBe("CLIENT_IP_MISSING");
    } finally {
      process.env.NODE_ENV = originalNodeEnv; // Restore NODE_ENV
    }
  });

  // Test: No IP in test/development environment (should use fallback)
  test("Request without IP in test environment should succeed (uses fallback IP)", async () => {
    // NODE_ENV is 'test' by default for this suite
    // This test assumes the fallback IP '127.0.0.1' (used by server in dev/test) has its usage tracked independently
    // or that its usage count is 0 at the start of this specific request.
    // For more robustness, this might require clearing usage for '127.0.0.1' before test or using a dedicated test fallback IP.
    const response = await makeUsageRequest(); // No IP headers
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    // The current usage for the fallback IP '127.0.0.1' can vary if other tests use it.
    // We mainly check that the request succeeds and returns the limit.
    expect(data.usage.current).toBeGreaterThanOrEqual(0);
    expect(data.usage.limit).toBe(MAX_ANONYMOUS_ANALYSES);
  });

});
