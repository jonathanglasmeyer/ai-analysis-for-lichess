/**
 * Hauptmodul zum Ausführen aller Tests
 * 
 * Dieses Modul bietet eine einfache Möglichkeit, alle Tests zur Laufzeit
 * in der Browser-Umgebung auszuführen.
 */

import { runHighlightMovesTests } from './highlight-moves-tests';

/**
 * Führt alle Tests aus
 */
export function runAllTests(): void {
  console.log('🧪🧪🧪 STARTING ALL TESTS 🧪🧪🧪');
  console.log('================================');
  
  try {
    // Highlight-Moves-Tests ausführen
    runHighlightMovesTests();
    
    // Hier können weitere Tests hinzugefügt werden
    
    console.log('================================');
    console.log('✅✅✅ ALL TESTS COMPLETED ✅✅✅');
  } catch (error) {
    console.error('❌❌❌ TESTS FAILED ❌❌❌');
    console.error(error);
  }
}

/**
 * Führt Tests für eine bestimmte Komponente aus
 * @param component - Name der zu testenden Komponente
 */
export function runComponentTests(component: string): void {
  console.log(`🧪🧪🧪 STARTING TESTS FOR ${component.toUpperCase()} 🧪🧪🧪`);
  console.log('================================');
  
  try {
    switch (component.toLowerCase()) {
      case 'highlight':
      case 'highlightmoves':
      case 'highlight-moves':
        runHighlightMovesTests();
        break;
        
      // Hier können weitere Komponenten hinzugefügt werden
        
      default:
        console.warn(`⚠️ No tests found for component "${component}"`);
        break;
    }
    
    console.log('================================');
    console.log(`✅✅✅ ${component.toUpperCase()} TESTS COMPLETED ✅✅✅`);
  } catch (error) {
    console.error(`❌❌❌ ${component.toUpperCase()} TESTS FAILED ❌❌❌`);
    console.error(error);
  }
}
