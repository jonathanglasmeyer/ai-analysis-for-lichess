import type { ChessHistory } from '../types/chess';

interface MoveListProps {
  history: ChessHistory;
  onMoveClick: (index: number) => void;
}

/**
 * MoveList component displays the chess game history and allows navigation
 * Displays moves in pairs (white/black) with move numbers
 */
export function MoveList({ history, onMoveClick }: MoveListProps) {
  const { moves, currentMoveIndex } = history;

  // Organize moves in pairs (white and black moves together)
  const renderMoves = () => {
    const elements = [];
    
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];
      
      elements.push(
        <div key={i} className="flex mb-1">
          <div className="w-8 text-gray-500 font-medium">{moveNumber}.</div>
          <div 
            className={`w-14 px-1 cursor-pointer hover:bg-gray-200 ${i === currentMoveIndex ? 'bg-blue-200 font-bold' : ''}`}
            onClick={() => onMoveClick(i)}
          >
            {whiteMove.san}
          </div>
          {blackMove && (
            <div 
              className={`w-14 px-1 cursor-pointer hover:bg-gray-200 ${i + 1 === currentMoveIndex ? 'bg-blue-200 font-bold' : ''}`}
              onClick={() => onMoveClick(i + 1)}
            >
              {blackMove.san}
            </div>
          )}
        </div>
      );
    }
    
    return elements;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        {moves.length === 0 ? (
          <div className="text-gray-500 italic p-4">No moves yet</div>
        ) : (
          <div className="p-3">{renderMoves()}</div>
        )}
      </div>
      
      {/* Navigation controls fixed at bottom */}
      <div className="flex justify-center gap-3 text-gray-400 border-t border-gray-100 py-2 bg-white">
        <button 
          className="p-1 hover:bg-gray-50 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          onClick={() => onMoveClick(-1)}
          disabled={currentMoveIndex === -1}
          title="First move"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="11 17 6 12 11 7"></polyline>
            <polyline points="18 17 13 12 18 7"></polyline>
          </svg>
        </button>
        <button 
          className="p-1 hover:bg-gray-50 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          onClick={() => onMoveClick(currentMoveIndex - 1)}
          disabled={currentMoveIndex <= -1}
          title="Previous move"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <button 
          className="p-1 hover:bg-gray-50 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          onClick={() => onMoveClick(currentMoveIndex + 1)}
          disabled={currentMoveIndex >= moves.length - 1}
          title="Next move"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <button 
          className="p-1 hover:bg-gray-50 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          onClick={() => onMoveClick(moves.length - 1)}
          disabled={currentMoveIndex === moves.length - 1 || moves.length === 0}
          title="Last move"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="13 17 18 12 13 7"></polyline>
            <polyline points="6 17 11 12 6 7"></polyline>
          </svg>
        </button>
      </div>
    </div>
  );
}
