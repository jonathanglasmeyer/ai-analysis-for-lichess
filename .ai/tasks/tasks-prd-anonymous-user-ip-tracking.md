# PRD Tasks: Anonymous User IP Tracking & Analysis Limiting with Supabase

**Objective:** Implement robust anonymous user IP tracking using SHA-256 hashing with a secret salt, leveraging a hosted Supabase (PostgreSQL) database. Enforce a limit of five free analyses per anonymous user on the `/analyze` endpoint.

## Relevant Files (Supabase Based)

- `server/index.ts` - Main server file for `/analyze` endpoint and Supabase client integration.
- `server/src/config.ts` (new) - For managing environment variables (`IP_HASHING_SALT`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`).
- `server/src/supabaseClient.ts` (new) - For Supabase client setup and database interaction functions.
- `server/src/utils/ip-utils.ts` (partially created) - For IP address extraction and hashing utilities.
- `.env` / `.env.example` - To manage `IP_HASHING_SALT`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
- `package.json` - To add `@supabase/supabase-js` dependency.

### Test Files (Supabase Based)
- `server/tests/integration/analyze-ip-tracking.test.ts` (new) - Integration tests for `/analyze` endpoint.
- `server/src/supabaseClient.test.ts` (new) - Unit tests for `supabaseClient.ts` (mocking Supabase).
- `server/src/utils/ip-utils.test.ts` (new) - Unit tests for `ip-utils.ts`.

## Tasks

- [ ] **1.0 Set up Supabase for Anonymous Usage Tracking**
  - [x] 1.1 Manually create a Supabase project and obtain `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
  - [x] 1.2 In Supabase SQL Editor, create the `user_usage` table (schema: `user_key TEXT PK`, `is_anonymous BOOLEAN NN`, `analysis_count INTEGER NN DEFAULT 0`, `first_analysis_timestamp TIMESTAMPTZ DEFAULT NOW() NN`, `last_analysis_timestamp TIMESTAMPTZ DEFAULT NOW() NN`).
  - [x] 1.3 Add `@supabase/supabase-js` dependency: `bun add @supabase/supabase-js`.
  - [x] 1.4 Create `server/src/config.ts` to load and export environment variables.
  - [x] 1.5 Create `server/src/supabaseClient.ts` for Supabase client initialization.
  - [x] 1.6 Update `.env.example` and local `.env` with Supabase credentials and `IP_HASHING_SALT`.
  - [x] 1.7 (Optional) Basic test in `server/src/supabaseClient.test.ts` for client connectivity.

- [x] **2.0 Implement IP Address Capturing and Secure Hashing Mechanism**
  - [x] 2.1 Complete/Verify `server/src/utils/ip-utils.ts` with `getClientIp` and `hashIp` functions.
  - [x] 2.2 Create `server/src/utils/ip-utils.test.ts` with unit tests for `getClientIp` and `hashIp`.

- [x] **3.0 Develop Core Logic for Tracking and Limiting Anonymous Analyses with Supabase**
  - [x] 3.1 Define `UserUsageRow` interface in `server/src/supabaseClient.ts`.
  - [x] 3.2 Implement `getUsage(userKey: string): Promise<UserUsageRow | null>` in `server/src/supabaseClient.ts`.
  - [x] 3.3 Implement `incrementOrInsertUsage(userKey: string, isAnonymous: boolean): Promise<{ data: UserUsageRow | null, error: any }>` in `server/src/supabaseClient.ts`.
  - [x] 3.4 Create `server/src/supabaseClient.test.ts` with unit tests for `getUsage` and `incrementOrInsertUsage` (mocking Supabase client).

- [x] **4.0 Integrate IP Tracking and Usage Logic into `/analyze` Endpoint**
  - [x] 4.1 In `server/index.ts`, add the necessary imports for IP utils, Supabase client, and config.
  - [x] 4.2 Inside the `/analyze` handler, implement the logic to get the client IP and generate the hashed `userKey`. Handle the case where the IP cannot be determined.
  - [x] 4.3 Fetch the current usage for the `userKey` using `getUsage`.
  - [x] 4.4 Add the `MAX_ANONYMOUS_ANALYSES` constant to `server/src/config.ts` and check if the user has exceeded the limit. If so, return a `429 Too Many Requests` error.
  - [x] 4.5 After a successful analysis, call `incrementOrInsertUsage` to update the user's analysis count.
  - [x] 4.6 Add robust error handling for all new database and utility calls.

- [x] **5.0 Prevent Usage Tracking for Development/Fallback IPs**
  - [x] 5.1 In `server/index.ts`, modify the logic to skip usage tracking (both fetching `getUsage` and incrementing `directUpdateUsage`) if the `effectiveIp` is the development fallback IP (`127.0.0.1`).
  - [x] 5.2 Ensure that this skipping logic is only active when `isDevelopment` is true, so that production behavior remains unchanged.

- [x] **6.0 Integration Tests**
  - [x] 6.1 Create `server/tests/integration/analyze-ip-tracking.test.ts`.
  - [x] 6.2 Add a test case to verify that a user with no prior usage can get an analysis.
  - [x] 6.3 Add a test case to verify that the usage count is incremented after a successful analysis.
  - [x] 6.4 Add a test case to verify that a user who has reached the limit is blocked with a 429 error.
  - [x] 6.5 Add a test case to verify that a request without a client IP is rejected (in production mode).