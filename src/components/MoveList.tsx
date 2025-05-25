import { useEffect, useRef, useState } from 'react';
import type { ChessHistory } from '../types/chess';

// Interface für einen wichtigen Moment aus der Analyse
interface AnalysisMoment {
  ply: number;
  move: string;
  color: 'white' | 'black';
  comment: string;
  recommendation?: string;
  reasoning?: string;
}

interface MoveListProps {
  history: ChessHistory;
  onMoveClick: (index: number) => void;
  analysisMoments?: AnalysisMoment[];
}

/**
 * MoveList component displays the chess game history and allows navigation
 * Displays moves in pairs (white/black) with move numbers
 * Styled after chess.com with a light theme
 */
export function MoveList({ history, onMoveClick, analysisMoments = [] }: MoveListProps) {
  const { moves, currentMoveIndex } = history;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentMoveRef = useRef<HTMLDivElement | null>(null);
  
  // State für das Mapping der Halbzüge (ply) zu Analysemomenten
  const [momentsByPly, setMomentsByPly] = useState<Record<number, AnalysisMoment>>({});
  
  // Debug-State zum Erzwingen von Re-Renderings
  const [renderCount, setRenderCount] = useState(0);
  
  console.log('MoveList rendered, count:', renderCount, 'moments count:', Object.keys(momentsByPly).length);
  
  // Aktualisiere das Mapping, wenn sich die Analysemomente ändern
  useEffect(() => {
    console.log('analysisMoments changed, length:', analysisMoments?.length || 0);
    
    const map: Record<number, AnalysisMoment> = {};
    // Stelle sicher, dass analysisMoments ein Array ist
    if (analysisMoments && Array.isArray(analysisMoments)) {
      analysisMoments.forEach(moment => {
        map[moment.ply] = moment;
      });
      console.log('Mapped moments, keys:', Object.keys(map));
    }
    
    // Update des State löst Re-Rendering aus
    setMomentsByPly(map);
    setRenderCount(prev => prev + 1);
  }, [analysisMoments]);
  
  // Wir verfolgen keinen ausgewählten Moment mehr, da alle Details inline angezeigt werden
  
  // Scroll to current move when currentMoveIndex changes, ensuring 2 full moves remain visible
  useEffect(() => {
    if (scrollContainerRef.current) {
      if (currentMoveIndex === -1) {
        // Scroll to start on initial position
        scrollContainerRef.current.scrollTop = 0;
      } else if (currentMoveRef.current) {
        // Berechne, bei welchem Vollzug wir sind
        const currentFullMove = Math.floor(currentMoveIndex / 2);
        
        // Finde alle Elemente für die nächsten Vollzüge
        const moveElements = Array.from(scrollContainerRef.current.querySelectorAll('[data-fullmove]'))
          .filter(el => {
            const fullMove = parseInt(el.getAttribute('data-fullmove') || '0', 10);
            // Berhalte nur Elemente, die den aktuellen und die nächsten 2 Vollzüge enthalten
            return fullMove >= currentFullMove && fullMove <= currentFullMove + 2;
          });
        
        // Scrolle, aber mit angepasstem Block-Verhalten
        if (moveElements.length > 0) {
          // Nimm das erste Element für das Scrollen
          const targetElement = moveElements[0];
          targetElement.scrollIntoView({
            behavior: 'smooth',
            // 'start' stellt sicher, dass das Element oben im sichtbaren Bereich erscheint
            // und genügend Platz für weitere Elemente darunter lässt
            block: 'start'
          });
        } else {
          // Fallback: Scroll direkt zum aktuellen Zug
          currentMoveRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }
    }
  }, [currentMoveIndex]);

  // Organize moves in pairs (white and black moves together) and highlight important moments

  // Rendere die Details für einen wichtigen Moment direkt in der Zugliste
  const renderMomentDetailsInline = (moment: AnalysisMoment) => {
    return (
      <div className="px-2 py-1.5 text-xs bg-blue-50 border-t border-blue-100">
        <p className="text-gray-700 mb-1">{moment.comment}</p>
        {moment.recommendation && (
          <p className="text-gray-600">
            <span className="font-medium text-green-600">Besser: {moment.recommendation}</span>
            {' - '}{moment.reasoning}
          </p>
        )}
      </div>
    );
  };

  // Rendere die Zugliste mit hervorgehobenen wichtigen Momenten
  const renderMoves = () => {
    const elements = [];
    
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];
      
      // Prüfe, ob dieser Zug ein wichtiger Moment ist
      // In der Analyse beginnt ply bei 1, in der MoveList beginnt der Index bei 0
      // Weiß: ply = (i+1)
      // Schwarz: ply = (i+2)
      const isWhiteImportant = momentsByPly[i+1] !== undefined;
      const isBlackImportant = blackMove && momentsByPly[i+2] !== undefined;
      
      // Haupt-Zugelement
      elements.push(
        <div key={`move-${i}`} data-fullmove={moveNumber}>
          {/* Zug-Zeile */}
          <div className={`flex items-center h-7 text-sm ${Math.floor(i / 2) % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}> 
            {/* Move number */}
            <div className="w-8 px-2 text-gray-500 font-medium text-right text-xs">{moveNumber}.</div>
            {/* White move */}
            <div
              className={`flex-1 px-2 py-1 text-left cursor-pointer transition-colors ${i === currentMoveIndex ? 'bg-gray-200' : isWhiteImportant ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-100'}`}
              onClick={() => onMoveClick(i)}
              ref={i === currentMoveIndex ? currentMoveRef : null}
            >
              <span className={`font-[500] ${isWhiteImportant ? 'text-blue-600' : ''}`}>{whiteMove.san}</span>
            </div>
            {/* Black move or placeholder */}
            {blackMove ? (
              <div
                className={`flex-1 px-2 py-1 text-left cursor-pointer transition-colors ${i + 1 === currentMoveIndex ? 'bg-gray-200' : isBlackImportant ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-100'}`}
                onClick={() => onMoveClick(i + 1)}
                ref={i + 1 === currentMoveIndex ? currentMoveRef : null}
              >
                <span className={`font-[500] ${isBlackImportant ? 'text-blue-600' : ''}`}>{blackMove.san}</span>
              </div>
            ) : (
              <div className="flex-1 bg-white"></div> /* Placeholder for missing black move */
            )}
          </div>
          
          {/* Analyse-Details für beide Züge, wenn vorhanden */}
          {(isWhiteImportant || (isBlackImportant && blackMove)) && (
            <div className="flex">
              <div className="w-8"></div>
              {/* Weißer Zug Details */}
              <div className="flex-1">
                {isWhiteImportant && renderMomentDetailsInline(momentsByPly[i+1])}
              </div>
              {/* Schwarzer Zug Details */}
              <div className="flex-1">
                {isBlackImportant && blackMove && renderMomentDetailsInline(momentsByPly[i+2])}
              </div>
            </div>
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
