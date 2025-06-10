## Relevant Files

- `server/index.ts` - Hauptdatei des Servers, hier wird der neue `/usage` Endpoint hinzugefügt.
- `server/src/utils/ipUtils.ts` - Enthält Hilfsfunktionen wie `getClientIp` und `hashIp`.
- `server/src/supabaseClient.ts` - Enthält die Funktion `getUsage` für die Supabase-Interaktion.
- `server/src/config.ts` - Enthält Konfigurationsvariablen wie `MAX_ANONYMOUS_ANALYSES`.
- `server/tests/integration/usage-endpoint.test.ts` - Neue Integrationstests für den `/usage` Endpoint.
- `extension/src/popup/popup.html` - HTML-Struktur für das Extension-Popup.
- `extension/src/popup/popup.ts` - TypeScript-Logik für das Extension-Popup (Datenabruf und DOM-Manipulation).
- `extension/src/utils/api.ts` - (Potenziell neu oder existierend) Hilfsdatei für API-Aufrufe von der Extension aus.
- `extension/manifest.json` - Konfigurationsdatei der Extension (ggf. für Permissions prüfen).

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.
- For the server, use `bun test [optional/path/to/test/file]` to run tests.

## Tasks

- [x] **1.0 Backend: Implement New `/usage` Endpoint**
  - [x] 1.1 In `server/index.ts`, definiere eine neue `GET`-Route `/usage`.
  - [x] 1.2 Implementiere die Handler-Logik für `/usage`:
    - [x] 1.2.1 Ermittle die Client-IP-Adresse (verwende `getClientIp` aus `ipUtils.ts`).
    - [x] 1.2.2 Wenn keine IP ermittelt werden kann (und `NODE_ENV` nicht "development" ist), gib einen Fehler zurück (z.B. Status 400, `ok: false`, `error: "Could not determine client IP"`). Im Entwicklungsmodus die Fallback-IP verwenden.
    - [x] 1.2.3 Hashe die IP-Adresse (verwende `hashIp` aus `ipUtils.ts` mit `IP_HASHING_SALT`).
    - [x] 1.2.4 Rufe die Nutzungsdaten aus Supabase ab (verwende `getUsage` aus `supabaseClient.ts` mit dem `hashedIp`).
    - [x] 1.2.5 Wenn der Benutzer nicht in Supabase existiert (neuer Benutzer), setze `current` auf 0.
    - [x] 1.2.6 Stelle die Antwort im Format `{ ok: true, usage: { current: number, limit: number } }` zusammen, wobei `limit` aus `MAX_ANONYMOUS_ANALYSES` stammt.
    - [x] 1.2.7 Implementiere Fehlerbehandlung für Supabase-Abfragen und andere mögliche Fehler. Gib im Fehlerfall `{ ok: false, error: "Fehlerbeschreibung", errorCode: "USAGE_FETCH_FAILED" }` zurück.
  - [x] 1.3 Füge grundlegende Integrationstests für den `/usage` Endpoint in `server/tests/integration/usage-endpoint.test.ts` hinzu:
    - [x] 1.3.1 Test für einen neuen Benutzer (sollte `current: 0` zurückgeben).
    - [x] 1.3.2 Test für einen bestehenden Benutzer (simuliere einen Eintrag in Supabase, mocke `getUsage`).
    - [x] 1.3.3 Test für den Fall, dass keine IP ermittelt werden kann (in Produktionssimulation).
    - [ ] 1.3.4 Test für Fehler bei der Supabase-Abfrage (mocke `getUsage`, um einen Fehler zu werfen).

- [ ] **2.0 Frontend: Display Usage in Extension Popup**
  - [ ] 2.1 In `extension/src/popup/popup.html`:
    - [ ] 2.1.1 Entferne den bisherigen Inhalt, der über die Lichess-Analyse-Seite informiert.
    - [ ] 2.1.2 Füge ein HTML-Element (z.B. `<div id="usage-display"></div>`) hinzu, um den Nutzungsstatus anzuzeigen.
  - [ ] 2.2 In `extension/src/popup/popup.ts` (oder der entsprechenden Logikdatei):
    - [ ] 2.2.1 Implementiere eine Funktion, die beim Laden des Popups ausgeführt wird.
    - [ ] 2.2.2 Zeige initial "Nutzung wird geladen..." im `#usage-display` Element an.
    - [ ] 2.2.3 Sende eine `fetch`-Anfrage an den `GET /usage` Endpoint des Backends. Stelle sicher, dass der `Authorization`-Header mit dem `CHESS_GPT_API_KEY` korrekt gesetzt ist.
    - [ ] 2.2.4 Bei erfolgreicher Antwort vom Backend:
      - [ ] 2.2.4.1 Extrahiere `current` und `limit` aus der Antwort.
      - [ ] 2.2.4.2 Aktualisiere das `#usage-display` Element mit dem Text "Analysen: [current] von [limit]".
    - [ ] 2.2.5 Bei einer Fehlerantwort vom Backend oder einem Netzwerkfehler:
      - [ ] 2.2.5.1 Zeige "Fehler beim Laden der Nutzung" im `#usage-display` Element an.
      - [ ] 2.2.5.2 Logge den detaillierten Fehler in der Konsole der Extension.
  - [ ] 2.3 Überprüfe `extension/manifest.json`, ob die Host-Permissions für den API-Aufruf zum Backend korrekt konfiguriert sind (wahrscheinlich bereits durch `/analyze` abgedeckt).

- [ ] **3.0 Testing: Verify Backend and Frontend Integration**
  - [ ] 3.1 Führe manuelle End-to-End-Tests durch:
    - [ ] 3.1.1 Öffne das Extension-Popup als "neuer" Benutzer (z.B. nach Löschen der Nutzungsdaten in Supabase für die Test-IP oder Verwendung einer neuen IP): Es sollte "Analysen: 0 von 5" (oder der konfigurierte Maximalwert) angezeigt werden.
    - [ ] 3.1.2 Führe eine Analyse über die Extension durch.
    - [ ] 3.1.3 Öffne das Popup erneut: Der Zähler sollte inkrementiert sein (z.B. "Analysen: 1 von 5").
    - [ ] 3.1.4 Wiederhole, bis das Limit erreicht ist, und prüfe die Anzeige.
    - [ ] 3.1.5 Teste das Verhalten bei Serverfehlern (z.B. Server temporär stoppen und Popup öffnen): Es sollte die Fehlermeldung angezeigt werden.
