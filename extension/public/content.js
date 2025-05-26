/**
 * Content script for the ChessGPT Lichess Integration
 * This is a simplified version for initial testing
 */

console.log('ChessGPT Lichess Integration loaded', window.location.href);

// Debugging-Funktion, um die DOM-Struktur zu analysieren
function analyzeDOM() {
  console.log('Analyzing Lichess DOM structure...');
  
  // Prüfe auf Analyse-Unterboard
  const underboard = document.querySelector('.analyse__underboard');
  console.log('Analyse underboard found:', !!underboard);
  
  // Prüfe auf Tabs
  const tabs = document.querySelector('.tabs-horiz');
  console.log('Tabs found:', !!tabs);
  
  // Liste alle wichtigen Elemente auf
  console.log('Body classes:', document.body.className);
  console.log('Main content:', document.querySelector('main')?.className);
}

// Führe DOM-Analyse sofort und nach einer Verzögerung aus (für dynamisch geladene Inhalte)
analyzeDOM();
setTimeout(analyzeDOM, 2000);

// DOM Element selectors basierend auf der tatsächlichen Struktur
const LICHESS_SIDEBAR_SELECTOR = '.mchat';
const LICHESS_TABS_SELECTOR = '.mchat__tabs';

// Debug ausgabe für die aktuelle Tab-Struktur
console.log('Current tab structure:', document.querySelector('.mchat__tabs')?.outerHTML);

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
 * Adds the AI Analysis tab to the Lichess sidebar
 */
async function addAiAnalysisTab() {
  try {
    // Wait for the Lichess sidebar tabs to appear
    const tabsContainer = await waitForElement(LICHESS_TABS_SELECTOR);
    console.log('Found tabs container:', tabsContainer);
    
    // Create the new tab based on the existing tab structure
    const aiTab = document.createElement('div');
    aiTab.className = 'mchat__tab ai-analysis'; // Match Lichess tab class
    aiTab.setAttribute('role', 'tab');
    
    // Add span with text like the other tabs
    const tabSpan = document.createElement('span');
    tabSpan.textContent = 'AI Analyse';
    aiTab.appendChild(tabSpan);
    
    // Füge den Tab als dritten Tab ein (vor dem Telefon-Icon)
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
    
    // Create the tab content panel (initially hidden)
    const aiContent = document.createElement('div');
    aiContent.className = 'mchat__content ai-analysis-panel'; // Match Lichess content class
    aiContent.style.display = 'none'; // Initially hidden
    
    // Funktion zum Extrahieren des PGN aus dem Lichess DOM
    function extractPgn() {
      console.log('Attempting to extract PGN...');
      
      // Methode 1: Direkt aus dem .pgn Element
      const pgnElement = document.querySelector('.pgn');
      if (pgnElement && pgnElement.textContent) {
        console.log('Found PGN via .pgn element');
        return pgnElement.textContent;
      }
      
      // Methode 2: Aus der URL des Download-Links
      const downloadLinks = document.querySelectorAll('a[href*="/game/export/"]');
      if (downloadLinks.length > 0) {
        console.log('Found export links, fetching PGN...');
        // Extrahiere die Game-ID aus der URL
        const href = downloadLinks[0].getAttribute('href');
        const gameId = href.match(/\/game\/export\/([^?]+)/);
        
        if (gameId && gameId[1]) {
          console.log('Game ID found:', gameId[1]);
          // Diese Methode würde einen Fetch-Request benötigen, was wir später implementieren
          return `Game ID: ${gameId[1]} (PGN wird vom Server geholt)`;
        }
      }
      
      // Methode 3: Aus der aktuellen URL
      const currentUrl = window.location.href;
      const urlMatch = currentUrl.match(/lichess\.org\/([^/?#]+)/);
      if (urlMatch && urlMatch[1]) {
        console.log('Extracted game ID from URL:', urlMatch[1]);
        return `Game ID: ${urlMatch[1]} (PGN wird vom Server geholt)`;
      }
      
      console.error('Could not extract PGN');
      return null;
    }
    
    // Add the button to create analysis
    const analyzeButton = document.createElement('button');
    analyzeButton.className = 'button';
    analyzeButton.textContent = 'AI ANALYSE ERSTELLEN';
    analyzeButton.style.margin = '10px';
    analyzeButton.style.padding = '8px 12px';
    analyzeButton.style.backgroundColor = '#629924'; // Grün wie Lichess-Buttons
    analyzeButton.style.color = 'white';
    analyzeButton.style.border = 'none';
    analyzeButton.style.borderRadius = '3px';
    analyzeButton.style.cursor = 'pointer';
    
    analyzeButton.addEventListener('click', () => {
      // PGN extrahieren
      const pgn = extractPgn();
      
      if (pgn) {
        // Zeige Lade-Status an
        aiContent.innerHTML = '<div style="padding: 20px; color: #666;">Analysiere Partie...</div>';
        
        // Sende Nachricht an das Background-Script
        chrome.runtime.sendMessage(
          { type: 'ANALYZE_PGN', pgn: pgn },
          response => {
            if (response && response.success) {
              // Zeige Ergebnis an
              displayAnalysisResult(response.data, aiContent);
            } else {
              // Zeige Fehler an
              aiContent.innerHTML = `<div style="padding: 20px; color: #c33;">
                Fehler bei der Analyse: ${response?.error || 'Unbekannter Fehler'}
              </div>`;
            }
          }
        );
      } else {
        aiContent.innerHTML = '<div style="padding: 20px; color: #c33;">PGN konnte nicht extrahiert werden</div>';
      }
    });
    
    // Hilfsfunktion zum Anzeigen des Analyseergebnisses
    function displayAnalysisResult(result, container) {
      // Analyse-Zusammenfassung anzeigen
      container.innerHTML = `
        <div style="padding: 20px;">
          <h3 style="margin-top: 0;">Analyse-Zusammenfassung</h3>
          <p style="white-space: pre-line;">${result?.summary || 'Keine Zusammenfassung verfügbar'}</p>
          
          <div class="ai-moments-info" style="margin-top: 15px; font-size: 0.9em; color: #666;">
            <p>Wichtige Momente werden in der Zugliste hervorgehoben.</p>
          </div>
        </div>
      `;
      
      // Highlights in der Zugliste implementieren
      if (result && result.moments && Array.isArray(result.moments)) {
        highlightMovesInMoveList(result.moments);
      }
    }
    
    // Hilfsfunktion zum Highlighten von Zügen in der Lichess-Zugliste
    function highlightMovesInMoveList(moments) {
      console.log('Highlighting moves:', moments);
      
      // Finde die Zugliste
      const moveListContainer = document.querySelector('.tview2');
      if (!moveListContainer) {
        console.error('Move list container not found');
        return;
      }
      
      // CSS für AI-Kommentare injizieren
      injectAICommentStyles();
      
      // Sammle alle Moves in ein ply-basiertes Mapping
      const momentsByPly = {};
      moments.forEach(moment => {
        momentsByPly[moment.ply] = moment;
      });
      
      // Finde alle Zugeinträge in der Zugliste
      setTimeout(() => {
        // Warte kurz, da Lichess die Zugliste dynamisch aktualisieren könnte
        const moveElements = moveListContainer.querySelectorAll('move');
        console.log('Found move elements:', moveElements.length);
        
        // Versuche, die Halbzug-Nummern (ply) für jeden Zug zu bestimmen
        let currentPly = 0;
        moveElements.forEach(moveEl => {
          currentPly++;
          
          // Prüfe, ob dieser Zug ein wichtiges Moment ist
          if (momentsByPly[currentPly]) {
            // Nur den Kommentar hinzufügen, kein visuelles Highlighting des Zugs
            const moment = momentsByPly[currentPly];
            
            // Prüfe, ob bereits ein Kommentar nach diesem Zug existiert
            let commentElement = moveEl.nextElementSibling;
            let commentAlreadyExists = false;
            
            if (commentElement && commentElement.tagName.toLowerCase() === 'interrupt') {
              // Schaue, ob es bereits einen AI-Kommentar gibt
              const existingAIComment = commentElement.querySelector('.ai-comment');
              if (existingAIComment) {
                commentAlreadyExists = true;
              } else {
                // Füge zu bestehenden Kommentaren hinzu
                const commentContainer = commentElement.querySelector('comment') || 
                                         commentElement.querySelector('.comment');
                if (commentContainer) {
                  insertAIComment(commentContainer, moment);
                  commentAlreadyExists = true;
                }
              }
            }
            
            // Wenn kein Kommentar existiert, füge einen neuen hinzu
            if (!commentAlreadyExists) {
              // Erstelle einen neuen Kommentar im Lichess-Stil
              const interrupt = document.createElement('interrupt');
              const comment = document.createElement('comment');
              comment.className = 'ai-comment';
              
              insertAIComment(comment, moment);
              
              interrupt.appendChild(comment);
              
              // Füge den Kommentar nach dem Zug ein
              if (moveEl.nextSibling) {
                moveEl.parentNode.insertBefore(interrupt, moveEl.nextSibling);
              } else {
                moveEl.parentNode.appendChild(interrupt);
              }
            }
            
            console.log('Highlighted move:', moveEl.textContent, 'ply:', currentPly);
          }
        });
      }, 500);
    }
    
    // Fügt die CSS-Stile für AI-Kommentare ein
    function injectAICommentStyles() {
      if (document.getElementById('ai-comment-styles')) return;
      
      const styleSheet = document.createElement('style');
      styleSheet.id = 'ai-comment-styles';
      styleSheet.innerHTML = `
        .ai-comment {
          color: #805AD5 !important; /* Lila Farbe */
          padding: 5px 0;
        }
        
        .ai-highlighted-move {
          background-color: rgba(128, 90, 213, 0.2) !important;
          border-radius: 3px;
        }
        
        .ai-recommendation {
          color: #805AD5;
          font-weight: bold;
          margin-top: 3px;
        }
        
        .ai-reasoning {
          color: #666;
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
    
    // Fügt den AI-Kommentar in ein Element ein
    function insertAIComment(element, moment) {
      // Emoji für Magie: ✨ (Sparkles)
      element.innerHTML = `
        <span class="ai-magic-icon">✨</span>
        ${moment.comment || ''}
        ${moment.recommendation ? `
          <div class="ai-recommendation">
            Besser: ${moment.recommendation}
            <div class="ai-reasoning">${moment.reasoning || ''}</div>
          </div>
        ` : ''}
      `;
    }
    
    aiContent.appendChild(analyzeButton);
    
    // Add the content panel after the tabs
    if (mchatElement) {
      const existingContent = mchatElement.querySelector('.mchat__content');
      if (existingContent && existingContent.parentNode) {
        // Füge das Panel nach dem ersten Content-Element ein
        existingContent.parentNode.insertBefore(aiContent, existingContent.nextSibling);
        console.log('Added AI Analysis content panel');
      } else {
        mchatElement.appendChild(aiContent);
        console.log('Added AI Analysis content panel (fallback)');
      }
    } else {
      console.error('Could not find parent mchat element');
    }
    
    // Add click event to tab
    aiTab.addEventListener('click', () => {
      // Deaktiviere alle Tabs und verstecke alle Panels
      const tabs = tabsContainer.querySelectorAll('.mchat__tab');
      tabs.forEach(tab => tab.classList.remove('mchat__tab-active'));
      
      // Verstecke alle Content-Panels
      if (mchatElement) {
        const contentPanels = mchatElement.querySelectorAll('.mchat__content');
        contentPanels.forEach(panel => panel.style.display = 'none');
      }
      
      // Aktiviere unseren Tab und Panel
      aiTab.classList.add('mchat__tab-active');
      aiContent.style.display = 'block';
      
      console.log('Activated AI Analysis tab');
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
