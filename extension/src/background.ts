/**
 * Background script for the ChessGPT Lichess Extension
 */
import { SERVER_URL, CHESS_GPT_API_KEY } from './config';
import { supabase } from './supabaseClient';
import i18next, { setupI18n } from './i18n';

// Log Supabase client status on startup
if (supabase) {
  console.log('Supabase client initialized successfully in background script.');
} else {
  console.error('Supabase client failed to initialize in background script. Check config and Supabase status.');
}

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
  
  // Handle usage data requests
  if (message.type === 'GET_USAGE') {
    console.log('Background: Processing GET_USAGE request');
    fetchUsageData().then(sendResponse);
    return true; // Indicates asynchronous response
  }

  // Handle Google Login requests from popup
  if (message.type === 'GOOGLE_LOGIN') {
    console.log('Background: Processing GOOGLE_LOGIN request', message);
    const { authUrl, rawNonce } = message;

    if (!supabase) {
      console.error('Background: Supabase client not initialized for GOOGLE_LOGIN.');
      sendResponse({ success: false, error: 'Supabase client not available in background.', errorKey: 'popup.error.supabaseInit' });
      return false; // Synchronous response for this specific error
    }

    (async () => {
      try {
        const resultUrl = await new Promise<string>((resolve, reject) => {
          chrome.identity.launchWebAuthFlow(
            { url: authUrl, interactive: true },
            (responseUrl?: string) => {
              if (chrome.runtime.lastError) {
                console.error('Background: launchWebAuthFlow error:', chrome.runtime.lastError.message);
                return reject(new Error(chrome.runtime.lastError.message || 'Authentication flow error.'));
              }
              if (!responseUrl) {
                console.warn('[BACKGROUND] GOOGLE_LOGIN: Authentication flow was cancelled by the user or failed (responseUrl is undefined).');
                sendResponse({ success: false, error: 'Authentication flow cancelled or failed.', errorKey: 'popup.error.userCancelled' });
                return;
              }
              console.log('[BACKGROUND] GOOGLE_LOGIN: Auth flow successful, result URL:', responseUrl);
              resolve(responseUrl);
            }
          );
        });

        const url = new URL(resultUrl);
        const params = new URLSearchParams(url.hash.substring(1)); // Google puts params in hash for ID token
        const idToken = params.get('id_token');

        if (!idToken) {
          console.error('[BACKGROUND] GOOGLE_LOGIN: ID token not found in auth response. Full response URL might be missing hash or id_token parameter.');
          sendResponse({ success: false, error: 'ID token not found.', errorKey: 'popup.error.googleAuth' });
          return;
        }

        console.log('[BACKGROUND] GOOGLE_LOGIN: Extracted ID Token (first 10 chars):', idToken.substring(0, 10));
        console.log('[BACKGROUND] GOOGLE_LOGIN: ID Token extracted, attempting Supabase sign-in...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
          nonce: rawNonce, // Use the raw nonce here for Supabase to verify
        });

        if (signInError) {
          console.error('[BACKGROUND] GOOGLE_LOGIN: Supabase signInWithIdToken error:', signInError.message, signInError);
          sendResponse({ success: false, error: signInError.message, errorKey: 'popup.error.supabaseSignIn' });
          return;
        }

        if (signInData.user) {
          console.log(`[BACKGROUND] GOOGLE_LOGIN: Successfully signed in with Supabase. User ID: ${signInData.user.id} Email: ${signInData.user.email}`);

          // Initialize i18n to show notification in the correct language
          // The language is sent from the popup
          await setupI18n(message.lang || 'en');

          // Show notification to guide the user
          const notificationId = `login-success-${Date.now()}`;
          console.log('[BACKGROUND] Attempting to create notification...');
          chrome.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon128.png'),
            title: i18next.t('notification.login.title'),
            message: i18next.t('notification.login.message'),
            priority: 2
          }, (createdId) => {
            if (chrome.runtime.lastError) {
              console.error('[BACKGROUND] Notification creation failed:', chrome.runtime.lastError.message);
            } else {
              console.log(`[BACKGROUND] Notification successfully created with ID: ${createdId}`);
            }
          });

          sendResponse({ success: true, user: signInData.user });
        } else {
          console.warn('[BACKGROUND] GOOGLE_LOGIN: Supabase signInWithIdToken did not return a user, though no error was reported. Response data:', signInData);
          sendResponse({ success: false, error: 'No user data returned from Supabase.', errorKey: 'popup.error.supabaseNoUser' });
        }
      } catch (error: unknown) {
        console.error('Background: An error occurred during Google sign-in:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        let errorKey = 'popup.error.googleAuth'; // Default error key
        if (errorMessage.includes('cancelled by the user')) {
          errorKey = 'popup.error.userCancelled';
        }
        sendResponse({ success: false, error: errorMessage, errorKey });
      }
    })(); // Immediately invoke async function

    return true; // Indicates async response will be sent
  }

  if (message.type === 'ANALYZE_PGN') {
    console.log('Processing ANALYZE_PGN request');
    console.log('[LOCALE] Background received locale:', message.locale);
    
    // Lokale Kopie von sendResponse für asynchrone Kontexte
    const sendResponseSafe = sendResponse;
    
    performAnalysis(message.pgn, message.locale)
      .then((result: any) => {
        console.log('Analysis result (raw):', JSON.stringify(result));
        
        // Stelle sicher, dass die Antwort konsistent ist
        const response: any = {
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
 * Fetches usage data from the server
 */
async function fetchUsageData() {
  const usageUrl = `${SERVER_URL}/usage`;
  console.log('Background: Fetching usage data from', usageUrl);
  
  try {
    const response = await fetch(usageUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHESS_GPT_API_KEY}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Background: HTTP error! status: ${response.status}`, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Background: Usage data fetched successfully:', data);
    return data;
  } catch (error) {
    console.error('Background: Failed to fetch usage data:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { ok: false, error: 'Serververbindung für Nutzungsdaten fehlgeschlagen', details: errorMessage };
  }
}

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
    const normalizedPgn = pgn.replace(/{[^}]*}/g, '').replace(/\([^)]*\)/g, '').trim();
    
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
      console.error('Error analyzing PGN, but no specific error message provided.');
      return { 
        ok: false,
        error: 'Unbekannter Fehler bei der Cache-Prüfung.'
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
