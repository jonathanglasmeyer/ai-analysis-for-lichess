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
    console.log('Normalized from originalResponse.analysis');
  }
  // Case 2: Cache hit with direct structure
  else if (response?.summary) {
    normalized.summary = response.summary || '';
    normalized.moments = response.moments || [];
    console.log('Normalized from direct response');
  }
  // Case 3: Fresh analysis with data structure
  else if (response?.data) {
    normalized.summary = response.data.summary || '';
    normalized.moments = response.data.moments || [];
    console.log('Normalized from response.data');
  }
  // Case 4: Direct analysis object
  else if (response?.analysis) {
    normalized.summary = response.analysis.summary || '';
    normalized.moments = response.analysis.moments || [];
    console.log('Normalized from response.analysis');
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
          console.log('Parsed moments from JSON code block');
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
 * Erkennt Formate wie [14. Qxd8] oder [14...Qxd8]
 */
function convertMovesToLinks(text: string): HTMLDivElement {
  // Regex für Zugnotationen im Format [Zugnummer. Notation] oder [Zugnummer... Notation]
  const moveRegex = /\[(\d+)\s*(\.{1,3})\s*([^\]]+)\]/g;
  
  // Container für den HTML-Inhalt
  const container = document.createElement('div');
  
  // Text in Segmente aufteilen und Links einfügen
  let lastIndex = 0;
  let match;
  
  while ((match = moveRegex.exec(text)) !== null) {
    // Text vor dem Match hinzufügen
    if (match.index > lastIndex) {
      const textNode = document.createTextNode(text.substring(lastIndex, match.index));
      container.appendChild(textNode);
    }
    
    // Zugnotation extrahieren
    const moveNumber = match[1]; // z.B. "14"
    const dots = match[2];       // z.B. "." oder "..."
    const notation = match[3];   // z.B. "Qxd8"
    
    // Link erstellen
    const moveLink = document.createElement('a');
    moveLink.href = '#';
    moveLink.className = 'ai-highlighted-move';
    
    // Erstelle den Linktext OHNE eckige Klammern
    moveLink.textContent = `${moveNumber}${dots} ${notation}`; // z.B. "14. Qxd8" statt "[14. Qxd8]"
    

    
    // Daten zum Zug speichern für Event-Handler
    moveLink.dataset.moveNumber = moveNumber;
    moveLink.dataset.isWhite = dots === '.' ? 'true' : 'false';
    moveLink.dataset.notation = notation.trim();
    
    // Verhindere Standard-Link-Verhalten
    moveLink.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToMove(moveLink.dataset.moveNumber, moveLink.dataset.isWhite === 'true', moveLink.dataset.notation);
    });
    
    container.appendChild(moveLink);
    
    lastIndex = match.index + match[0].length;
  }
  
  // Rest des Textes hinzufügen
  if (lastIndex < text.length) {
    const textNode = document.createTextNode(text.substring(lastIndex));
    container.appendChild(textNode);
  }
  
  return container;
}

/**
 * Navigiert zu einem bestimmten Zug in der Lichess-Oberfläche
 */
function navigateToMove(moveNumber: string | undefined, isWhite: boolean, notation: string | undefined): void {
  console.log(`Navigating to move: ${moveNumber}${isWhite ? '.' : '...'} ${notation}`);
  
  if (!moveNumber) return;
  if (!notation) return;
  
  // Konvertiere moveNumber zu Integer
  const moveNum = parseInt(moveNumber, 10);
  if (isNaN(moveNum)) return;
  
  // Berechne die Halbzugnummer (ply)
  // Jeder vollständige Zug besteht aus zwei Halbzügen (weiß und schwarz)
  // Weiße Züge sind ungerade, schwarze Züge sind gerade
  const ply = (moveNum - 1) * 2 + (isWhite ? 1 : 2);
  
  try {
    // Hilfsfunktion für DOM-Navigation
    const findAndClickMove = () => {
      // Finde das richtige Element in der Zugliste
      const moveContainer = document.querySelector('.tview2');
      if (!moveContainer) {
        console.error('Move container not found');
        return false;
      }
      
      const moveText = `${moveNumber}${isWhite ? '.' : '...'} ${notation}`;
      let targetMove: Element | null = null;
      
      // ROBUSTE SUCHE: Finde das passende Move-Element anhand von Zugnummer und SAN
      const moveElements = moveContainer.querySelectorAll('move');
      console.group('DEBUG: Move DOM-Scan');
      console.log('Gesucht:', { moveNumber, notation });
      for (const moveEl of Array.from(moveElements)) {
        const san = moveEl.querySelector('san');
        // Rückwärts laufen bis zum nächsten index-Element (überspringt leere/intermediate Elemente)
        let prev = moveEl.previousElementSibling;
        let foundIndex = null;
        while (prev) {
          if (prev.tagName.toLowerCase() === 'index') {
            foundIndex = prev.textContent?.trim();
            break;
          }
          prev = prev.previousElementSibling;
        }
        console.log('DOM:', { foundIndex, san: san?.textContent?.trim() });
        if (!san || san.textContent?.trim() !== notation) continue;
        if (foundIndex === moveNumber) {
          targetMove = moveEl;
          console.log('TREFFER:', { foundIndex, san: san.textContent?.trim() });
          break;
        }
      }
      
      // Klick auf den Zug auslösen, wenn gefunden
      if (targetMove) {
        console.log('Found target move:', targetMove);
        
        // Zum Element scrollen
        targetMove.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // 1. Markiere alle aktiven Züge als inaktiv
        const activeMoves = moveContainer.querySelectorAll('move.active');
        activeMoves.forEach(m => m.classList.remove('active'));
        
        // 2. Markiere den ausgewählten Zug als aktiv
        targetMove.classList.add('active');
        
        // 3. Simuliere einen Mausklick auf den Zug
        setTimeout(() => {
          const mouseEvent = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          targetMove!.dispatchEvent(mouseEvent);
        }, 100);
        
        return true;
      }
      
      console.warn(`Move not found: ${moveNumber}${isWhite ? '.' : '...'} ${notation}`);
      return false;
    };
    
    // Versuche die DOM-Navigation
    if (!findAndClickMove()) {
      // Wenn es nicht sofort klappt, warte kurz und versuche es noch einmal
      // (manchmal braucht Lichess einen Moment, um die DOM-Struktur zu aktualisieren)
      setTimeout(() => {
        findAndClickMove();
      }, 300);
    }
  } catch (error) {
    console.error('Error navigating to move:', error);
  }
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
  
  // Cleanup: Entferne alle von uns erstellten Empty-Moves und AI-Kommentare aus vorherigen Durchläufen
  const existingAIComments = document.querySelectorAll('.ai-comment');
  existingAIComments.forEach(comment => {
    const interrupt = comment.closest('interrupt');
    // Wenn das interrupt nur unseren AI-Kommentar enthält, entferne das ganze interrupt
    if (interrupt && interrupt.children.length === 1 && interrupt.children[0].classList.contains('ai-comment')) {
      // Prüfe, ob es ein von uns erstelltes Empty-Move vor oder nach dem interrupt gibt
      const prevEmpty = interrupt.previousElementSibling;
      const nextEmpty = interrupt.nextElementSibling;
      
      if (prevEmpty && prevEmpty.tagName.toLowerCase() === 'move' && prevEmpty.classList.contains('empty') && prevEmpty.hasAttribute('data-ai-empty-id')) {
        console.log(`🗑️ Removing AI-created empty move (ID: ${prevEmpty.getAttribute('data-ai-empty-id')}) before interrupt`);
        prevEmpty.remove();
      }
      if (nextEmpty && nextEmpty.tagName.toLowerCase() === 'move' && nextEmpty.classList.contains('empty') && nextEmpty.hasAttribute('data-ai-empty-id')) {
        console.log(`🗑️ Removing AI-created empty move (ID: ${nextEmpty.getAttribute('data-ai-empty-id')}) after interrupt`);
        nextEmpty.remove();
      }
      
      console.log('🗑️ Removing AI-only interrupt');
      interrupt.remove();
    } else if (interrupt) {
      // Nur den AI-Kommentar entfernen, interrupt behalten
      console.log('🗑️ Removing AI comment from shared interrupt');
      comment.remove();
    }
  });
  
  // Inject CSS for AI comments
  injectAICommentStyles();
  
  // Collect all moves in a ply-based mapping
  const momentsByPly: Record<number, AnalysisMoment> = {};
  moments.forEach((moment: AnalysisMoment) => {
    momentsByPly[moment.ply] = moment;
  });
  
  // Find all move entries in the move list
  setTimeout(() => {
    // Wait briefly as Lichess might update the move list dynamically
    console.log('Looking for move elements and their PLY values');
    console.log('Moments by ply:', Object.keys(momentsByPly).map(Number));
    
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
    
    const processMove = (moveEl: Element, ply: number) => {
      // Toleranz für ungenaue Ply-Werte einbauen
      // Auch bei leichten Abweichungen (±1) sollen die Kommentare angezeigt werden
      let moment = momentsByPly[ply];
      
      // Wenn kein Moment für den exakten Ply gefunden wurde, versuche benachbarte Plys
      if (!moment) {
        // Erst prüfen, ob ein Zug mit dem gleichen Text in einem benachbarten Ply existiert
        const moveText = moveEl.querySelector('san')?.textContent || moveEl.textContent || '';
        const trimmedMoveText = moveText.replace(/[\s\?\.\!]+/g, ''); // Entferne Leerzeichen, ?, ., ! etc.
        
        // Benachbarte Plys prüfen (-1, +1)
        for (const offset of [-1, 1]) {
          const nearbyPly = ply + offset;
          const nearbyMoment = momentsByPly[nearbyPly];
          
          if (nearbyMoment && nearbyMoment.move) {
            const trimmedMomentMove = nearbyMoment.move.replace(/[\s\?\.\!]+/g, '');
            
            // Wenn der Zugtext übereinstimmt oder zumindest sehr ähnlich ist
            if (trimmedMoveText.includes(trimmedMomentMove) || trimmedMomentMove.includes(trimmedMoveText)) {
              moment = nearbyMoment;
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

    plyByMoveEl.forEach((ply, moveEl) => {
      processMove(moveEl, ply);
    });

    // Nach allen Moment-Verarbeitungen: Erstelle Empty-Moves für die Darstellung
    // Das muss nach den Cleanups passieren, damit sie nicht wieder entfernt werden
    
    // CRITICAL: Empty move creation must happen AFTER all AI comment processing
    // to prevent them from being removed by cleanup functions.
    // We use the plyByMoveEl Map instead of DOM queries because Lichess uses
    // encoded 'p' attributes that are not searchable via standard selectors.
    
    // Verwende die bereits erstellte plyByMoveEl Map anstatt DOM-Queries
    for (const [plyStr, moment] of Object.entries(momentsByPly)) {
      const ply = parseInt(plyStr);
      
      // Suche das Move-Element in der plyByMoveEl Map
      let moveEl: HTMLElement | null = null;
      for (const [element, elementPly] of plyByMoveEl.entries()) {
        if (elementPly === ply) {
          moveEl = element as HTMLElement;
          break;
        }
      }
      
      if (!moveEl) continue;

      const isWhiteMove = ply % 2 === 1;
      
      if (isWhiteMove) {
        // White move: Check if the following black move has a moment/interrupt
        // If so, create an empty move after the white move for proper display spacing
        const blackMovePly = ply + 1;
        const blackMoveHasMoment = !!momentsByPly[blackMovePly];
        
        let nextBlackMove = moveEl.nextElementSibling;
        while (nextBlackMove && nextBlackMove.tagName.toLowerCase() !== 'move') {
          nextBlackMove = nextBlackMove.nextElementSibling;
        }
        const blackMoveHasNativeInterrupt = !!(nextBlackMove && nextBlackMove.nextElementSibling?.tagName.toLowerCase() === 'interrupt');
        
        if (blackMoveHasMoment || blackMoveHasNativeInterrupt) {
          // Check for existing empty move to prevent duplicates (respects both native Lichess and AI-created)
          const nextElement = moveEl.nextElementSibling;
          const existingEmptyMove = nextElement && nextElement.tagName.toLowerCase() === 'move' && nextElement.classList.contains('empty');
          
          if (!existingEmptyMove) {
            const emptyMove = document.createElement('move');
            emptyMove.className = 'empty';
            emptyMove.textContent = '...';
            const emptyMoveId = `empty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            emptyMove.setAttribute('data-ai-empty-id', emptyMoveId);
            moveEl.after(emptyMove);
          } else {
          }
        }
      } else {
        // Black move: Check if the preceding white move has a moment/interrupt  
        // If so, create an empty move before the black move for proper display spacing
        const whiteMovePly = ply - 1;
        const whiteMoveHasMoment = !!momentsByPly[whiteMovePly];
        
        const prevElement = moveEl.previousElementSibling;
        const whiteMoveHasNativeInterrupt = prevElement && prevElement.nextElementSibling?.tagName.toLowerCase() === 'interrupt';
        
        if ((whiteMoveHasMoment || whiteMoveHasNativeInterrupt) && 
            (!prevElement || !(prevElement.tagName.toLowerCase() === 'move' && prevElement.classList.contains('empty')))) {
          const emptyMove = document.createElement('move');
          emptyMove.className = 'empty';
          emptyMove.textContent = '...';
          const emptyMoveId = `empty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          emptyMove.setAttribute('data-ai-empty-id', emptyMoveId);
          moveEl.before(emptyMove);
        }
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
        color: ${isDark ? '#bfaee9' : '#8357e9'};
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
