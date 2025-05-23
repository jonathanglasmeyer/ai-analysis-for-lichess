import { useState, useCallback, useEffect } from 'react';
import { Chess } from 'chess.js';
import type { Square, Move } from 'chess.js';
import type { ChessMove, ChessHistory } from '../types/chess';

/**
 * Custom hook to manage chess game state and logic
 * Provides functionality for making moves, navigating history, and importing PGN
 */
export function useChessGame() {
  // Initialize the chess.js instance
  const [game, setGame] = useState<Chess>(new Chess());
  
  // Game history state
  const [history, setHistory] = useState<ChessHistory>({
    moves: [],
    currentMoveIndex: -1,
  });

  // Current position FEN string
  const [fen, setFen] = useState<string>(game.fen());
  
  // Update the FEN when game changes
  useEffect(() => {
    setFen(game.fen());
  }, [game]);

  // Convert chess.js history to our format
  const updateHistory = useCallback((chessInstance: Chess) => {
    try {
      const moveHistory = chessInstance.history({ verbose: true });
      console.log('Move history:', moveHistory); // Debug-Ausgabe
      
      const formattedMoves: ChessMove[] = moveHistory.map((move: any, index: number) => ({
        san: move.san,
        from: move.from,
        to: move.to,
        piece: move.piece,
        color: move.color,
        flags: move.flags,
        index,
      }));

      setHistory({
        moves: formattedMoves,
        currentMoveIndex: formattedMoves.length - 1,
      });
    } catch (error) {
      console.error('Error updating history:', error);
    }
  }, []);

  // Make a move on the board
  const makeMove = useCallback((from: string, to: string, promotion?: string) => {
    try {
      console.log('Making move from', from, 'to', to); // Debug-Ausgabe
      
      // Erstelle eine neue Spielinstanz basierend auf dem aktuellen Status
      const newGame = new Chess(game.fen());
      
      // Führe den Zug aus
      const moveResult = newGame.move({
        from,
        to,
        promotion: promotion || undefined,
      });

      console.log('Move result:', moveResult); // Debug-Ausgabe

      if (moveResult) {
        // Aktualisiere das Spiel mit dem neuen Zustand
        setGame(newGame);
        
        // Manuell den aktuellen Zug zur Historie hinzufügen, falls die updateHistory-Funktion fehlschlägt
        const moveHistory = newGame.history({ verbose: true });
        if (moveHistory && moveHistory.length > 0) {
          const lastMove = moveHistory[moveHistory.length - 1];
          if (lastMove) {
            // Bestehende Züge beibehalten und den neuen Zug hinzufügen
            const newMove: ChessMove = {
              san: lastMove.san || '',
              from: lastMove.from || from,
              to: lastMove.to || to,
              piece: lastMove.piece || '',
              color: lastMove.color || (newGame.turn() === 'w' ? 'b' : 'w'), // Gegenteil der aktuellen Farbe, da der Zug bereits ausgeführt wurde
              flags: lastMove.flags || '',
              index: history.moves.length,
            };
            
            setHistory(prev => ({
              moves: [...prev.moves, newMove],
              currentMoveIndex: prev.moves.length,
            }));
          } else {
            // Fallback: updateHistory verwenden
            updateHistory(newGame);
          }
        } else {
          // Fallback: updateHistory verwenden
          updateHistory(newGame);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Invalid move:', error);
      return false;
    }
  }, [game, updateHistory, history.moves]);

  // Handle move navigation in history
  const goToMove = useCallback((moveIndex: number) => {
    if (moveIndex < -1 || moveIndex >= history.moves.length) return;
    
    const newGame = new Chess();
    
    // If we're going to the start position
    if (moveIndex === -1) {
      setGame(newGame);
      setHistory(prev => ({ ...prev, currentMoveIndex: -1 }));
      return;
    }

    // Apply moves up to the selected index
    for (let i = 0; i <= moveIndex; i++) {
      const move = history.moves[i];
      newGame.move({ from: move.from, to: move.to, promotion: move.piece === 'p' ? 'q' : undefined });
    }

    setGame(newGame);
    setHistory(prev => ({ ...prev, currentMoveIndex: moveIndex }));
  }, [history.moves]);

  // Import a game from PGN notation
  const importPgn = useCallback((pgn: string) => {
    try {
      const newGame = new Chess();
      newGame.loadPgn(pgn);
      setGame(newGame);
      updateHistory(newGame);
      return true;
    } catch (error) {
      console.error('Invalid PGN:', error);
      return false;
    }
  }, [updateHistory]);

  // Reset the game to the starting position
  const resetGame = useCallback(() => {
    const newGame = new Chess();
    setGame(newGame);
    setHistory({
      moves: [],
      currentMoveIndex: -1,
    });
  }, []);

  // Get possible moves for a piece
  const getPossibleMoves = useCallback((square: Square) => {
    const moves = game.moves({
      square,
      verbose: true,
    }) as Move[];
    return moves.map(move => move.to);
  }, [game]);

  // Export the current game to PGN
  const exportPgn = useCallback(() => {
    try {
      // Ein neues Chess-Spiel mit der Standardposition erstellen
      const exportGame = new Chess();
      
      // Alle Züge aus der History anwenden
      for (const move of history.moves) {
        exportGame.move({
          from: move.from,
          to: move.to,
          promotion: move.piece === 'p' && (move.to[1] === '8' || move.to[1] === '1') ? 'q' : undefined
        });
      }
      
      // Das PGN des vollständigen Spiels mit allen Zügen zurückgeben
      return exportGame.pgn();
    } catch (error) {
      console.error('Error exporting PGN:', error);
      return game.pgn(); // Fallback zur ursprünglichen Implementierung
    }
  }, [history.moves, game]);

  return {
    game,
    fen,
    history,
    makeMove,
    goToMove,
    importPgn,
    resetGame,
    getPossibleMoves,
    exportPgn,
  };
}
