/**
 * Type definitions for chess-related data
 */

// Represents a chess move in the game
export interface ChessMove {
  san: string;       // Standard Algebraic Notation (e.g., "e4", "Nf3")
  from: string;      // Source square (e.g., "e2")
  to: string;        // Target square (e.g., "e4")
  piece: string;     // Piece type (e.g., "p" for pawn, "n" for knight)
  color: "w" | "b";  // Piece color (white or black)
  flags: string;     // Additional move flags (e.g., "c" for capture)
  index: number;     // Move index in the game
}

// Represents a chess game history with moves
export interface ChessHistory {
  currentMoveIndex: number;  // Index of the current move being displayed
  moves: ChessMove[];        // List of all moves in the game
}

// PGN data for importing/exporting games
export interface PgnData {
  pgn: string;               // The PGN string representation of the game
}
