/**
 * Content script for the ChessGPT Lichess Integration
 */

import { waitForElement, analyzeDOM } from './utils/dom';
import { setupI18n, observeLanguageChange, detectLichessLanguage, resolveLanguageForPrompt } from './i18n';
import i18next from 'i18next';
import { addTestButton } from './utils/test-launcher';
// SERVER_URL and CHESS_GPT_API_KEY are used by fetchUsageData in api.ts
// import { SERVER_URL, CHESS_GPT_API_KEY } from '../config'; // No longer needed directly here

// Initialize i18n before any translations are used
setupI18n(detectLichessLanguage());
observeLanguageChange();
console.log("CONTENT SCRIPT LOADED");


// Dynamically update UI text when language changes
i18next.on('languageChanged', () => {
  // Update AI Analysis tab title
  const aiTab = document.querySelector('.mchat__tab.ai-analysis span');
  if (aiTab) {
    aiTab.textContent = i18next.t('analysis.title');
  }
  // Update Analyze button text
  const analyzeButton = document.querySelector('.ai-analysis-panel button');
  if (analyzeButton) {
    analyzeButton.textContent = i18next.t('analysis.create');
  }
});

// Interface for the usage data response (copied from popup/index.ts)
import { extractPgn } from './utils/pgn';
import { requestAnalysis, requestUsageData, requestCacheCheck, CacheCheckResponse } from './services/api';
import { setupTabEventListeners, activateAiTab } from './components/tabs'; // Removed activatePanel
import { displayAnalysisResult } from './components/analysis'; // Removed createAnalyzeButton

// Constants
const LICHESS_TABS_SELECTOR = '.mchat__tabs';

interface ChessGptCustomEventDetail {
  container?: HTMLElement;
}

/**
 * Startet die Analyse einer Schachpartie
 */
function showLoadingStatus(contentElement: HTMLElement) {
  contentElement.innerHTML = `<div style="padding: 20px; text-align: center;">
    <div style="margin-bottom: 15px; color: #666;">
      <p>${i18next.t('status.creating')}</p>
      <p style="font-size: 0.9em; margin-top: 8px;">${i18next.t('status.working')}</p>
    </div>
    <div class="spinner" style="display: inline-block; width: 40px; height: 40px; border: 3px solid rgba(128, 90, 213, 0.3); border-radius: 50%; border-top-color: #805AD5; animation: spin 1s ease-in-out infinite;"></div>
  </div>
  <style>
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>`;
}

async function startAnalysis(contentElement: HTMLElement): Promise<void> {
  showLoadingStatus(contentElement);

  try {
    console.log('[ContentScript] Querying for usage data.');
    const usageData = await requestUsageData();

    if (usageData.ok) {
      if (usageData.developmentMode) {
        console.log('[ContentScript] Development mode is active. Usage check skipped.');
      } else if (usageData.usage && usageData.usage.current >= usageData.usage.limit) {
        console.warn('[ContentScript] Analysis blocked: Usage limit reached.');
        contentElement.innerHTML = `<div style="padding: 20px; color: #c33;">${i18next.t('popup.limitReachedMessage')}</div>`;
        return;
      }
    } else {
      // Handle cases where the request itself fails
      console.error('[ContentScript] Failed to fetch usage data:', usageData.error);
      contentElement.innerHTML = `<div style="padding: 20px; color: #c33;">${usageData.error || i18next.t('error.serverConnection')}</div>`;
      return;
    }
  } catch (error) {
    console.error('[ContentScript] Exception during usage check:', error);
    contentElement.innerHTML = `<div style="padding: 20px; color: #c33;">${i18next.t('error.serverConnection')}</div>`;
    return;
  }

  // If usage check passes, proceed with analysis
  console.log('[ContentScript] Usage check passed. Proceeding with analysis.');

  const pgn = extractPgn();
  if (!pgn) {
    contentElement.innerHTML = `<div style="padding: 20px; color: #c33;">${i18next.t('error.pgnExtract')}</div>`;
    return;
  }

  const detectedLocale = i18next.language || detectLichessLanguage() || 'en';
  const locale = resolveLanguageForPrompt(detectedLocale);
  console.log('[ANALYSIS] Detected locale:', detectedLocale, '| Using locale:', locale);

  // Exponential backoff retry logic
  const maxRetries = 4;
  const initialDelay = 2000; // 2s
  let attempt = 0;

  while (attempt <= maxRetries) {
    if (attempt > 0) {
      const delay = initialDelay * Math.pow(2, attempt - 1);
      const countdownElId = `retry-countdown-${Date.now()}`;
      contentElement.innerHTML += `<div style="margin-top: 12px; color: #805AD5; font-size: 0.95em;">${i18next.t('error.serviceOverloaded')} <span id='${countdownElId}'>${delay / 1000}</span>s...</div>`;
      
      let countdown = delay / 1000;
      const countdownEl = contentElement.querySelector(`#${countdownElId}`);
      if (countdownEl) {
        const interval = setInterval(() => {
          countdown--;
          if (countdownEl) {
            countdownEl.textContent = countdown.toString();
          }
          if (countdown <= 0) clearInterval(interval);
        }, 1000);
      }
      await new Promise(res => setTimeout(res, delay));
    } else {
        showLoadingStatus(contentElement);
    }

    const response = await requestAnalysis(pgn, locale);
    const data = response.data;

    if (response.success && data && data.ok) {
      console.log('[ContentScript] Analysis successful.');
      displayAnalysisResult(data, contentElement);
      return; // Success, exit loop
    }
    
    const errorMsg = data?.error || response.error || '';

    if (errorMsg.includes('OVERLOADED') || errorMsg.includes('503')) {
      attempt++;
      console.warn(`[ContentScript] Analysis failed with overload, attempt ${attempt}/${maxRetries}.`);
      if (attempt > maxRetries) {
        contentElement.innerHTML = `<div style="padding: 20px; color: #c33;">${i18next.t('error.analysisFailedAfterRetries')}</div>`;
        return;
      }
    } else {
      // Handle other errors (non-retriable)
      let displayError = errorMsg || i18next.t('error.unknownAnalysisError');
      if (displayError.includes('Failed to fetch') || displayError.includes('NetworkError')) {
        displayError = i18next.t('error.serverUnreachable');
      }
      console.error('[ContentScript] Analysis failed with non-retriable error:', displayError);
      contentElement.innerHTML = `<div style="padding: 20px; color: #c33;">${displayError}</div>`;
      return; // Exit loop on non-retriable error
    }
  }
}

/**
 * Adds the AI Analysis tab to the Lichess sidebar
 */
async function addAiAnalysisTab(): Promise<void> {
  try {
    console.log('ChessGPT Lichess Integration loaded', window.location.href);
    
    // Run DOM analysis immediately and after a delay (for dynamically loaded content)
    analyzeDOM();
    setTimeout(analyzeDOM, 2000);
    
    // Event-Listener für den 'NEUE ANALYSE ERSTELLEN'-Button
    document.addEventListener('chess-gpt-start-analysis', (event: Event) => {
      const customEvent = event as CustomEvent<ChessGptCustomEventDetail>; // Cast to CustomEvent with specific detail type
      const container = customEvent.detail?.container;
      
      if (container) {
        console.log('Neuen Analyse-Request erhalten');
        startAnalysis(container);
      }
    });
    
    console.log('Initializing AI Analysis tab...');
    
    // Wait for the tab container to appear
    const tabsContainer = await waitForElement(LICHESS_TABS_SELECTOR);
    console.log('Found tabs container:', tabsContainer);
    
    // Create the new tab based on the existing tab structure
    const aiTab = document.createElement('div');
    aiTab.className = 'mchat__tab ai-analysis'; // Match Lichess tab class
    aiTab.setAttribute('role', 'tab');
    aiTab.setAttribute('data-tab', 'ai-analysis');
    
    // Add span with text like the other tabs
    const tabSpan = document.createElement('span');
    tabSpan.textContent = i18next.t('analysis.title');
    tabSpan.classList.add('ai-analysis-tab-label');
    aiTab.appendChild(tabSpan);

    // Inject AI styles up-front so the tab is styled immediately
    import('./components/analysis').then(mod => mod.injectAICommentStyles());
    
    // Insert tab as third tab (before phone icon)
    const phoneTab = tabsContainer.querySelector('.palantir-slot');
    if (phoneTab) {
      tabsContainer.insertBefore(aiTab, phoneTab);
      console.log('Added AI Analysis tab before phone icon');
    } else {
      tabsContainer.appendChild(aiTab);
      console.log('Added AI Analysis tab to the end (phone icon not found)');
    }
    
    // Find the parent mchat element to add our content panel
    const mchatElement = tabsContainer.closest('.mchat');
    if (!mchatElement) {
      throw new Error('Could not find parent mchat element');
    }
    
    // Identify all existing tabs for the event listener
    const allTabs = tabsContainer.querySelectorAll('.mchat__tab');
    console.log('Found existing tabs:', allTabs.length);
    
    // Create the tab content panel (initially hidden)
    const aiContent = document.createElement('div');
    aiContent.className = 'mchat__content ai-analysis-panel'; // Match Lichess content class
    aiContent.setAttribute('data-tab', 'ai-analysis');
    aiContent.style.display = 'none'; // Initially hidden
    
    // Add the content panel to mchat
    mchatElement.appendChild(aiContent);
    console.log('Added AI Analysis content panel');
    
    // Helper function to check cache status
        async function checkCacheStatus(): Promise<CacheCheckResponse> {
      const pgn = extractPgn();
      if (!pgn) {
        return { ok: false, error: i18next.t('error.pgnExtract') };
      }
      
      // Detect locale (prefer i18next.language, fallback to detectLichessLanguage)
      let detectedLocale = i18next.language;
      if (!detectedLocale) {
        detectedLocale = typeof detectLichessLanguage === 'function' ? detectLichessLanguage() : 'en';
      }
      
      // Resolve locale to a supported language
      const locale = resolveLanguageForPrompt(detectedLocale);
      console.log('[LOCALE] Cache check with locale:', locale);
      
      try {
        console.log('Checking cache for:', pgn.substring(0, 50) + '...');
        
        const result = await requestCacheCheck(pgn, locale);
        return result;
      } catch (error) {
        console.error('Error during cache check:', error);
        let errMsg = String(error);
        if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('network')) {
          errMsg = i18next.t('error.serverUnreachable');
        } else {
          errMsg = i18next.t('error.cacheCheck') + ' ' + errMsg;
        }
        return { error: errMsg };
      }
    }
    
    // Check cache in the background
    setTimeout(() => {
      checkCacheStatus().then(result => {
        console.log('Cache pre-loaded:', result ? 'SUCCESS' : 'FAILED');
      });
    }, 1000);
    
    // Wir brauchen keinen Analyse-Button mehr, da die Analyse automatisch gestartet wird
    // wenn der Tab angeklickt wird
    
    // Set up tab event listeners
    setupTabEventListeners(mchatElement, allTabs, aiTab as HTMLElement, aiContent);
    
    // Add click event for AI tab
    aiTab.addEventListener('click', async () => {
      console.log('[TRACE] AI tab clicked');
      // Activate AI tab
      activateAiTab(mchatElement, aiTab as HTMLElement, aiContent);
      
      // Check cache status
      const cacheResult = await checkCacheStatus();
      console.log('[TRACE] cacheResult:', cacheResult);
      
      if (cacheResult && cacheResult.ok && cacheResult.inCache) {
        console.log('[TRACE] Cache hit, displaying cached result');
        // Cache-Ergebnis anzeigen
        console.log('Using cache result found');
        displayAnalysisResult(cacheResult, aiContent);
      } else if (cacheResult && cacheResult.ok === true && cacheResult.inCache === false) {
        console.log('[TRACE] Cache miss, auto-starting analysis');
        console.log('[DEBUG] Calling startAnalysis with aiContent:', aiContent);
        // Not in cache but cache check succeeded - automatically start analysis
        startAnalysis(aiContent);
      } else if (cacheResult && cacheResult.error) {
        console.log('[TRACE] Cache check error, showing error message');
        let errMsg = cacheResult.error;
        if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('network')) {
          errMsg = i18next.t('error.serverUnreachable');
        }
        aiContent.innerHTML = `<div style="padding: 20px; color: #c33;">${errMsg}</div>`;
      } else {
        console.log('[TRACE] Unexpected situation, showing fallback error');
        // Fallback für unerwartete Situationen
        aiContent.innerHTML = `<div style="padding: 20px; color: #c33;">${i18next.t('error.unexpected')}</div>`;
      }
    });
    
    console.log('AI Analysis tab integration complete');
  } catch (error) {
    console.error('Failed to add AI Analysis tab:', error);
  }
}

// Initialize when the page is fully loaded
window.addEventListener('load', () => {
  addAiAnalysisTab();
  addTestButton(); // Füge Test-Button hinzu
});

// Fallback: Initialize immediately if page is already loaded
if (document.readyState === 'complete') {
  console.log('Page already loaded, initializing ChessGPT extension...');
  addAiAnalysisTab();
}



// Listen for requests from the popup to get the page's language
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Check if the message is from our extension
  if (sender.id === chrome.runtime.id && request.type === 'GET_LANGUAGE') {
    const lang = detectLichessLanguage();
    console.log(`[ContentScript] Popup requested language. Responding with: ${lang}`);
    sendResponse({ language: lang });
    return true; // Keep the message channel open for the asynchronous response
  }
});
