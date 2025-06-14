# Architecture: AI Analysis for Lichess

## 1. System Overview

The AI Analysis for Lichess is a client-server application composed of three main parts: a **Chrome Extension** (the primary user interface), a **backend API server**, and **Supabase** (for database and authentication services). A legacy React-based UI also exists but is not actively maintained.

```mermaid
graph TD
    subgraph "User's Browser"
        A[Chrome Extension] --> B{Lichess Analysis Page}
    end

    subgraph "Backend Infrastructure"
        C[API Server (Hono/Bun)] --> D[Anthropic API]
        C --> E[Supabase]
    end

    A -- API Requests --> C
    E -- Auth & DB --> A
    E -- DB --> C

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style C fill:#ccf,stroke:#333,stroke-width:2px
    style E fill:#cfc,stroke:#333,stroke-width:2px
```

## 2. Component Breakdown

### a. Chrome Extension (`/extension`)

-   **Role:** The main entry point for users. It integrates directly with the Lichess website to provide a seamless analysis experience.
-   **Key Files:**
    -   [`extension/public/manifest.json`](extension/public/manifest.json): Defines the extension's permissions, content scripts, and UI components.
    -   [`extension/src/content.ts`](extension/src/content.ts): Injects the analysis UI into the Lichess page and communicates with the background script.
    -   [`extension/src/background.ts`](extension/src/background.ts): The service worker that orchestrates communication between the popup, content script, and the backend API. It also handles the Google OAuth flow.
    -   [`extension/src/popup/index.ts`](extension/src/popup/index.ts): Manages the popup UI, including user authentication status, usage display, and the login/logout process.
    -   [`extension/src/services/api.ts`](extension/src/services/api.ts): A dedicated module for making API calls to the backend server.
    -   [`extension/src/supabaseClient.ts`](extension/src/supabaseClient.ts): Initializes and configures the Supabase client for frontend use (primarily authentication).

### b. API Server (`/server`)

-   **Role:** The backend powerhouse that handles business logic, data processing, and communication with external services.
-   **Key Files:**
    -   [`server/index.ts`](server/index.ts): The main server file. It defines all API endpoints using the Hono framework, including `/analyze`, `/usage`, and `/usage/migrate`. It also integrates middleware for authentication, rate limiting, and CORS.
    -   [`server/src/supabaseClient.ts`](server/src/supabaseClient.ts): Contains functions for server-side Supabase interactions, such as querying the `user_usage` table and executing RPCs for usage migration.
    -   [`server/auth-middleware.ts`](server/auth-middleware.ts): Implements middleware for both API key validation and JWT validation (via Supabase) to secure endpoints.
    -   [`server/src/config.ts`](server/src/config.ts): Centralizes key configuration variables like analysis limits and the IP hashing salt.
    -   `server/src/db/migrations/`: This directory contains SQL files for managing database schema changes, ensuring the database structure evolves in a controlled manner.

### c. Supabase (Cloud Backend)

-   **Role:** Provides the persistence layer and authentication services for the entire application.
-   **Components:**
    -   **PostgreSQL Database:** Stores all user and usage data. The primary table is `user_usage`, which tracks anonymous and authenticated users' analysis counts and credits.
    -   **Authentication:** Manages user sign-up, sign-in, and session management using Google as the primary OAuth provider.
    -   **Remote Procedure Calls (RPCs):** Custom SQL functions are defined to handle complex, atomic database operations securely and efficiently. A key example is `migrate_usage_from_ip_to_user`, which handles the critical logic of transferring anonymous usage data to a newly authenticated user.

### d. Legacy React UI (`/src`)

-   **Role:** A previous iteration of the user interface. It is no longer under active development.
-   **Key Files:**
    -   All files under the [`src/`](src/) directory are part of this legacy application. This code should generally be disregarded for new feature development.

## 3. Key Technical Decisions

-   **Monorepo Structure:** The project is organized as a monorepo, which simplifies dependency management and keeps the related client and server codebases in a single repository.
-   **Bun Runtime:** The server uses Bun for its performance benefits and integrated tooling (package manager, test runner).
-   **Hono Framework:** Hono was chosen for the backend due to its lightweight and fast nature, making it a good fit for the Bun runtime.
-   **Supabase for BaaS:** Leveraging Supabase for database and authentication offloads significant complexity from the self-hosted backend, allowing the development team to focus on core application logic.
-   **Filesystem Caching:** The server uses a simple but effective filesystem cache to store analysis results, reducing latency and cost for repeated analyses of the same game.
-   **Internationalization (i18n):** The extension uses `i18next` to support multiple languages, making the tool accessible to a global audience.