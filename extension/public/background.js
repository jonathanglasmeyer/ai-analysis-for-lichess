/**
 * Background script for the ChessGPT Lichess Integration
 */

console.log('ChessGPT background script initialized');

// Server endpoint for chess analysis - verwende den bestehenden Server auf Port 3001
const API_ENDPOINT = 'http://localhost:3001/analyze';

// Server endpoint für cache check
const CACHE_CHECK_ENDPOINT = 'http://localhost:3001/check-cache';

// Funktion zum Überprüfen des Cache-Status für ein PGN
async function checkCacheForPgn(pgn) {
  console.log('Checking cache for PGN...');
  
  try {
    const response = await fetch(CACHE_CHECK_ENDPOINT, {
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
    console.error('Cache check failed:', error);
    return { inCache: false, error: error.message };
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request);
  
  if (request.type === 'CHECK_CACHE') {
    console.log('Checking cache for PGN:', request.pgn.substring(0, 100) + '...');
    
    // Extrahiere PGN oder Game ID
    let pgnData = request.pgn;
    
    // Falls wir nur eine Game ID haben, konvertiere sie in ein Format, das unser Server versteht
    if (pgnData.startsWith('Game ID:')) {
      const gameId = pgnData.match(/Game ID: ([^\s]+)/)[1];
      pgnData = gameId; // Server kann mit der ID arbeiten
    }
    
    // Prüfe den Cache-Status asynchron
    checkCacheForPgn(pgnData)
      .then(cacheResult => {
        console.log('Cache check result:', cacheResult);
        
        // Formatiere die Antwort so, dass sie mit dem Content-Script übereinstimmt
        // Content-Script erwartet response.ok, aber wir haben cacheResult.inCache
        const formattedResponse = {
          ok: cacheResult.inCache, // Übersetze inCache zu ok
          
          // Extrahiere die Summary aus der verschachtelten Struktur
          summary: cacheResult.analysis?.summary || '',
          
          cached: true,
          // Füge die Originaldaten hinzu, falls die Implementierung geändert wird
          originalResponse: cacheResult
        };
        
        console.log('Extracted summary from response:', formattedResponse.summary ? 'FOUND' : 'NOT FOUND');
        
        console.log('Sending formatted response to content script:', formattedResponse);
        sendResponse(formattedResponse);
      })
      .catch(error => {
        console.error('Cache check error:', error);
        sendResponse({ 
          ok: false, 
          error: error.message || 'Unknown error',
          cached: false
        });
      });
    
    // Wichtig: Return true, um anzuzeigen, dass wir asynchron antworten werden
    return true;
  }
  else if (request.type === 'ANALYZE_PGN') {
    console.log('Analyzing PGN:', request.pgn.substring(0, 100) + '...');
    
    // Extrahiere PGN oder Game ID
    let pgnData = request.pgn;
    
    // Falls wir nur eine Game ID haben, konvertiere sie in ein Format, das unser Server versteht
    if (pgnData.startsWith('Game ID:')) {
      const gameId = pgnData.match(/Game ID: ([^\s]+)/)[1];
      pgnData = gameId; // Server kann mit der ID arbeiten
    }
    
    console.log('Calling API endpoint:', API_ENDPOINT);
    console.log('Sending data:', { pgn: pgnData.substring(0, 100) + '...' });
    
    // Teste zuerst, ob der Server erreichbar ist
    fetch(API_ENDPOINT.split('/analyze')[0], { method: 'GET' })
      .then(response => {
        console.log('Server reachability check:', response.status, response.statusText);
        return true;
      })
      .catch(error => {
        console.error('Server is not reachable:', error);
        sendResponse({ 
          success: false, 
          error: 'Server nicht erreichbar. Läuft der Server auf ' + API_ENDPOINT.split('/analyze')[0] + '?' 
        });
        return false;
      })
      .then(serverReachable => {
        if (!serverReachable) return;
        
        // Tatsächlicher API-Aufruf an den bestehenden Server
        return fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pgn: pgnData }),
        });
      })
      .then(response => {
        if (!response) return; // Wenn der vorherige Promise null zurückgibt
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        if (!data) return; // Wenn der vorherige Promise null zurückgibt
        
        console.log('Analysis received:', data);
        
        // Extrahiere die relevanten Teile aus der Antwort
        let result;
        
        // Die Server-Antwort hat folgendes Format: {ok: true, summary: '```json\n{...}\n```', cached: false}
        if (data.ok) {
          // Extrahiere den JSON-String aus der summary
          const summaryText = data.summary || '';
          let analysisData;
          
          try {
            // Versuche, den JSON-Teil aus dem Text zu extrahieren
            const jsonMatch = summaryText.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
              analysisData = JSON.parse(jsonMatch[1]);
              console.log('Parsed JSON data:', analysisData);
            } else {
              throw new Error('No JSON found in response');
            }
          } catch (jsonError) {
            console.error('Error parsing JSON:', jsonError);
            console.error('JSON string was:', summaryText);
            // Fallback zu einem Objekt mit dem Rohtext
            analysisData = {
              summary: "Fehler beim Parsen der Antwort. Bitte versuche es später erneut.",
              moments: []
            };
          }
          
          result = {
            success: true,
            data: analysisData
          };
        } else {
          console.error('Server returned error:', data);
          result = {
            success: false,
            error: data.error || 'Analysis failed'
          };
        }
        
        sendResponse(result);
      })
      .catch(error => {
        console.error('Analysis request failed:', error);
        sendResponse({ 
          success: false, 
          error: error.message || 'Network error' 
        });
      });
    
    // Wichtig: Return true, um anzuzeigen, dass wir asynchron antworten werden
    return true;
  }
  
  if (request.type === 'TEST_CONNECTION') {
    sendResponse({ success: true, message: 'Background script connected' });
    return true;
  }
});
