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
        loadMoreGames();
      }
    });

    // Letztes Spielelement beobachten, wenn vorhanden
    if (lastGameElementRef.current) {
      observer.current.observe(lastGameElementRef.current);
    }
    
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [loading, hasMore, games]);
  
  // Funktion zum Laden weiterer Spiele
  const loadMoreGames = async () => {
    if (!user || loading || !hasMore) return;
    
    try {
      setLoading(true);
      const moreGames = await fetchMoreGames(user.username, games.length);
      
      if (moreGames.length === 0) {
        setHasMore(false);
      } else {
        setGames(prev => [...prev, ...moreGames]);
        setHasMore(moreGames.length === 30);
      }
    } catch (err) {
      console.error('Fehler beim Laden weiterer Spiele:', err);
      setError('Fehler beim Laden weiterer Spiele');
    } finally {
      setLoading(false);
    }
  };
  
  // Axios ist bereits importiert

  // Spiel auswählen und PGN an übergeordnete Komponente übergeben
  const handleSelectGame = useCallback(async (game: LichessGame) => {
    try {
      setLoading(true);
      setError(null);
      
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
      <div className="border rounded p-4 bg-white h-full">
        <h2 className="text-lg font-bold mb-4">Lichess Verbindung</h2>
        <p className="mb-4">Verbinden Sie Ihr Lichess-Konto, um Ihre Partien zu sehen und zu analysieren.</p>
        <button
          onClick={handleLogin}
          className="w-full text-center px-4 py-2 bg-[#80808F] text-white rounded hover:bg-[#5D5D6D] transition"
        >
          Mit Lichess verbinden
        </button>
        {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
      </div>
    );
  }

  return (
    <div className="border rounded p-4 bg-white h-full overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Lichess Partien</h2>
        {user && (
          <div className="flex items-center">
            <span className="mr-2">{user.username}</span>
            <button
              onClick={handleLogout}
              className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
              Abmelden
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-500 py-2 mb-2">{error}</div>
      )}
      
      {games.length === 0 && !loading ? (
        <div className="text-gray-500 py-2">Keine Partien gefunden</div>
      ) : (
        <div className="space-y-2">
          {games.map((game, index) => (
            <div
              key={game.id}
              ref={index === games.length - 1 ? lastGameElementRef : null}
              className="p-2 border rounded cursor-pointer hover:bg-gray-100"
              onClick={() => handleSelectGame(game)}
            >
              <div className="font-medium">
                {game.players?.white?.user?.name || 'Weiß'} vs {game.players?.black?.user?.name || 'Schwarz'}
              </div>
              <div className="text-sm text-gray-600">
                {new Date(game.createdAt).toLocaleDateString()} • {game.speed || 'Standard'} • {game.status || 'Beendet'}
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
