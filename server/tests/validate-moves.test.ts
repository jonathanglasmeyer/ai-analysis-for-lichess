import { describe, expect, test } from "bun:test";
import { correctMomentPlies, correctPlies, AnalysisMoment } from "../index";

// Testdaten
const validPgn = `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O`;

// Mock für eine Antwort von Anthropic mit korrekten Ply-Werten
const mockMoments: AnalysisMoment[] = [
  {
    ply: 1, // Erster Zug ist ply 1
    move: "e4"
  },
  {
    ply: 3, // Zweiter Zug von Weiß ist ply 3
    move: "Nf3"
  },
  {
    ply: 5, // Dritter Zug von Weiß ist ply 5
    move: "Bb5"
  },
];

describe("Korrektur von Ply-Werten", () => {
  test("Behält korrekte Ply-Werte bei", () => {
    const correctedMoments = correctMomentPlies(validPgn, mockMoments);
    
    // Prüfe, dass alle Momente zurückgegeben wurden
    expect(correctedMoments.length).toBe(mockMoments.length);
    
    // Prüfe, dass die Ply-Werte korrekt sind
    expect(correctedMoments[0].ply).toBe(1);
    expect(correctedMoments[1].ply).toBe(3);
    expect(correctedMoments[2].ply).toBe(5);
  });
  
  test("Korrigiert Ply-Werte", () => {
    const momentsWithPlyErrors: AnalysisMoment[] = [
      {
        ply: 2, // Falscher Ply-Wert, sollte 1 sein
        move: "e4",
        color: "white",
        comment: "Guter Eröffnungszug"
      },
      {
        ply: 4, // Falscher Ply-Wert, sollte 3 sein
        move: "Nf3",
        color: "white",
        comment: "Entwickelt einen Springer"
      },
      {
        ply: 6, // Falscher Ply-Wert, sollte 5 sein
        move: "Bb5",
        color: "white",
        comment: "Spanische Eröffnung"
      }
    ];
    const validatedMoments = correctMomentPlies(validPgn, momentsWithPlyErrors);
    
    // Prüfe, dass die Ply-Werte korrigiert wurden
    expect(validatedMoments[0].ply).toBe(1); // Korrigiert von 2 auf 1
    expect(validatedMoments[1].ply).toBe(3); // Korrigiert von 4 auf 3
    expect(validatedMoments[2].ply).toBe(5); // Korrigiert von 6 auf 5
  });
  
  test("Verarbeitet ungültiges PGN gracefully", () => {
    const invalidPgn = "1. e4 e5 2. Nf3 _invalid_pgn_";
    
    // Sollte keine Exception werfen
    const validatedMoments = correctMomentPlies(invalidPgn, mockMoments);
    
    // Sollte die ursprünglichen Momente zurückgeben
    expect(validatedMoments).toEqual(mockMoments);
  });
});
