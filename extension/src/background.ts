/**
 * Background script for the ChessGPT Lichess Extension
 */
import { SERVER_URL, CHESS_GPT_API_KEY } from './config';

const CACHE_CHECK_ENDPOINT = `${SERVER_URL}/check-cache`;
const ANALYZE_ENDPOINT = `${SERVER_URL}/analyze`;

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message);
  
  // Handle cache check requests
  if (message.type === 'CHECK_CACHE') {
    console.log('Processing CHECK_CACHE request');
    console.log('[LOCALE] Cache check with locale:', message.locale);
    
    fetchCacheStatus(message.pgn, message.locale)
      .then((result: any) => {
        console.log('Cache check result:', result);
        sendResponse(result);
      })
      .catch((error) => {
        console.error('Error during cache check:', error);
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
    console.log('[LOCALE] Background received locale:', message.locale);
    
    // Lokale Kopie von sendResponse für asynchrone Kontexte
    const sendResponseSafe = sendResponse;
    
    performAnalysis(message.pgn, message.locale)
      .then((result: any) => {
        console.log('Analysis result (raw):', JSON.stringify(result));
        
        // Stelle sicher, dass die Antwort konsistent ist
        let response: any = {
          success: true,
          ...result
        };
        
        // Immer alles in data kapseln, falls nicht vorhanden
        if (!response.data) {
          response.data = {};
        }
        
        // Kopiere alle relevanten Felder in data, falls sie an der Wurzel liegen
        for (const key of ['summary', 'moments', 'ok', 'error', 'details']) {
          if (typeof response[key] !== 'undefined') {
            response.data[key] = response[key];
            delete response[key];
          }
        }
        
        // Stelle sicher, dass ok: true im data-Objekt ist
        if (response.data && !('ok' in response.data)) {
          response.data.ok = true;
        }
        
        console.log('Sending normalized analysis response:', JSON.stringify(response));
        try {
          sendResponseSafe(response);
        } catch (sendError) {
          console.error('Error sending response to content script:', sendError);
        }
      })
      .catch((error: any) => {
        console.error('Error analyzing PGN:', error);
        console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('Error details:', error instanceof Error ? error.message : String(error));
        
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Detected AbortError, returning server unreachable message');
          try {
            sendResponseSafe({
              success: false,
              error: 'Server nicht erreichbar. Bitte prüfe deine Internetverbindung oder versuche es später erneut.'
            });
          } catch (sendError) {
            console.error('Error sending AbortError response:', sendError);
          }
        } else {
          const errorMessage = `Fehler bei der Analyse: ${error instanceof Error ? error.message : String(error)}`;
          console.log('Returning error message:', errorMessage);
          try {
            sendResponseSafe({ 
              success: false, 
              error: errorMessage
            });
          } catch (sendError) {
            console.error('Error sending error response:', sendError);
          }
        }
      });
    
    return true; // Indicates async response
  }
});

/**
 * Checks if a PGN is in the cache
 */
async function fetchCacheStatus(pgn: string, locale?: string) {
  console.log('Starting cache check process with endpoint:', CACHE_CHECK_ENDPOINT);
  console.log('PGN length:', pgn.length, 'First 50 chars:', pgn.substring(0, 50));
  
  try {
    console.log('Checking cache status for PGN...');
    console.log('[LOCALE] Cache check with locale:', locale);
    
    // Normalisiere PGN (Entferne Kommentare, Leerzeilen, etc.)
    const normalizedPgn = pgn.replace(/\{[^\}]*\}/g, '').replace(/\([^\)]*\)/g, '').trim();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      console.log('Sending cache check request to server...');
      const response = await fetch(`${CACHE_CHECK_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHESS_GPT_API_KEY}`
        },
        body: JSON.stringify({ 
          pgn: normalizedPgn,
          locale: locale
        }),
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
async function performAnalysis(pgn: string, locale?: string) {
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
      console.log('Sending fetch request for analysis to:', ANALYZE_ENDPOINT);
      console.log('Request payload:', { pgn: pgn.substring(0, 50) + '...', locale });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s Timeout (2 Minuten) für die Analyse, da Anthropic länger brauchen kann
      
      const response = await fetch(ANALYZE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHESS_GPT_API_KEY}`
        },
        body: JSON.stringify({ pgn, locale }),
        signal: controller.signal,
        // Konsistent mit dem Popup für CORS-Handling
        credentials: 'omit',
        mode: 'cors'
      });
      
      console.log('Fetch completed successfully, status:', response.status);
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
      
      // Debug-Logs wurden entfernt
      
      // Error handling: If backend returned ok: false, surface error and set success: false
      if (result && result.ok === false) {
        console.log('Server returned ok: false, creating error response with:', {
          error: result.error,
          details: result.details
        });
        return {
          success: false,
          error: result.error || 'Server returned an unknown error',
          details: result.details
        };
      }
      // Standardisiere die Antwortstruktur
      const standardizedResponse = {
        success: true,
        data: result
      };
      
      // Wenn die Daten im Wurzelobjekt sind, verschiebe sie in das data-Feld
      if (!result.data && (result.summary || result.moments)) {
        console.log('Restructuring analysis response: moving root data to data field');
        standardizedResponse.data = {
          ok: true, // Explizit ok:true setzen für Frontend-Checks
          summary: result.summary || '',
          moments: result.moments || []
        };
      }
      
      console.log('Returning standardized analysis response:', JSON.stringify(standardizedResponse));
      return standardizedResponse;
    } catch (fetchError: unknown) {
      console.error('Error during analysis fetch operation:', fetchError);
      if (fetchError instanceof Error) {
        console.error('Error type:', fetchError.constructor.name);
        console.error('Error message:', fetchError.message);
        console.error('Error stack:', fetchError.stack);
      } else {
        console.error('Non-Error object thrown:', typeof fetchError);
      }
      throw fetchError;
    }
  } catch (outerError: unknown) {
    console.error('Critical error in analysis function:', outerError);
    if (outerError instanceof Error) {
      console.error('Error type:', outerError.constructor.name);
      console.error('Full error details:', outerError);
      
      if (outerError.name === 'AbortError') {
        console.log('Detected AbortError, returning server unreachable message');
        return {
          success: false,
          error: 'Server nicht erreichbar. Bitte prüfe deine Internetverbindung oder versuche es später erneut.'
        };
      } else {
        const errorMessage = `Fehler bei der Analyse: ${outerError.message}`;
        console.log('Returning error message:', errorMessage);
        return { 
          success: false, 
          error: errorMessage
        };
      }
    } else {
      console.error('Non-Error object caught:', typeof outerError);
      return {
        success: false,
        error: `Fehler bei der Analyse: ${String(outerError)}`
      };
    }
  }
}
