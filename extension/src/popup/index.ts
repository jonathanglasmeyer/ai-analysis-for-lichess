/**
 * Popup script for the ChessGPT Lichess Integration
 * This script runs in the popup window when the user clicks the extension icon
 */

// Import API key from environment or config
import { requestUsageData, UsageResponse } from '../services/api';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';
import i18next from 'i18next';

import { setupI18n } from '../i18n';

/**
 * Applies translations to all elements with a data-i18n attribute.
 */
function localizeHtml(): void {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      // Use innerHTML to allow for simple formatting tags in the future
      element.innerHTML = i18next.t(key);
    }
  });
}

function updateUsageDisplay(data: UsageResponse, usageDisplayElement: HTMLElement, limitReachedElement: HTMLElement, statusDivElement: HTMLElement, googleLoginBtnElement: HTMLButtonElement, user: User | null): void {
  console.log('[DEBUG] updateUsageDisplay called with data:', data, 'User:', user);

  // Hide all potentially conflicting sections initially, then show the correct one.
  statusDivElement.style.display = 'none';       // Contains usageDisplayElement
  limitReachedElement.style.display = 'none';    // Contains "Bitte melde dich an" text
  googleLoginBtnElement.style.display = 'none';  // "Weiter mit Google" button

  if (data.developmentMode) {
    usageDisplayElement.textContent = data.message || i18next.t('popup.devModeMessage');
    usageDisplayElement.style.color = '#888';
    statusDivElement.style.display = 'block'; // Ensure status div is visible
    limitReachedElement.style.display = 'none';
    console.log('[DEBUG] updateUsageDisplay: Development mode detected.');
    return;
  }

  if (user) { // User is logged in
    // Show usage info for logged-in user. Login prompt elements (limitReachedElement, googleLoginBtnElement) remain hidden from initial clear.
    statusDivElement.style.display = 'block';
    usageDisplayElement.style.display = 'block';
    if (data.ok && data.usage) {
      const { current, limit } = data.usage;
      usageDisplayElement.textContent = i18next.t('popup.usageDisplay', { current, limit });
      usageDisplayElement.style.color = (current >= limit) ? '#c33' : '';
      console.log(`[DEBUG] updateUsageDisplay: Logged-in user. Usage: ${current}/${limit}`);
    } else if (data.error) {
      usageDisplayElement.textContent = data.error;
      usageDisplayElement.style.color = '#c33';
      console.log('[DEBUG] updateUsageDisplay: Logged-in user. Error loading usage:', data.error);
    } else { // Fallback
      usageDisplayElement.textContent = i18next.t('popup.errorServer', { status: 'N/A' });
      usageDisplayElement.style.color = '#c33';
      console.log('[DEBUG] updateUsageDisplay: Logged-in user. Fallback usage display.');
    }
  } else { // No user / Anonymous
    // Decide whether to show login prompt or usage info for anonymous.
    // loggedInStateDiv is already hidden by updateUIForAuthState.
    if (data.ok && data.usage && data.usage.current < data.usage.limit) {
      // Anonymous, within limit: show usage info. Login prompt elements remain hidden.
      statusDivElement.style.display = 'block';
      usageDisplayElement.style.display = 'block';
      const { current, limit } = data.usage;
      usageDisplayElement.textContent = i18next.t('popup.usageDisplay', { current, limit });
      usageDisplayElement.style.color = '';
      console.log(`[DEBUG] updateUsageDisplay: Anonymous user within limit. Usage: ${current}/${limit}`);
    } else {
      // Anonymous, limit reached OR error OR fallback: show login prompt.
      limitReachedElement.style.display = 'block';
      googleLoginBtnElement.style.display = 'block';
      // statusDiv (usage info) remains hidden.
      if (data.error) {
        console.log('[DEBUG] updateUsageDisplay: Anonymous user. Error loading usage. Showing login prompt. Error:', data.error);
      } else if (data.ok && data.usage) { // Implies limit reached
        console.log('[DEBUG] updateUsageDisplay: Anonymous user. Limit reached. Showing login prompt.');
      } else { // Fallback
        console.log('[DEBUG] updateUsageDisplay: Anonymous user. Fallback. Showing login prompt.');
      }
    }
  }
}

/**
 * Initializes the popup's UI, sets up translations, and fetches usage data.
 * This function is called after the correct language has been determined.
 * @param language The language code (e.g., 'en', 'de') to use for translations.
 */
async function initializePopup(language: string) {
  setupI18n(language);
  localizeHtml();

  const statusDiv = document.querySelector('.status') as HTMLElement;
  const googleLoginBtn = document.getElementById('google-login-btn') as HTMLButtonElement;
  const loginError = document.getElementById('login-error') as HTMLParagraphElement;
  const usageDisplay = document.getElementById('usage-display') as HTMLSpanElement;
  const limitReachedDiv = document.getElementById('limit-reached') as HTMLDivElement;
  const loggedInStateDiv = document.getElementById('logged-in-state') as HTMLDivElement;
  const userIdentifierSpan = document.getElementById('user-identifier') as HTMLSpanElement;
  const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement;

  // Function to show login error messages
  const showLoginError = (messageKey: string) => {
    loginError.textContent = i18next.t(messageKey);
    loginError.style.display = 'block';
  };

  const clearLoginError = () => {
    loginError.textContent = '';
    loginError.style.display = 'none';
  };

  if (supabase) {
    // Initial check for user session and update UI
    console.log('[POPUP_INIT] Attempting to get user from Supabase (should check localStorage due to persistSession:true)...');
    const { data: { user: initialUser }, error: getUserError } = await supabase.auth.getUser();
    
    if (getUserError) {
      console.error('[POPUP_INIT] Error calling supabase.auth.getUser():', getUserError);
    }
    console.log('[POPUP_INIT] supabase.auth.getUser() completed. User:', initialUser ? initialUser.id : 'null');
    
    updateUIForAuthState(initialUser);
    if (initialUser) {
      console.log('[POPUP_INIT] User found by getUser(). UI updated for logged-in state. User ID:', initialUser.id, 'Email:', initialUser.email);
    } else {
      console.log('[POPUP_INIT] No active user session found by getUser(). UI updated for logged-out state.');
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[POPUP_AUTH_CHANGE] Event: ${event}, Session User: ${session?.user?.id || 'null'}`);
      const currentUser = session?.user ?? null;
      console.log(`[POPUP_AUTH_CHANGE] Current user determined: ${currentUser ? currentUser.id : 'null'}. Calling updateUIForAuthState.`);
      updateUIForAuthState(currentUser); // Sets basic UI visibility (logged-in section vs. not)
      if (currentUser) {
        console.log(`[POPUP_AUTH_CHANGE] UI should now reflect LOGGED-IN state for user ${currentUser.id}.`);
      } else {
        console.log(`[POPUP_AUTH_CHANGE] UI should now reflect LOGGED-OUT state.`);
      }

      console.log('[DEBUG] onAuthStateChange: Calling requestUsageData for event:', event, 'with user:', currentUser);
      requestUsageData()
        .then(usageData => {
          console.log('[DEBUG] onAuthStateChange: requestUsageData resolved:', usageData);
          // updateUsageDisplay will show/hide the limitReachedDiv (login prompt)
          // or the usageDisplay based on the fetched data.
          updateUsageDisplay(usageData, usageDisplay, limitReachedDiv, statusDiv, googleLoginBtn, currentUser);

          if (currentUser) {
            // If a user is confirmed (either from INITIAL_SESSION with a user, or SIGNED_IN),
            // clear any pre-existing login errors.
            clearLoginError();
          }
        })
        .catch(error => {
          console.error('[DEBUG] onAuthStateChange: requestUsageData failed:', error);
          console.error('Error fetching usage data on auth state change:', error);
          // Display a generic error in the usage display area
          usageDisplay.textContent = i18next.t('popup.errorNetwork');
          usageDisplay.style.color = '#c33';
          statusDiv.style.display = 'block'; // Ensure status div (containing usageDisplay) is visible

          if (!currentUser) {
            // If there's no user and fetching usage data failed,
            // ensure the login prompt is visible so the user can try to log in.
            limitReachedDiv.style.display = 'block';
            usageDisplay.style.display = 'none'; // Hide the "Nutzung wird geladen" or error text
            statusDiv.style.display = 'none'; // Hide the status div as well
            console.log('[DEBUG] onAuthStateChange (catch): No current user and request failed. Showing login prompt.');
          } else {
            // If there IS a user and data fetch failed, just show error in usageDisplay.
            // LoggedInStateDiv is already visible from updateUIForAuthState(currentUser).
            // limitReachedDiv should remain hidden.
            limitReachedDiv.style.display = 'none';
          }
        });

      if (event === 'INITIAL_SESSION') {
        console.log('[DEBUG] onAuthStateChange: INITIAL_SESSION event. User from session:', currentUser);
        if (currentUser) {
          console.log('[DEBUG] onAuthStateChange: INITIAL_SESSION with user. UI should update to logged-in.');
        } else {
          console.log('[DEBUG] onAuthStateChange: INITIAL_SESSION with NO user. UI should update to logged-out.');
        }
      }
      if (event === 'SIGNED_IN') {
        console.log('[DEBUG] onAuthStateChange: SIGNED_IN event. User from session:', currentUser);
      }
      if (event === 'SIGNED_OUT') {
        console.log('[DEBUG] onAuthStateChange: SIGNED_OUT event. User should be null:', currentUser);
      }
    }); // End of onAuthStateChange listener's main logic block, before the .then().catch() for requestUsageData
    // The requestUsageData().then().catch() block was already correctly placed after updateUIForAuthState(currentUser)
    // and within the onAuthStateChange handler. The duplicated error logging inside INITIAL_SESSION was the main issue there.

    // Add event listener for logout button once
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (supabase) {
          try {
            const { error } = await supabase.auth.signOut();
            if (error) {
              console.error('Error logging out:', error);
              // Optionally, show an error message to the user
              // showLoginError('popup.error.logoutFailed'); 
            }
            // UI update is handled by onAuthStateChange
          } catch (e) {
            console.error('Exception during logout:', e);
            // showLoginError('popup.error.logoutFailed');
          }
        }
      });
    }
  } // End of if (supabase) block

  googleLoginBtn.addEventListener('click', async () => {
    clearLoginError();

    if (!supabase) {
      console.error('Supabase client is not initialized.');
      showLoginError('popup.error.supabaseInit');
      return;
    }

      // 1. Generate a raw nonce.
      const rawNonce = Math.random().toString(36).substring(2);

      // 2. Hash the raw nonce using SHA-256.
      async function sha256(message: string): Promise<string> {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
      const hashedNonce = await sha256(rawNonce);

      const manifest = chrome.runtime.getManifest();
      const clientId = manifest.oauth2?.client_id;
      if (!clientId) {
        throw new Error('OAuth2 Client ID is not defined in the manifest.');
      }

      const redirectUri = chrome.identity.getRedirectURL();

      // 3. Send the hashed nonce to Google.
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('response_type', 'id_token');
      authUrl.searchParams.append('scope', 'openid email profile');
      authUrl.searchParams.append('nonce', hashedNonce);

      console.log('Popup: Auth URL created:', authUrl.href);
      console.log('Popup: Raw nonce:', rawNonce);
      console.log('Popup: Hashed nonce:', hashedNonce);
      console.log('Popup: Sending GOOGLE_LOGIN message to background script...');

      // Disable button to prevent multiple clicks while processing
      googleLoginBtn.disabled = true;

      chrome.runtime.sendMessage(
        { 
          type: 'GOOGLE_LOGIN',
          authUrl: authUrl.toString(),
          rawNonce: rawNonce,
          lang: i18next.language, // Pass current language to background script 
        }, 
        (response) => {
          // Re-enable button once response is received or error occurs
          googleLoginBtn.disabled = false;

          if (chrome.runtime.lastError) {
            console.error('Popup: Error communicating with background script:', chrome.runtime.lastError.message);
            showLoginError('popup.error.internal');
            return;
          }

          if (response && response.success && response.user) {
            console.log('Popup: Login successful via background script. User:', response.user);
            // UI update will primarily be handled by onAuthStateChange due to shared localStorage session.
            // For this specific popup instance, we can proactively update.
            updateUIForAuthState(response.user); 
            requestUsageData().then(usageResponse => {
              updateUsageDisplay(usageResponse, usageDisplay, limitReachedDiv, statusDiv, googleLoginBtn, response.user);
              clearLoginError();
            }).catch(err => {
              console.error("Failed to fetch usage data after login (via background):", err);
              // Display a generic error or the specific one from usage data call
              updateUsageDisplay({ ok: false, error: i18next.t('popup.error.fetchUsage') }, usageDisplay, limitReachedDiv, statusDiv, googleLoginBtn, response.user);
            });
          } else {
            console.error('Popup: Login failed via background script:', response?.error);
            showLoginError(response?.errorKey || 'popup.error.googleAuth');
          }
        }
      );
  });

  // Function to update UI based on authentication state
  function updateUIForAuthState(user: User | null) {
  console.log('[DEBUG] updateUIForAuthState called with user:', user);
    if (user) {
      // User is logged in
      loggedInStateDiv.style.display = 'block';
      if (user.email) {
        userIdentifierSpan.textContent = user.email;
      } else {
        userIdentifierSpan.textContent = i18next.t('popup.error.noEmail'); // Fallback if email is not available
      }
    } else {
      loggedInStateDiv.style.display = 'none';
      // Visibility of login prompt elements (limitReachedDiv, googleLoginBtn)
      // is now fully handled by updateUsageDisplay.
    }
  }

  // Initial fetch and display of usage data is now primarily handled by INITIAL_SESSION event in onAuthStateChange.
  // This block serves as a fallback if Supabase client isn't initialized,
  // ensuring usage data is still fetched.
  if (!supabase) {
    console.log('Supabase not initialized, fetching usage data with fallback logic.');
    // In this block, supabase is not available, so we cannot fetch initialUserForFallback.
    // We directly call requestUsageData and pass null for the user to updateUsageDisplay.
    requestUsageData()
      .then((data: UsageResponse) => {
        updateUsageDisplay(data, usageDisplay, limitReachedDiv, statusDiv, googleLoginBtn, null); // Pass null as user for this case
      })
      .catch((error: Error) => {
        console.error('Error fetching usage data (Supabase not init fallback):', error);
        usageDisplay.textContent = i18next.t('popup.errorNetwork');
        usageDisplay.style.color = '#c33';
      });
  }
  // Note: The main initializePopup function's closing brace is here.
  // If Supabase is initialized, the INITIAL_SESSION event from onAuthStateChange
  // is expected to trigger the first data load.
}

document.addEventListener('DOMContentLoaded', () => {
  // Query for the active tab to send a message to its content script
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const activeTab = tabs[0];
    if (activeTab && activeTab.id) {
      // Request the language from the content script
      chrome.tabs.sendMessage(
        activeTab.id,
        { type: 'GET_LANGUAGE' },
        response => {
          // Check for errors, like the content script not being injected
          if (chrome.runtime.lastError) {
            console.warn(
              `Could not get language from content script: ${chrome.runtime.lastError.message}. Defaulting to English. This is expected on non-Lichess pages.`
            );
            initializePopup('en');
          } else if (response && response.language) {
            console.log(`[Popup] Received language: ${response.language}. Initializing...`);
            initializePopup(response.language);
          } else {
            console.warn('Received no or invalid response from content script. Defaulting to English.');
            initializePopup('en');
          }
        }
      );
    } else {
      console.error('Could not find active tab. Defaulting to English.');
      initializePopup('en');
    }
  });
});
