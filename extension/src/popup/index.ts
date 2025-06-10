/**
 * Popup script for the ChessGPT Lichess Integration
 * This script runs in the popup window when the user clicks the extension icon
 */

// Import API key from environment or config
import { SERVER_URL, CHESS_GPT_API_KEY } from '../config';

// Interface for the usage data response
interface UsageResponse {
  ok: boolean;
  usage?: {
    current: number;
    limit: number;
  };
  error?: string;
  errorCode?: string;
  developmentMode?: boolean; // NEU
  message?: string;          // NEU (für die Dev-Mode-Nachricht vom Server)
}

/**
 * Debug-Hilfsfunktion, um alle wichtigen Informationen im UI anzuzeigen
 * (für Entwicklungszwecke, in Produktion auskommentieren)
 */
function debugToUI(message: string): void {
  console.log('[DEBUG]', message);
  // const debugElement = document.getElementById('debug-output');
  // if (debugElement) {
  //   debugElement.innerHTML += `<div>${message}</div>`;
  // }
}

/**
 * Fetch the current usage data from the backend
 */
async function fetchUsageData(): Promise<UsageResponse> {
  const apiUrl = `${SERVER_URL}/usage`;
  debugToUI(`Fetching from URL: ${apiUrl}`);
  debugToUI(`Using API Key: ${CHESS_GPT_API_KEY.substring(0, 3)}...`);
  
  try {
    debugToUI('Starting fetch request...');
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CHESS_GPT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      // Wichtig für Extensions - keine Credentials senden
      credentials: 'omit',
      // CORS-Mode explizit setzen
      mode: 'cors'
    });

    debugToUI(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      debugToUI(`Error response: ${response.status}`);
      console.error('Error fetching usage data:', response.status, response.statusText);
      return { 
        ok: false, 
        error: `Server responded with ${response.status}`,
        errorCode: 'ERROR_SERVER_STATUS'
      };
    }

    const data = await response.json();
    debugToUI(`Response data: ${JSON.stringify(data)}`);
    return data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    debugToUI(`Fetch error: ${errorMsg}`);
    console.error('Error fetching usage data:', error);
    return { 
      ok: false, 
      error: errorMsg,
      errorCode: 'ERROR_NETWORK'
    };
  }
}

/**
 * Update the usage display with data or error message
 */
function updateUsageDisplay(data: UsageResponse): void {
  const usageDisplayElement = document.getElementById('usage-display');
  
  if (!usageDisplayElement) {
    debugToUI('Usage display element not found');
    console.error('Usage display element not found');
    return;
  }

  // NEU: Prüfen auf developmentMode
  if (data.developmentMode) {
    usageDisplayElement.textContent = data.message || "Nutzungs-Tracking im Entwicklungsmodus deaktiviert.";
    usageDisplayElement.style.color = '#888'; // Graue Farbe für Dev-Modus-Nachricht
    debugToUI(`Development mode detected. Displaying message: ${usageDisplayElement.textContent}`);
    return; // Frühzeitiger Ausstieg, da keine Nutzungsdaten angezeigt werden sollen
  }

  if (data.ok && data.usage) {
    const { current, limit } = data.usage;
    usageDisplayElement.textContent = `Analysen: ${current} von ${limit}`;
    debugToUI(`Updated display: Analysen ${current} von ${limit}`);
    
    // Optional: Style basierend auf der Nutzung
    if (current >= limit) {
      usageDisplayElement.style.color = '#d23333'; // Rot für das Limit erreicht
    } else if (current >= limit * 0.8) {
      usageDisplayElement.style.color = '#e69f00'; // Orange für nahe am Limit
    } else {
      usageDisplayElement.style.color = '#629924'; // Grün für genügend verbleibende Analysen
    }
  } else {
    usageDisplayElement.textContent = 'Fehler beim Laden der Nutzung';
    usageDisplayElement.style.color = '#d23333'; // Rot für Fehler
    
    // Logge den detaillierten Fehler
    const errorDetails = data.error || 'Unknown error';
    debugToUI(`Error in usage response: ${errorDetails}`);
    console.error('Error in usage response:', errorDetails, data.errorCode || '');
  }
}

// Initialize when popup is loaded
document.addEventListener('DOMContentLoaded', async () => {
  debugToUI('Popup loaded, DOMContentLoaded fired');
  
  const usageDisplayElement = document.getElementById('usage-display');
  
  if (!usageDisplayElement) {
    debugToUI('ERROR: Usage display element not found');
    console.error('Usage display element not found');
    return;
  }
  
  // Config-Werte ausgeben für Debugging
  debugToUI(`SERVER_URL: ${SERVER_URL}`);
  
  // Initial loading state
  usageDisplayElement.textContent = 'Nutzung wird geladen...';
  debugToUI('Set initial loading state');
  
  try {
    // Fetch and update usage data
    debugToUI('Starting to fetch usage data...');
    const usageData = await fetchUsageData();
    debugToUI('Fetch complete, updating display...');
    updateUsageDisplay(usageData);
  } catch (finalError) {
    debugToUI(`Fatal error: ${finalError instanceof Error ? finalError.message : String(finalError)}`);
    const usageDisplayElement = document.getElementById('usage-display');
    if (usageDisplayElement) {
      usageDisplayElement.textContent = 'Kritischer Fehler beim Laden';
      usageDisplayElement.style.color = '#d23333';
    }
  }
});
