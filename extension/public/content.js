(function () {
  'use strict';

  /**
   * DOM utility functions for the ChessGPT Lichess Extension
   */
  /**
   * Waits for a DOM element to appear and returns it
   */
  function waitForElement(selector, timeout = 5000) {
      return new Promise((resolve, reject) => {
          const element = document.querySelector(selector);
          if (element) {
              return resolve(element);
          }
          const observer = new MutationObserver(() => {
              const element = document.querySelector(selector);
              if (element) {
                  observer.disconnect();
                  resolve(element);
              }
          });
          observer.observe(document.body, {
              childList: true,
              subtree: true
          });
          setTimeout(() => {
              observer.disconnect();
              reject(new Error(`Element ${selector} not found within ${timeout}ms`));
          }, timeout);
      });
  }
  /**
   * Debugging function to analyze the DOM structure
   */
  function analyzeDOM() {
      console.log('Analyzing Lichess DOM structure...');
      // Check for analysis underboard
      const underboard = document.querySelector('.analyse__underboard');
      console.log('Analyse underboard found:', !!underboard);
      // Check for tabs
      const tabs = document.querySelector('.tabs-horiz');
      console.log('Tabs found:', !!tabs);
      // List all important elements
      console.log('Body classes:', document.body.className);
      console.log('Main content:', document.querySelector('main')?.className);
  }

  /**
   * PGN extraction utilities
   */
  /**
   * Extracts PGN from the Lichess DOM using various methods
   */
  function extractPgn() {
      console.log('Attempting to extract PGN...');
      // Method 1: Directly from the .pgn element
      const pgnElement = document.querySelector('.pgn');
      if (pgnElement && pgnElement.textContent) {
          console.log('Found PGN via .pgn element');
          return pgnElement.textContent;
      }
      // Method 2: From the URL of the download link
      const downloadLinks = document.querySelectorAll('a[href*="/game/export/"]');
      if (downloadLinks.length > 0) {
          console.log('Found export links, fetching PGN...');
          // Extract the game ID from the URL
          const href = downloadLinks[0].getAttribute('href');
          if (!href)
              return null;
          const gameId = href.match(/\/game\/export\/([^?]+)/);
          if (gameId && gameId[1]) {
              console.log('Game ID found:', gameId[1]);
              // This method would require a fetch request, which we'll implement later
              return `Game ID: ${gameId[1]} (PGN wird vom Server geholt)`;
          }
      }
      // Method 3: From the current URL
      const currentUrl = window.location.href;
      const urlMatch = currentUrl.match(/lichess\.org\/([^/?#]+)/);
      if (urlMatch && urlMatch[1]) {
          console.log('Extracted game ID from URL:', urlMatch[1]);
          return `Game ID: ${urlMatch[1]} (PGN wird vom Server geholt)`;
      }
      console.error('Could not extract PGN');
      return null;
  }

  /**
   * API Service for ChessGPT Lichess Extension
   */
  // API Endpoints
  /**
   * Checks if a PGN is already in the cache
   */
  function requestCacheCheck(pgn) {
      return new Promise((resolve) => {
          console.log('Sending cache check request for PGN:', pgn.substring(0, 50) + '...');
          try {
              chrome.runtime.sendMessage({ type: 'CHECK_CACHE', pgn }, (response) => {
                  console.log('Received cache check response:', JSON.stringify(response));
                  // Stellen sicher, dass die Antwort der erwarteten Struktur entspricht
                  if (!response) {
                      console.warn('Empty response received from background script');
                      resolve({ ok: false, error: 'Keine Antwort vom Hintergrundskript erhalten' });
                      return;
                  }
                  resolve(response);
              });
          }
          catch (error) {
              console.error('Error sending message to background script:', error);
              resolve({ ok: false, error: 'Fehler bei der Kommunikation mit dem Hintergrundskript' });
          }
      });
  }
  /**
   * Sends a PGN for analysis
   */
  function requestAnalysis(pgn) {
      return new Promise((resolve) => {
          console.log('Sending analysis request for PGN:', pgn.substring(0, 50) + '...');
          try {
              chrome.runtime.sendMessage({ type: 'ANALYZE_PGN', pgn }, (response) => {
                  console.log('Received analysis response:', JSON.stringify(response));
                  // Stellen sicher, dass die Antwort der erwarteten Struktur entspricht
                  if (!response) {
                      console.warn('Empty analysis response received from background script');
                      resolve({ success: false, error: 'Keine Antwort vom Hintergrundskript erhalten' });
                      return;
                  }
                  resolve(response);
              });
          }
          catch (error) {
              console.error('Error sending analysis request to background script:', error);
              resolve({ success: false, error: 'Fehler bei der Kommunikation mit dem Hintergrundskript' });
          }
      });
  }

  /**
   * Tab management utilities for ChessGPT Lichess Extension
   */
  /**
   * Activates a panel and configures it based on the tab type
   */
  function activatePanel(panel, tabType) {
      // Make panel visible
      panel.style.display = 'block';
      // Tab type specific adjustments
      if (tabType === 'note') {
          console.log('Configuring notes panel');
          // Fix for the Notes panel
          panel.style.height = '100%';
          panel.style.display = 'flex';
          panel.style.flexDirection = 'column';
          // Find and configure the textarea
          const textarea = panel.querySelector('textarea.mchat__note');
          if (textarea) {
              console.log('Configuring notes textarea');
              // Ensure the textarea is displayed correctly
              textarea.style.flexGrow = '1';
              textarea.style.height = '100%';
              textarea.style.width = '100%';
              // Simulate Lichess lifecycle
              setTimeout(() => {
                  textarea.blur();
                  textarea.click();
                  textarea.focus();
              }, 10);
          }
      }
      else if (tabType === 'chat' || tabType === 'discussion') {
          console.log('Configuring chat panel');
          // Fix for the Chat panel
          panel.style.height = '100%';
          panel.style.display = 'flex';
          panel.style.flexDirection = 'column';
          // Find chat container and input field
          const chatLines = panel.querySelector('.mchat__messages');
          const chatInput = panel.querySelector('.mchat__say');
          if (chatLines) {
              chatLines.style.display = 'block';
              chatLines.style.flexGrow = '1';
              chatLines.style.overflow = 'auto';
          }
          if (chatInput) {
              chatInput.style.display = 'flex';
          }
      }
  }
  /**
   * Activates the AI tab and deactivates all others
   */
  function activateAiTab(mchatElement, aiTab, aiContent) {
      console.log('Activating AI Tab');
      // Deactivate all tabs
      const tabs = mchatElement.querySelectorAll('.mchat__tab');
      tabs.forEach(tab => tab.classList.remove('mchat__tab-active'));
      // Hide all panels
      const panels = mchatElement.querySelectorAll('.mchat__content');
      panels.forEach(panel => panel.style.display = 'none');
      // Activate AI tab
      aiTab.classList.add('mchat__tab-active');
      aiContent.style.display = 'block';
  }
  /**
   * Sets up event listeners for tabs
   */
  function setupTabEventListeners(mchatElement, allTabs, aiTab, aiContent) {
      allTabs.forEach(tab => {
          tab.addEventListener('click', function (event) {
              const isAiTab = tab.classList.contains('ai-analysis');
              console.log(`Tab clicked: ${tab.textContent?.trim()}, is AI tab: ${isAiTab}`);
              if (isAiTab) {
                  // AI tab click is handled by its own handler
                  return;
              }
              // Original tab was clicked
              // 1. Deactivate AI tab
              aiTab.classList.remove('mchat__tab-active');
              aiContent.style.display = 'none';
              // 2. Determine tab type
              const tabType = tab.getAttribute('data-tab') ||
                  Array.from(tab.classList).find(cls => cls !== 'mchat__tab' && cls !== 'mchat__tab-active');
              if (!tabType) {
                  console.log('Could not determine tab type');
                  return;
              }
              console.log(`Original tab type: ${tabType}`);
              // 3. Find the corresponding panel
              const targetPanel = mchatElement.querySelector(`.mchat__content[data-tab="${tabType}"]`) ||
                  mchatElement.querySelector(`.mchat__content.${tabType}`);
              if (targetPanel) {
                  // Activate panel correctly
                  activatePanel(targetPanel, tabType);
              }
          });
      });
      // Debug event listener for tab clicks
      setupDebugClickListener(mchatElement);
  }
  /**
   * Sets up a debug event listener for tab clicks
   */
  function setupDebugClickListener(mchatElement) {
      document.addEventListener('click', function (event) {
          const target = event.target;
          if (target.closest('.mchat__tab')) {
              setTimeout(() => {
                  // Check which tabs are active
                  const activeTabs = document.querySelectorAll('.mchat__tab-active');
                  console.log('Active tabs after click:', activeTabs.length);
                  activeTabs.forEach(tab => {
                      console.log(`- ${tab.textContent?.trim()}`);
                  });
                  // Check which panels are visible
                  const visiblePanels = Array.from(mchatElement.querySelectorAll('.mchat__content'))
                      .filter(p => p.style.display !== 'none');
                  console.log('Visible panels:', visiblePanels.length);
                  visiblePanels.forEach(panel => {
                      console.log(`- ${panel.className}`);
                  });
              }, 50);
          }
      }, true);
  }

  /**
   * Analysis UI components and functions
   */
  /**
   * Creates the analyze button
   */
  function createAnalyzeButton() {
      const analyzeButton = document.createElement('button');
      analyzeButton.className = 'button';
      analyzeButton.textContent = 'AI ANALYSE ERSTELLEN';
      analyzeButton.style.margin = '10px';
      analyzeButton.style.padding = '8px 12px';
      analyzeButton.style.backgroundColor = '#629924'; // Green like Lichess buttons
      analyzeButton.style.color = 'white';
      analyzeButton.style.border = 'none';
      analyzeButton.style.borderRadius = '3px';
      analyzeButton.style.cursor = 'pointer';
      return analyzeButton;
  }
  /**
   * Normalizes analysis data from different sources
   */
  function normalizeAnalysisData(response) {
      // Unified data structure for analyses
      const normalized = {
          summary: '',
          moments: []
      };
      // Log the response structure for analysis
      console.log('Response to normalize:', response);
      // Case 1: Cache hit with originalResponse
      if (response?.originalResponse?.analysis) {
          normalized.summary = response.originalResponse.analysis.summary || '';
          normalized.moments = response.originalResponse.analysis.moments || [];
          console.log('Normalized from originalResponse.analysis');
      }
      // Case 2: Cache hit with direct structure
      else if (response?.summary) {
          normalized.summary = response.summary || '';
          normalized.moments = response.moments || [];
          console.log('Normalized from direct response');
      }
      // Case 3: Fresh analysis with data structure
      else if (response?.data) {
          normalized.summary = response.data.summary || '';
          normalized.moments = response.data.moments || [];
          console.log('Normalized from response.data');
      }
      // Case 4: Direct analysis object
      else if (response?.analysis) {
          normalized.summary = response.analysis.summary || '';
          normalized.moments = response.analysis.moments || [];
          console.log('Normalized from response.analysis');
      }
      // If the summary contains markdown code blocks, parse them
      if (normalized.summary && normalized.summary.includes('```')) {
          try {
              // Remove code block markers (```json and ```)
              const cleanedText = normalized.summary.replace(/```json\n|```/g, '');
              const jsonObject = JSON.parse(cleanedText.trim());
              // If the JSON object has a summary, use it
              if (jsonObject.summary) {
                  normalized.summary = jsonObject.summary;
                  console.log('Parsed summary from JSON code block');
                  // Also take moments if available
                  if (jsonObject.moments && Array.isArray(jsonObject.moments)) {
                      normalized.moments = jsonObject.moments;
                      console.log('Parsed moments from JSON code block');
                  }
              }
          }
          catch (e) {
              console.log('Failed to parse JSON from code block, using raw summary:', e);
              // Apply simple markdown formatting
              normalized.summary = normalized.summary
                  .replace(/```json\n|```/g, '')
                  .replace(/\n\n/g, '<br><br>')
                  .replace(/\n- /g, '<br>• ');
          }
      }
      console.log('Normalized data:', {
          summary: normalized.summary.substring(0, 50) + '...',
          moments: normalized.moments.length
      });
      return normalized;
  }
  /**
   * Displays the analysis result in the content panel
   */
  function displayAnalysisResult(result, container) {
      // Normalize data from different formats
      const normalizedData = normalizeAnalysisData(result);
      // Display analysis summary
      container.innerHTML = `
    <div>
      
      <p style="white-space: pre-line;">${normalizedData.summary || 'Keine Zusammenfassung verfügbar'}</p>
      
      <div class="ai-moments-info" style="margin-top: 15px; font-size: 0.9em; color: #666;">
        <p>Wichtige Momente werden in der Zugliste hervorgehoben.</p>
      </div>
    </div>
  `;
      // Implement highlights in the move list if moments are available
      if (normalizedData.moments && normalizedData.moments.length > 0) {
          console.log(`Highlighting ${normalizedData.moments.length} moments in move list`);
          highlightMovesInMoveList(normalizedData.moments);
      }
      else {
          console.log('No moments to highlight');
      }
  }
  /**
   * Highlights moves in the Lichess move list
   */
  function highlightMovesInMoveList(moments) {
      console.log('Highlighting moves:', moments);
      // Find the move list
      const moveListContainer = document.querySelector('.tview2');
      if (!moveListContainer) {
          console.error('Move list container not found');
          return;
      }
      // Inject CSS for AI comments
      injectAICommentStyles();
      // Collect all moves in a ply-based mapping
      const momentsByPly = {};
      moments.forEach(moment => {
          momentsByPly[moment.ply] = moment;
      });
      // Find all move entries in the move list
      setTimeout(() => {
          // Wait briefly as Lichess might update the move list dynamically
          const moveElements = moveListContainer.querySelectorAll('move');
          console.log('Found move elements:', moveElements.length);
          // Try to determine the half-move numbers (ply) for each move
          let currentPly = 0;
          moveElements.forEach(moveEl => {
              currentPly++;
              // Check if this move is an important moment
              if (momentsByPly[currentPly]) {
                  // Only add the comment, no visual highlighting of the move
                  const moment = momentsByPly[currentPly];
                  // Check if a comment already exists after this move
                  let commentElement = moveEl.nextElementSibling;
                  let commentAlreadyExists = false;
                  if (commentElement && commentElement.tagName.toLowerCase() === 'interrupt') {
                      // Check if an AI comment already exists
                      const existingAIComment = commentElement.querySelector('.ai-comment');
                      if (existingAIComment) {
                          commentAlreadyExists = true;
                      }
                      else {
                          // Add to existing comments
                          const commentContainer = commentElement.querySelector('comment') ||
                              commentElement.querySelector('.comment');
                          if (commentContainer) {
                              insertAIComment(commentContainer, moment);
                              commentAlreadyExists = true;
                          }
                      }
                  }
                  // If no comment exists, add a new one
                  if (!commentAlreadyExists) {
                      // Create a new comment in Lichess style
                      const interrupt = document.createElement('interrupt');
                      const comment = document.createElement('comment');
                      comment.className = 'ai-comment';
                      insertAIComment(comment, moment);
                      interrupt.appendChild(comment);
                      // Insert the comment after the move
                      if (moveEl.nextSibling) {
                          moveEl.parentNode?.insertBefore(interrupt, moveEl.nextSibling);
                      }
                      else {
                          moveEl.parentNode?.appendChild(interrupt);
                      }
                  }
                  console.log('Highlighted move:', moveEl.textContent, 'ply:', currentPly);
              }
          });
      }, 500);
  }
  /**
   * Injects CSS styles for AI comments
   */
  function injectAICommentStyles() {
      if (document.getElementById('ai-comment-styles'))
          return;
      const styleSheet = document.createElement('style');
      styleSheet.id = 'ai-comment-styles';
      styleSheet.innerHTML = `
    .ai-comment {
      color: #805AD5 !important; /* Purple color for all AI comments */
      padding: 5px 0;
    }
    
    .ai-highlighted-move {
      background-color: rgba(128, 90, 213, 0.2) !important;
      border-radius: 3px;
    }
    
    .ai-recommendation {
      color: #805AD5; /* Keep purple color */
      margin-top: 3px;
    }
    
    .ai-recommendation-move {
      font-weight: bold; /* Only the move suggestion itself is bold */
    }
    
    .ai-reasoning {
      color: #805AD5; /* Also reasoning in purple */
      margin-top: 2px;
    }
    
    .ai-magic-icon {
      display: inline-block;
      margin-right: 4px;
      font-size: 14px;
    }
  `;
      document.head.appendChild(styleSheet);
  }
  /**
   * Inserts an AI comment into an element
   */
  function insertAIComment(element, moment) {
      // Emoji for magic: ✨ (Sparkles)
      element.innerHTML = `
    <span class="ai-magic-icon">✨</span>
    ${moment.comment || ''}
    ${moment.recommendation ? `
      <div class="ai-recommendation">
        <span class="ai-recommendation-move">Besser: ${moment.recommendation}</span>
        <div class="ai-reasoning">${moment.reasoning || ''}</div>
      </div>
    ` : ''}
  `;
  }

  /**
   * Content script for the ChessGPT Lichess Integration
   */
  const LICHESS_TABS_SELECTOR = '.mchat__tabs';
  // Global variables
  let cachedResult = null;
  let isCacheCheckInProgress = false;
  /**
   * Adds the AI Analysis tab to the Lichess sidebar
   */
  async function addAiAnalysisTab() {
      try {
          console.log('ChessGPT Lichess Integration loaded', window.location.href);
          // Run DOM analysis immediately and after a delay (for dynamically loaded content)
          analyzeDOM();
          setTimeout(analyzeDOM, 2000);
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
          }
          else {
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
          async function checkCacheStatus() {
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
              }
              catch (error) {
                  console.error('Error during cache check:', error);
                  isCacheCheckInProgress = false;
                  return { error: `Fehler bei der Cache-Prüfung: ${error}` };
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
          analyzeButton.addEventListener('click', async () => {
              // Extract PGN
              const pgn = extractPgn();
              if (pgn) {
                  // Show loading status
                  aiContent.innerHTML = '<div style="padding: 20px; color: #666;">Analysiere Partie...</div>';
                  // Send message to background script
                  const response = await requestAnalysis(pgn);
                  if (response.success) {
                      // Show result
                      displayAnalysisResult(response.data, aiContent);
                  }
                  else {
                      // Show error
                      aiContent.innerHTML = `<div style="padding: 20px; color: #c33;">
            Fehler bei der Analyse: ${response?.error || 'Unbekannter Fehler'}
          </div>`;
                  }
              }
              else {
                  aiContent.innerHTML = '<div style="padding: 20px; color: #c33;">PGN konnte nicht extrahiert werden</div>';
              }
          });
          // Add the button to the content
          aiContent.appendChild(analyzeButton);
          // Set up tab event listeners
          setupTabEventListeners(mchatElement, allTabs, aiTab, aiContent);
          // Add click event for AI tab
          aiTab.addEventListener('click', async () => {
              // Activate AI tab
              activateAiTab(mchatElement, aiTab, aiContent);
              // Show loading indicator
              aiContent.innerHTML = '<div style="padding: 20px; color: #666;">Lade KI-Analyse...</div>';
              // Use pre-loaded result if available
              if (cachedResult) {
                  console.log('Using pre-loaded cache result');
                  if (cachedResult.error) {
                      aiContent.innerHTML = `<div style="padding: 20px; color: #c33;">${cachedResult.error}</div>`;
                  }
                  else if (cachedResult.ok) {
                      displayAnalysisResult(cachedResult, aiContent);
                  }
                  else {
                      aiContent.innerHTML = '';
                      aiContent.appendChild(analyzeButton);
                  }
                  return;
              }
              // If no pre-loaded result available, check now
              const result = await checkCacheStatus();
              if (!result)
                  return; // If check is already in progress
              if (result.error) {
                  aiContent.innerHTML = `<div style="padding: 20px; color: #c33;">${result.error}</div>`;
              }
              else if (result.ok) {
                  displayAnalysisResult(result, aiContent);
              }
              else {
                  aiContent.innerHTML = '';
                  aiContent.appendChild(analyzeButton);
              }
          });
          console.log('AI Analysis tab integration complete');
      }
      catch (error) {
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

})();
//# sourceMappingURL=content.js.map
