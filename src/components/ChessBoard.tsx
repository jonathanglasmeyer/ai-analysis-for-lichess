import { useCallback, useState, useEffect, useRef } from 'react';
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
  const [boardWidth, setBoardWidth] = useState<number>(560); // Default-Wert
  const boardContainerRef = useRef<HTMLDivElement>(null);
  
  // Berechne die Breite des Schachbretts basierend auf dem Container
  const calculateBoardWidth = useCallback(() => {
    if (boardContainerRef.current) {
      // Wir nehmen die Container-Breite minus Padding
      const containerWidth = boardContainerRef.current.clientWidth - 32; // 32px für Padding (16px auf jeder Seite)
      // Stelle sicher, dass die Breite nicht zu klein wird
      const minWidth = 640;
      // Maximale Breite auf 740px begrenzen
      const newWidth = Math.max(minWidth, Math.min(containerWidth, 740));
      setBoardWidth(newWidth);
    }
  }, []);
  
  // Initialisiere und passe die Breite bei Resize an
  useEffect(() => {
    // Berechne die Breite beim ersten Rendern
    calculateBoardWidth();
    
    // Event-Listener für Fenstergrößenänderungen
    const handleResize = () => {
      calculateBoardWidth();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateBoardWidth]);

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

  // Definiere den benutzerdefinierten Board-Style mit abgerundeten Ecken
  const customBoardStyle = {
    borderRadius: '5px',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.07)',
    overflow: 'hidden', // Wichtig, damit die abgerundeten Ecken sichtbar sind
  };

  return (
    <div className="w-full flex justify-center items-center" ref={boardContainerRef}>
      <Chessboard
        id="chess-analysis-board"
        position={fen}
        onPieceDrop={onPieceDrop}
        onPieceDragBegin={onDragStart}
        onPieceDragEnd={onDragEnd}
        customSquareStyles={highlightedSquares}
        boardWidth={boardWidth}
        areArrowsAllowed={true}
        boardOrientation="white"
        animationDuration={200}
        customBoardStyle={customBoardStyle}
      />
    </div>
  );
}
