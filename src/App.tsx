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
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Chess Analysis</h1>
        
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Lichess Seitenleiste */}
          <div className="w-full lg:w-64 order-3 lg:order-1">
            <LichessSidebar onSelectGame={handleLichessGameSelect} />
          </div>
        
          {/* Chess board section */}
          <div className="flex-1 order-1 lg:order-2">
            <ChessBoard
              fen={fen}
              onPieceDrop={handlePieceDrop}
              getPossibleMoves={getPossibleMoves}
            />
            
            <div className="mt-4 flex gap-2">
              <button
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                onClick={resetGame}
              >
                Reset Board
              </button>
              <button
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                onClick={handleCopyPgn}
                disabled={history.moves.length === 0}
              >
                Copy PGN
              </button>
            </div>
          </div>
          
          {/* Move history section */}
          <div className="w-full lg:w-64 order-2 lg:order-3">
            <div className="mb-4">
              <PgnImport onImport={importPgn} />
            </div>
            <MoveList history={history} onMoveClick={goToMove} />
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
