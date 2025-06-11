/**
 * Popup script for the ChessGPT Lichess Integration
 * This script runs in the popup window when the user clicks the extension icon
 */

// Import API key from environment or config
import { requestUsageData, UsageResponse } from '../services/api';
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
  const statusDivElement = document.querySelector('.status') as HTMLElement; // Get the parent status div
  const signUpBtn = document.getElementById('sign-up-btn') as HTMLButtonElement;
  const loginBtn = document.getElementById('login-btn') as HTMLButtonElement;

  if (!usageDisplayElement || !limitReachedElement || !statusDivElement || !signUpBtn || !loginBtn) {
    console.error('One or more popup elements are missing from the DOM.');
    return;
  }

  // Fetch and display usage data
  requestUsageData()
    .then((data: UsageResponse) => {
      updateUsageDisplay(data, usageDisplayElement, limitReachedElement, statusDivElement);
    })
    .catch((error: Error) => {
      console.error('Error fetching usage data:', error);
      usageDisplayElement.textContent = i18next.t('popup.errorNetwork');
      usageDisplayElement.style.color = '#c33';
    });
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
