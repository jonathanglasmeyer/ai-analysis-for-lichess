/**
 * DOM utility functions for the ChessGPT Lichess Extension
 */

/**
 * Waits for a DOM element to appear and returns it
 */
export function waitForElement(selector: string, timeout: number = 5000): Promise<Element> {
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
export function analyzeDOM(): void {
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
