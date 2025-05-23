import { useCallback, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Square } from 'chess.js';

interface ChessBoardProps {
  fen: string;
  onPieceDrop: (sourceSquare: Square, targetSquare: Square) => boolean;
  getPossibleMoves: (square: Square) => Square[];
}

/**
 * ChessBoard component that handles the interactive chess board
 * Uses react-chessboard for rendering and handles drag-and-drop interaction
 */
export function ChessBoard({ fen, onPieceDrop, getPossibleMoves }: ChessBoardProps) {
  const [highlightedSquares, setHighlightedSquares] = useState<Record<string, Record<string, string>>>({});

  // Handle when a piece is dragged over a square
  const onDragStart = useCallback((piece: string, square: Square) => {
    // Only allow pieces of the current turn to be moved
    const isWhitePiece = piece[0] === 'w';
    const isWhiteTurn = fen.split(' ')[1] === 'w';
    if (isWhitePiece !== isWhiteTurn) return false;
    
    // Highlight possible moves
    const moves = getPossibleMoves(square);
    const highlights: Record<string, Record<string, string>> = {};
    
    moves.forEach((move) => {
      highlights[move] = { backgroundColor: 'rgba(0, 255, 0, 0.3)' }; // Green highlight for valid moves
    });
    
    setHighlightedSquares(highlights);
    return true;
  }, [fen, getPossibleMoves]);

  // Clear highlights when drag ends
  const onDragEnd = useCallback(() => {
    setHighlightedSquares({});
  }, []);

  return (
    <div className="w-full max-w-md mx-auto">
     
      <Chessboard
        id="chess-analysis-board"
        position={fen}
        onPieceDrop={onPieceDrop}
        onPieceDragBegin={onDragStart}
        onPieceDragEnd={onDragEnd}
        customSquareStyles={highlightedSquares}
        boardWidth={560}
        areArrowsAllowed={true}
        boardOrientation="white"
        animationDuration={200}
      />
    </div>
  );
}
