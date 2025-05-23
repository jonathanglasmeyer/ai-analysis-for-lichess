import axios from 'axios';
import { OAuth2AuthCodePKCE } from '@bity/oauth2-auth-code-pkce';
import type { AccessContext, HttpClient } from '@bity/oauth2-auth-code-pkce';

// Lichess API Konfiguration
const LICHESS_HOST = 'https://lichess.org';
const LICHESS_API_URL = `${LICHESS_HOST}/api`;
const CLIENT_ID = 'chess-gpt-analysis'; // Ein einfacher Bezeichner für die Anwendung
const REDIRECT_URI = window.location.origin;

// Wir verwenden keinen Scope, da wir nur öffentliche Daten benötigen
// Ein leerer Scope gibt uns Zugriff auf das Benutzerprofil, was ausreicht
const SCOPES: string[] = [];

// Entwicklungsmodus für einfaches Testen ohne OAuth
const DEVELOPMENT_MODE = false;

// OAuth Client erstellen, genau wie im offiziellen Lichess-Beispiel
const oauth = new OAuth2AuthCodePKCE({
  authorizationUrl: `${LICHESS_HOST}/oauth`,
  tokenUrl: `${LICHESS_API_URL}/token`, // WICHTIG: /api/token statt /oauth/token für CORS
  clientId: CLIENT_ID,
  scopes: SCOPES,
  redirectUrl: REDIRECT_URI,
  onAccessTokenExpiry: refreshAccessToken => refreshAccessToken(),
  onInvalidGrant: _retry => {
    console.log('Ungültiger Grant erkannt, setze OAuth-Status zurück');
    return false;
  },
});

// Typen für Lichess-Daten
export interface LichessGame {
  id: string;
  rated: boolean;
  variant: string;
  speed: string;
  perf: string;
  createdAt: number;
  lastMoveAt: number;
  status: string;
  players: {
    white: {
      user: {
        name: string;
        id: string;
      };
      rating: number;
    };
    black: {
      user: {
        name: string;
        id: string;
      };
      rating: number;
    };
  };
  pgn?: string;
}

// Legacy-Funktion, um Abwärtskompatibilität zu gewährleisten
// Diese wird durch login() ersetzt, bleibt aber für bestehenden Code verfügbar
export const getLoginUrl = async (): Promise<{ url: string, codeVerifier: string }> => {
  try {
    // Wir erstellen hier einen URL-String für die Komponente, anstatt eine automatische Umleitung durchzuführen
    const authorizationUrl = new URL(`${LICHESS_HOST}/oauth`);
    const pkceData = await OAuth2AuthCodePKCE.generatePKCECodes();
    const state = OAuth2AuthCodePKCE.generateRandomState(16);
    
    // URL-Parameter setzen
    authorizationUrl.searchParams.append('response_type', 'code');
    authorizationUrl.searchParams.append('client_id', CLIENT_ID);
    authorizationUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authorizationUrl.searchParams.append('code_challenge', pkceData.codeChallenge);
    authorizationUrl.searchParams.append('code_challenge_method', 'S256');
    authorizationUrl.searchParams.append('state', state);
    if (SCOPES.length > 0) {
      authorizationUrl.searchParams.append('scope', SCOPES.join(' '));
    }
    
    // CodeVerifier für späteren Austausch bereitstellen
    // Hinweis: Die neue OAuth-Bibliothek verwaltet dies intern
    
    return {
      url: authorizationUrl.toString(),
      codeVerifier: pkceData.codeVerifier
    };
  } catch (error) {
    console.error('Fehler beim Generieren der Login-URL:', error);
    throw error;
  }
};

/**
 * Clientseitige OAuth-Implementierung
 * 
 * Diese Implementierung nutzt die @bity/oauth2-auth-code-pkce Bibliothek für den vollständig
 * clientseitigen OAuth-Flow, ohne einen Backend-Server zu benötigen.
 * Der Code basiert auf dem offiziellen Lichess-API-Beispiel.
 */

// Authentifizierungsstatus initialisieren und Token abrufen
let accessContext: AccessContext | undefined;
let decoratedFetch: HttpClient | undefined;

// Hilfsfunktion zum direkten Austausch des Auth-Codes gegen ein Token
const directTokenExchange = async (code: string): Promise<string | null> => {
  try {
    console.log('Verwende direkten Token-Austausch als Fallback');
    
    // Direkter Austausch mit dem Token-Endpunkt ohne PKCE
    const response = await fetch(`${LICHESS_API_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token-Austausch fehlgeschlagen: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    return data.access_token || null;
  } catch (error) {
    console.error('Fehler beim direkten Token-Austausch:', error);
    return null;
  }
};

// Initialisierung der Authentifizierung - mit verbesserter Fehlerbehandlung und Fallback
export const initAuth = async (): Promise<void> => {
  try {
    // Wenn im Entwicklungsmodus, prüfen wir nicht auf OAuth
    if (DEVELOPMENT_MODE && localStorage.getItem('lichess_dev_token')) {
      console.log('Entwicklungsmodus aktiv, verwende Test-Token');
      return;
    }

    // Prüfen, ob ein Auth-Code in der URL ist
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      try {
        // Versuche zu prüfen, ob der Benutzer von der Auth-Seite zurückkommt
        // Diese Funktion wirft einen Fehler, wenn der state-Parameter nicht stimmt
        const hasAuthCode = await oauth.isReturningFromAuthServer();
        
        if (hasAuthCode) {
          console.log('Auth-Code in URL gefunden, tausche gegen Token');
          
          // Zugangstoken abrufen, wenn wir von der Auth-Seite zurückgekommen sind
          accessContext = await oauth.getAccessToken();
          
          // HTTP-Client mit Token dekorieren für API-Anfragen
          decoratedFetch = oauth.decorateFetchHTTPClient(window.fetch);
          
          // Wenn wir ein Token erhalten haben, speichern wir es
          if (accessContext?.token?.value) {
            console.log('Access Token erfolgreich erhalten');
            
            // URL bereinigen
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      } catch (stateError) {
        console.error('State-Parameter-Fehler, versuche direkten Austausch:', stateError);
        
        // Bei State-Parameter-Fehler versuchen wir den direkten Austausch als Fallback
        const token = await directTokenExchange(code);
        
        if (token) {
          console.log('Direkter Token-Austausch erfolgreich');
          
          // OAuth-Daten zurücksetzen und dann manuell das Token setzen
          oauth.reset();
          
          // Token manuell in den localStorage speichern
          // Die Bibliothek wird es beim nächsten Laden verwenden
          localStorage.setItem('oauth2-token-storage', JSON.stringify({
            accessToken: token,
            expiresAt: Date.now() + 3600 * 1000, // 1 Stunde Gültigkeit
            refreshToken: null
          }));
          
          // URL bereinigen
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Neu initialisieren, um das Token zu laden
          return initAuth();
        } else {
          // Bei Fehler alle OAuth-Daten zurücksetzen
          oauth.reset();
          localStorage.removeItem('oauth2-token-storage');
          localStorage.removeItem('oauth2-state');
          localStorage.removeItem('oauth2-code-verifier');
          
          // URL bereinigen, damit wir nicht in einer Schleife landen
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } else if (oauth.isAuthorized()) {
      console.log('Bereits autorisiert, aktualisiere Token');
      
      try {
        // Wenn bereits autorisiert, Token abrufen und HTTP-Client aktualisieren
        accessContext = await oauth.getAccessToken();
        decoratedFetch = oauth.decorateFetchHTTPClient(window.fetch);
      } catch (tokenError) {
        console.error('Fehler beim Abrufen des Tokens:', tokenError);
        oauth.reset();
      }
    }
  } catch (error) {
    console.error('Fehler bei der Authentifizierung:', error);
    oauth.reset();
  }
};

// Leitet zur Lichess-Anmeldeseite weiter
// Leitet zur Lichess-Anmeldeseite weiter - nach dem offiziellen Beispiel
export const login = async (): Promise<void> => {
  try {
    // Das wird zur Lichess-Anmeldeseite umleiten
    await oauth.fetchAuthorizationCode();
  } catch (error) {
    console.error('Fehler beim Login:', error);
    throw error;
  }
};

// Abmelden und Token widerrufen - nach dem offiziellen Beispiel
export const logout = async (): Promise<void> => {
  try {
    const token = accessContext?.token?.value;
    
    // Lokale Daten zurücksetzen
    accessContext = undefined;
    decoratedFetch = undefined;
    oauth.reset();
    
    // Token am Lichess-Server widerrufen
    if (token) {
      await fetch(`${LICHESS_API_URL}/token`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    console.log('Erfolgreich abgemeldet');
  } catch (error) {
    console.error('Fehler beim Logout:', error);
    throw error;
  }
};

// Legacy-Funktion für Kompatibilität mit bestehenden Komponenten
// Alias für logout
export const removeToken = async (): Promise<void> => {
  return logout();
};

// Extrahiere den Autorisierungscode aus der URL (nützlich für die Fehlerbehandlung und UI-Updates)
export const extractCodeFromUrl = (): { code: string | null; error: string | null } => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');
  const errorDescription = urlParams.get('error_description');
  
  return { 
    code, 
    error: error ? `${error}: ${errorDescription || ''}` : null 
  };
};

// Token-Management-Funktionen

// Prüfen, ob der Benutzer bereits authentifiziert ist
export const isAuthenticated = (): boolean => {
  return oauth.isAuthorized();
};

// Access Token für API-Anfragen abrufen
export const getToken = async (): Promise<string | null> => {
  try {
    if (!oauth.isAuthorized()) return null;
    
    // Token vom OAuth-Client abrufen oder erneuern
    accessContext = await oauth.getAccessToken();
    return accessContext.token?.value || null;
  } catch (error) {
    console.error('Fehler beim Abrufen des Tokens:', error);
    return null;
  }
};

// Dekorierte Fetch-Funktion für einfache API-Anfragen
export const getAuthenticatedFetch = async (): Promise<HttpClient> => {
  if (!decoratedFetch) {
    // Falls noch nicht initialisiert, versuchen wir es zu initialisieren
    await initAuth();
    if (!decoratedFetch && oauth.isAuthorized()) {
      // Wenn autorisiert, aber decoratedFetch noch nicht gesetzt ist
      decoratedFetch = oauth.decorateFetchHTTPClient(window.fetch);
    } else if (!decoratedFetch) {
      // Wenn nicht autorisiert, verwenden wir eine einfache Variante
      return async (url, options = {}) => {
        const token = await getToken();
        if (token) {
          const headers = { ...options.headers, Authorization: `Bearer ${token}` };
          return fetch(url, { ...options, headers });
        }
        return fetch(url, options);
      };
    }
  }
  return decoratedFetch;
};

// API-Client erstellen (mit oder ohne Token)
export const createApiClient = async () => {
  const token = await getToken();
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return axios.create({
    baseURL: LICHESS_API_URL,
    headers,
    timeout: 10000,
  });
};

// Benutzerprofil abrufen
export const fetchUserProfile = async (): Promise<any> => {
  try {
    // Authentifizierte Fetch-Funktion verwenden
    const authFetch = await getAuthenticatedFetch();
    const response = await authFetch(`${LICHESS_API_URL}/account`);
    
    if (!response.ok) {
      throw new Error(`Fehler beim Abrufen des Benutzerprofils: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Fehler beim Abrufen des Benutzerprofils:', error);
    throw error;
  }
};

// Funktion zum Abrufen der Spiele eines Benutzers
export const fetchUserGames = async (
  username: string, 
  options: {
    max?: number,
    since?: number,
    until?: number,
    rated?: boolean,
    perfType?: string,
    color?: 'white' | 'black',
    analysed?: boolean,
    withAnalysis?: boolean,
    ongoing?: boolean,
    finished?: boolean,
  } = {}
): Promise<LichessGame[]> => {
  try {
    // Default Parameter setzen
    const params = new URLSearchParams({
      pgnInJson: 'true', // PGN im JSON-Format erhalten
      ...Object.fromEntries(
        Object.entries(options)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)])
      )
    });

    // Wenn max nicht definiert ist, setzen wir einen hohen Wert, um mehr Spiele zu laden
    if (!options.max) {
      params.set('max', '100'); // Erhöhen auf 100 für effizienteres Laden
    }

    // URL mit Parametern erstellen
    const url = `${LICHESS_API_URL}/games/user/${username}?${params.toString()}`;
    
    console.log(`Lade Spiele von ${url}`);
    
    // Authentifizierte Fetch-Funktion verwenden
    const authFetch = await getAuthenticatedFetch();
    const response = await authFetch(url, {
      headers: {
        'Accept': 'application/x-ndjson' // NDJSON-Format akzeptieren
      }
    });

    if (!response.ok) {
      throw new Error(`Fehler beim Abrufen der Spiele: ${response.status}`);
    }

    // Text der Antwort abrufen
    const text = await response.text();

    // NDJSON parsen (jede Zeile ist ein eigenständiges JSON-Objekt)
    const games: LichessGame[] = text
      .trim()
      .split('\n')
      .filter((line: string) => line.trim() !== '')
      .map((line: string) => JSON.parse(line));

    console.log(`${games.length} Spiele geladen`);
    return games;
  } catch (error) {
    console.error('Fehler beim Abrufen der Spiele:', error);
    throw error;
  }
};

// Funktion zum inkrementellen Laden mit zeitbasierter Paginierung
export const fetchMoreGames = async (
  username: string,
  currentGames: LichessGame[],
  batchSize: number = 50,
  additionalOptions: Record<string, any> = {}
): Promise<LichessGame[]> => {
  // Wenn keine aktuellen Spiele vorhanden sind, lade die ersten Spiele
  if (!currentGames || currentGames.length === 0) {
    return fetchUserGames(username, {
      max: batchSize,
      ...additionalOptions
    });
  }

  // Finde das Datum des ältesten Spiels in der aktuellen Liste
  // Lichess sortiert Spiele nach Datum absteigend (neueste zuerst)
  const oldestGame = currentGames[currentGames.length - 1];
  
  if (!oldestGame || !oldestGame.createdAt) {
    console.warn('Konnte kein gültiges ältestes Spiel finden, lade ohne until-Parameter');
    return fetchUserGames(username, {
      max: batchSize,
      ...additionalOptions
    });
  }
  
  // Verwende das Datum des ältesten Spiels als 'until'-Parameter
  // Subtrahiere 1 Millisekunde, um das älteste Spiel auszuschließen
  const untilTimestamp = oldestGame.createdAt - 1;
  
  console.log(`Lade Spiele vor ${new Date(untilTimestamp).toISOString()}`);
  
  return fetchUserGames(username, {
    max: batchSize,
    until: untilTimestamp,
    ...additionalOptions
  });
};

// Spieldetails abrufen
export const fetchGameDetails = async (gameId: string): Promise<LichessGame> => {
  try {
    // Authentifizierte Fetch-Funktion verwenden
    const authFetch = await getAuthenticatedFetch();
    const response = await authFetch(`${LICHESS_API_URL}/game/${gameId}?pgnInJson=true`);

    if (!response.ok) {
      throw new Error(`Fehler beim Abrufen der Spieldetails: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Fehler beim Abrufen der Spieldetails:', error);
    throw error;
  }
};
