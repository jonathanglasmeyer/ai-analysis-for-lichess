/**
 * Content script for the ChessGPT Lichess Integration
 */

import { waitForElement, analyzeDOM } from './utils/dom';
import { setupI18n, observeLanguageChange, detectLichessLanguage } from './i18n';
import i18next from 'i18next';

// Initialize i18n before any translations are used
setupI18n();
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
import { extractPgn } from './utils/pgn';
import { requestCacheCheck, requestAnalysis, CacheCheckResponse } from './services/api';
import { setupTabEventListeners, activateAiTab, activatePanel } from './components/tabs';
import { createAnalyzeButton, displayAnalysisResult } from './components/analysis';

// Constants
const LICHESS_SIDEBAR_SELECTOR = '.mchat';
const LICHESS_TABS_SELECTOR = '.mchat__tabs';

// Global variables
let cachedResult: CacheCheckResponse | null = null;
let isCacheCheckInProgress = false;
let aiContentElement: HTMLElement | null = null;

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
  // Extract PGN
  const pgn = extractPgn();
  // Detect locale (prefer i18next.language, fallback to detectLichessLanguage)
  let locale = i18next.language;
  if (!locale || !['en', 'de'].includes(locale)) {
    locale = typeof detectLichessLanguage === 'function' ? detectLichessLanguage() : 'en';
  }
  if (!['en', 'de'].includes(locale)) locale = 'en';
  console.log('[TRACE] Detected/sending locale to backend:', locale);

  if (!pgn) {
    console.log('[TRACE] No PGN found, displaying error message');
    contentElement.innerHTML = `<div style="padding: 20px; color: #c33;">${i18next.t('error.pgnExtract')}</div>`;
    return;
  }

  // Exponential backoff retry logic for overloads
  const maxRetries = 4;
  const initialDelay = 2000; // 2s
  let attempt = 0;
  let delay = initialDelay;

  while (attempt <= maxRetries) {
    showLoadingStatus(contentElement);
    // Add retry info if not first try
    if (attempt > 0) {
      contentElement.innerHTML += `<div style="margin-top: 12px; color: #805AD5; font-size: 0.95em;">Service überlastet, erneuter Versuch in <span id='retry-countdown'>${delay / 1000}</span>s...</div>`;
      // Simple countdown for user feedback
      let countdown = delay / 1000;
      const countdownEl = contentElement.querySelector('#retry-countdown');
      if (countdownEl) {
        const interval = setInterval(() => {
          countdown--;
          countdownEl.textContent = countdown.toString();
          if (countdown <= 0) clearInterval(interval);
        }, 1000);
      }
      await new Promise(res => setTimeout(res, delay));
    }
    const response = await requestAnalysis(pgn, locale);
    const data = response.data;
    const hasOk = typeof data === 'object' && data !== null && 'ok' in data;
    const hasError = typeof data === 'object' && data !== null && 'error' in data;
    const hasDetails = typeof response === 'object' && response !== null && 'details' in response;
    if (response.success && (!hasOk || (data as any).ok !== false)) {
      // Analysis successful, display result
      displayAnalysisResult(response.data, contentElement);
      return;
    } else {
      // Check for Anthropic overload error in multiple possible locations
      let overloaded = false;
      let details: string | undefined = undefined;
      
      // Check in response.details
      if (hasDetails) {
        details = (response as any).details;
        overloaded = typeof details === 'string' && (details.includes('Overloaded') || details.includes('529'));
      }
      
      // Also check in error message
      let errorMsg = response.error;
      if (hasError) errorMsg = (data as any).error || errorMsg;
      if (errorMsg && typeof errorMsg === 'string' && (errorMsg.includes('Overloaded') || errorMsg.includes('529'))) {
        overloaded = true;
      }
      
      if (overloaded && attempt < maxRetries) {
        attempt++;
        delay *= 2;
        continue;
      } else if (overloaded) {
        const errorText = 'Der Analyse-Service ist aktuell überlastet. Bitte versuche es in ein paar Minuten erneut.';
        contentElement.innerHTML = `<div style="padding: 20px; color: #c33;">${errorText}</div>`;
        return;
      } else {
        if (!errorMsg) errorMsg = i18next.t('error.unknownAnalysisError');
        // Fix network error messages
        if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('network')) {
          errorMsg = 'Server nicht erreichbar. Bitte prüfe deine Internetverbindung oder versuche es später erneut.';
        }
        // Analysis failed, display error message
        contentElement.innerHTML = `<div style="padding: 20px; color: #c33;">${errorMsg}</div>`;
        return;
      }
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
      const customEvent = event as CustomEvent;
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
    async function checkCacheStatus(): Promise<CacheCheckResponse | null> {
      console.log('[TRACE] checkCacheStatus called');
      if (isCacheCheckInProgress) {
        console.log('Cache check already in progress');
        return null;
      }
      
      isCacheCheckInProgress = true;
      
      try {
        const pgn = extractPgn();
        if (!pgn) {
          console.error('No PGN found for cache check');
          isCacheCheckInProgress = false;
          return { error: i18next.t('error.noPGN') };
        }
        
        console.log('Checking cache for:', pgn.substring(0, 50) + '...');
        
        const result = await requestCacheCheck(pgn);
        isCacheCheckInProgress = false;
        cachedResult = result;
        return result;
      } catch (error) {
        console.error('Error during cache check:', error);
        isCacheCheckInProgress = false;
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
    
    // Create analyze button
    const analyzeButton = createAnalyzeButton();
    
    // Add click event for analyze button
    analyzeButton.addEventListener('click', () => {
      console.log('[TRACE] Analyze button clicked');
      startAnalysis(aiContent);
    });
    
    // Add the button to the content
    aiContent.appendChild(analyzeButton);
    
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
          errMsg = i18next.t('Server nicht erreichbar. Bitte prüfe deine Internetverbindung oder versuche es später erneut.');
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
});

// Fallback: Initialize immediately if page is already loaded
if (document.readyState === 'complete') {
  console.log('Page already loaded, initializing ChessGPT extension...');
  addAiAnalysisTab();
}
