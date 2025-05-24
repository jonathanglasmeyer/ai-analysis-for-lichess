import { useState, useEffect } from 'react';

interface AnalyzeButtonProps {
  exportPgn: () => string;
  pgn?: string; // Optional PGN, wenn es sich ändert, prüfen wir auf Cache-Treffer
}

export function AnalyzeButton({ exportPgn, pgn }: AnalyzeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [checkingCache, setCheckingCache] = useState(false);
  
  // Funktion zum Abrufen der API-Basis-URL
  const getApiBaseUrl = () => {
    return process.env.NODE_ENV === 'production' 
      ? 'https://chess-gpt-api.onrender.com'
      : 'http://localhost:3001';
  };
  
  // Prüft den Cache, wenn sich das PGN ändert
  useEffect(() => {
    // Nur prüfen, wenn PGN vorhanden ist
    if (!pgn) return;
    
    const checkCache = async () => {
      try {
        setCheckingCache(true);
        
        const apiUrl = `${getApiBaseUrl()}/check-cache`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pgn }),
        });
        
        if (!response.ok) {
          console.error('Cache check failed:', response.status);
          return;
        }
        
        const data = await response.json();
        
        // Wenn Analyse im Cache gefunden wurde, zeige sie an
        if (data.inCache && data.analysis) {
          console.log('Analysis found in cache');
          
          // Event auslösen, um die Analyse im übergeordneten Element anzuzeigen
          const event = new CustomEvent('chess-analysis-result', { 
            detail: data.analysis
          });
          window.dispatchEvent(event);
        }
      } catch (err) {
        console.error('Cache check error:', err);
      } finally {
        setCheckingCache(false);
      }
    };
    
    checkCache();
  }, [pgn]);
  
  const handleAnalyze = async () => {
    try {
      setLoading(true);
      
      const pgn = exportPgn();
      
      // Lokaler Entwicklungsserver oder Produktions-API
      const apiUrl = `${getApiBaseUrl()}/analyze`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pgn }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Event auslösen, um die Analyse im übergeordneten Element anzuzeigen
      const event = new CustomEvent('chess-analysis-result', { 
        detail: data
      });
      window.dispatchEvent(event);
      
    } catch (err) {
      console.error('Analysis error:', err);
      
      // Event mit Fehler auslösen
      const event = new CustomEvent('chess-analysis-error', { 
        detail: { error: err instanceof Error ? err.message : 'Unknown error' }
      });
      window.dispatchEvent(event);
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleAnalyze}
      disabled={loading || checkingCache}
      className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title="Analyze current position"
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Analyzing...</span>
        </>
      ) : checkingCache ? (
        <>
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Checking cache...</span>
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0Z"></path>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
          </svg>
          <span>Analyze</span>
        </>
      )}
    </button>
  );
}
