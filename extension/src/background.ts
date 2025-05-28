/**
 * Background script for the ChessGPT Lichess Extension
 */

// API Endpoints - Lokale Entwicklungsserver
const CACHE_CHECK_ENDPOINT = 'http://localhost:3001/check-cache';
const ANALYZE_ENDPOINT = 'http://localhost:3001/analyze';

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message);
  
  // Handle cache check requests
  if (message.type === 'CHECK_CACHE') {
    console.log('Processing CHECK_CACHE request');
    fetchCacheStatus(message.pgn)
      .then((result: any) => {
        // Stelle sicher, dass wir eine eindeutige Antwortstruktur haben
        console.log('Cache check result (raw):', result);
        
        // Normalizing response format
        const response = {
          ok: true,  // Explizit ok-Flag setzen
          ...result // Originaldaten beibehalten
        };
        
        console.log('Sending normalized response to content script:', response);
        sendResponse(response);
      })
      .catch((error: any) => {
        console.error('Error checking cache:', error);
        if (error instanceof Error && error.name === 'AbortError') {
          sendResponse({
            ok: false,
            error: 'Server nicht erreichbar. Bitte prüfe deine Internetverbindung oder versuche es später erneut.'
          });
        } else {
          sendResponse({ 
            ok: false, 
            error: 'Fehler bei der Cache-Prüfung: ' + (error?.message || String(error)) 
          });
        }
      });
    
    return true; // Indicates async response
  }
  
  // Handle analysis requests
  if (message.type === 'ANALYZE_PGN') {
    console.log('Processing ANALYZE_PGN request');
    performAnalysis(message.pgn)
      .then((result: any) => {
        console.log('Analysis result (raw):', result);
        
        // Stelle sicher, dass die Antwort konsistent ist
        const response = {
          success: true, // Explizites Erfolgs-Flag
          ...result // Originaldaten beibehalten
        };
        
        // Wenn data nicht vorhanden ist, aber Daten in der Wurzel sind, diese in data verschieben
        if (!response.data && (response.summary || response.moments)) {
          response.data = {
            summary: response.summary,
            moments: response.moments
          };
        }
        
        console.log('Sending normalized analysis response:', response);
        sendResponse(response);
      })
      .catch((error: any) => {
        console.error('Error analyzing PGN:', error);
        if (error instanceof Error && error.name === 'AbortError') {
          sendResponse({
            success: false,
            error: 'Server nicht erreichbar. Bitte prüfe deine Internetverbindung oder versuche es später erneut.'
          });
        } else {
          sendResponse({ 
            success: false, 
            error: 'Fehler bei der Analyse: ' + (error?.message || String(error)) 
          });
        }
      });
    
    return true; // Indicates async response
  }
});

/**
 * Checks if a PGN is in the cache
 */
async function fetchCacheStatus(pgn: string) {
  console.log('Starting cache check process with endpoint:', CACHE_CHECK_ENDPOINT);
  console.log('PGN length:', pgn.length, 'First 50 chars:', pgn.substring(0, 50));
  
  try {
    console.log('Preparing to send fetch request...');
    
    // Für Debugging: Direkter Zugriff auf die API ohne fetch
    const mockResponse = {
      ok: true,
      summary: '',
      moments: []
    };
    
    try {
      console.log('Sending fetch request to cache API...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s Timeout
      
      const response = await fetch(CACHE_CHECK_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pgn }),
        signal: controller.signal
      }).catch(e => {
        console.error('Fetch execution error:', e);
        throw e;
      });
      
      clearTimeout(timeoutId);
      console.log('Received response from server, status:', response.status);
      
      if (!response.ok) {
        console.error(`Server responded with error status: ${response.status}`);
        throw new Error(`Server responded with status ${response.status}`);
      }
      
      console.log('Response is OK, parsing JSON...');
      const result = await response.json().catch(e => {
        console.error('Error parsing response JSON:', e);
        throw e;
      });
      
      console.log('Cache check API response parsed successfully:', result);
      
      // Füge explizit das ok-Flag hinzu, falls nicht vorhanden
      if (result && typeof result.ok === 'undefined') {
        console.log('Adding missing ok flag to result');
        result.ok = true;
      }
      
      return result;
    } catch (fetchError) {
      console.error('Error during fetch operation:', fetchError);
      throw fetchError;
    }
  } catch (outerError) {
    console.error('Critical error in cache check function:', outerError);
    if (outerError instanceof Error && outerError.name === 'AbortError') {
      return {
        ok: false,
        error: 'Server nicht erreichbar. Bitte prüfe deine Internetverbindung oder versuche es später erneut.'
      };
    } else {
      return { 
        ok: false,
        error: `Fehler bei der Cache-Prüfung: ${outerError instanceof Error ? outerError.message : String(outerError)}` 
      };
    }
  }
}

/**
 * Sends a PGN for analysis
 */
async function performAnalysis(pgn: string) {
  console.log('Starting analysis process with endpoint:', ANALYZE_ENDPOINT);
  console.log('PGN length for analysis:', pgn.length, 'First 50 chars:', pgn.substring(0, 50));
  
  try {
    console.log('Preparing to send analysis request...');
    
    // Für Debugging: Fallback-Daten falls API-Aufruf fehlschlägt
    const mockResponse = {
      success: true,
      data: {
        summary: 'Dies ist eine Notfall-Fallback-Analyse, da der Analyse-API-Aufruf nicht funktioniert.',
        moments: []
      }
    };
    
    try {
      console.log('Sending fetch request for analysis...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s Timeout (2 Minuten) für die Analyse, da Anthropic länger brauchen kann
      
      const response = await fetch(ANALYZE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pgn }),
        signal: controller.signal
      }).catch(e => {
        console.error('Analysis fetch execution error:', e);
        throw e;
      });
      
      clearTimeout(timeoutId);
      console.log('Received analysis response, status:', response.status);
      
      if (!response.ok) {
        console.error(`Analysis server responded with error status: ${response.status}`);
        throw new Error(`Server responded with status ${response.status}`);
      }
      
      console.log('Analysis response is OK, parsing JSON...');
      const result = await response.json().catch(e => {
        console.error('Error parsing analysis response JSON:', e);
        throw e;
      });
      
      console.log('Analysis API response parsed successfully:', result);
      
      // Standardisiere die Antwortstruktur
      const standardizedResponse = {
        success: true,
        data: result
      };
      
      // Wenn die Daten im Wurzelobjekt sind, verschiebe sie in das data-Feld
      if (!result.data && (result.summary || result.moments)) {
        console.log('Restructuring analysis response: moving root data to data field');
        standardizedResponse.data = {
          summary: result.summary || '',
          moments: result.moments || []
        };
      }
      
      console.log('Returning standardized analysis response');
      return standardizedResponse;
    } catch (fetchError) {
      console.error('Error during analysis fetch operation:', fetchError);
      throw fetchError;
    }
  } catch (outerError) {
    console.error('Critical error in analysis function:', outerError);
    if (outerError instanceof Error && outerError.name === 'AbortError') {
      return {
        success: false,
        error: 'Server nicht erreichbar. Bitte prüfe deine Internetverbindung oder versuche es später erneut.'
      };
    } else {
      return { 
        success: false, 
        error: `Fehler bei der Analyse: ${outerError instanceof Error ? outerError.message : String(outerError)}` 
      };
    }
  }
}
