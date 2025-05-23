import { useCallback, useEffect } from 'react';
import type { Square } from 'chess.js';
import { useChessGame } from './hooks/useChessGame';
import { ChessBoard } from './components/ChessBoard';
import { MoveList } from './components/MoveList';
import { PgnImport } from './components/PgnImport';
import { LichessSidebar } from './components/LichessSidebar';
import { initAuth } from './services/lichessApi';

/**
 * Chess Analysis UI
 * Main application component that integrates the chess board, move history, and PGN import
 * Inspired by lichess.org analysis view
 */
function App() {
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
    resetGame,
    getPossibleMoves,
    exportPgn,
  } = useChessGame();

  // Handle piece drops on the board
  const handlePieceDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square) => {
      return makeMove(sourceSquare, targetSquare);
    },
    [makeMove]
  );

  // Copy PGN to clipboard
  const handleCopyPgn = useCallback(() => {
    navigator.clipboard.writeText(exportPgn());
    alert('PGN copied to clipboard!');
  }, [exportPgn]);

  // Handler für das Laden einer Lichess-Partie
  const handleLichessGameSelect = useCallback((pgn: string) => {
    importPgn(pgn);
  }, [importPgn]);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-[1400px]">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Chess Analysis</h1>
        
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Lichess Seitenleiste - abgesetzt mit Schatten und eigenes Scrolling */}
          <div className="w-full lg:w-[380px] order-3 lg:order-1 lg:sticky lg:top-8 self-start">
            <div className="bg-white rounded-lg shadow-md h-[calc(100vh-120px)] overflow-hidden">
              <LichessSidebar onSelectGame={handleLichessGameSelect} />
            </div>
          </div>
        
          {/* Chess board section */}
          <div className="flex-1 order-1 lg:order-2 flex flex-col gap-4">
            {/* Schachbrett in einer Karte */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 flex justify-center">
                <ChessBoard
                  fen={fen}
                  onPieceDrop={handlePieceDrop}
                  getPossibleMoves={getPossibleMoves}
                />
              </div>
              <div className="px-4 py-3 border-t flex gap-3">
                <button
                  className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors font-medium"
                  onClick={resetGame}
                >
                  Reset Board
                </button>
                <button
                  className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                  onClick={handleCopyPgn}
                  disabled={history.moves.length === 0}
                >
                  Copy PGN
                </button>
              </div>
            </div>
          </div>
          
          {/* Move history section */}
          <div className="w-full lg:w-[300px] order-2 lg:order-3">
            {/* PGN Import in einer Karte */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
              <div className="px-4 py-3 border-b">
                <h2 className="text-lg font-bold text-gray-800">PGN Import</h2>
              </div>
              <div className="p-4">
                <PgnImport onImport={importPgn} />
              </div>
            </div>
            
            {/* Zughistorie in einer Karte */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 h-[400px] overflow-auto">
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
