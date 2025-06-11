/**
 * API Service for ChessGPT Lichess Extension
 */




export interface CacheCheckResponse {
  ok?: boolean;
  error?: string;
  details?: string;
  inCache?: boolean;
  summary?: string;
  moments?: AnalysisMoment[];
  data?: {
    ok?: boolean;
    error?: string;
    summary?: string;
    moments?: AnalysisMoment[];
  };
  originalResponse?: {
    analysis?: {
      summary?: string;
      moments?: AnalysisMoment[];
    }
  };
}

export interface AnalysisResponse {
  success?: boolean;
  error?: string;
  details?: string;
  data?: {
    ok?: boolean;
    error?: string;
    summary?: string;
    moments?: AnalysisMoment[];
  };
}

// Interface for the usage data response
export interface UsageResponse {
  ok: boolean;
  usage?: {
    current: number;
    limit: number;
  };
  error?: string;
  errorCode?: string;
  developmentMode?: boolean;
  message?: string;
}

export interface AnalysisMoment {
  ply: number;
  move: string;
  color: string; // 'white' oder 'black'
  comment: string;
  isValidMove?: boolean; // Wird nicht mehr für Empfehlungen verwendet
}

/**
 * Checks if a PGN is already in the cache
 */
export function requestCacheCheck(pgn: string, locale?: string): Promise<CacheCheckResponse> {
  return new Promise((resolve) => {
    console.log('[LOCALE] checkCache called with locale:', locale);
    console.log('Sending cache check request for PGN:', pgn.substring(0, 50) + '...');
    
    try {
      chrome.runtime.sendMessage(
        { type: 'CHECK_CACHE', pgn, locale },
        (response: CacheCheckResponse) => {
          console.log('Received cache check response:', JSON.stringify(response));
          
          // Stellen sicher, dass die Antwort der erwarteten Struktur entspricht
          if (!response) {
            console.warn('Empty response received from background script');
            resolve({ ok: false, error: 'Keine Antwort vom Hintergrundskript erhalten' });
            return;
          }
          
          resolve(response);
        }
      );
    } catch (error) {
      console.error('Error sending message to background script:', error);
      resolve({ ok: false, error: 'Fehler bei der Kommunikation mit dem Hintergrundskript' });
    }
  });
}

/**
 * Sends a PGN for analysis
 */
export function requestAnalysis(pgn: string, locale?: string): Promise<AnalysisResponse> {
  return new Promise((resolve) => {
    console.log('Sending analysis request for PGN:', pgn.substring(0, 50) + '...');
    console.log('[LOCALE] API requestAnalysis received locale:', locale);
    
    let didRespond = false;
    try {
      chrome.runtime.sendMessage(
        { type: 'ANALYZE_PGN', pgn, locale },
        (response: AnalysisResponse) => {
          didRespond = true;
          console.log('Received analysis response');
          // Ensure structured error for empty/undefined response
          if (!response || typeof response !== 'object') {
            console.warn('Empty or invalid analysis response received from background script');
            resolve({ success: false, error: 'Server nicht erreichbar. Bitte prüfe deine Internetverbindung oder versuche es später erneut.' });
            return;
          }
          resolve(response);
        }
      );
      // Fallback: if callback not called, resolve after timeout
      // Erhöhe Timeout auf 60 Sekunden, da die Analyse länger dauern kann
      setTimeout(() => {
        if (!didRespond) {
          console.log('[DEBUG] Timeout reached (60s), callback never called!');
          resolve({ success: false, error: 'Server nicht erreichbar. Bitte prüfe deine Internetverbindung oder versuche es später erneut.' });
        }
      }, 60000);
    } catch (error) {
      console.error('Error sending analysis request to background script:', error);
      resolve({ success: false, error: 'Fehler bei der Kommunikation mit dem Hintergrundskript' });
    }
  });
}

/**
 * Fetch the current usage data from the backend
 */
export function requestUsageData(): Promise<UsageResponse> {
  return new Promise((resolve) => {
    console.log('[API Service] Requesting usage data from background script.');
    try {
      chrome.runtime.sendMessage({ type: 'GET_USAGE' }, (response: UsageResponse) => {
        if (chrome.runtime.lastError) {
          console.error('Error receiving usage data:', chrome.runtime.lastError.message);
          resolve({ ok: false, error: 'Kommunikationsfehler mit der Erweiterung.' });
          return;
        }
        if (!response) {
          console.warn('Leere Antwort vom Hintergrundskript für GET_USAGE erhalten.');
          resolve({ ok: false, error: 'Keine Antwort vom Hintergrundskript erhalten.' });
          return;
        }
        console.log('[API Service] Received usage data:', response);
        resolve(response);
      });
    } catch (error) {
      console.error('Fehler beim Senden der GET_USAGE Nachricht:', error);
      resolve({ ok: false, error: 'Fehler bei der Kommunikation mit dem Hintergrundskript.' });
    }
  });
}
