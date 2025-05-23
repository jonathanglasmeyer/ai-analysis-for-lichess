import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { 
  fetchUserGames, 
  fetchMoreGames,
  fetchUserProfile, 
  fetchGameDetails,
  login,
  logout, 
  initAuth,
  extractCodeFromUrl,
  isAuthenticated
} from '../services/lichessApi';
import type { LichessGame } from '../services/lichessApi';

interface LichessSidebarProps {
  onSelectGame: (pgn: string) => void;
}

export function LichessSidebar({ onSelectGame }: LichessSidebarProps) {
  // Status für die Authentifizierung
  const [authenticated, setAuthenticated] = useState<boolean>(isAuthenticated());
  const [user, setUser] = useState<any>(null);
  
  // Status für die Spiele
  const [games, setGames] = useState<LichessGame[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  
  // Ref für den Observer zum infiniten Scrollen
  const observer = useRef<IntersectionObserver | null>(null);
  const lastGameElementRef = useRef<HTMLDivElement | null>(null);

  // Login-Handler - wird aufgerufen, wenn der Benutzer auf den Login-Button klickt
  const handleLogin = useCallback(async () => {
    try {
      setError(null);
      await login(); // Verwendet die neue login-Funktion, die direkt zur Lichess-Anmeldeseite weiterleitet
    } catch (err) {
      console.error('Fehler beim Login:', err);
      setError('Fehler beim Login mit Lichess');
    }
  }, []);

  // Beim Laden der Komponente die Authentifizierung initialisieren
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Prüfen, ob ein Fehler in der URL ist
        const { error: authError } = extractCodeFromUrl();
        if (authError) {
          setError(`Authentifizierungsfehler: ${authError}`);
          // Bei Fehler in der URL die URL bereinigen
          window.history.replaceState({}, document.title, window.location.pathname);
          setLoading(false);
          return;
        }
        
        // Initialisiere die Authentifizierung mit der Bibliothek
        // Diese Funktion kümmert sich automatisch um den Auth-Code in der URL
        await initAuth();
        
        // Prüfen, ob die Authentifizierung erfolgreich war
        const isAuth = isAuthenticated();
        setAuthenticated(isAuth);
        
        if (isAuth) {
          console.log('Erfolgreich bei Lichess angemeldet!');
        }
      } catch (err: any) {
        console.error('Fehler bei der Authentifizierung:', err);
        setError('Fehler bei der Authentifizierung mit Lichess');
        
        // Bei schwerwiegenden Fehlern alle OAuth-Daten zurücksetzen
        logout().catch(e => console.error('Fehler beim Logout:', e));
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);
  
  // Aktualisiere den Authentifizierungsstatus, wenn sich dieser ändert
  useEffect(() => {
    const checkAuthStatus = () => {
      const isAuth = isAuthenticated();
      if (isAuth !== authenticated) {
        setAuthenticated(isAuth);
      }
    };
    
    // Prüfe den Status sofort und dann alle 5 Sekunden
    checkAuthStatus();
    const interval = setInterval(checkAuthStatus, 5000);
    
    return () => clearInterval(interval);
  }, [authenticated]);

  // Benutzerprofil und erste Spiele laden, wenn authentifiziert
  useEffect(() => {
    if (authenticated) {
      const loadInitialData = async () => {
        try {
          setLoading(true);
          setError(null);
          
          // Benutzerprofil laden
          const profile = await fetchUserProfile();
          setUser(profile);
          
          // Erste Spiele des Benutzers laden
          const userGames = await fetchUserGames(profile.username, { max: 30 });
          setGames(userGames);
          setHasMore(userGames.length === 30); // Wenn 30 Spiele geladen wurden, gibt es wahrscheinlich mehr
        } catch (err: any) {
          console.error('Fehler beim Laden der Lichess-Daten:', err);
          setError('Fehler beim Laden der Lichess-Daten. Bitte versuchen Sie es erneut.');
          
          // Bei Authentifizierungsfehler abmelden
          if (axios.isAxiosError(err) && err.response?.status === 401) {
            handleLogout();
          }
        } finally {
          setLoading(false);
        }
      };

      loadInitialData();
    }
  }, [authenticated]);
  
  // Funktion zum Laden weiterer Spiele
  const loadMoreGames = useCallback(async () => {
    if (loading || !user || !hasMore) return;
    
    try {
      setLoading(true);
      console.log('Lade weitere Spiele mit zeitbasierter Paginierung');
      
      // Übergebe das aktuelle Spiele-Array anstelle eines Zählers
      // Die Funktion verwendet nun das älteste Spiel für die zeitbasierte Paginierung
      const moreGames = await fetchMoreGames(user.username, games, 50);
      console.log('Erhaltene Spiele:', moreGames.length);
      
      if (moreGames.length === 0) {
        console.log('Keine weiteren Spiele gefunden');
        setHasMore(false);
      } else {
        // Prüfe auf doppelte IDs, bevor wir die neuen Spiele hinzufügen
        const existingIds = new Set(games.map(game => game.id));
        const uniqueNewGames = moreGames.filter(game => !existingIds.has(game.id));
        
        console.log('Eindeutige neue Spiele:', uniqueNewGames.length);
        
        if (uniqueNewGames.length === 0) {
          console.log('Keine eindeutigen neuen Spiele gefunden');
          setHasMore(false);
        } else {
          setGames(prevGames => [...prevGames, ...uniqueNewGames]);
          
          // Prüfen, ob es wahrscheinlich weitere Spiele gibt
          // Wenn wir weniger als die angeforderte Batch-Größe erhalten haben, gibt es wahrscheinlich keine weiteren
          setHasMore(moreGames.length >= 30);
        }
      }
    } catch (err) {
      console.error('Fehler beim Laden weiterer Spiele:', err);
      setError('Fehler beim Laden weiterer Spiele');
    } finally {
      setLoading(false);
    }
  }, [loading, user, games, hasMore]);
  
  // Intersection Observer für infinites Scrollen
  useEffect(() => {
    if (loading) return;
    
    // Observer-Cleanup-Funktion
    if (observer.current) {
      observer.current.disconnect();
    }

    // Neuen Observer erstellen
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        console.log('Letztes Element sichtbar, lade weitere Spiele...');
        loadMoreGames();
      }
    });

    // Letztes Spielelement beobachten, wenn vorhanden
    if (lastGameElementRef.current) {
      console.log('Beobachte letztes Spielelement');
      observer.current.observe(lastGameElementRef.current);
    } else {
      console.log('Kein letztes Spielelement gefunden');
    }
    
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [loading, hasMore, loadMoreGames]);

  // Hilfsfunktion zur formatierung des Spieltyps
  const formatGameType = (game: LichessGame) => {
    let type = game.speed || 'Standard';
    if (game.rated) {
      return `${type} • Rated`;
    }
    return type;
  };
  
  // Hilfsfunktion zur Formatierung des Ergebnisses
  const getResultText = (status: string, winner?: 'white' | 'black' | null) => {
    if (status === 'draw') return 'Remis';
    if (status === 'mate' || status === 'resign' || status === 'timeout') {
      if (winner === 'white') return 'Weiß gewinnt';
      if (winner === 'black') return 'Schwarz gewinnt';
    }
    return status;
  };
  
  // Hilfsfunktion zur Formatierung des Datums
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('de-DE', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Spiel auswählen und PGN an übergeordnete Komponente übergeben
  const handleSelectGame = useCallback(async (game: LichessGame) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedGameId(game.id); // Markiere das ausgewählte Spiel
      
      // Wenn das PGN bereits vorhanden ist, verwenden wir es direkt
      if (game.pgn) {
        onSelectGame(game.pgn);
        return;
      }
      
      // Ansonsten laden wir die Spieldetails, um das PGN zu erhalten
      const gameDetails = await fetchGameDetails(game.id);
      if (gameDetails.pgn) {
        onSelectGame(gameDetails.pgn);
      } else {
        setError('PGN für dieses Spiel nicht verfügbar');
      }
    } catch (err) {
      console.error('Fehler beim Laden der Spieldetails:', err);
      setError('Fehler beim Laden der Spieldetails');
    } finally {
      setLoading(false);
    }
  }, [onSelectGame]);

  // Abmelden
  const handleLogout = useCallback(async () => {
    try {
      await logout(); // Verwendet die neue logout-Funktion
      setAuthenticated(false);
      setUser(null);
      setGames([]);
      setHasMore(true);
    } catch (error) {
      console.error('Fehler beim Abmelden:', error);
      setError('Fehler beim Abmelden');
    }
  }, []);

  // Login-Ansicht anzeigen, wenn nicht authentifiziert
  if (!authenticated) {
    return (
      <div className="h-full flex flex-col justify-center items-center p-8">
        <div className="text-center mb-6">
          <h2 className="text-base font-medium text-gray-800 mb-3">Lichess Games</h2>
          <p className="text-gray-500 text-sm mb-6">Verbinden Sie Ihr Lichess-Konto, um Ihre Partien zu sehen und zu analysieren.</p>
          
          <button
            onClick={handleLogin}
            className="w-full max-w-xs text-center px-4 py-2.5 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            Mit Lichess verbinden
          </button>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded text-red-600 text-xs w-full max-w-xs">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="flex justify-between items-center px-5 py-3 sticky top-0 bg-white z-10 border-b border-gray-100">
        <h2 className="text-base font-medium text-gray-800">Lichess Partien</h2>
        {user && (
          <div className="flex items-center text-gray-700">
            <span className="text-sm mr-2">{user.username}</span>
            <button
              onClick={handleLogout}
              className="text-xs p-1.5 text-gray-500 rounded hover:bg-gray-100 transition-colors"
              aria-label="Abmelden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="px-5 py-2 border-l-2 border-red-400 bg-red-50 text-red-600 text-xs mt-2">
          {error}
        </div>
      )}
      
      {games.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center p-10 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-gray-300">
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <path d="M12 11h4"/>
            <path d="M12 16h4"/>
            <path d="M8 11h.01"/>
            <path d="M8 16h.01"/>
          </svg>
          <p className="text-sm">Keine Partien gefunden</p>
        </div>
      ) : (
        <div className="py-2 space-y-1 px-3">
          {games.map((game, index) => (
            <div
              key={game.id}
              ref={index === games.length - 1 ? lastGameElementRef : null}
              className={`p-3 rounded cursor-pointer border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-all duration-150 ${selectedGameId === game.id ? 'bg-blue-50 border-blue-100' : ''}`}
              onClick={() => handleSelectGame(game)}
            >
              <div className="flex justify-between items-start mb-2">
                {/* Spielerinformationen */}
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="inline-block w-2 h-2 bg-white border border-gray-300 mr-1.5 rounded-sm"></span>
                    <span className="text-sm text-gray-800">{game.players?.white?.user?.name || 'Weiß'}</span>
                    {game.players?.white?.rating && (
                      <span className="ml-1 text-gray-400 text-xs">{game.players.white.rating}</span>
                    )}
                  </div>
                  <div className="flex items-center mt-1.5">
                    <span className="inline-block w-2 h-2 bg-gray-800 border border-gray-300 mr-1.5 rounded-sm"></span>
                    <span className="text-sm text-gray-800">{game.players?.black?.user?.name || 'Schwarz'}</span>
                    {game.players?.black?.rating && (
                      <span className="ml-1 text-gray-400 text-xs">{game.players.black.rating}</span>
                    )}
                  </div>
                </div>
                
                {/* Badge und Datum */}
                <div>
                  <div className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 inline-block">
                    {formatGameType(game)}
                  </div>
                </div>
              </div>
              
              {/* Ergebnis und Anzahl der Züge */}
              <div className="mt-1 text-xs flex justify-between items-center">
                <div className="text-gray-500">
                  {getResultText(game.status, game.winner)} • 
                  {game.moves?.length ? `${Math.ceil(game.moves.length / 2)} Züge` : 'Keine Züge'}
                </div>
                <span className="text-gray-400">{formatDate(game.createdAt)}</span>
              </div>
            </div>
          ))}
        
        {loading && (
          <div className="text-center py-2 mt-2">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-900 mr-2"></div>
            Lädt weitere Partien...
          </div>
        )}
      </div>
    )}
  </div>
  );
}
