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
    - [x] 1.2.2 Wenn keine IP ermittelt werden kann (und `NODE_ENV` nicht "development" ist), gib einen Fehler zurück (z.B. Status 400, `ok: false`, `error: "Could not determine client IP"`). Das Verhalten im Entwicklungsmodus wird in Task 4.0 spezifiziert.
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

- [x] **2.0 Frontend: Display Usage in Extension Popup**
  - [x] 2.1 In `extension/public/popup.html`:
    - [x] 2.1.1 Entferne den bisherigen Inhalt, der über die Lichess-Analyse-Seite informiert.
    - [x] 2.1.2 Füge ein HTML-Element (z.B. `<div id="usage-display"></div>`) hinzu, um den Nutzungsstatus anzuzeigen.
  - [x] 2.2 In `extension/src/popup/index.ts`:
    - [x] 2.2.1 Implementiere eine Funktion, die beim Laden des Popups ausgeführt wird.
    - [x] 2.2.2 Zeige initial "Nutzung wird geladen..." im `#usage-display` Element an.
    - [x] 2.2.3 Sende eine `fetch`-Anfrage an den `GET /usage` Endpoint des Backends. Stelle sicher, dass der `Authorization`-Header mit dem `CHESS_GPT_API_KEY` korrekt gesetzt ist.
    - [x] 2.2.4 Bei erfolgreicher Antwort vom Backend:
      - [x] 2.2.4.1 Extrahiere `current` und `limit` aus der Antwort.
      - [x] 2.2.4.2 Aktualisiere das `#usage-display` Element mit dem Text "Analysen: [current] von [limit]".
    - [x] 2.2.5 Bei einer Fehlerantwort vom Backend oder einem Netzwerkfehler:
      - [x] 2.2.5.1 Zeige "Fehler beim Laden der Nutzung" im `#usage-display` Element an.
      - [x] 2.2.5.2 Logge den detaillierten Fehler in der Konsole der Extension.
  - [x] 2.3 Überprüfe `extension/public/manifest.json`, ob die Host-Permissions für den API-Aufruf zum Backend korrekt konfiguriert sind (bestätigt: bereits durch `/analyze` abgedeckt).

- [ ] **3.0 Testing: Verify Backend and Frontend Integration**
  - [ ] 3.1 Führe manuelle End-to-End-Tests durch:
    - [ ] 3.1.1 Öffne das Extension-Popup als "neuer" Benutzer (z.B. nach Löschen der Nutzungsdaten in Supabase für die Test-IP oder Verwendung einer neuen IP): Es sollte "Analysen: 0 von 5" (oder der konfigurierte Maximalwert) angezeigt werden.
    - [ ] 3.1.2 Führe eine Analyse über die Extension durch.
    - [ ] 3.1.3 Öffne das Popup erneut: Der Zähler sollte inkrementiert sein (z.B. "Analysen: 1 von 5").
    - [ ] 3.1.4 Wiederhole, bis das Limit erreicht ist, und prüfe die Anzeige.
    - [ ] 3.1.5 Teste das Verhalten bei Serverfehlern (z.B. Server temporär stoppen und Popup öffnen): Es sollte die Fehlermeldung angezeigt werden.

- [x] **4.0 Development Mode: Handle Skipped Usage Tracking**
  - [x] 4.1 Backend (`server/index.ts` - `/usage` Endpoint):
    - [ ] 4.1.1 Wenn `NODE_ENV` auf "development" steht UND das IP-Hashing/Tracking übersprungen wird (basierend auf der Logik in `getClientIp` oder einer expliziten Konfigurationsvariable wie `SKIP_IP_TRACKING_IN_DEV`):
      - [x] 4.1.1.1 Gib eine spezielle Antwort zurück, z.B. `{ ok: true, usage: { current: 0, limit: 0 }, message: "Usage tracking is disabled in development mode." }` oder `{ ok: true, developmentMode: true, message: "Usage tracking is disabled in development mode." }`.
  - [x] 4.2 Frontend (`extension/src/popup/index.ts`):
    - [x] 4.2.1 Erkenne die spezielle Antwort vom Backend für den Entwicklungsmodus (z.B. anhand von `usage.limit === 0` oder dem `developmentMode: true` Flag).
    - [x] 4.2.2 Wenn der Entwicklungsmodus ohne Tracking erkannt wird, zeige im `#usage-display` Element eine entsprechende Meldung an, z.B. "Nutzungs-Tracking im Entwicklungsmodus deaktiviert."
  - [x] 4.3 Integrationstests (`server/tests/integration/usage-endpoint.test.ts`):
    - [x] 4.3.1 Füge einen Testfall hinzu, der prüft, ob der `/usage` Endpoint im Entwicklungsmodus (mit geskipptem IP-Tracking) die erwartete spezielle Antwort zurückgibt.
