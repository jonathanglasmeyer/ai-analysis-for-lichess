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
            {/* Schachbrett */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-6 flex justify-center">
                <ChessBoard
                  fen={fen}
                  onPieceDrop={handlePieceDrop}
                  getPossibleMoves={getPossibleMoves}
                />
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                <button
                  className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition-colors font-medium text-sm"
                  onClick={resetGame}
                >
                  Reset Board
                </button>
                <button
                  className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={handleCopyPgn}
                  disabled={history.moves.length === 0}
                >
                  Copy PGN
                </button>
              </div>
            </div>
          </div>
          
          {/* Move history section */}
          <div className="w-full lg:w-[300px] order-2 lg:order-3 flex flex-col gap-6">
            {/* PGN Import */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-medium text-gray-700">PGN Import</h2>
              </div>
              <div className="p-5">
                <PgnImport onImport={importPgn} />
              </div>
            </div>
            
            {/* Zughistorie */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-medium text-gray-700">Move History</h2>
              </div>
              <div className="p-5 h-[400px] overflow-auto">
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
