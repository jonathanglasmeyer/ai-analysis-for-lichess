# Product: AI Analysis for Lichess

## 1. The Problem

Chess players, particularly amateurs and club players, often struggle to get meaningful insights from traditional engine analysis. While engines like Stockfish are incredibly strong, their output is often cryptic and lacks the contextual, strategic, and instructive explanations that help a human player learn and improve. It's hard to understand *why* a move is good or bad, what the underlying strategic ideas are, or what the critical turning points of a game were.

## 2. The Solution

ChessGPT is a Chrome extension that integrates directly into the Lichess analysis board, providing AI-powered, human-friendly chess analysis. It uses a Large Language Model (LLM) to analyze games and deliver insights in a clear, narrative, and instructive format.

The core goal is to bridge the gap between raw engine power and human understanding.

## 3. How It Works

1.  **Seamless Integration:** The extension injects its UI directly into the Lichess analysis page.
2.  **Analysis Request:** The user can request an AI analysis of the current game.
3.  **Backend Processing:** The request is sent to our Hono-based server. The server authenticates the user, checks their usage credits, and sends the game's PGN to an LLM (currently Anthropic's Claude) for analysis.
4.  **Instructive Feedback:** The LLM returns a structured JSON response containing:
    *   A **summary** of the game's narrative, key strategic themes, and decisive moments.
    *   A list of **critical moments** (`moments`) with specific comments explaining the significance of each move.
5.  **Display:** The extension's content script displays this analysis directly on the Lichess page, enriching the user's study.

## 4. User Experience Goals

-   **Intuitive and Non-Intrusive:** The extension should feel like a natural part of the Lichess interface, not a clunky add-on.
-   **Clear and Actionable Insights:** The analysis provided should be easy to understand for the target audience (advanced beginners to ~1400 Elo) and provide concrete learning takeaways.
-   **Frictionless Authentication:** Users should be able to easily sign up and log in with their Google account to get more analysis credits and a persistent usage history.
-   **Transparent Usage:** Users should always know their authentication status and how many analysis credits they have remaining.

## 5. Key Features

-   **Anonymous Access:** New users can try the service for a limited number of analyses without creating an account.
-   **Authenticated Access:** Users can sign in with Google to receive a larger number of analysis credits.
-   **Usage Migration:** When a user signs in for the first time, their anonymous usage history and remaining credits are automatically migrated to their new account.
-   **Multi-language Support:** The analysis can be provided in multiple languages to cater to a global user base.
-   **Caching:** To improve performance and reduce costs, analysis results for the same PGN are cached on the server.