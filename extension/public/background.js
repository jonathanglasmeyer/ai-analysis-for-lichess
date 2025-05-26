/**
 * Background script for the ChessGPT Lichess Integration
 */

console.log('ChessGPT background script initialized');

// Server endpoint for chess analysis
const API_ENDPOINT = 'http://localhost:3000/api/analyze';

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request);
  
  if (request.type === 'ANALYZE_PGN') {
    console.log('Analyzing PGN:', request.pgn.substring(0, 100) + '...');
    
    // Für den ersten Test, simuliere eine Antwort ohne echten Server-Call
    setTimeout(() => {
      // Teste, ob wir eine Game ID oder ein vollständiges PGN haben
      if (request.pgn.startsWith('Game ID:')) {
        // Simuliere Antwort für Game ID
        const gameId = request.pgn.match(/Game ID: ([^\s]+)/)[1];
        sendResponse({
          success: true,
          data: {
            summary: `Dies ist eine Beispiel-Analyse für Spiel ${gameId}. Die eigentliche Analyse wird später vom Server erstellt.\n\nDie Partie zeigt interessante taktische Momente und strategische Entscheidungen.`,
            moments: [
              { ply: 1, move: 'd4', color: 'white', comment: 'Beispiel-Kommentar für Test' }
            ]
          }
        });
      } else {
        // Simuliere Antwort für vollständiges PGN
        sendResponse({
          success: true,
          data: {
            summary: `Dies ist eine Beispiel-Analyse für das bereitgestellte PGN. Die eigentliche Analyse wird später vom Server erstellt.\n\nDie Partie zeigt einen klassischen Eröffnungsaufbau mit Komplikationen im Mittelspiel.`,
            moments: [
              { ply: 1, move: 'd4', color: 'white', comment: 'Solider Eröffnungszug' },
              { ply: 2, move: 'e6', color: 'black', comment: 'Französische Struktur' }
            ]
          }
        });
      }
    }, 1500); // Simuliere eine kurze Verzögerung
    
    // Implementierung des tatsächlichen Server-Aufrufs für später:
    /*
    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pgn: request.pgn }),
    })
    .then(response => response.json())
    .then(data => {
      sendResponse({ success: true, data });
    })
    .catch(error => {
      console.error('Analysis request failed:', error);
      sendResponse({ success: false, error: error.message || 'Network error' });
    });
    */
    
    // Wichtig: Return true, um anzuzeigen, dass wir asynchron antworten werden
    return true;
  }
  
  if (request.type === 'TEST_CONNECTION') {
    sendResponse({ success: true, message: 'Background script connected' });
    return true;
  }
});
