/**
 * Popup script for the ChessGPT Lichess Integration
 * This script runs in the popup window when the user clicks the extension icon
 */

document.addEventListener('DOMContentLoaded', () => {
  const statusElement = document.getElementById('status');
  
  // Prüfe, ob das Element existiert
  if (!statusElement) {
    console.error('Status element not found');
    return;
  }
  
  // Check if we're on Lichess
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentUrl = tabs[0]?.url || '';
    
    if (currentUrl.includes('lichess.org')) {
      if (currentUrl.includes('/analysis')) {
        statusElement.textContent = 'Auf Lichess Analyse-Seite';
        statusElement.style.color = '#629924'; // Green
      } else {
        statusElement.textContent = 'Auf Lichess, aber nicht auf Analyse-Seite';
        statusElement.style.color = '#e69f00'; // Orange
      }
    } else {
      statusElement.textContent = 'Nicht auf Lichess';
      statusElement.style.color = '#999';
    }
  });
});
