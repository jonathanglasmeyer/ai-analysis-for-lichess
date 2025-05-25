import { useCallback, useEffect, useState } from 'react';
import type { Square } from 'chess.js';
import { useChessGame } from './hooks/useChessGame';
import { ChessBoard } from './components/ChessBoard';
import { MoveList } from './components/MoveList';
import { LichessSidebar } from './components/LichessSidebar';
import { CopyPgnButton } from './components/CopyPgnButton';
import { AnalyzeButton } from './components/AnalyzeButton';
import { initAuth } from './services/lichessApi';

/**
 * Chess Analysis UI
 * Main application component that integrates the chess board, move history, and PGN import
 * Inspired by lichess.org analysis view
 */
function App() {
  // State für Analyseergebnisse
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
  // Initialisiere Lichess-Authentifizierung beim App-Start
  useEffect(() => {
    // Initialisiere die Authentifizierung und prüfe, ob der Benutzer von der Auth-Seite zurückgeleitet wurde
    initAuth().catch(error => {
      console.error('Fehler bei der Authentifizierung:', error);
    });
  }, []);

  const {
    fen,
    history,
    makeMove,
    goToMove,
    importPgn,
    getPossibleMoves,
    exportPgn,
  } = useChessGame();
  
  // Tastaturnavigation für Zughistorie
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Nur reagieren, wenn keine Eingabefelder fokussiert sind
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowLeft') {
        if (e.shiftKey) {
          // Erster Zug (mit Shift)
          goToMove(-1);
        } else {
          // Vorheriger Zug
          goToMove(history.currentMoveIndex - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (e.shiftKey) {
          // Letzter Zug (mit Shift)
          goToMove(history.moves.length - 1);
        } else {
          // Nächster Zug
          goToMove(history.currentMoveIndex + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToMove, history.currentMoveIndex, history.moves.length]);
  
  // Event-Listener für Analyseergebnisse
  useEffect(() => {
    const handleAnalysisResult = (event: CustomEvent<any>) => {
      // Speichere das gesamte Analyseergebnis, nicht nur die Zusammenfassung
      setAnalysisResult(event.detail);
    };

    const handleAnalysisError = (event: CustomEvent<any>) => {
      setAnalysisResult({
        ok: false,
        error: event.detail.error
      });
    };

    window.addEventListener('chess-analysis-result', handleAnalysisResult as EventListener);
    window.addEventListener('chess-analysis-error', handleAnalysisError as EventListener);

    return () => {
      window.removeEventListener('chess-analysis-result', handleAnalysisResult as EventListener);
      window.removeEventListener('chess-analysis-error', handleAnalysisError as EventListener);
    };
  }, []);

  // Handle piece drops on the board
  const handlePieceDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square) => {
      return makeMove(sourceSquare, targetSquare);
    },
    [makeMove]
  );



  // Handler für das Laden einer Lichess-Partie
  const handleLichessGameSelect = useCallback((pgn: string) => {
    // PGN importieren
    importPgn(pgn);
    
    // Analyseergebnisse zurücksetzen, wenn eine neue Partie geladen wird
    setAnalysisResult(null);
  }, [importPgn, setAnalysisResult]);

  return (
    <div className="min-h-screen bg-gray-50 py-3">
      <div className="container mx-auto px-2 max-w-[1600px]">
        
        <div className="flex flex-col lg:flex-row gap-4">
          
          {/* Lichess Seitenleiste - breiter für detailliertere Anzeige */}
          <div className="w-full lg:w-[320px] order-3 lg:order-1 lg:sticky self-start">
            <div className="bg-white border border-gray-200 rounded-lg h-[calc(100vh-120px)] overflow-hidden">
              <LichessSidebar onSelectGame={handleLichessGameSelect} />
            </div>
          </div>
        
          {/* Mittlerer Bereich: Schachbrett und Analyse nebeneinander */}
          <div className="flex-1 order-1 lg:order-2">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Schachbrett - jetzt mit fester Breite */}
              <div className="lg:w-auto">
                <ChessBoard
                  fen={fen}
                  onPieceDrop={handlePieceDrop}
                  getPossibleMoves={getPossibleMoves}
                  onMoveChange={goToMove}
                  currentMoveIndex={history.currentMoveIndex}
                  maxMoveIndex={history.moves.length - 1}
                />
              </div>
              
              {/* Rechter Bereich: Analyse und Zughistorie */}
              <div className="flex-1 flex flex-col gap-4">
                
                {/* Analyse-Sektion - immer sichtbar */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xs font-medium text-gray-700">Spielanalyse</h2>
                    <AnalyzeButton exportPgn={exportPgn} pgn={exportPgn()} />
                  </div>
                  <div className="p-3 max-h-[250px] overflow-y-auto">
                    {/* Fehleranzeige */}
                    {analysisResult && !analysisResult.ok && (
                      <div className="text-sm text-red-500 mb-4">
                        <h3 className="font-medium text-red-600 mb-2">Fehler bei der Analyse</h3>
                        <p>{analysisResult.error || 'Ein unbekannter Fehler ist aufgetreten'}</p>
                      </div>
                    )}
                    
                    {/* Keine Analyse vorhanden */}
                    {!analysisResult && (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-500 text-sm">
                        <p>Klicke auf 'Analyze', um eine KI-Analyse der aktuellen Partie zu erhalten.</p>
                      </div>
                    )}
                    
                    {/* Hilfsfunktion zum Bereinigen und Reparieren von JSON */}
                    {/* Analyse-Ergebnisse, wenn vorhanden */}
                    {analysisResult && analysisResult.ok && (() => {
                      // Hilfsfunktion, um fehlerhafte JSON-Strings zu reparieren
                      const sanitizeJsonString = (jsonStr: string): string => {
                        let fixed = jsonStr;
                        
                        // Doppelte Kommas entfernen
                        fixed = fixed.replace(/,\s*,/g, ',');
                        
                        // Kommas vor schließenden Klammern entfernen
                        fixed = fixed.replace(/,\s*}/g, '}');
                        fixed = fixed.replace(/,\s*\]/g, ']');
                        
                        // Kommas nach öffnenden Klammern entfernen
                        fixed = fixed.replace(/{\s*,/g, '{');
                        fixed = fixed.replace(/\[\s*,/g, '[');
                        
                        return fixed;
                      };
                      
                      try {
                        // Versuche, das JSON aus dem String zu extrahieren
                        const jsonMatch = analysisResult.summary.match(/```json\n([\s\S]*?)\n```/);
                        
                        if (jsonMatch && jsonMatch[1]) {
                          let jsonContent = jsonMatch[1].trim();
                          
                          // Versuche zu parsen
                          try {
                            const parsedData = JSON.parse(jsonContent);
                            return (
                              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                <p className="mb-4">{parsedData.summary}</p>
                                
                                {parsedData.moments && parsedData.moments.length > 0 && (
                                  <>
                                    <h3 className="font-medium mt-4 mb-2">Wichtige Momente</h3>
                                    <div className="space-y-3">
                                      {parsedData.moments.slice(0, 3).map((moment: any, index: number) => (
                                        <div key={index} className="p-2 bg-gray-50 rounded">
                                          <div className="font-medium">
                                            Zug {Math.floor(moment.ply/2) + (moment.ply % 2 === 0 ? 0 : 0.5)}: 
                                            <span className={moment.color === 'white' ? 'text-blue-600' : 'text-gray-800'}>
                                              {moment.move}
                                            </span>
                                          </div>
                                          <p className="text-xs mt-1">{moment.comment}</p>
                                          {moment.recommendation && (
                                            <p className="text-xs mt-1 text-green-600">
                                              Besser: {moment.recommendation} - {moment.reasoning}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                      {parsedData.moments.length > 3 && (
                                        <p className="text-xs text-gray-500 italic">
                                          + {parsedData.moments.length - 3} weitere wichtige Momente
                                        </p>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          } catch (parseError) {
                            console.error('First parse attempt failed:', parseError);
                            
                            // Versuche das JSON zu reparieren
                            const fixedJson = sanitizeJsonString(jsonContent);
                            console.log('Attempting with fixed JSON:', fixedJson.substring(0, 100) + '...');
                            
                            try {
                              const parsedData = JSON.parse(fixedJson);
                              console.log('Successfully parsed fixed JSON');
                              
                              return (
                                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                  <p className="mb-4">{parsedData.summary}</p>
                                  
                                  {parsedData.moments && parsedData.moments.length > 0 && (
                                    <>
                                      <h3 className="font-medium mt-4 mb-2">Wichtige Momente</h3>
                                      <div className="space-y-3">
                                        {parsedData.moments.slice(0, 3).map((moment: any, index: number) => (
                                          <div key={index} className="p-2 bg-gray-50 rounded">
                                            <div className="font-medium">
                                              Zug {Math.floor(moment.ply/2) + (moment.ply % 2 === 0 ? 0 : 0.5)}: 
                                              <span className={moment.color === 'white' ? 'text-blue-600' : 'text-gray-800'}>
                                                {moment.move}
                                              </span>
                                            </div>
                                            <p className="text-xs mt-1">{moment.comment}</p>
                                            {moment.recommendation && (
                                              <p className="text-xs mt-1 text-green-600">
                                                Besser: {moment.recommendation} - {moment.reasoning}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                        {parsedData.moments.length > 3 && (
                                          <p className="text-xs text-gray-500 italic">
                                            + {parsedData.moments.length - 3} weitere wichtige Momente
                                          </p>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            } catch (fixError) {
                              console.error('Failed to fix JSON:', fixError);
                              // Weiterfall zum Fallback unten
                            }
                          }
                        }
                      } catch (e) {
                        console.error('Error extracting or parsing analysis JSON:', e);
                      }
                      
                      // Fallback: Zeige den Rohtext an
                      return (
                        <div className="text-sm text-gray-600 whitespace-pre-wrap">
                          {analysisResult.summary}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                
                {/* Zughistorie */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
                  <div className="px-3 py-2 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xs font-medium text-gray-700">Move History</h2>
                    <CopyPgnButton exportPgn={exportPgn} />
                  </div>
                  <div className="h-[calc(100vh-385px)] overflow-hidden relative">
                    <MoveList history={history} onMoveClick={goToMove} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
