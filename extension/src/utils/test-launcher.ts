/**
 * Test-Launcher für die Ausführung der Tests direkt aus der Extension
 */

import { runAllTests, runComponentTests } from '../tests/run-tests';

/**
 * Führt alle Tests aus
 */
export function launchAllTests(): void {
  runAllTests();
}

/**
 * Führt Tests für die highlightMovesInMoveList-Funktion aus
 */
export function launchHighlightMovesTests(): void {
  runComponentTests('highlight-moves');
}

/**
 * Fügt einen Test-Button zur Lichess-UI hinzu
 */
export function addTestButton(): void {
  // Prüfen, ob der Button bereits existiert
  if (document.getElementById('chess-gpt-test-button')) {
    return;
  }
  
  // Button erstellen
  const button = document.createElement('button');
  button.id = 'chess-gpt-test-button';
  button.textContent = 'Run Tests';
  button.style.position = 'fixed';
  button.style.bottom = '10px';
  button.style.right = '10px';
  button.style.zIndex = '9999';
  button.style.padding = '8px 12px';
  button.style.backgroundColor = '#805AD5';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  
  // Click-Event hinzufügen
  button.addEventListener('click', () => {
    launchHighlightMovesTests();
  });
  
  // Button zur Seite hinzufügen
  document.body.appendChild(button);
  
  console.log('🧪 Test-Button wurde hinzugefügt');
}
