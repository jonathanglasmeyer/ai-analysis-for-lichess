/**
 * Tab management utilities for ChessGPT Lichess Extension
 */

/**
 * Activates a panel and configures it based on the tab type
 */
export function activatePanel(panel: HTMLElement, tabType: string): void {
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
      (textarea as HTMLElement).style.flexGrow = '1';
      (textarea as HTMLElement).style.height = '100%';
      (textarea as HTMLElement).style.width = '100%';
      
      // Simulate Lichess lifecycle
      setTimeout(() => {
        (textarea as HTMLElement).blur();
        (textarea as HTMLElement).click();
        (textarea as HTMLElement).focus();
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
      (chatLines as HTMLElement).style.display = 'block';
      (chatLines as HTMLElement).style.flexGrow = '1';
      (chatLines as HTMLElement).style.overflow = 'auto';
    }
    
    if (chatInput) {
      (chatInput as HTMLElement).style.display = 'flex';
    }
  }
}

/**
 * Activates the AI tab and deactivates all others
 */
export function activateAiTab(
  mchatElement: Element, 
  aiTab: HTMLElement, 
  aiContent: HTMLElement
): void {
  console.log('Activating AI Tab');
  
  // Deactivate all tabs
  const tabs = mchatElement.querySelectorAll('.mchat__tab');
  tabs.forEach(tab => tab.classList.remove('mchat__tab-active'));
  
  // Hide all panels
  const panels = mchatElement.querySelectorAll('.mchat__content');
  panels.forEach(panel => (panel as HTMLElement).style.display = 'none');
  
  // Activate AI tab
  aiTab.classList.add('mchat__tab-active');
  aiContent.style.display = 'block';
}

/**
 * Sets up event listeners for tabs
 */
export function setupTabEventListeners(
  mchatElement: Element, 
  allTabs: NodeListOf<Element>, 
  aiTab: HTMLElement, 
  aiContent: HTMLElement
): void {
  allTabs.forEach(tab => {
    tab.addEventListener('click', function(event) {
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
                     Array.from(tab.classList).find(cls => 
                       cls !== 'mchat__tab' && cls !== 'mchat__tab-active');
      
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
        activatePanel(targetPanel as HTMLElement, tabType);
      }
    });
  });
  
  // Debug event listener for tab clicks
  setupDebugClickListener(mchatElement);
}

/**
 * Sets up a debug event listener for tab clicks
 */
export function setupDebugClickListener(mchatElement: Element): void {
  document.addEventListener('click', function(event) {
    const target = event.target as HTMLElement;
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
          .filter(p => (p as HTMLElement).style.display !== 'none');
        console.log('Visible panels:', visiblePanels.length);
        visiblePanels.forEach(panel => {
          console.log(`- ${panel.className}`);
        });
      }, 50);
    }
  }, true);
}
