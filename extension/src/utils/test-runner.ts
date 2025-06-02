/**
 * Utility zum einfachen Ausführen der Tests in der Browser-Umgebung
 */

import { runAllTests, runComponentTests } from '../tests/run-tests';

/**
 * Globale Testfunktion, die im window-Objekt verfügbar gemacht wird
 */
export function setupTestRunner(): void {
  // Füge die Testfunktionen zum window-Objekt hinzu, damit sie über die Konsole aufgerufen werden können
  (window as any).chessGPT = {
    ...(window as any).chessGPT,
    tests: {
      runAll: runAllTests,
      runComponent: runComponentTests,
      highlightMoves: () => runComponentTests('highlight-moves')
    }
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
