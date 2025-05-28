/**
 * Content script for the ChessGPT Lichess Integration
 */

import { waitForElement, analyzeDOM } from './utils/dom';
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
async function startAnalysis(contentElement: HTMLElement): Promise<void> {
  // Extract PGN
  const pgn = extractPgn();
  
  if (pgn) {
    // Show loading status
    contentElement.innerHTML = '<div style="padding: 20px; color: #666;">Analysiere Partie...</div>';
    
    // Send message to background script
    const response = await requestAnalysis(pgn);
    
    if (response.success) {
      // Show result
      displayAnalysisResult(response.data, contentElement);
    } else {
      // Show error
      contentElement.innerHTML = `<div style="padding: 20px; color: #c33;">
        Fehler bei der Analyse: ${response?.error || 'Unbekannter Fehler'}
      </div>`;
    }
  } else {
    contentElement.innerHTML = '<div style="padding: 20px; color: #c33;">PGN konnte nicht extrahiert werden</div>';
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
    tabSpan.textContent = 'AI Analyse';
    tabSpan.style.color = '#805AD5'; // Purple color, same as in move highlights
    aiTab.appendChild(tabSpan);
    
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
          return { error: 'Konnte keine PGN finden' };
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
          errMsg = 'Server nicht erreichbar. Bitte prüfe deine Internetverbindung oder versuche es später erneut.';
        } else {
          errMsg = `Fehler bei der Cache-Prüfung: ${errMsg}`;
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
    
    // Benutze die globale startAnalysis-Funktion

// Add click event for analyze button
    analyzeButton.addEventListener('click', () => {
      startAnalysis(aiContent);
    });
    
    // Add the button to the content
    aiContent.appendChild(analyzeButton);
    
    // Set up tab event listeners
    setupTabEventListeners(mchatElement, allTabs, aiTab as HTMLElement, aiContent);
    
    // Add click event for AI tab
    aiTab.addEventListener('click', async () => {
      // Activate AI tab
      activateAiTab(mchatElement, aiTab as HTMLElement, aiContent);
      
      // Show loading indicator with explanation
      aiContent.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <div style="margin-bottom: 15px; color: #666;">
            <p>Prüfe Cache...</p>
            <p style="font-size: 0.9em; margin-top: 8px;">Suche nach bestehenden Analysen für diese Partie.</p>
          </div>
          <div class="spinner" style="display: inline-block; width: 40px; height: 40px; border: 3px solid rgba(128, 90, 213, 0.3); border-radius: 50%; border-top-color: #805AD5; animation: spin 1s ease-in-out infinite;"></div>
        </div>
        <style>
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      `;
      
      // Zuerst im Cache prüfen, um mehrfache API-Calls zu vermeiden
      console.log('Checking cache from tab click...');
      const cacheResult = await checkCacheStatus();
      
      // Wenn der Cache keine Ergebnisse hat, neue Analyse starten
      if (cacheResult && cacheResult.ok && !cacheResult.inCache) {
        console.log('No cache found, starting new analysis');
        
        // Ladeanzeige aktualisieren
        aiContent.innerHTML = `
          <div style="padding: 20px; text-align: center;">
            <div style="margin-bottom: 15px; color: #666;">
              <p>Erstelle neue Analyse...</p>
              <p style="font-size: 0.9em; margin-top: 8px;">Die KI analysiert deine Partie. Dies kann einen Moment dauern.</p>
            </div>
            <div class="spinner" style="display: inline-block; width: 40px; height: 40px; border: 3px solid rgba(128, 90, 213, 0.3); border-radius: 50%; border-top-color: #805AD5; animation: spin 1s ease-in-out infinite;"></div>
          </div>
        `;
        
        const pgn = extractPgn();
        
        if (pgn) {
          const response = await requestAnalysis(pgn);
          
          if (response.success) {
            // Show result
            displayAnalysisResult(response.data, aiContent);
          } else {
            // Show error
            aiContent.innerHTML = `<div style="padding: 20px; color: #c33;">
              Fehler bei der Analyse: ${response?.error || 'Unbekannter Fehler'}
            </div>`;
          }
        } else {
          aiContent.innerHTML = '<div style="padding: 20px; color: #c33;">PGN konnte nicht extrahiert werden</div>';
        }
      } else if (cacheResult && cacheResult.ok && cacheResult.inCache) {
        // Cache-Ergebnis anzeigen
        console.log('Using cache result found');
        displayAnalysisResult(cacheResult, aiContent);
      } else if (cacheResult && cacheResult.error) {
        // Fehler anzeigen
        let errMsg = cacheResult.error || '';
        if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('network')) {
          errMsg = 'Server nicht erreichbar. Bitte prüfe deine Internetverbindung oder versuche es später erneut.';
        }
        aiContent.innerHTML = `<div style="padding: 20px; color: #c33;">${errMsg}</div>`;
      } else {
        // Fallback für unerwartete Situationen
        aiContent.innerHTML = '<div style="padding: 20px; color: #c33;">Unerwarteter Fehler bei der Analyse</div>';
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
