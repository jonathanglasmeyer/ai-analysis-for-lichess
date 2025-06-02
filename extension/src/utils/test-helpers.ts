/**
 * Hilfsfunktionen für Tests
 */

/**
 * Verbesserte Assertion-Funktion für Tests mit detaillierten Debugging-Informationen
 */
export function assert(condition: boolean, message: string, details?: any): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    
    if (details) {
      console.error('Details:', details);
      
      // Wenn es sich um DOM-Elemente handelt, zeige mehr Informationen
      if (details.actual && details.expected) {
        console.error('Actual:', details.actual);
        if (details.actual instanceof HTMLElement) {
          console.error('Actual HTML:', details.actual.outerHTML);
        }
        
        console.error('Expected:', details.expected);
        if (details.expected instanceof HTMLElement) {
          console.error('Expected HTML:', details.expected.outerHTML);
        }
      }
    }
    
    console.trace('Assertion stack trace:');
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

/**
 * Gibt den HTML-Inhalt eines Elements zurück (für Debugging)
 */
export function getHTML(element: HTMLElement): string {
  return element.outerHTML;
}

/**
 * Erstellt eine simulierte DOM-Struktur für Tests
 * @param structure - Ein Array von Objekten, die die DOM-Struktur beschreiben
 * @returns Das erstellte Root-Element
 */
export function createMockDOMStructure(structure: any[]): HTMLElement {
  const container = document.createElement('div');
  
  function createElementFromStructure(struct: any, parent: HTMLElement) {
    const element = document.createElement(struct.tag || 'div');
    
    // Attribute setzen
    if (struct.attributes) {
      for (const [key, value] of Object.entries(struct.attributes)) {
        element.setAttribute(key, value as string);
      }
    }
    
    // Klassen setzen
    if (struct.classes) {
      element.className = Array.isArray(struct.classes) 
        ? struct.classes.join(' ') 
        : struct.classes;
    }
    
    // Text-Inhalt setzen
    if (struct.textContent) {
      element.textContent = struct.textContent;
    }
    
    // Custom properties setzen
    if (struct.properties) {
      for (const [key, value] of Object.entries(struct.properties)) {
        (element as any)[key] = value;
      }
    }
    
    // Zum Parent hinzufügen
    parent.appendChild(element);
    
    // Kinder rekursiv erstellen
    if (struct.children && Array.isArray(struct.children)) {
      struct.children.forEach((child: any) => {
        createElementFromStructure(child, element);
      });
    }
    
    return element;
  }
  
  // Alle Strukturelemente durchgehen
  structure.forEach(struct => {
    createElementFromStructure(struct, container);
  });
  
  return container;
}

/**
 * Erstellt eine simulierte Lichess-Zugliste für Tests
 * @param moves - Array von Zügen (z.B. ['e4', 'e5', 'Nf3', ...])
 * @param options - Optionen für die Erstellung
 * @returns Das erstellte Container-Element
 */
export function createMockLichessMoveList(
  moves: string[], 
  options: {
    startPly?: number;
    includeEmptyMoves?: boolean;
    includeInterrupts?: boolean;
    nativeComments?: Record<number, string>;
  } = {}
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'analyse__moves';
  
  // Optionen mit Defaults
  const startPly = options.startPly || 0;
  const includeEmptyMoves = options.includeEmptyMoves || false;
  const includeInterrupts = options.includeInterrupts || false;
  const nativeComments = options.nativeComments || {};
  
  // Erstelle die Moves-Struktur
  const movesEl = document.createElement('div');
  movesEl.className = 'moves';
  container.appendChild(movesEl);
  
  // Map zum Speichern der Ply-zu-Element-Zuordnung
  const plyByMoveEl = new Map<HTMLElement, number>();
  (container as any).plyByMoveEl = plyByMoveEl;
  
  // Züge erstellen
  let currentPly = startPly;
  
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    currentPly++;
    const isWhite = currentPly % 2 === 1;
    
    // Zugnummer für weiße Züge
    if (isWhite) {
      const indexEl = document.createElement('index');
      indexEl.textContent = `${Math.ceil(currentPly / 2)}.`;
      movesEl.appendChild(indexEl);
    }
    
    // Zug-Element erstellen
    const moveEl = document.createElement('move');
    moveEl.setAttribute('p', currentPly.toString()); // Wichtig: p-Attribut wie in Lichess
    
    // <san>-Element für den Zugtext erstellen (wie in Lichess)
    const sanEl = document.createElement('san');
    sanEl.textContent = move;
    moveEl.appendChild(sanEl);
    
    movesEl.appendChild(moveEl);
    
    // In der Map speichern
    plyByMoveEl.set(moveEl, currentPly);
    
    // Native Kommentare hinzufügen
    if (nativeComments[currentPly]) {
      const commentEl = document.createElement('comment');
      commentEl.textContent = nativeComments[currentPly];
      movesEl.appendChild(commentEl);
    }
    
    // Leere Züge für Tests hinzufügen
    if (includeEmptyMoves && i === 2) { // Nach dem 3. Zug
      const emptyEl = document.createElement('move');
      emptyEl.className = 'empty';
      emptyEl.setAttribute('p', (currentPly + 0.5).toString());
      emptyEl.textContent = '...'; // Leere Züge haben typischerweise '...' als Text
      movesEl.appendChild(emptyEl);
    }
    
    // Interrupt für Tests hinzufügen
    if (includeInterrupts && i === 4) { // Nach dem 5. Zug
      const interruptEl = document.createElement('interrupt');
      
      // Füge einen nativen Kommentar zum Interrupt hinzu
      if (!nativeComments[currentPly]) {
        const nativeComment = document.createElement('comment');
        nativeComment.textContent = 'Nativer Lichess-Kommentar';
        interruptEl.appendChild(nativeComment);
      }
      
      movesEl.appendChild(interruptEl);
      
      // Index nach dem Interrupt
      const indexAfterInterrupt = document.createElement('index');
      indexAfterInterrupt.textContent = `${Math.ceil((currentPly + 1) / 2)}.`;
      movesEl.appendChild(indexAfterInterrupt);
    }
  }
  
  return container;
}

/**
 * Vergleicht zwei DOM-Elemente und prüft, ob sie strukturell ähnlich sind
 * @param actual - Das tatsächliche Element
 * @param expected - Das erwartete Element
 * @param options - Vergleichsoptionen
 * @returns true, wenn die Elemente ähnlich sind
 */
export function compareDOMStructure(
  actual: HTMLElement, 
  expected: HTMLElement,
  options: {
    ignoreTextContent?: boolean;
    ignoreAttributes?: string[];
    onlyCheckAttributes?: string[];
  } = {}
): boolean {
  // Optionen mit Defaults
  const ignoreTextContent = options.ignoreTextContent || false;
  const ignoreAttributes = options.ignoreAttributes || [];
  const onlyCheckAttributes = options.onlyCheckAttributes || [];
  
  // Prüfe Tag-Namen
  if (actual.tagName !== expected.tagName) {
    console.error(`Tag mismatch: ${actual.tagName} !== ${expected.tagName}`);
    return false;
  }
  
  // Prüfe Text-Inhalt
  if (!ignoreTextContent && actual.textContent !== expected.textContent) {
    console.error(`Text content mismatch: "${actual.textContent}" !== "${expected.textContent}"`);
    return false;
  }
  
  // Prüfe Attribute
  const actualAttrs = Array.from(actual.attributes);
  const expectedAttrs = Array.from(expected.attributes);
  
  // Wenn nur bestimmte Attribute geprüft werden sollen
  if (onlyCheckAttributes.length > 0) {
    for (const attrName of onlyCheckAttributes) {
      const actualValue = actual.getAttribute(attrName);
      const expectedValue = expected.getAttribute(attrName);
      
      if (actualValue !== expectedValue) {
        console.error(`Attribute "${attrName}" mismatch: "${actualValue}" !== "${expectedValue}"`);
        return false;
      }
    }
  } else {
    // Alle Attribute prüfen (außer ignorierte)
    for (const attr of expectedAttrs) {
      if (ignoreAttributes.includes(attr.name)) continue;
      
      const actualValue = actual.getAttribute(attr.name);
      if (actualValue !== attr.value) {
        console.error(`Attribute "${attr.name}" mismatch: "${actualValue}" !== "${attr.value}"`);
        return false;
      }
    }
  }
  
  // Prüfe Kinder rekursiv
  if (actual.children.length !== expected.children.length) {
    console.error(`Children count mismatch: ${actual.children.length} !== ${expected.children.length}`);
    return false;
  }
  
  for (let i = 0; i < actual.children.length; i++) {
    const actualChild = actual.children[i] as HTMLElement;
    const expectedChild = expected.children[i] as HTMLElement;
    
    if (!compareDOMStructure(actualChild, expectedChild, options)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Zählt die Anzahl der Elemente eines bestimmten Typs in einem Container
 */
export function countElements(container: HTMLElement, selector: string): number {
  return container.querySelectorAll(selector).length;
}
