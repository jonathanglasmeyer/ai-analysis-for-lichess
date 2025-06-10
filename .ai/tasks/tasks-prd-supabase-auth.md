## Relevant Files

- `extension/src/popup/index.ts` - Main script for popup UI, will handle auth state and UI updates.
- `extension/src/popup/index.html` - HTML structure for the popup, will need new elements for login/signup forms and logged-in state.
- `extension/src/config.ts` - Configuration file, to store Supabase URL and Anon Key. => currently already available in server/.env
- `extension/src/background.ts` - Background script, may need to assist with Supabase client initialization or token management.
- `server/index.ts` - Backend server, needs to be updated to handle authenticated requests and link usage to user IDs.
- `server/db/schema.ts` - Database schema, will need adjustments for user table and linking usage.
- `extension/src/popup/popup.test.ts` - Unit tests for popup logic.
- `server/tests/integration/auth-endpoints.test.ts` - Integration tests for new/updated auth-related server endpoints.

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [ ] 1.0 Setup Supabase Client in Extension
  - [ ] 1.1 Add `@supabase/supabase-js` package to `extension/package.json`.
  - [ ] 1.2 Add Supabase URL and Anon Key to `extension/src/config.ts` (ensure they are loaded from environment variables during build if possible, or clearly documented for manual setup).
  - [ ] 1.3 Create a Supabase client instance, potentially in `extension/src/background.ts` or a dedicated `supabaseClient.ts` to be imported where needed.
  - [ ] 1.4 Ensure Supabase client is initialized correctly when the extension starts.

- [ ] 2.0 Implement UI for Anonymous User Limit and Login/Signup Prompt
  - [ ] 2.1 Modify `extension/src/popup/index.ts` to check if the anonymous user limit (5 analyses) is reached.
  - [ ] 2.2 If limit is reached, don't perform further analyses in the Analysis tab, instead show a message to the user telling them to signup/signin via the extension popup window.
  - [ ] 2.3 Display a clear message in `extension/public/popup.html` prompting the user to sign up or log in to continue, e.g., "You've used your 5 free analyses. Please sign up or log in to continue."
  - [ ] 2.4 Add buttons/links for "Sign Up / Log In" that will lead to the auth forms (Task 3.0).

- [ ] 3.0 Implement Registration and Login Flow (Email & Social)
  - [ ] 3.1 Design and implement HTML forms in `extension/public/popup.html` for email/password sign-up and login.
  - [ ] 3.2 Add "Continue with Google" button to `extension/public/popup.html`.
  - [ ] 3.3 In `extension/src/popup/index.ts`, implement `handleEmailPasswordSignUp` function using `supabase.auth.signUp()`.
  - [ ] 3.4 In `extension/src/popup/index.ts`, implement `handleEmailPasswordLogin` function using `supabase.auth.signInWithPassword()`.
  - [ ] 3.5 In `extension/src/popup/index.ts`, implement `handleGoogleLogin` function using `supabase.auth.signInWithOAuth({ provider: 'google' })`.
  - [ ] 3.6 Handle Supabase auth events (e.g., `onAuthStateChange`) to update UI and manage user session (store JWT, user data).
  - [ ] 3.7 Implement error handling and display appropriate messages for auth failures (e.g., incorrect password, email already taken).
  - [ ] 3.8 Upon successful login/registration, transition the UI to the logged-in state (Task 4.0).

- [ ] 4.0 Implement Logged-in State UI in Popup
  - [ ] 4.1 In `extension/public/popup.html`, create a new UI section for the logged-in state.
  - [ ] 4.2 Display the logged-in user's identifier (e.g., email) in this section.
  - [ ] 4.3 Display the user's current analysis quota (this might require a backend call or be part of the user session data).
  - [ ] 4.4 Add a "Logout" button.
  - [ ] 4.5 In `extension/src/popup/index.ts`, implement `handleLogout` function using `supabase.auth.signOut()`.
  - [ ] 4.6 Ensure that after logout, the UI reverts to the anonymous state, and any user-specific data is cleared from the popup's state.

- [ ] 5.0 Backend Adjustments for Authenticated Users
  - [ ] 5.1 Modify `server/index.ts` middleware to parse JWTs from Supabase in the `Authorization` header.
  - [ ] 5.2 Update the `/usage` endpoint (and any other relevant endpoints) to:
    - [ ] 5.2.1 Identify users based on their JWT (user ID).
    - [ ] 5.2.2 Fetch/update usage data from the database based on the authenticated user ID instead of IP address.
  - [ ] 5.3 Ensure anonymous IP-based tracking still works for unauthenticated requests.

- [ ] 6.0 Database Schema and Logic for Registered Users
  - [ ] 6.1 Review the existing `ip_analysis_counts` table in `server/db/schema.ts` (or equivalent).
  - [ ] 6.2 Add a `user_id` column (nullable, or a separate table for user-specific quotas) to associate analysis counts with registered Supabase users.
  - [ ] 6.3 Consider if a separate `users` table is needed to store additional profile information from Supabase, or if Supabase's `auth.users` table is sufficient for now.
  - [ ] 6.4 Update database queries in the backend to reflect the new schema for fetching and incrementing usage for registered users.
  - [ ] 6.5 Define the initial analysis quota for a newly registered user (as per PRD: take over the anonymous quota, then they can buy more - buying is out of scope for this PRD).

- [ ] 7.0 Testing
  - [ ] 7.1 Write unit tests for new UI components and logic in `extension/src/popup/popup.test.ts` (e.g., form submissions, UI state changes, auth function calls).
  - [ ] 7.2 Write integration tests in `server/tests/integration/auth-endpoints.test.ts` for:
    - [ ] 7.2.1 Anonymous user limit enforcement.
    - [ ] 7.2.2 Authenticated user usage tracking via JWT.
    - [ ] 7.2.3 Behavior of endpoints with invalid/expired tokens.
  - [ ] 7.3 Manually test the end-to-end sign-up, login (email & Google), and logout flows in the extension.
  - [ ] 7.4 Manually test the transition from anonymous usage to logged-in usage and quota display.
