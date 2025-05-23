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
    <div>
      <div className="font-bold mb-2 border-b pb-1">Move History</div>
      {moves.length === 0 ? (
        <div className="text-gray-500 italic">No moves yet</div>
      ) : (
        <div>{renderMoves()}</div>
      )}
      <div className="mt-2 flex gap-2">
        <button 
          className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onMoveClick(-1)}
          disabled={currentMoveIndex === -1}
        >
          Start
        </button>
        <button 
          className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onMoveClick(currentMoveIndex - 1)}
          disabled={currentMoveIndex <= -1}
        >
          Prev
        </button>
        <button 
          className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onMoveClick(currentMoveIndex + 1)}
          disabled={currentMoveIndex >= moves.length - 1}
        >
          Next
        </button>
        <button 
          className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onMoveClick(moves.length - 1)}
          disabled={currentMoveIndex === moves.length - 1 || moves.length === 0}
        >
          End
        </button>
      </div>
    </div>
  );
}
