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
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  
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
      setAnalysisResult(event.detail.summary);
    };

    const handleAnalysisError = (event: CustomEvent<any>) => {
      setAnalysisResult(`Error: ${event.detail.error}`);
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
    importPgn(pgn);
  }, [importPgn]);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-6 max-w-[1400px]">
        <h1 className="text-2xl font-medium mb-8 text-gray-800">Chess Analysis</h1>
        
        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* Lichess Seitenleiste */}
          <div className="w-full lg:w-[380px] order-3 lg:order-1 lg:sticky lg:top-8 self-start">
            <div className="bg-white border border-gray-200 rounded-lg h-[calc(100vh-120px)] overflow-hidden">
              <LichessSidebar onSelectGame={handleLichessGameSelect} />
            </div>
          </div>
        
          {/* Chess board section */}
          <div className="flex-1 order-1 lg:order-2 flex flex-col gap-6">
            <div className="flex justify-center" id="chessboard-container">
              <ChessBoard
                fen={fen}
                onPieceDrop={handlePieceDrop}
                getPossibleMoves={getPossibleMoves}
                onMoveChange={goToMove}
                currentMoveIndex={history.currentMoveIndex}
                maxMoveIndex={history.moves.length - 1}
              />
            </div>
            
            {/* Analyse-Ergebnisse */}
            {analysisResult && (
              <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Game Analysis</h3>
                <div className="text-sm text-gray-600 whitespace-pre-wrap">
                  {analysisResult}
                </div>
              </div>
            )}
          </div>
          
          {/* Move history section */}
          <div className="w-full lg:w-[300px] order-2 lg:order-3 flex flex-col gap-6">
            {/* Zughistorie */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col h-[740px]">
              <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-sm font-medium text-gray-700">Move History</h2>
                <div className="flex items-center gap-2">
                  <AnalyzeButton exportPgn={exportPgn} />
                  <CopyPgnButton exportPgn={exportPgn} />
                </div>
              </div>
              <div className="flex-1 overflow-hidden relative">
                <MoveList history={history} onMoveClick={goToMove} />
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>
            This chess analysis board allows you to explore chess positions and variations.
            Drag pieces to make moves, navigate through the move history, and import/export games in PGN format.
          </p>
          <p className="mt-2">
            Future additions could include engine analysis, evaluation bars, and variation trees.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
