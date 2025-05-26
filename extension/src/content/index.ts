/**
 * Content script for the ChessGPT Lichess Integration
 * This script runs in the context of the Lichess analysis page
 * and is responsible for adding the AI Analysis tab to the sidebar
 */

console.log('ChessGPT Lichess Integration loaded');

// DOM Element selectors
const LICHESS_SIDEBAR_SELECTOR = '.analyse__underboard';
const LICHESS_TABS_SELECTOR = '.analyse__underboard .tabs-horiz';

/**
 * Waits for a DOM element to appear and returns it
 * @param selector CSS selector for the element
 * @param timeout Maximum time to wait in milliseconds
 * @returns Promise that resolves to the element or rejects if timeout
 */
function waitForElement(selector: string, timeout = 5000): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      return resolve(element);
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector) as HTMLElement;
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
    
    // Create the new tab
    const aiTab = document.createElement('span');
    aiTab.className = 'tab'; // Use Lichess tab class
    aiTab.setAttribute('data-tab', 'ai-analysis');
    aiTab.textContent = 'AI Analyse';
    
    // Add the tab to the tabs container
    tabsContainer.appendChild(aiTab);
    
    // Create the tab content
    const aiContent = document.createElement('div');
    aiContent.className = 'analyse__underboard__panel ai-analysis-panel none'; // Hidden initially
    aiContent.setAttribute('data-panel', 'ai-analysis');
    
    // Add the button to create analysis
    const analyzeButton = document.createElement('button');
    analyzeButton.className = 'button button-green';
    analyzeButton.textContent = 'AI Analyse erstellen';
    analyzeButton.addEventListener('click', createAnalysis);
    
    aiContent.appendChild(analyzeButton);
    
    // Add the content to the sidebar
    const sidebar = await waitForElement(LICHESS_SIDEBAR_SELECTOR);
    sidebar.appendChild(aiContent);
    
    // Add click event to tab
    aiTab.addEventListener('click', () => {
      // Remove active class from all tabs and hide all panels
      const tabs = tabsContainer.querySelectorAll('.tab');
      tabs.forEach(tab => tab.classList.remove('active'));
      
      const panels = sidebar.querySelectorAll('.analyse__underboard__panel');
      panels.forEach(panel => panel.classList.add('none'));
      
      // Activate our tab and panel
      aiTab.classList.add('active');
      aiContent.classList.remove('none');
    });
    
    console.log('AI Analysis tab added to Lichess sidebar');
  } catch (error) {
    console.error('Failed to add AI Analysis tab:', error);
  }
}

/**
 * Creates an analysis of the current position
 */
async function createAnalysis() {
  try {
    // Get the PGN from Lichess
    const pgnElement = document.querySelector('.copyable') as HTMLElement;
    if (!pgnElement) {
      throw new Error('PGN not found');
    }
    
    const pgn = pgnElement.innerText;
    console.log('PGN retrieved:', pgn);
    
    // Show loading state
    const aiPanel = document.querySelector('.ai-analysis-panel') as HTMLElement;
    aiPanel.innerHTML = '<div class="loading">Analysiere Partie...</div>';
    
    // TODO: Send PGN to backend and receive analysis
    // For now, just simulate a delay
    setTimeout(() => {
      // TODO: Replace with actual API call
      displayAnalysis({
        summary: "Dies ist eine Beispiel-Analyse. Die eigentliche Analyse wird von unserem Server generiert.",
        moments: []
      });
    }, 1500);
  } catch (error) {
    console.error('Failed to create analysis:', error);
    
    // Show error message
    const aiPanel = document.querySelector('.ai-analysis-panel') as HTMLElement;
    aiPanel.innerHTML = `<div class="error">Fehler bei der Analyse: ${error instanceof Error ? error.message : String(error)}</div>`;
  }
}

/**
 * Displays the analysis in the AI Analysis panel
 */
function displayAnalysis(analysis: any) {
  const aiPanel = document.querySelector('.ai-analysis-panel') as HTMLElement;
  
  // Create the analysis display
  const analysisDisplay = document.createElement('div');
  analysisDisplay.className = 'ai-analysis-display';
  
  // Add the summary
  const summary = document.createElement('div');
  summary.className = 'ai-analysis-summary';
  summary.textContent = analysis.summary;
  analysisDisplay.appendChild(summary);
  
  // Replace panel content with the analysis display
  aiPanel.innerHTML = '';
  aiPanel.appendChild(analysisDisplay);
  
  // TODO: Highlight moves in the Lichess move list
  console.log('Analysis displayed');
}

// Initialize when the page is fully loaded
window.addEventListener('load', () => {
  addAiAnalysisTab();
});
