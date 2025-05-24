import { useEffect, useRef } from 'react';
import type { ChessHistory } from '../types/chess';

interface MoveListProps {
  history: ChessHistory;
  onMoveClick: (index: number) => void;
}

/**
 * MoveList component displays the chess game history and allows navigation
 * Displays moves in pairs (white/black) with move numbers
 * Styled after chess.com with a light theme
 */
export function MoveList({ history, onMoveClick }: MoveListProps) {
  const { moves, currentMoveIndex } = history;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentMoveRef = useRef<HTMLDivElement | null>(null);
  
  // Scroll to current move when currentMoveIndex changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      if (currentMoveIndex === -1) {
        // Scroll to start on initial position
        scrollContainerRef.current.scrollTop = 0;
      } else if (currentMoveRef.current) {
        // Scroll to current move
        currentMoveRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }
    }
  }, [currentMoveIndex]);

  // Organize moves in pairs (white and black moves together)
  const renderMoves = () => {
    const elements = [];
    
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];
      
      
      elements.push(
        <div key={i} className={`flex items-center h-7 text-sm ${Math.floor(i / 2) % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}> 
          {/* Move number */}
          <div className="w-8 px-2 text-gray-500 font-medium text-right text-xs">{moveNumber}.</div>
          {/* White move */}
          <div
            className={`flex-1 px-2 py-1 text-left cursor-pointer transition-colors ${i === currentMoveIndex ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            onClick={() => onMoveClick(i)}
            ref={i === currentMoveIndex ? currentMoveRef : null}
          >
            <span className="font-[500]">{whiteMove.san}</span>
          </div>
          {/* Black move or placeholder */}
          {blackMove ? (
            <div
              className={`flex-1 px-2 py-1 text-left cursor-pointer transition-colors ${i + 1 === currentMoveIndex ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              onClick={() => onMoveClick(i + 1)}
              ref={i + 1 === currentMoveIndex ? currentMoveRef : null}
            >
              <span className="font-[500]">{blackMove.san}</span>
            </div>
          ) : (
            <div className="flex-1 bg-white"></div> /* Placeholder for missing black move */
          )}
        </div>
      );
    }
    
    return elements;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      
      {/* Move list */}
      <div className="flex-1 overflow-auto border-b border-gray-200" ref={scrollContainerRef}>
        {moves.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400 italic">No moves yet</div>
        ) : (
          <div className="divide-y divide-gray-100">{renderMoves()}</div>
        )}
      </div>
      
      {/* Navigation controls */}
      <div className="flex justify-center items-center gap-1 py-2 px-3 bg-gray-50">
        <button 
          className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
          onClick={() => onMoveClick(-1)}
          disabled={currentMoveIndex === -1}
          title="First move"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="11 17 6 12 11 7"></polyline>
            <polyline points="18 17 13 12 18 7"></polyline>
          </svg>
        </button>
        <button 
          className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
          onClick={() => onMoveClick(currentMoveIndex - 1)}
          disabled={currentMoveIndex <= -1}
          title="Previous move"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <button 
          className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
          onClick={() => onMoveClick(currentMoveIndex + 1)}
          disabled={currentMoveIndex >= moves.length - 1}
          title="Next move"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <button 
          className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
          onClick={() => onMoveClick(moves.length - 1)}
          disabled={currentMoveIndex === moves.length - 1 || moves.length === 0}
          title="Last move"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="13 17 18 12 13 7"></polyline>
            <polyline points="6 17 11 12 6 7"></polyline>
          </svg>
        </button>
      </div>
    </div>
  );
}
