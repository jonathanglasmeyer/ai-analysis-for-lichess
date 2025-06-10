# PRD: Anzeige des Nutzungszählers in der Chrome Extension

## 1. Introduction/Overview
Dieses Dokument beschreibt die Anforderungen für die Anzeige des aktuellen Analyse-Nutzungszählers für anonyme Benutzer im Popup-Fenster der Chrome Extension. Ziel ist es, dem Benutzer Transparenz über seine verbleibenden kostenlosen Analysen zu geben. Diese Anzeige ersetzt den bisherigen Inhalt des Popups, der darüber informierte, ob sich der Benutzer auf einer Lichess-Analyse-Seite befindet.

## 2. Goals
*   Bereitstellung einer klaren Sichtbarkeit für Benutzer über ihre aktuelle Nutzung des kostenlosen Analyse-Features.
*   Information der Benutzer, wenn sie sich ihrem Nutzungslimit nähern oder es erreicht haben.
*   Verbesserung der Benutzererfahrung durch direkte Rückmeldung im Extension-Popup.

## 3. User Stories
*   Als anonymer Benutzer möchte ich meinen aktuellen Analyse-Nutzungszähler im Extension-Popup sehen, damit ich weiß, wie viele kostenlose Analysen mir noch zur Verfügung stehen.
*   Als anonymer Benutzer möchte ich, dass der angezeigte Nutzungszähler aktuell ist, wenn ich das Extension-Popup öffne.

## 4. Functional Requirements
1.  Das Popup-Fenster der Chrome Extension *muss* den aktuellen Analyse-Nutzungszähler des anonymen Benutzers anzeigen.
2.  Das Anzeigeformat *soll* lauten: "Analysen: X von Y" (z.B. "Analysen: 3 von 5").
3.  Der Nutzungszähler *muss* vom Backend abgerufen werden, wenn das Popup-Fenster geöffnet wird.
4.  Der bisherige Inhalt des Popups (Information über die Lichess-Analyse-Seite) *muss* entfernt und durch die Anzeige des Nutzungszählers ersetzt werden.
5.  Wenn die Nutzungsdaten geladen werden, *soll* die Meldung "Nutzung wird geladen..." angezeigt werden.
6.  Wenn beim Abrufen der Nutzungsdaten ein Fehler auftritt, *soll* die Meldung "Fehler beim Laden der Nutzung" angezeigt werden.
7.  Wenn der Benutzer sein Limit erreicht hat (z.B. 5 von 5), *soll* dies entsprechend angezeigt werden.

## 5. Non-Goals (Out of Scope)
*   Eine manuelle Schaltfläche zum Aktualisieren des Nutzungszählers.
*   Echtzeit-Aktualisierungen des Zählers, während das Popup geöffnet ist (Aktualisierung nur beim Öffnen).
*   Anzeige der Nutzung für authentifizierte Benutzer (dieses PRD gilt nur für anonyme Benutzer).
*   Komplexe UI-Elemente wie Fortschrittsbalken (für die erste Version).

## 6. Design Considerations (Optional)
*   Einfache Textanzeige.
*   Die Anzeige soll den primären Inhalt des Popups darstellen.

## 7. Technical Considerations
1.  **Backend:**
    *   Ein neuer Backend-Endpoint (z.B. `GET /usage`) *muss* erstellt werden.
    *   Dieser Endpoint *muss* die aktuelle `analysis_count` des anfragenden anonymen Benutzers und den Wert für `MAX_ANONYMOUS_ANALYSES` zurückgeben.
    *   Der Endpoint verwendet die bestehende Logik zur IP-Ermittlung, IP-Hashing und Abfrage der `user_usage` Tabelle in Supabase.
    *   Der Endpoint *darf keine* PGN-Daten entgegennehmen oder eine Analyse durchführen.
    *   Antwortformat-Vorschlag:
        ```json
        {
          "ok": true,
          "usage": {
            "current": 3,
            "limit": 5
          }
        }
        // Bei Fehler:
        {
          "ok": false,
          "error": "Fehlerbeschreibung",
          "errorCode": "ERROR_CODE_USAGE_FETCH_FAILED" // Beispiel
        }
        ```
2.  **Chrome Extension (Frontend):**
    *   Die Logik in `popup.js` (oder der entsprechenden Datei, die das Popup steuert) *muss* angepasst werden.
    *   Beim Öffnen des Popups *muss* eine Anfrage an den neuen `/usage` Endpoint gesendet werden.
    *   Das DOM des Popups *muss* aktualisiert werden, um den abgerufenen Nutzungszähler (oder Lade-/Fehlermeldungen) anzuzeigen.
    *   Fehler beim Abruf der Daten vom `/usage` Endpoint *müssen* abgefangen und dem Benutzer entsprechend angezeigt werden.
    *   Die `manifest.json` der Extension benötigt ggf. angepasste `permissions`, falls der Host oder Pfad des neuen Endpoints dies erfordert (wahrscheinlich nicht, wenn es derselbe Host wie `/analyze` ist).
    *   Die Datei `extension/src/popup/popup.html` und die zugehörige Logikdatei (vermutlich `popup.ts` oder `popup.js`) müssen angepasst werden, um die alte Logik zu entfernen und die neue Anzeige zu implementieren.

## 8. Success Metrics
*   Benutzer können ihren aktuellen Analyse-Nutzungsstand im Popup-Fenster der Extension einsehen.
*   Der angezeigte Zähler spiegelt korrekt die vom Backend getrackte Nutzung wider.
*   Die Lade- und Fehlermeldungen werden korrekt angezeigt.

## 9. Open Questions
*   Sind die vorgeschlagenen Lade- ("Nutzung wird geladen...") und Fehlermeldungen ("Fehler beim Laden der Nutzung") so in Ordnung?
*   Gibt es spezifische `errorCode` Werte, die das Backend für Fehler beim Abrufen der Nutzungsinformationen zurückgeben soll?
