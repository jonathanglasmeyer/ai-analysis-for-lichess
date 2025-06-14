# Tech Stack: AI Analysis for Lichess

This document outlines the key technologies, libraries, and tools used in the AI Analysis for Lichess.

## 1. Backend (`/server`)

-   **Runtime:** **Bun** - A fast JavaScript all-in-one toolkit. Used as the runtime, package manager, and test runner.
-   **Web Framework:** **Hono** - A small, simple, and ultrafast web framework for the edge. Chosen for its performance and compatibility with Bun.
-   **Language:** **TypeScript** - Provides type safety and improves developer experience.
-   **AI/LLM Integration:** **Anthropic API** (`@anthropic-ai/sdk`) - The official SDK for interacting with the Claude family of models, which power the core analysis feature.
-   **Database Client:** **Supabase Client** (`@supabase/supabase-js`) - Used for all server-side interactions with the Supabase database, including querying tables and executing RPCs.
-   **Chess Logic:** **chess.js** (`chess.js`) - A JavaScript library for chess move generation, validation, and PGN manipulation. It's crucial for validating PGNs and correcting ply counts.
-   **Authentication:**
    -   **JWT (JSON Web Tokens):** User authentication is handled via JWTs issued by Supabase.
    -   **API Keys:** A simple API key middleware (`auth-middleware.ts`) provides a basic layer of security for server endpoints.
-   **Development Environment:** Relies on a `.env` file for storing sensitive information like API keys and database credentials.

## 2. Frontend (Chrome Extension - `/extension`)

-   **Language:** **TypeScript** - Ensures type safety for all frontend components and logic.
-   **Platform:** **Chrome Extension Manifest V3** - The project adheres to the latest Chrome extension standards.
-   **Authentication:**
    -   **`chrome.identity.getRedirectURL()`:** The core Chrome API used to initiate the Google OAuth2 flow.
    -   **Supabase Client** (`@supabase/supabase-js`): The frontend instance of the Supabase client handles user sign-in with Google, session management, and JWT retrieval.
-   **Internationalization (i18n):** **i18next** - A popular internationalization framework used to provide multi-language support for the extension's UI.
-   **Build Tool:** **Rollup.js** - Used to bundle the extension's JavaScript and TypeScript files for production.
-   **UI:** Standard **HTML** and **CSS**. There is no complex UI framework in use within the extension itself.

## 3. Cloud Services

-   **Supabase:** The primary backend-as-a-service (BaaS) provider.
    -   **PostgreSQL Database:** Hosts the application's data, primarily the `user_usage` table.
    -   **Authentication:** Manages the entire user authentication lifecycle, with Google as the configured OAuth provider.
    -   **RPCs (Remote Procedure Calls):** Custom SQL functions are written to handle sensitive or complex database operations atomically.

## 4. Legacy UI (`/src`)

-   **Framework:** **React** - The legacy UI is a standard React application.
-   **Build Tool:** **Vite** - A modern and fast build tool for web development.
-   **Styling:** **Tailwind CSS** - A utility-first CSS framework.
-   **State Management:** **`use-chess-game` hook** - A custom hook for managing chess game state.
-   **Note:** This part of the codebase is **not actively maintained**.

## 5. Development & Tooling

-   **Monorepo:** The project is structured as a monorepo, with client (`extension`), server (`server`), and legacy UI (`src`) codebases in the same repository.
-   **Package Management:** The root `package.json` manages dependencies and scripts for the legacy UI, while the `server` and `extension` directories have their own `package.json` files for their specific dependencies.
-   **Linting:** **ESLint** is configured to ensure code quality and consistency across the project.