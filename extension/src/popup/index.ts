/**
 * Popup script for the ChessGPT Lichess Integration
 * This script runs in the popup window when the user clicks the extension icon
 */

// Import API key from environment or config
import { requestUsageData, UsageResponse } from '../services/api';
import { supabase } from '../supabaseClient';
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

function updateUsageDisplay(data: UsageResponse, usageDisplayElement: HTMLElement, limitReachedElement: HTMLElement, statusDivElement: HTMLElement): void {
  if (data.developmentMode) {
    usageDisplayElement.textContent = data.message || i18next.t('popup.devModeMessage');
    usageDisplayElement.style.color = '#888';
    statusDivElement.style.display = 'block'; // Ensure status div is visible
    limitReachedElement.style.display = 'none';
    return;
  }

  if (data.ok && data.usage) {
    const { current, limit } = data.usage;
    usageDisplayElement.textContent = i18next.t('popup.usageDisplay', { current, limit });
    if (current >= limit) {
      usageDisplayElement.style.display = 'none';
      statusDivElement.style.display = 'none'; // Hide status div as well
      limitReachedElement.style.display = 'block';
    } else {
      usageDisplayElement.style.display = 'block';
      statusDivElement.style.display = 'block'; // Show status div
      limitReachedElement.style.display = 'none';
    }
  } else if (data.error) {
    usageDisplayElement.textContent = data.error;
    usageDisplayElement.style.color = '#c33';
    statusDivElement.style.display = 'block'; // Ensure status div is visible for errors
  } else {
    usageDisplayElement.textContent = i18next.t('popup.errorServer', { status: 'N/A' });
    usageDisplayElement.style.color = '#c33';
    statusDivElement.style.display = 'block'; // Ensure status div is visible for errors
  }
}

/**
 * Initializes the popup's UI, sets up translations, and fetches usage data.
 * This function is called after the correct language has been determined.
 * @param language The language code (e.g., 'en', 'de') to use for translations.
 */
function initializePopup(language: string) {
  setupI18n(language);
  localizeHtml();

  const usageDisplayElement = document.getElementById('usage-display') as HTMLElement;
  const limitReachedElement = document.getElementById('limit-reached') as HTMLElement;
  const statusDivElement = document.querySelector('.status') as HTMLElement;
  const googleLoginBtn = document.getElementById('google-login-btn') as HTMLButtonElement;
  const loginErrorElement = document.getElementById('login-error') as HTMLElement;

  // It's assumed that limitReachedElement contains the entire login prompt UI (text, button, error message)
  // and statusDivElement contains the usage display.

  if (!usageDisplayElement || !limitReachedElement || !statusDivElement || !googleLoginBtn || !loginErrorElement) {
    console.error('One or more popup elements are missing from the DOM.');
    return;
  }

  const showLoginError = (messageKey: string) => {
    loginErrorElement.textContent = i18next.t(messageKey);
    loginErrorElement.style.display = 'block';
  };

  const clearLoginError = () => {
    loginErrorElement.textContent = '';
    loginErrorElement.style.display = 'none';
  };

  // Supabase Auth State Change Listener
  if (supabase) {
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session);
      // Clear any previous login errors on auth state change
      clearLoginError(); 

      if (event === 'SIGNED_IN') {
        console.log('User signed in:', session?.user?.id);
        limitReachedElement.style.display = 'none'; // Hide login prompt section
        statusDivElement.style.display = 'block';    // Ensure usage/status is visible
        usageDisplayElement.style.display = 'block'; // Ensure usage text is visible
        // Fetch usage data for authenticated user
        requestUsageData()
          .then(data => updateUsageDisplay(data, usageDisplayElement, limitReachedElement, statusDivElement))
          .catch(error => {
            console.error('Error fetching usage data after sign in:', error);
            usageDisplayElement.textContent = i18next.t('popup.errorNetwork');
            usageDisplayElement.style.color = '#c33';
          });
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        // updateUsageDisplay will handle showing the login prompt (via limitReachedElement) 
        // or anonymous usage based on the fetched data.
        // Ensure statusDiv (which contains usageDisplay) is potentially visible before updateUsageDisplay hides it if limit is reached.
        statusDivElement.style.display = 'block'; 
        limitReachedElement.style.display = 'block'; // Make sure the container for login is visible
        // Fetch usage data for anonymous user
        requestUsageData()
          .then(data => updateUsageDisplay(data, usageDisplayElement, limitReachedElement, statusDivElement))
          .catch(error => {
            console.error('Error fetching usage data after sign out:', error);
            usageDisplayElement.textContent = i18next.t('popup.errorNetwork');
            usageDisplayElement.style.color = '#c33';
          });
      } else if (event === 'INITIAL_SESSION') {
        console.log('Initial session:', session);
        if (session) {
            limitReachedElement.style.display = 'none'; 
            statusDivElement.style.display = 'block';
            usageDisplayElement.style.display = 'block';
        } else {
            // No initial session, updateUsageDisplay will handle showing login prompt if needed
            statusDivElement.style.display = 'block'; 
            limitReachedElement.style.display = 'block';
        }
        // Fetch initial usage data, updateUsageDisplay will correctly show login or usage
        requestUsageData()
          .then(data => updateUsageDisplay(data, usageDisplayElement, limitReachedElement, statusDivElement))
          .catch(error => {
            console.error('Error fetching initial usage data:', error);
            usageDisplayElement.textContent = i18next.t('popup.errorNetwork');
            usageDisplayElement.style.color = '#c33';
          });
      }
    });
  } else {
    console.error('Supabase client not initialized, cannot listen for auth changes.');
  }

  googleLoginBtn.addEventListener('click', async () => {
    clearLoginError();

    if (!supabase) {
      console.error('Supabase client is not initialized.');
      showLoginError('popup.error.supabaseInit');
      return;
    }

    try {
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

      console.log('Launching web auth flow...');

      const resultUrl = await new Promise<string>((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
          { url: authUrl.href, interactive: true },
          (responseUrl?: string) => {
            if (chrome.runtime.lastError) {
              return reject(chrome.runtime.lastError);
            }
            if (!responseUrl) {
              return reject(new Error('Authentication flow was cancelled by the user.'));
            }
            resolve(responseUrl);
          }
        );
      });

      const url = new URL(resultUrl);
      const params = new URLSearchParams(url.hash.substring(1));
      const idToken = params.get('id_token');

      if (!idToken) {
        throw new Error('ID token not found in authentication response.');
      }

      console.log('ID Token extracted, signing in with Supabase...');

      // 4. Send the raw nonce to Supabase.
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
        nonce: rawNonce,
      });

      if (error) {
        throw error;
      }

      console.log('Successfully signed in with Supabase:', data.user);
    } catch (error: unknown) {
      console.error('An error occurred during Google sign-in:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('cancelled by the user')) {
        showLoginError('popup.error.userCancelled');
      } else {
        showLoginError('popup.error.googleAuth');
      }
    }
  });

  // Initial fetch and display of usage data is now primarily handled by INITIAL_SESSION event in onAuthStateChange.
  // This block serves as a fallback if Supabase client isn't initialized,
  // ensuring usage data is still fetched.
  if (!supabase) {
    console.log('Supabase not initialized, fetching usage data with fallback logic.');
    requestUsageData()
      .then((data: UsageResponse) => {
        updateUsageDisplay(data, usageDisplayElement, limitReachedElement, statusDivElement);
      })
      .catch((error: Error) => {
        console.error('Error fetching usage data (Supabase not init fallback):', error);
        usageDisplayElement.textContent = i18next.t('popup.errorNetwork');
        usageDisplayElement.style.color = '#c33';
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
