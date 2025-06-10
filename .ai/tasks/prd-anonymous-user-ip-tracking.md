# PRD: Anonymous User IP Tracking and Usage Limiting

## 1. Introduction/Overview

This document outlines the requirements for implementing a system to track anonymous users by their IP address for requests made to the `/analyze` endpoint. The primary goal is to limit the number of free analyses an anonymous user can perform, encouraging them to sign up for an account to access further services, including paid features. This feature aims to control resource consumption and create a pathway for monetization.

## 2. Goals

*   Implement IP-based tracking for anonymous users making requests to the `/analyze` endpoint.
*   Securely hash user IP addresses using SHA-256 and a secret salt before storage to protect user privacy.
*   Limit anonymous users to five (5) free analyses. An "analysis" is defined as a request that results in a call to an external service (e.g., Anthropic) and is not served from a cache.
*   After an anonymous user exhausts their free analyses, deny further analysis requests and prompt them to log in or sign up.
*   Establish a foundational mechanism for differentiating usage tiers (anonymous free vs. registered users) to support future monetization strategies.

## 3. User Stories

*   **As an anonymous user,** I want to be able to get up to 5 free chess analyses so that I can try out the service and evaluate its usefulness before committing to creating an account.
*   **As an anonymous user,** after my 5th free analysis (non-cache hit), I want to be clearly informed that I have reached my limit and need to sign up or log in to continue using the analysis feature, so that I understand the next steps.
*   **As a system administrator,** I want anonymous user IP addresses to be securely hashed (SHA-256 with a secret salt) and stored, so that we can track usage for limiting purposes without storing raw Personally Identifiable Information (PII) and adhere to privacy best practices.
*   **As a system administrator,** I want to ensure that only actual analyses (i.e., non-cache hits that trigger a call to an external AI service) are counted towards an anonymous user's free quota, so that the limit is fair and accurately reflects resource consumption.
*   **As a product owner,** I want to limit free usage for anonymous users on the `/analyze` endpoint so that we can reduce operational costs associated with external API calls and encourage user registration, which is a prerequisite for future paid services.

## 4. Functional Requirements

FR1.  The system **must** capture the IP address of all incoming requests to the `/analyze` endpoint.
FR2.  For requests identified as originating from an anonymous user, the system **must** hash the captured IP address using SHA-256 in conjunction with a securely stored and configurable secret salt.
FR3.  The system **must** store usage data in a persistent SQLite database table (e.g., `user_usage`), using the hashed IP address as a key for anonymous users.
FR4.  The system **must** maintain a count of non-cached analyses performed by each unique hashed IP address. This count should only be incremented if the `/analyze` request is not served from the cache and results in an actual call to the backend AI service.
FR5.  If an anonymous user (identified by their hashed IP) has performed fewer than 5 non-cached analyses, the `/analyze` request **must** be processed. If the request is not a cache hit, their analysis count **must** be incremented.
FR6.  If an anonymous user has performed 5 or more non-cached analyses, any subsequent requests to the `/analyze` endpoint from that hashed IP **must** be denied.
FR7.  When an anonymous user's request is denied due to exceeding the usage limit (as per FR6), the system **must** return an appropriate HTTP status code (e.g., 429 Too Many Requests) and a clear error message in the response body. The message should indicate that the free limit has been reached and suggest logging in or signing up.
FR8.  Requests to the `/analyze` endpoint that are successfully served from the cache **must not** increment the analysis count for the anonymous user.

## 5. Non-Goals (Out of Scope)

*   Implementation of the full user authentication (login/signup) system. (This PRD focuses solely on tracking and limiting anonymous users; authentication is a separate feature).
*   Implementation of the payment processing or credit purchasing system.
*   Advanced bot detection or sophisticated anti-abuse mechanisms beyond the IP-based counting described.
*   Specific UI/UX changes for login/signup prompts within the client application. (This PRD addresses backend logic; client-side changes will be handled separately).
*   Development of a detailed user analytics dashboard or reporting interface. (Basic data storage for counts is in scope, but not its advanced presentation).

## 6. Design Considerations (Optional)

*   The error response for users exceeding their limit should be standardized and provide a clear call to action (e.g., "You have reached your free analysis limit. Please sign up or log in to continue.").
*   Consider the implications for users on shared IP addresses (e.g., corporate networks, public Wi-Fi, VPNs). While the initial implementation will be based on direct IP, this is a known limitation that might need to be addressed with more sophisticated methods in the future.

## 7. Technical Considerations (Optional)

*   The secret salt used for IP hashing **must** be treated as sensitive information, stored securely (e.g., as an environment variable or in a secrets management system), and be configurable.
*   A Supabase (PostgreSQL) cloud-hosted database will be used. A table named `user_usage` (or `public.user_usage`) will be required in Supabase. This table is designed to be forward-compatible for tracking authenticated users in the future.
    *   **Schema for `user_usage` (PostgreSQL syntax)**: 
        *   `user_key TEXT PRIMARY KEY`: For anonymous users, this will be the `hashed_ip`. For future authenticated users, this will be their `user_id`.
        *   `is_anonymous BOOLEAN NOT NULL`: `true` if `user_key` is a hashed IP, `false` if it's a `user_id`.
        *   `analysis_count INTEGER NOT NULL DEFAULT 0`: The number of analyses performed.
        *   `first_analysis_timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL`: Timestamp of the first analysis.
        *   `last_analysis_timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL`: Timestamp of the most recent analysis.
*   The `@supabase/supabase-js` package will need to be added as a project dependency to interact with the Supabase instance.
*   The Supabase table schema will be managed via the Supabase dashboard or SQL scripts. The server will require initialization of the Supabase client with appropriate credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
*   The logic for checking the cache, retrieving/updating the analysis count, and enforcing the limit **must** be integrated into the existing request handling flow for the `/analyze` endpoint.
*   The hashing mechanism should be implemented in a way that is consistent and produces the same hash for the same IP and salt.

## 8. Success Metrics

*   The system successfully records hashed IP addresses and their corresponding non-cached analysis counts in the designated data store.
*   Anonymous users are correctly prevented from making more than 5 non-cached analysis requests.
*   Cache hits do not incorrectly increment the usage count for anonymous users.
*   A measurable decrease in the number of analyses performed by anonymous users beyond the 5-analysis threshold, once the feature is live.
*   No significant increase in user-reported errors or legitimate users being unfairly blocked (excluding those who legitimately hit their defined limit).

## 9. Open Questions

*   What is the definitive strategy for the secure generation, storage, rotation, and management of the secret salt for IP hashing?
*   How should the system handle potential IP spoofing attempts, if this is identified as a significant concern at this stage?
*   What is the desired behavior if a user clears browser cookies/local storage but continues to use the same IP address? (The current IP-based proposal implies they would still be recognized as the same anonymous entity based on their IP hash).
*   Are there any specific legal or privacy review processes that need to be completed internally before implementing IP hashing and usage tracking, even with hashing?
*   How will this integrate with users who eventually log in? Will their anonymous usage count towards any limits on their registered account, or does it reset? (Assumption for now: it resets, or is separate).
