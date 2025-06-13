# Roadmap

# Done
### Summary

- [x]  Clickable moves sometimes don’t work
- [x]  Fallback UI wenn API down ist

### Move List

- [x]  Still: […] bugs
- [x]  Consistent purple font color
- [x]  ply matching ensure

### Layout/Design/UX insgesamt

- [x]  Color compatibility mit light/dark mode
- [x]  Englisch & Deutsch

### Extension Window
[Feedback](https://www.notion.so/Feedback-202d17641ccf80529777ec1eff192aaa?pvs=21)

### Server
- [x]  Deploy
- [x]  [localhost](http://localhost) vs PRD URLS in extension codebase

### Produktbestandteile
- [x]  Testing-Modus für dich / Dev?Z. B. Extension erkennt, ob du selbst eingeloggt bist und skipt Quotenlimit.
- [x]  Illegal moves aus recommendations rausfiltern
- [x]  First: anonymous user


# Open
### Bugs
popup.limitReachedMessage Nicht übersetzt. 

### Produktbestandteile
- [ ]  **User Login**
- [ ]  Also allow logging & purchasing packages before 5 free analyses are used up.
- [ ]  Stripe integration
- [ ]  Buying credits
    - [ ]  Show remaining credits
- [ ]  [Feedback via email](https://www.notion.so/jonathanglasmeyer/Feedback-UX-202d17641ccf80529777ec1eff192aaa?pvs=25)
- [ ]  Icon für Extension


### Marketing
- [ ]  Upload chrome extension
    - [ ]  Sprachabhängige Screenshots im Storelisting? Besonders bei französischsprachigen Nutzern auf Lichess stark relevant.
- [ ]  Reddit, lichess forums
- [ ]  Website

### Technical/Quality
- [ ]  Generate list of manual test cases
- [ ]  Start automating them iteratively. 

### Popup
- [ ]  Invertiere die Analyse-Anzeige, indem du noch verfügbare Analysen anzeigst. 
- [ ]  Better pop-up UX & UI

# Post-MVP Ideas
- [ ]  Customizing prompt, Prompt Presets
- [ ]  How to make it work in other views, like study & Analyse Board
[Pro-Plan mit monthly flat fee incl. prompt customization ](https://www.notion.so/Pro-Plan-mit-monthly-flat-fee-incl-prompt-customization-202d17641ccf801e9516cc067a70ea66?pvs=21)


=====================

# Pakete

	•	20er Paket: 1,99 €
(10 Cent pro Analyse, „das tut nicht weh“ und du bleibst über Break-even)
	•	50er Paket: 3,99 €
(8 Cent pro Analyse – gut für Heavy User)
	•	100er Paket: 6,99 €
(7 Cent pro Analyse – aber das wird selten gekauft, ist eher ein „Poweruser“-Feature)

Der Sweet Spot liegt bei ca. 0,08–0,12 € pro Analyse im Paket.

⸻

Wichtige Hinweise
	•	Die Hemmschwelle ist deutlich geringer, wenn die erste Bezahlhürde klein ist (also lieber das 20er Paket als Standard).
	•	Kommunikation entscheidet:
Wenn du klar machst, dass es keine Abo-Falle, keine Mengenrabatte, keine Intransparenz gibt – sondern „du zahlst nur, was du wirklich nutzt“, ist die Bereitschaft höher.
	•	Ein kleiner „Support“- oder „Community“-Hinweis („Mit jedem Kauf finanzierst du die Weiterentwicklung und Serverkosten.“) kann helfen.

## Margen
| **Paket** | **Verkaufspreis** | **Stripe** | **Modellkosten** | **Gewinn gesamt** | **Gewinn/Analyse** | **Marge %** |
|-----------|-------------------|------------|------------------|-------------------|--------------------|-------------|
| 20        | 1,99 €            | 0,29 €     | 0,50 €           | 1,20 €            | 0,06 €             | 60 %        |
| 50        | 3,99 €            | 0,33 €     | 1,25 €           | 2,41 €            | 0,048 €            | 60 %        |
| 100       | 6,99 €            | 0,39 €     | 2,50 €           | 4,10 €            | 0,041 €            | 59 %        |

### Beispielrechnung 20er Paket für 1,99 € (Kleinunternehmer, Stripe 2 % + 0,25 €)

Einnahmen:
•	Verkaufspreis: 1,99€ (keine MwSt ausweisen/abführen!)
Ausgaben:
•	Stripe: 1,99€ × 0,02 = 0,04€ +0,25€ = 0,29€
•	Modell: 20 × 0,025€ = 0,50€
•	Gewinn: Bruttoeinnahmen – Stripe – Modell = Marge = 1,99 - 0,29 - 0,50 = 1,20€
•	Pro Analyse: 1,20€ / 20 = 0,06€ (6 Cent)
•	Marge in Prozent (auf Einnahme): 1,20 / 1,99 = 60,3%

### Für 50er Paket (3,99€):
•	Stripe: 3,99€ × 0,02 = 0,08€ + 0,25€ = 0,33€
•	Modell: 50 × 0,025€ = 1,25€
•	Gewinn: 3,99 - 0,33 - 1,25 = 2,41€
•	Pro Analyse: 2,41 / 50 = 0,0482€ (4,8 Cent)
•	Marge in Prozent: 2,41 / 3,99 = 60,4%

### Für 100er Paket (6,99€):
•	Stripe: 6,99€ × 0,02 = 0,14€ + 0,25€ = 0,39€
•	Modell: 100 × 0,025€ = 2,50€
•	Gewinn: 6,99 - 0,39 - 2,50 = 4,10€
•	Pro Analyse: 4,10 / 100 = 0,041€ (4,1 Cent)
•	Marge in Prozent: 4,10 / 6,99 = 58,7%

| **Finde-Rate** | **Zahlende User** | **Gekaufte Pakete** | **Umsatz (€)** | **Rohertrag (€, 60 %)** |
|----------------|-------------------|---------------------|----------------|-------------------------|
| 3 %            | 238               | 714                 | 1.779          | 1.067                   |
| 5 %            | 396               | 1.188               | 2.960          | 1.776                   |
| 10 %           | 792               | 2.376               | 5.920          | 3.552                   |

| **Finde-Rate** | **„Findet Extension“** | **Installiert** | **Nutzt regelmäßig** | **Verbraucht Free Credits** | **Zahlende User** | **Gekaufte Pakete** | **Umsatz gesamt (€)** |
|----------------|------------------------|-----------------|----------------------|-----------------------------|-------------------|---------------------|-----------------------|
| **3 %**        | 66.000                 | 13.200          | 3.960                | 2.376                       | 238               | 714                 | 1.779                 |
| **5 %**        | 110.000                | 22.000          | 6.600                | 3.960                       | 396               | 1.188               | 2.960                 |
| **10 %**       | 220.000                | 44.000          | 13.200               | 7.920                       | 792               | 2.376               | 5.920                 |

### Wie kannst du die „Finde-Rate“ realistisch erhöhen?

1. Gute Sichtbarkeit in den Extension-Stores
	•	Chrome Web Store (und Firefox Add-on-Store):
Je nach Kategorie und Keywords wirst du – gerade in Nischen wie „Chess“, „Lichess“, „AI“ – schnell auf der ersten oder zweiten Seite angezeigt.
	•	Tipp: Gute Beschreibung, Screenshots, Keywords und regelmäßig Updates.

2. Community-Boost
	•	Lichess-Foren/Discord: Offizieller Thread, Support-Post, Feature-Requests.
	•	Reddit: r/chess, r/lichess, r/opensourcerepos, r/chessbeginners, r/chessprog, r/programming
	•	Twitter/X: Ein, zwei bekannte Chess-Influencer können schon für einen kleinen Hype sorgen.
	•	YouTube/Streamer: Schachstreamer oder YouTuber, die Lichess-Inhalte machen, können die Extension direkt empfehlen oder mal „live ausprobieren“.

3. Organisches Wachstum durch Feature-Trigger
	•	Wer die Extension installiert hat, empfiehlt sie anderen (z. B. im Verein, auf Discord, als Tipp bei Twitter).
	•	User, die beeindruckt sind, posten ihre KI-Analyse als Screenshot („Wow, das hat mir echt was gebracht!“).

4. „In-App“-Vermittlung
	•	Kooperation mit Lichess selbst wäre ein absoluter Jackpot (Banner, Erwähnung, Blog), ist aber schwer zu kriegen.
	•	Alternativ: Austausch mit anderen Tool-Makern (Chessvision.ai, OpeningTree, …).

Wie viel ist realistisch?

Praxiswerte aus anderen Extensions und Community-Tools:
	•	3 % ist Pessimismus pur.
5–10 % ist im ersten Jahr mit aktivem Community-Marketing sehr realistisch.
	•	Gute Extensions, die viral gehen, erreichen 15 % und mehr (z. B. „Chess.com Analysis+“, „Lichess Enhancer“).

Rechnung:
	•	10 % Find-Rate:
2,2 Mio. relevante User × 10 % = 220.000 sehen deine Extension
(statt 66.000 bei 3 %)
	•	Das wirkt sich auf ALLE weiteren Zahlen im Funnel aus!