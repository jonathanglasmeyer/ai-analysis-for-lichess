# PRD: User Authentication with Supabase Auth

## 1. Introduction/Overview

This document outlines the requirements for implementing a user authentication system using Supabase Auth for the ChessGPT Chrome Extension. The primary goal is to differentiate between anonymous and registered users to manage analysis quotas, paving the way for future premium features.

## 2. Goals

-   Implement a secure user sign-up and login system.
-   Enforce a usage limit for anonymous users to encourage registration. -> was already done in prd-anonymous-user-ip-tracking
-   Provide a seamless authentication experience entirely within the extension's popup UI.
-   Establish a user data model that can support future features like purchasable analysis packs. -> would assume that this should somehow extend the existing postgres table.

## 3. User Stories

-   already done: **As an anonymous user,** I want to be able to perform more than my 5 free anonymous analyses so that I can evaluate the extension's value.
-   **As an anonymous user who has reached my limit,** I want to easily sign up for a free account so that I can continue using the service.
-   **As a registered user,** I want to log in to my account using my email or a social provider to access my analysis quota.
-   **As a logged-in user,** I want to see my logged-in status and my remaining analysis count within the popup, and I want a clear option to log out.

## 4. Functional Requirements

1.  **Anonymous User Tracking:**
    -   [Done] The system must track usage for anonymous users. This session is limited to 5 analyses.
    -   [Not yet done!] When the limit is reached, the UI must clearly prompt the user to sign up or log in to continue.

2.  **User Registration (Sign-up and/or Login, should be combined ("Continue with Google" pattern)):**
    -   The popup UI must provide sign-up options for:
        -   Email and Password.
        -   Social Logins supported by Supabase Auth (Google).
    -   Upon successful registration, the user is automatically logged in.

4.  **Usage Quota Transition:**
    -   Analyses performed as an anonymous user are considered a free trial. A new, registered user account is no longer subject to the initial 5-analysis as they can buy more. (not in scope of this ticket)

5.  **Logged-in State UI:**
    -   When a user is logged in, the popup must display their identifier (e.g., email address).
    -   The popup must display the current analysis quota for the logged-in user.
    -   A clearly visible "Logout" button must be present.
    -   Clicking "Logout" must end the user's session and return the UI to the anonymous state.

## 5. Non-Goals (Out of Scope)

-   **Payment Integration:** The implementation of purchasing additional analysis packs is not part of this feature.
-   **Custom Password Reset Flow:** A custom UI for the "Forgot Password" flow is not required. We will rely on the default mechanism provided by Supabase.
-   **Dedicated Profile Page:** All user-relevant information (email, analysis count) will be displayed directly in the popup. No separate profile page is needed.

## 6. Design & UI/UX Considerations

-   The entire authentication flow (forms, buttons, status displays) will be integrated into the existing `popup.html`.
-   The popup will manage several UI states:
    1.  **Anonymous State:** Shows usage count. If the limit is hit, it displays a login/sign-up prompt.
    2.  **Auth Form State:** Shows forms for login and registration.
    3.  **Logged-in State:** Shows user email, analysis count, and a logout button.
-   The Social Login flow will likely trigger a new browser popup for the OAuth process, which is standard and acceptable.

## 7. Technical Considerations

-   **Backend:** The server endpoints (especially for usage tracking) must be updated to handle both anonymous and authenticated JWT-based requests.
-   **Database:** The database schema needs to be adapted to link analysis usage to registered user IDs.
-   **Environment:** Supabase URL and Anon Key must be managed via environment variables. => done as we've done the postgres stuff with supabase already -> anything else to do?
-   **Client-side:** The extension's frontend logic must manage auth state, tokens, and dynamically update the UI based on the user's login status.

## 9. Open Questions

-   What is the initial analysis quota for a newly registered user? => we should take the quota they have from anonymous tracking.
