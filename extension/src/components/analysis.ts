/**
 * Analysis UI components and functions
 */

import { AnalysisMoment } from '../services/api';
import i18next from '../i18n';

interface NormalizedAnalysisData {
  summary: string;
  moments: AnalysisMoment[];
}

/**
 * Creates the analyze button
 */
export function createAnalyzeButton(): HTMLButtonElement {
  const analyzeButton = document.createElement('button');
  analyzeButton.className = 'button';
  analyzeButton.textContent = i18next.t('analysis.create');
  analyzeButton.style.margin = '10px';
  analyzeButton.style.padding = '8px 12px';
  analyzeButton.style.backgroundColor = '#629924'; // Green like Lichess buttons
  analyzeButton.style.color = 'white';
  analyzeButton.style.border = 'none';
  analyzeButton.style.borderRadius = '3px';
  analyzeButton.style.cursor = 'pointer';
  
  return analyzeButton;
}

/**
 * Normalizes analysis data from different sources
 */
export function normalizeAnalysisData(response: any): NormalizedAnalysisData {
  // Unified data structure for analyses
  const normalized: NormalizedAnalysisData = {
    summary: '',
    moments: []
  };
  
  // Log the response structure for analysis
  console.log('Response to normalize:', response);
  
  // Case 1: Cache hit with originalResponse
  if (response?.originalResponse?.analysis) {
    normalized.summary = response.originalResponse.analysis.summary || '';
    normalized.moments = response.originalResponse.analysis.moments || [];
    console.log('Normalized from originalResponse.analysis. Moments:', JSON.parse(JSON.stringify(normalized.moments.find(m => m.move === 'Nc6' || m.comment?.includes('Nc6')) || normalized.moments)));
  }
  // Case 2: Cache hit with direct structure
  else if (response?.summary) {
    normalized.summary = response.summary || '';
    normalized.moments = response.moments || [];
    console.log('Normalized from direct response. Moments:', JSON.parse(JSON.stringify(normalized.moments.find(m => m.move === 'Nc6' || m.comment?.includes('Nc6')) || normalized.moments)));
  }
  // Case 3: Fresh analysis with data structure
  else if (response?.data) {
    normalized.summary = response.data.summary || '';
    normalized.moments = response.data.moments || [];
    console.log('Normalized from response.data. Moments:', JSON.parse(JSON.stringify(normalized.moments.find(m => m.move === 'Nc6' || m.comment?.includes('Nc6')) || normalized.moments)));
  }
  // Case 4: Direct analysis object
  else if (response?.analysis) {
    normalized.summary = response.analysis.summary || '';
    normalized.moments = response.analysis.moments || [];
    console.log('Normalized from response.analysis. Moments:', JSON.parse(JSON.stringify(normalized.moments.find(m => m.move === 'Nc6' || m.comment?.includes('Nc6')) || normalized.moments)));
  }
  
  // If the summary contains markdown code blocks, parse them
  if (normalized.summary && normalized.summary.includes('```')) {
    try {
      // Remove code block markers (```json and ```)
      const cleanedText = normalized.summary.replace(/```json\n|```/g, '');
      const jsonObject = JSON.parse(cleanedText.trim());
      
      // If the JSON object has a summary, use it
      if (jsonObject.summary) {
        normalized.summary = jsonObject.summary;
        console.log('Parsed summary from JSON code block');
        
        // Also take moments if available
        if (jsonObject.moments && Array.isArray(jsonObject.moments)) {
          normalized.moments = jsonObject.moments;
          console.log('Parsed moments from JSON code block. Moments:', JSON.parse(JSON.stringify(normalized.moments.find(m => m.move === 'Nc6' || m.comment?.includes('Nc6')) || normalized.moments)));
        }
      }
    } catch (e) {
      console.log('Failed to parse JSON from code block, using raw summary:', e);
      // Apply simple markdown formatting
      normalized.summary = normalized.summary
        .replace(/```json\n|```/g, '')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n- /g, '<br>• ');
    }
  }
  
  console.log('Normalized data:', {
    summary: normalized.summary.substring(0, 50) + '...',
    moments: normalized.moments.length
  });
  
  return normalized;
}

// Stil-Konstanten für einheitliches Design
const styles = {
  container: `margin: 0; padding: 10px;`,
  emptyState: `color: #666; text-align: center; padding: 20px 0;`,
  infoText: `margin-top: 15px; font-size: 0.9em; color: #666;`,
  summaryContainer: `
    max-height: calc(100vh - 120px); 
    overflow-y: auto; 
    font-size: 95%; 
    white-space: pre-line; 
    padding-right: 8px;
    padding-bottom: 10px;
    margin: 0;
    overflow-wrap: break-word;
  `
};

/**
 * Konvertiert Zugnotationen in klickbare Links
 * Erkennt verschiedene Formate von Schachzügen und wandelt sie in klickbare Links um
 */
function convertMovesToLinks(text: string): HTMLDivElement {
  // Container für den HTML-Inhalt
  const container = document.createElement('div');
  
  // Entferne zunächst alle eckigen Klammern um Zugnotationen
  let processedText = text.replace(/\[(\d+\s*\.{1,3}\s*[^\]]+)\]/g, '$1');
  
  // Definiere die Regex-Muster für weiße und schwarze Züge
  // Beispiel: "1. e4" (weiß) oder "1... e5" (schwarz)
  const whiteMoveRegex = /(\d+)\s*\.(?!\.+)\s*([A-Za-z][A-Za-z0-9\+\-\=\#\!\?\u00d7]+)/g;
  const blackMoveRegex = /(\d+)\s*\.{2,3}\s*([A-Za-z][A-Za-z0-9\+\-\=\#\!\?\u00d7]+)/g;
  
  // Sammle alle Matches in einem Array
  type MoveMatch = {
    index: number;
    length: number;
    moveNumber: string;
    notation: string;
    isWhite: boolean;
  };
  
  const allMatches: MoveMatch[] = [];
  
  // Erkenne weiße Züge
  let whiteMatch;
  while ((whiteMatch = whiteMoveRegex.exec(processedText)) !== null) {
    allMatches.push({
      index: whiteMatch.index,
      length: whiteMatch[0].length,
      moveNumber: whiteMatch[1],
      notation: whiteMatch[2],
      isWhite: true
    });
  }
  
  // Erkenne schwarze Züge
  let blackMatch;
  while ((blackMatch = blackMoveRegex.exec(processedText)) !== null) {
    allMatches.push({
      index: blackMatch.index,
      length: blackMatch[0].length,
      moveNumber: blackMatch[1],
      notation: blackMatch[2],
      isWhite: false
    });
  }
  
  // Sortiere alle Matches nach Position
  allMatches.sort((a, b) => a.index - b.index);
  
  // Verarbeite den Text Segment für Segment
  let lastIndex = 0;
  
  for (const match of allMatches) {
    // Text vor dem Match hinzufügen
    if (match.index > lastIndex) {
      container.appendChild(document.createTextNode(processedText.substring(lastIndex, match.index)));
    }
    
    // Erstelle den Link
    const moveLink = document.createElement('a');
    moveLink.href = '#';
    moveLink.className = 'ai-highlighted-move';
    moveLink.style.color = '#3692e7';
    moveLink.style.textDecoration = 'underline';
    
    // Originaltext als Link-Text verwenden
    const originalText = processedText.substring(match.index, match.index + match.length);
    moveLink.textContent = originalText;
    
    // Daten zum Zug speichern für Event-Handler
    moveLink.dataset.moveNumber = match.moveNumber;
    moveLink.dataset.isWhite = match.isWhite ? 'true' : 'false';
    moveLink.dataset.notation = match.notation;
    
    // Verhindere Standard-Link-Verhalten
    moveLink.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToMove(match.moveNumber, match.isWhite, match.notation);
    });
    
    container.appendChild(moveLink);
    
    // Aktualisiere lastIndex
    lastIndex = match.index + match.length;
  }
  
  // Rest des Textes hinzufügen
  if (lastIndex < processedText.length) {
    container.appendChild(document.createTextNode(processedText.substring(lastIndex)));
  }
  
  return container;
}

/**
 * Navigates to a specific move in the Lichess UI.
 */
function navigateToMove(moveNumber: string | undefined, isWhite: boolean, notation: string | undefined): void {
  console.log(`Navigating to move: ${moveNumber}${isWhite ? '.' : '...'} ${notation}`);
  
  if (!moveNumber || !notation) return;
  
  const moveNum = parseInt(moveNumber, 10);
  if (isNaN(moveNum)) return;
  
  try {
    const findAndClickMove = () => {
      const moveContainer = document.querySelector('.tview2');
      if (!moveContainer) {
        console.error('Move container .tview2 not found for navigation.');
        return false;
      }
      
      let targetMove: Element | null = null;
      const moveElements = moveContainer.querySelectorAll('move');

      for (const moveEl of Array.from(moveElements)) {
        const sanNode = moveEl.querySelector('san');
        const currentNotation = sanNode?.textContent?.trim() || moveEl.textContent?.trim();
        if (currentNotation !== notation) continue;

        // Find the preceding 'index' element to get the move number
        let prevSibling = moveEl.previousElementSibling;
        let currentMoveListNumber = '';
        let isCurrentMoveWhite = false;

        while (prevSibling) {
          if (prevSibling.tagName.toLowerCase() === 'index') {
            currentMoveListNumber = (prevSibling.textContent?.match(/^(\d+)/) || [])[1] || '';
            // Determine color: if moveEl is the first 'move' after 'index', it's white's move.
            // If it's the second 'move' (after white's move, possibly skipping an interrupt/empty), it's black's.
            let siblingAfterIndex = prevSibling.nextElementSibling;
            let moveCountAfterIndex = 0;
            while(siblingAfterIndex && siblingAfterIndex !== moveEl && moveCountAfterIndex < 3) {
              if (siblingAfterIndex.tagName.toLowerCase() === 'move' && !siblingAfterIndex.classList.contains('empty')) {
                moveCountAfterIndex++;
              }
              siblingAfterIndex = siblingAfterIndex.nextElementSibling;
            }
            if (siblingAfterIndex === moveEl && moveCountAfterIndex === 0) isCurrentMoveWhite = true;
            if (siblingAfterIndex === moveEl && moveCountAfterIndex === 1) isCurrentMoveWhite = false;
            break;
          }
          prevSibling = prevSibling.previousElementSibling;
        }

        if (currentMoveListNumber === moveNumber && isCurrentMoveWhite === isWhite) {
          targetMove = moveEl;
          break;
        }
      }
      
      if (targetMove) {
        console.log('Found target move for navigation:', targetMove);
        targetMove.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        const activeMoves = moveContainer.querySelectorAll('move.active');
        activeMoves.forEach(m => m.classList.remove('active'));
        targetMove.classList.add('active');
        
        setTimeout(() => {
          const mouseEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window });
          targetMove!.dispatchEvent(mouseEvent);
        }, 100);
        return true;
      }
      console.warn(`Move not found for navigation: ${moveNumber}${isWhite ? '.' : '...'} ${notation}`);
      return false;
    };
    
    if (!findAndClickMove()) {
      setTimeout(() => {
        findAndClickMove();
      }, 300); // Retry after a short delay if not found immediately
    }
  } catch (error) {
    console.error('Error navigating to move:', error);
  }
}


function preCorrectAndRebuildMomentsByPly(
  originalApiMoments: AnalysisMoment[],
  plyByDomMoveEl: Map<Element, number>
): Record<number, AnalysisMoment> {
  const correctedMomentsMap: Record<number, AnalysisMoment> = {};
  const assignedApiMoments = new Set<AnalysisMoment>(); // Verfolgt, welche API-Momente bereits zugeordnet wurden

  console.log('[MomentPreCorrection] Starting pre-correction. Original API moments:', originalApiMoments.length, 'DOM moves mapped:', plyByDomMoveEl.size);

  // Pass 1: Exakter Match von API-Ply und DOM-Ply, sowie SAN-Match
  originalApiMoments.forEach(apiMoment => {
    if (!apiMoment.move || assignedApiMoments.has(apiMoment)) return; // Moment ohne Zug oder bereits zugewiesen
    const apiSan = (apiMoment.move).replace(/[\s\?\.\!]+/g, '');

    for (const [moveEl, domPly] of plyByDomMoveEl.entries()) {
      const domSan = (moveEl.querySelector('san')?.textContent || moveEl.textContent || '').replace(/[\s\?\.\!]+/g, '');
      
      const isApiMomentWhite = apiMoment.color === 'white';
        const isDomPlyWhite = domPly % 2 === 1;
        if (apiMoment.ply === domPly && domSan === apiSan && isApiMomentWhite === isDomPlyWhite) {
        if (!correctedMomentsMap[domPly]) { // Nur wenn dieser domPly noch nicht belegt ist
          correctedMomentsMap[domPly] = { ...apiMoment, ply: domPly }; // Stelle sicher, dass der Ply-Wert der des DOM ist
          assignedApiMoments.add(apiMoment);
          console.log(`[MomentPreCorrection] Pass 1: Exact match for SAN '${apiSan}' at ply ${domPly}.`);
        } else {
          if (correctedMomentsMap[domPly].move?.replace(/[\s\?\.\!]+/g, '') !== apiSan || correctedMomentsMap[domPly].comment !== apiMoment.comment) {
             console.log(`[MomentPreCorrection] Pass 1: Slot for ply ${domPly} (SAN '${apiSan}') already taken by moment for SAN '${correctedMomentsMap[domPly].move}'. Skipping.`);
          }
        }
        break; 
      }
    }
  });

  // Pass 2: SAN-Match, aber API-Ply ist um +/-1 daneben (Korrektur)
  originalApiMoments.forEach(apiMoment => {
    if (assignedApiMoments.has(apiMoment) || !apiMoment.move) return; 
    const apiSan = (apiMoment.move).replace(/[\s\?\.\!]+/g, '');

    for (const [moveEl, domPly] of plyByDomMoveEl.entries()) {
      const domSan = (moveEl.querySelector('san')?.textContent || moveEl.textContent || '').replace(/[\s\?\.\!]+/g, '');

      const isApiMomentWhitePass2 = apiMoment.color === 'white';
        const isDomPlyWhitePass2 = domPly % 2 === 1;
        if (domSan === apiSan && isApiMomentWhitePass2 === isDomPlyWhitePass2) { 
          const plyDifference = Math.abs(apiMoment.ply - domPly);
          if (plyDifference <= 1) { 
            if (!correctedMomentsMap[domPly]) { 
            console.log(`[MomentPreCorrection] Pass 2: Adjusting moment for SAN '${apiSan}' from API ply ${apiMoment.ply} to DOM ply ${domPly} (diff: ${plyDifference}).`);
            correctedMomentsMap[domPly] = { ...apiMoment, ply: domPly }; 
            assignedApiMoments.add(apiMoment);
          } else {
            if (correctedMomentsMap[domPly].move?.replace(/[\s\?\.\!]+/g, '') !== apiSan || correctedMomentsMap[domPly].comment !== apiMoment.comment) {
                 console.log(`[MomentPreCorrection] Pass 2: Slot for ply ${domPly} (SAN '${apiSan}') already taken by moment for SAN '${correctedMomentsMap[domPly].move}'. Skipping adjustment from API ply ${apiMoment.ply}.`);
            }
          }
          break; 
        }
      }
    }
  });
  
  // Pass 3: For any unassigned moments, try to place them if their original API ply slot is free
  originalApiMoments.forEach(apiMoment => {
    if (assignedApiMoments.has(apiMoment)) return;

    if (!correctedMomentsMap[apiMoment.ply]) {
        console.log(`[MomentPreCorrection] Pass 3: Placing unassigned moment for SAN '${apiMoment.move || 'N/A'}' at its original API ply ${apiMoment.ply} as slot is free.`);
        correctedMomentsMap[apiMoment.ply] = { ...apiMoment }; 
        assignedApiMoments.add(apiMoment);
    } else {
      if (correctedMomentsMap[apiMoment.ply].move?.replace(/[\s\?\.\!]+/g, '') !== (apiMoment.move || '').replace(/[\s\?\.\!]+/g, '') || correctedMomentsMap[apiMoment.ply].comment !== apiMoment.comment) {
        console.log(`[MomentPreCorrection] Pass 3: Slot for original API ply ${apiMoment.ply} (SAN '${apiMoment.move || 'N/A'}') already taken by different moment. Moment could not be placed.`);
      }
    }
  });

  console.log(`[MomentPreCorrection] Finished pre-correction. ${Object.keys(correctedMomentsMap).length} moments in corrected map.`);
  return correctedMomentsMap;
}

/**
 * Highlights moves in the Lichess move list and integrates AI comments and interrupts.
 * 
 * This function handles the complex DOM manipulation required to:
 * 1. Parse Lichess move structure and calculate ply values
 * 2. Insert AI comments into existing or new interrupt elements  
 * 3. Create empty moves for proper display structure when AI/native interrupts are present
 * 
 * The process order is critical:
 * - First: Build ply-to-moveElement mapping (plyByMoveEl)
 * - Second: Process AI comments and create interrupts
 * - Third: Create empty moves (must be last to avoid cleanup removal)
 * 
 * Key challenges solved:
 * - Lichess uses encoded 'p' attributes on move elements (not searchable via CSS selectors)
 * - Empty moves must respect existing native Lichess empty moves to prevent duplicates
 * - Fuzzy matching for ply values to handle discrepancies between calculated and expected values
 * - Complex DOM structure with variants, lines, and interrupts that must be navigated carefully
 * 
 * @param moveListContainer - The container element of the Lichess move list
 * @param moments - Array of chess analysis moments with AI comments
 */
export function highlightMovesInMoveList(moveListContainer: HTMLElement, moments: AnalysisMoment[]): void {
  if (!moveListContainer || !moments || moments.length === 0) {
    console.log('No move list container or moments found');
    return;
  }
  console.log('Moments:', moments);
  
  // Simpler, more aggressive cleanup for all AI-generated elements
  console.log('🧹 Starting AI elements cleanup...');
  document.querySelectorAll('[data-ai-empty-id]').forEach(el => {
    console.log(`🗑️ Removing AI-created empty move (ID: ${el.getAttribute('data-ai-empty-id')})`);
    el.remove();
  });
  document.querySelectorAll('index[data-ai-created-index-for-ply]').forEach(el => {
    console.log(`🗑️ Removing AI-created index (for ply: ${el.getAttribute('data-ai-created-index-for-ply')})`);
    el.remove();
  });

  const aiCommentsToRemove = Array.from(document.querySelectorAll('.ai-comment'));
  aiCommentsToRemove.forEach(aiComment => {
    console.log('🗑️ Removing AI comment');
    const interrupt = aiComment.closest('interrupt');
    aiComment.remove(); // Remove AI comment itself
    if (interrupt && interrupt.children.length === 0 && !interrupt.textContent?.trim()) {
      // Check if interrupt is still in DOM before removing, as it might have been removed if aiComment was only child
      if (document.body.contains(interrupt)) {
          console.log('🗑️ Removing now-empty interrupt (due to AI comment removal)');
          interrupt.remove();
      }
    }
  });

  // Second pass for any interrupts that might have become completely empty
  document.querySelectorAll('interrupt').forEach(interrupt => {
    if (interrupt.children.length === 0 && !interrupt.textContent?.trim()) {
       if (document.body.contains(interrupt)) { 
          console.log('🗑️ Removing empty interrupt (second pass)');
          interrupt.remove();
       }
    }
  });
  console.log('🧹 AI elements cleanup finished.');
  
  // Inject CSS for AI comments
  injectAICommentStyles();
  
  // Map to store ply for each move element, built before pre-correction
  const plyByMoveEl = new Map<Element, number>();
  // ... (logic to populate plyByMoveEl needs to be here, before calling preCorrectAndRebuildMomentsByPly)
  // This part of the logic was complex and involved iterating moveElements and indexElements.
  // For now, I'll assume plyByMoveEl is populated correctly by the existing logic that follows shortly.
  // The call to preCorrectAndRebuildMomentsByPly will be moved after plyByMoveEl is populated.

  // Placeholder for where plyByMoveEl is fully populated.
  // The actual pre-correction call will be moved after the loop that builds plyByMoveEl.

  
  // Find all move entries in the move list
  setTimeout(() => {
    // Wait briefly as Lichess might update the move list dynamically
    console.log('Looking for move elements and their PLY values');
    // console.log('Moments by ply:', Object.keys(momentsByPly).map(Number)); // momentsByPly is replaced
    
    // Neue Strategie: Folge der DOM-Struktur und ermittle PLY-Werte basierend auf den index-Elementen
    const moveElements = Array.from(moveListContainer.querySelectorAll('move')).filter(moveEl => {
      // Überspringe Züge die innerhalb von Varianten stehen
      if (moveEl.closest('lines') || moveEl.closest('line') || moveEl.closest('branch')) {
        return false;
      }
      
      // Überspringe leere Züge und "[...]" Platzhalter
      if (moveEl.classList.contains('empty')) {
        return false;
      }
      
      const moveText = moveEl.querySelector('san')?.textContent || moveEl.textContent || '';
      if (moveText.includes('[...]') || moveText.trim() === '...') {
        return false;
      }
      
      return true;
    });

    console.log(`Found ${moveElements.length} main moves (excluding variants)`);

    // Sammele alle Züge und ihre zugehörigen Vollzüge
    const indexElements = moveListContainer.querySelectorAll('index');
    
    // Map erstellen, um jeden Zug mit seinem Ply-Wert zu verfolgen
    const plyByMoveEl = new Map<Element, number>();
    
    // Zuerst alle Index-Elemente verarbeiten, um die Vollzug-Nummern zu bekommen
    let currentFullMoveNumber = 0;
    let lastIndexContent = '';
    indexElements.forEach((indexEl: Element) => {
      const indexText = indexEl.textContent || '';
      // Index-Inhalte können sein: "1", "1...", "1.", etc.
      const numberMatch = indexText.match(/(\d+)/);
      if (numberMatch) {
        currentFullMoveNumber = parseInt(numberMatch[1], 10);
        lastIndexContent = indexText;
      }
    });
    
    // Züge durchgehen und Ply-Werte berechnen
    // Robuster Ansatz: Verfolge direkt die Vollzüge aus den Index-Elementen
    
    // Map zum Tracken der Indizes und zugehörigen Vollzüge
    const movesByFullMoveNumber = new Map<number, { white?: Element; black?: Element }>();
    let lastIndexNumber = 0;
    let currentMoveColor: 'white' | 'black' = 'white'; // Spur halten, welche Farbe als nächstes dran ist
    
    moveElements.forEach((moveEl) => {
      const moveText = moveEl.querySelector('san')?.textContent || moveEl.textContent || '';
      const prevEl = moveEl.previousElementSibling;
      
      // Prüfe, ob direkt vor diesem Zug ein Index steht
      let indexEl = prevEl;
      let stepsBack = 0;
      let foundIndex = false;
      
      // Gehe bis zu 5 Schritte zurück, um einen Index zu finden
      // (um <move class="empty">, <interrupt> etc. zu überspringen)
      while (indexEl && stepsBack < 5) {
        if (indexEl.tagName.toLowerCase() === 'index') {
          const indexText = indexEl.textContent || '';
          const match = indexText.match(/(\d+)/);
          if (match) {
            const newIndexNumber = parseInt(match[1], 10);
            
            // Nur wenn sich die Zugnummer ändert, setzen wir einen neuen Vollzug
            if (newIndexNumber !== lastIndexNumber) {
              lastIndexNumber = newIndexNumber;
              currentMoveColor = 'white'; // Nach einem neuen Index kommt immer ein weißer Zug
            } else {
              currentMoveColor = 'black'; // Nach einem weißen Zug kommt immer ein schwarzer Zug
            }
            foundIndex = true;
            break;
          }
        }
        indexEl = indexEl.previousElementSibling;
        stepsBack++;
      }
      
      if (!foundIndex) {
      }
      
      // Stelle sicher, dass wir einen Eintrag für diesen Vollzug haben
      if (!movesByFullMoveNumber.has(lastIndexNumber)) {
        movesByFullMoveNumber.set(lastIndexNumber, {});
      }
      
      const moveData = movesByFullMoveNumber.get(lastIndexNumber)!;
      
      if (currentMoveColor === 'white' && !moveData.white) {
        // Das ist der weiße Zug für diesen Vollzug
        moveData.white = moveEl;
        currentMoveColor = 'black'; // Nächster Zug wird schwarz sein
      } else if (currentMoveColor === 'black' && !moveData.black) {
        // Das ist der schwarze Zug für diesen Vollzug
        moveData.black = moveEl;
        currentMoveColor = 'white'; // Nach schwarz kommt der nächste Vollzug (weiß)
      } else {
      }
    });
    
    // Ply-Zuordnung wieder hinzufügen
    for (const [fullMoveNumber, moves] of movesByFullMoveNumber.entries()) {
      if (moves.white) {
        const ply = 2 * fullMoveNumber - 1; // Weiße Züge: 1, 3, 5, 7, 9, 11, 13...
        plyByMoveEl.set(moves.white, ply);
      }
      
      if (moves.black) {
        const ply = 2 * fullMoveNumber; // Schwarze Züge: 2, 4, 6, 8, 10, 12, 14...
        plyByMoveEl.set(moves.black, ply);
      }
    }
    
    // JETZT, da plyByMoveEl vollständig ist, können wir die Momente vorkorrigieren:
    const finalCorrectedMomentsByPly = preCorrectAndRebuildMomentsByPly(moments, plyByMoveEl);
    console.log('[MomentPreCorrection] Final corrected moments map:', JSON.parse(JSON.stringify(finalCorrectedMomentsByPly)));

    const processMove = (moveEl: Element, ply: number, currentCorrectedMomentsByPly: Record<number, AnalysisMoment>) => {
      // Toleranz für ungenaue Ply-Werte einbauen
      // Auch bei leichten Abweichungen (±1) sollen die Kommentare angezeigt werden
      let moment = currentCorrectedMomentsByPly[ply];
      
      // Wenn kein Moment für den exakten Ply gefunden wurde, versuche benachbarte Plys
      if (!moment) {
        // Erst prüfen, ob ein Zug mit dem gleichen Text in einem benachbarten Ply existiert
        const moveText = moveEl.querySelector('san')?.textContent || moveEl.textContent || '';
        const trimmedMoveText = moveText.replace(/[\s\?\.\!]+/g, ''); // Entferne Leerzeichen, ?, ., ! etc.
        
        // Benachbarte Plys prüfen (-1, +1)
        for (const offset of [-1, 1]) {
          const nearbyPly = ply + offset;
          const nearbyMoment = currentCorrectedMomentsByPly[nearbyPly];
          
          if (nearbyMoment && nearbyMoment.move) {
            const trimmedMomentMove = nearbyMoment.move.replace(/[\s\?\.\!]+/g, '');
            
            // Wenn der Zugtext exakt übereinstimmt (nach Bereinigung)
            if (trimmedMoveText === trimmedMomentMove) {
              moment = nearbyMoment;
              console.log(`[FuzzyMatchDebug] Fuzzy matched for moveEl "${trimmedMoveText}" (ply ${ply}) with moment for "${trimmedMomentMove}" from nearbyPly ${nearbyPly}`);
              break;
            }
          }
        }
      }
      
      // Immer noch kein Moment gefunden?
      if (!moment) {
        return; // Kein wichtiger Moment für diesen Zug
      }
      
      // Prüfe, ob dieser Moment bereits gerendert wurde (Anti-Duplikat-Schutz)
      const momentId = `ply-${moment.ply}-${moment.move}`;
      if (document.querySelector(`[data-moment-id="${momentId}"]`)) {
        return;
      }
      
      // Prüfe, ob es sich um einen Variantenzug handelt
      if (moveEl.closest('lines') || moveEl.closest('line') || moveEl.closest('branch')) {
        return;
      }

      // Check for existing interrupt
      let interruptElement: HTMLElement | null = null;
      let nextElement = moveEl.nextElementSibling;
      
      // Das interrupt Element sollte immer direkt nach dem Move kommen
      // Wenn ein <move class="empty"> dazwischen ist, schaue dahinter
      if (nextElement && nextElement.classList.contains('empty')) {
        nextElement = nextElement.nextElementSibling as HTMLElement;
      }
      
      // Check if there's already an interrupt with Lichess comments
      if (nextElement && nextElement.tagName.toLowerCase() === 'interrupt') {
        interruptElement = nextElement as HTMLElement;
        
        // Check if there's already an AI comment
        const existingAIComment = interruptElement.querySelector('.ai-comment');
        if (existingAIComment) {
          return;
        }
      }
      
      // If no existing interrupt found, create one
      if (!interruptElement) {
        interruptElement = document.createElement('interrupt');
        // Interrupts (containing comments) are always placed AFTER the move element in the DOM
        moveEl.after(interruptElement);
      }
      
      // Create and add the AI comment
      const comment = document.createElement('comment');
      comment.className = 'ai-comment';
      comment.setAttribute('data-moment-id', momentId);
      insertAIComment(comment, moment);
      
      // Add the comment to the interrupt AFTER any existing Lichess comments
      // but BEFORE any lines elements
      const existingComment = interruptElement.querySelector('comment:not(.ai-comment)');
      const existingLines = interruptElement.querySelector('lines');
      
      if (existingComment && existingLines) {
        interruptElement.insertBefore(comment, existingLines);
      } else if (existingComment) {
        existingComment.after(comment);
      } else if (existingLines) {
        interruptElement.insertBefore(comment, existingLines);
      } else {
        interruptElement.appendChild(comment);
      }
    };

    // Iteriere über die `plyByMoveEl` Map, um die Reihenfolge der DOM-Elemente beizubehalten
    plyByMoveEl.forEach((ply, moveEl) => {
      processMove(moveEl, ply, finalCorrectedMomentsByPly);
    });

    // Nach allen Moment-Verarbeitungen: Erstelle Empty-Moves für die Darstellung
    // Das muss nach den Cleanups passieren, damit sie nicht wieder entfernt werden
    
    // CRITICAL: Empty move creation must happen AFTER all AI comment processing
    // to prevent them from being removed by cleanup functions.
    // We use the plyByMoveEl Map instead of DOM queries because Lichess uses
    // encoded 'p' attributes that are not searchable via standard selectors.
    
    // Verwende die bereits erstellte plyByMoveEl Map anstatt DOM-Queries
    // Iterate over all moves found on the main line (via plyByMoveEl)
    // to decide where empty moves are structurally needed.
    for (const [moveElementFromMap, plyFromMap] of plyByMoveEl.entries()) {
      const moveEl = moveElementFromMap as HTMLElement; // Current move being considered
      const ply = plyFromMap; // Ply of the current moveEl

      const isWhiteMove = ply % 2 === 1;

      if (isWhiteMove) {
        const whitePly = ply;
        const blackPly = whitePly + 1;

        // Helper to determine if a move has any interrupt (AI or native)
        interface InterruptCheckResult {
          hasInterrupt: boolean;
          // The DOM element that IS the interrupt (the <interrupt> tag) or null if no interrupt structure.
          interruptDOMNode: HTMLElement | null;
        }
        const checkInterrupt = (currentMoveEl: HTMLElement, currentPly: number): InterruptCheckResult => {
          const hasAIMoment = !!finalCorrectedMomentsByPly[currentPly];
          let actualInterruptElement: HTMLElement | null = null;
          let nextPotentialElement = currentMoveEl.nextElementSibling;

          // Skip over any Lichess-generated empty moves (they don't have 'data-ai-empty-id')
          // to find our interrupt or a native interrupt.
          while (nextPotentialElement && 
                 nextPotentialElement.tagName.toLowerCase() === 'move' && 
                 nextPotentialElement.classList.contains('empty') && 
                 !nextPotentialElement.hasAttribute('data-ai-empty-id')) {
            nextPotentialElement = nextPotentialElement.nextElementSibling;
          }

          if (nextPotentialElement?.tagName.toLowerCase() === 'interrupt') {
            actualInterruptElement = nextPotentialElement as HTMLElement;
          }

          const isNativeInterruptContent = actualInterruptElement &&
                                       (actualInterruptElement.querySelector('comment:not(.ai-comment)') ||
                                        actualInterruptElement.querySelector('lines'));

          if (hasAIMoment || isNativeInterruptContent) {
            return {
              hasInterrupt: true,
              // actualInterruptElement is the <interrupt> tag if found after skipping Lichess empty moves
              interruptDOMNode: actualInterruptElement 
            };
          }
          return { hasInterrupt: false, interruptDOMNode: null };
        };

        const whiteInterruptDetailsLocal = checkInterrupt(moveEl, whitePly);
        const whiteHasInterrupt = whiteInterruptDetailsLocal.hasInterrupt;

        let blackHasInterrupt = false;
        let blackMoveElement: HTMLElement | null = null;
        for (const [bmEl, bmPly] of plyByMoveEl.entries()) {
          if (bmPly === blackPly) {
            blackMoveElement = bmEl as HTMLElement;
            break;
          }
        }
        if (blackMoveElement) {
          blackHasInterrupt = checkInterrupt(blackMoveElement, blackPly).hasInterrupt;
        }
        
        console.log(`[EmptyMoveDebug] White Move: ${moveEl.textContent?.trim()} (ply ${whitePly}). White hasInterrupt: ${whiteHasInterrupt}. Black (ply ${blackPly}) hasInterrupt: ${blackHasInterrupt}`);

        // USER RULE: If White has an interrupt AND Black (same full move) does NOT,
        // insert structure: emptyMove1, newIndexElement, emptyMove2.
        if (whiteHasInterrupt && !blackHasInterrupt) {
          let pointOfInsertion = moveEl; // White's move element (ply: whitePly)
          if (moveEl.nextElementSibling?.tagName.toLowerCase() === 'interrupt') {
            pointOfInsertion = moveEl.nextElementSibling as HTMLElement; // White's interrupt element
          }

          // Check if our full structure (empty1-index-empty2) already exists after pointOfInsertion
          const el1 = pointOfInsertion.nextElementSibling;
          const el2 = el1?.nextElementSibling;
          const el3 = el2?.nextElementSibling;

          const alreadyCorrectlyStructured = 
              el1?.matches('move.empty[data-ai-empty-id]') &&
              el2?.matches(`index[data-ai-created-index-for-ply="${blackPly}"]`) &&
              el3?.matches('move.empty[data-ai-empty-id]');

          if (!alreadyCorrectlyStructured) {
            console.log(`[EmptyMoveDebug] -> Building structure (empty1, newIndex, empty2) for whitePly ${whitePly}, blackPly ${blackPly}. Insertion after: ${pointOfInsertion.tagName} '${pointOfInsertion.textContent?.trim().substring(0,10)}'`);
            
            // Create emptyMove1
            // Determine the actual interrupt element for white, if any.
            // This element (if it's an <interrupt> tag) should already be in the DOM, typically after moveEl.
            const whiteInterruptDetails = whiteInterruptDetailsLocal; // Use the already fetched details
            const actualWhiteInterruptDOMElement = whiteInterruptDetails.interruptDOMNode;

            // Explicit DOM manipulation for the white-interrupt-only case
            // Order: moveEl -> emptyMove1 -> actualWhiteInterruptDOMElement -> newIndexElement -> emptyMove2

            // 1. Create and insert emptyMove1 after white's move (moveEl)
            const emptyMove1 = document.createElement('move');
            emptyMove1.className = 'empty';
            emptyMove1.textContent = '...';
            emptyMove1.setAttribute('data-ai-empty-id', `em1-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
            moveEl.after(emptyMove1);

            // 2. Create newIndexElement (for Black's turn, content is just the number)
            const newIndexElement = document.createElement('index');
            const blackMoveFullNumber = blackPly / 2;
            newIndexElement.textContent = `${blackMoveFullNumber}`;
            newIndexElement.setAttribute('data-ai-created-index-for-ply', blackPly.toString());
            // Attempt to copy class for styling consistency
            let precedingIndexSearch = moveEl.previousElementSibling;
            let foundPrecedingIndexClass = false;
            while (precedingIndexSearch) {
                if (precedingIndexSearch.tagName.toLowerCase() === 'index') {
                    if (precedingIndexSearch.className && precedingIndexSearch.className.startsWith('sbhint')) {
                        newIndexElement.className = precedingIndexSearch.className.replace(/sbhint\d+/, `sbhint${blackPly}`);
                        foundPrecedingIndexClass = true;
                    }
                    break;
                }
                precedingIndexSearch = precedingIndexSearch.previousElementSibling;
            }
            if (!foundPrecedingIndexClass) {
                newIndexElement.className = `sbhint${blackPly}`; // Fallback
            }

            // 3. Create emptyMove2
            const emptyMove2 = document.createElement('move');
            emptyMove2.className = 'empty';
            emptyMove2.textContent = '...';
            emptyMove2.setAttribute('data-ai-empty-id', `em2-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

            // 4. Position the interrupt and insert other elements
            if (actualWhiteInterruptDOMElement) {
                // Order: moveEl -> emptyMove1 -> actualWhiteInterruptDOMElement -> newIndexElement -> emptyMove2
                emptyMove1.after(actualWhiteInterruptDOMElement); // Move interrupt after emptyMove1
                actualWhiteInterruptDOMElement.after(newIndexElement); // Insert newIndex after interrupt
                newIndexElement.after(emptyMove2); // Insert emptyMove2 after newIndexElement
            } else {
                // This case implies whiteHasInterrupt was true, but checkInterrupt didn't find the DOM node.
                // This will lead to the incorrect order: moveEl -> emptyMove1 -> newIndexElement -> emptyMove2 ... (interrupt is somewhere else)
                console.warn(`[EmptyMoveDebug] CRITICAL: actualWhiteInterruptDOMElement is null but whiteHasInterrupt is true for ply ${whitePly}. Interrupt will be misplaced.`);
                emptyMove1.after(newIndexElement); // Insert newIndex after emptyMove1
                newIndexElement.after(emptyMove2); // Insert emptyMove2 after newIndex
            }

            console.log(`[EmptyMoveDebug] -> Inserted structure: empty1, newIndex, empty2.`);
          } else {
            console.log(`[EmptyMoveDebug] -> Full AI structure (empty1, newIndex, empty2) already exists for whitePly ${whitePly}.`);
          }
        } else {
          // Conditions for this specific 3-element structure not met.
          console.log(`[EmptyMoveDebug] -> Conditions for empty1-newIndex-empty2 structure not met for whitePly ${whitePly}. WhiteHasInterrupt: ${whiteHasInterrupt}, BlackHasInterrupt: ${blackHasInterrupt}`);
        }
      } else {
        // Black move: No empty move creation logic from Black's perspective based on the refined rule.
        // The console logs previously here for black move's empty decision are removed.
      }
    }
  }, 500);
}

/**
 * Injects CSS styles for AI comments
 */
export function injectAICommentStyles(): void {
  if (document.getElementById('ai-comment-styles')) return;

  const styleSheet = document.createElement('style');
  styleSheet.id = 'ai-comment-styles';
  document.head.appendChild(styleSheet);

  function setJWColors(isDark: boolean) {
    console.log('setJWColors', isDark);
    styleSheet.innerHTML = `
      .ai-comment, .ai-analysis-tab-label {
        color: ${isDark ? '#bfaee9' : '#835ed8'};
        padding: 5px 0;
      }
      /* move highlights in summary */
      .ai-highlighted-move {
        background-color: ${isDark ? 'hsl(258deg 78% 74% / 34%)' : 'rgb(210 200 233 / 40%)'} !important;
        color: inherit;
        text-decoration: none;
        padding: 0 3px;
        border-radius: 3px;
      }
      .ai-highlighted-move,
      .ai-highlighted-move a,
      .ai-highlighted-move a:visited,
      .ai-highlighted-move a:hover,
      .ai-highlighted-move a:active {
        color: inherit !important;
        -webkit-text-fill-color: inherit !important;
        text-decoration: none !important;
        background-color: inherit;
      }
      .ai-highlighted-move {
        background-color: ${isDark ? 'hsl(258deg 78% 74% / 34%)' : 'rgb(210 200 233 / 40%)'} !important;
      }
      .ai-highlighted-move:hover, .ai-highlighted-move:active {
        background-color: ${isDark ? 'hsl(258deg 78% 74% / 34%)' : 'rgb(210 200 233 / 40%)'} !important;
      }
      .ai-recommendation {
        margin-top: 3px;
      }
      .ai-recommendation-move {
        font-weight: bold;
      }
    `;
  }

  // Initial set
  setJWColors(document.body.classList.contains('dark'));

  // Listen for Lichess theme changes
  const observer = new MutationObserver(() => {
    const isDark = document.body.classList.contains('dark');
    setJWColors(isDark);
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}


/**
 * Inserts an AI comment into an element
 */
export function insertAIComment(element: HTMLElement, moment: AnalysisMoment): void {
  // Emoji for magic: ✨ (Sparkles)
  element.innerHTML = `
    ${moment.comment || ''}
    ${moment.recommendation ? `
      <div class="ai-recommendation">
        <span class="ai-recommendation-move">${i18next.t('analysis.better')} ${moment.recommendation}</span>
        <div>${moment.reasoning || ''}</div>
      </div>
    ` : ''}
  `;
}

/**
 * Displays the analysis result in the content panel
 */
export function displayAnalysisResult(result: any, container: HTMLElement): void {
  // Normalize data from different formats
  const normalizedData = normalizeAnalysisData(result);
  
  // Bestimme, ob es eine richtige Analyse ist oder nur ein leerer/Fehler-Zustand
  const hasAnalysis = normalizedData.summary && normalizedData.summary.trim().length > 0;
  
  // Leere den Container und setze die Grundstile
  container.innerHTML = '';
  container.style.padding = '0';
  container.style.margin = '0';
  container.style.height = '100%';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';

  const content = document.createElement('div');
  content.className = 'chess-gpt-analysis-content';
  content.style.padding = '0';
  content.style.margin = '0';
  content.style.flex = '1';
  content.style.display = 'flex';
  content.style.flexDirection = 'column';
  content.style.minHeight = '0';
  
  if (hasAnalysis) {
    // Analyse-Inhalt erstellen
    const analysisContent = document.createElement('div');
    analysisContent.className = 'analysis-content';
    analysisContent.style.margin = '0';
    analysisContent.style.padding = '10px';
    analysisContent.style.flex = '1';
    analysisContent.style.display = 'flex';
    analysisContent.style.flexDirection = 'column';
    analysisContent.style.minHeight = '0';
    
    // Scrollbaren Container für die Zusammenfassung erstellen
    const summaryContainer = document.createElement('div');
    summaryContainer.className = 'summary-container';
    summaryContainer.style.flex = '1';
    summaryContainer.style.minHeight = '0'; // Important for flexbox scrolling
    summaryContainer.style.overflowY = 'auto';
    summaryContainer.style.fontSize = '95%';
    summaryContainer.style.whiteSpace = 'pre-line';
    summaryContainer.style.paddingRight = '8px';
    summaryContainer.style.paddingBottom = '10px';
    summaryContainer.style.margin = '0';
    summaryContainer.style.overflowWrap = 'break-word';
    
    // Statt einfachem Text nun formatierte Links für Zugnotationen verwenden
    const formattedContent = convertMovesToLinks(normalizedData.summary);
    summaryContainer.appendChild(formattedContent);
    
    analysisContent.appendChild(summaryContainer);
    
    
    content.appendChild(analysisContent);
  } else {
    // Leerer Zustand
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-analysis';
    emptyState.style.color = '#666';
    emptyState.style.textAlign = 'center';
    emptyState.style.padding = '20px 0';
    
    const noAnalysisText = document.createElement('p');
    noAnalysisText.textContent = 'Keine Analyse verfügbar.';
    emptyState.appendChild(noAnalysisText);
    
    const hintText = document.createElement('p');
    hintText.style.fontSize = '0.9em';
    hintText.style.marginTop = '8px';
    hintText.textContent = 'Wechsle zu einem anderen Tab und zurück, um eine Analyse zu starten.';
    emptyState.appendChild(hintText);
    
    content.appendChild(emptyState);
  }
  
  // Container mit Content füllen
  container.appendChild(content);
  
  // Implement highlights in the move list if moments are available
  if (normalizedData.moments && normalizedData.moments.length > 0) {
    console.log(`Highlighting ${normalizedData.moments.length} moments in move list`);
    // Find the move list
    const moveListContainer = document.querySelector('.tview2');
    if (moveListContainer) {
      highlightMovesInMoveList(moveListContainer as HTMLElement, normalizedData.moments);
    } else {
      console.error('Move list container not found');
    }
  } else {
    console.log('No moments to highlight');
  }
}
