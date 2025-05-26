/**
 * API Service for ChessGPT Lichess Extension
 */

// API Endpoints
const CACHE_CHECK_ENDPOINT = 'https://chessgpt.com/api/check-cache';
const ANALYZE_ENDPOINT = 'https://chessgpt.com/api/analyze';

export interface CacheCheckResponse {
  ok?: boolean;
  error?: string;
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
  data?: {
    summary?: string;
    moments?: AnalysisMoment[];
  };
}

export interface AnalysisMoment {
  ply: number;
  comment: string;
  recommendation?: string;
  reasoning?: string;
}

/**
 * Checks if a PGN is already in the cache
 */
export function requestCacheCheck(pgn: string): Promise<CacheCheckResponse> {
  return new Promise((resolve) => {
    console.log('Sending cache check request for PGN:', pgn.substring(0, 50) + '...');
    
    try {
      chrome.runtime.sendMessage(
        { type: 'CHECK_CACHE', pgn },
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
export function requestAnalysis(pgn: string): Promise<AnalysisResponse> {
  return new Promise((resolve) => {
    console.log('Sending analysis request for PGN:', pgn.substring(0, 50) + '...');
    
    try {
      chrome.runtime.sendMessage(
        { type: 'ANALYZE_PGN', pgn },
        (response: AnalysisResponse) => {
          console.log('Received analysis response:', JSON.stringify(response));
          
          // Stellen sicher, dass die Antwort der erwarteten Struktur entspricht
          if (!response) {
            console.warn('Empty analysis response received from background script');
            resolve({ success: false, error: 'Keine Antwort vom Hintergrundskript erhalten' });
            return;
          }
          
          resolve(response);
        }
      );
    } catch (error) {
      console.error('Error sending analysis request to background script:', error);
      resolve({ success: false, error: 'Fehler bei der Kommunikation mit dem Hintergrundskript' });
    }
  });
}
