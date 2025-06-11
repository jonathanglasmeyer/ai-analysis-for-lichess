/**
 * Utility zum einfachen Ausführen der Tests in der Browser-Umgebung
 */

import { runAllTests, runComponentTests } from '../tests/run-tests';

// Define types for the test runner functions and the object attached to window
interface ChessGPTTestRunnerFunctions {
  runAll: () => void;
  runComponent: (componentName: string) => void;
  highlightMoves: () => void;
}

interface ChessGPTExtensionFeatures {
  tests: ChessGPTTestRunnerFunctions;
  // Add other top-level properties of window.chessGPT here if they are known and fixed
}

declare global {
  interface Window {
    // Augment the Window interface to include chessGPT
    // It can have 'tests' and any other properties (to match original spread behavior)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chessGPT: Partial<ChessGPTExtensionFeatures> & { [key: string]: any };
  }
}

/**
 * Globale Testfunktion, die im window-Objekt verfügbar gemacht wird
 */
export function setupTestRunner(): void {
  // Füge die Testfunktionen zum window-Objekt hinzu, damit sie über die Konsole aufgerufen werden können
  // Ensure window.chessGPT exists as an object and is compatible with our type.
  // This handles cases where window.chessGPT is undefined, null, or not an object.
  if (typeof window.chessGPT !== 'object' || window.chessGPT === null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.chessGPT = {} as { [key: string]: any }; // Initialize as an empty object compatible with the type
  }

  window.chessGPT = {
    ...window.chessGPT, // Spread existing properties from window.chessGPT
    tests: { // Add or overwrite the 'tests' property with our typed functions
      runAll: runAllTests,
      runComponent: runComponentTests,
      highlightMoves: () => runComponentTests('highlight-moves'),
    },
  };
  
  console.log('🧪 ChessGPT Test Runner wurde initialisiert');
  console.log('🧪 Verfügbare Testbefehle:');
  console.log('🧪 - window.chessGPT.tests.runAll()');
  console.log('🧪 - window.chessGPT.tests.runComponent("highlight-moves")');
  console.log('🧪 - window.chessGPT.tests.highlightMoves()');
}

/**
 * Führt Tests für die highlightMovesInMoveList-Funktion aus
 * Diese Funktion kann direkt aufgerufen werden
 */
export function testHighlightMoves(): void {
  runComponentTests('highlight-moves');
}
