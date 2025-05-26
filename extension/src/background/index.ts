/**
 * Background script for the ChessGPT Lichess Integration
 * This script runs in the background and handles communication with the server
 */

// Server endpoint for chess analysis
const API_ENDPOINT = 'http://localhost:3000/api/analyze';

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ANALYZE_PGN') {
    analyzePgn(request.pgn)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    // Return true to indicate we'll respond asynchronously
    return true;
  }
});

/**
 * Sends the PGN to the server for analysis
 * @param pgn The PGN string to analyze
 * @returns Promise with the analysis result
 */
async function analyzePgn(pgn: string): Promise<any> {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pgn }),
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Analysis request failed:', error);
    throw error;
  }
}
