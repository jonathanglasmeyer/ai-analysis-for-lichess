/**
 * Direkter Test-Runner, der sofort auf dem window-Objekt verfügbar ist
 * 
 * Diese Datei wird direkt in das Content-Script eingebunden und stellt
 * die Testfunktionen sofort auf dem window-Objekt zur Verfügung.
 */

import { runAllTests, runComponentTests } from '../tests/run-tests';

// Sofort auf dem window-Objekt registrieren
(window as any).chessGPT = {
  ...(window as any).chessGPT || {},
  tests: {
    runAll: runAllTests,
    runComponent: runComponentTests,
    highlightMoves: () => runComponentTests('highlight-moves')
  }
};

// Bestätigung in der Konsole ausgeben
console.log('🧪 ChessGPT Test Runner wurde initialisiert');
console.log('🧪 Verfügbare Testbefehle:');
console.log('🧪 - window.chessGPT.tests.runAll()');
console.log('🧪 - window.chessGPT.tests.runComponent("highlight-moves")');
console.log('🧪 - window.chessGPT.tests.highlightMoves()');

/**
 * Exportiere eine Dummy-Funktion, damit die Datei als Modul erkannt wird
 */
export function initializeDirectTestRunner(): void {
  // Nichts zu tun, da die Initialisierung bereits beim Import erfolgt
}
