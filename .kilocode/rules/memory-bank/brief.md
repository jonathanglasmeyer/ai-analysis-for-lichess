# Project Brief: AI Analysis for Lichess

## 1. Vision & Core Idea

'AI Analysis for Lichess' is an AI-powered chess analysis tool that provides human-friendly, instructive insights into chess games. It leverages Large Language Models (LLMs) to bridge the gap between powerful but cryptic chess engines and human understanding. The project is evolving from an anonymous-use tool into a platform with user accounts, laying the groundwork for future premium features.

## 2. High-Level Components

The system consists of three primary components:
-   **Chrome Extension:** The main user interface, seamlessly integrated into the Lichess analysis board.
-   **API Server:** A backend service that handles business logic, analysis requests, and user management.
-   **Supabase:** The cloud backend providing the database and authentication services.

A legacy React UI also exists but is not in active development.

## 3. Key Goals

-   **User-Friendly Analysis:** Deliver a powerful and intuitive chess analysis tool directly within a user's workflow.
-   **Encourage Registration:** Offer clear benefits (e.g., more analysis credits) for users who create an account.
-   **Robust & Scalable Backend:** Implement a backend capable of handling user growth and analysis demands.
-   **Flexible Data Model:** Establish a usage tracking system (credits and counts) that supports current needs and future monetization models.
-   **High-Quality Codebase:** Maintain well-documented, extensible, and high-quality code.

*Detailed descriptions of product features, architecture, and technology stack can be found in `product.md`, `architecture.md`, and `tech.md`.*
