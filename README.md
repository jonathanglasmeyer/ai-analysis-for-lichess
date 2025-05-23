# Chess Analysis UI

A React TypeScript application for chess game analysis, inspired by lichess.org's analysis board. This project provides a modern, interactive chess analysis environment with a focus on usability and expandability.

![Chess Analysis UI](https://example.com/screenshot.png) <!-- Hinweis: Ersetzen Sie diesen Platzhalter durch einen tatsächlichen Screenshot Ihrer Anwendung -->

## Features

- Interactive chess board with drag and drop piece movement
- Legal move validation and highlighting using chess.js
- Move history display with navigation capabilities
- PGN import/export functionality
- Clean, responsive UI built with Tailwind CSS
- Modular architecture for future extensibility

## Tech Stack

- React with TypeScript for type safety
- Vite as the build tool and development server
- chess.js for chess rules and game logic
- react-chessboard for the interactive board UI
- Tailwind CSS for styling

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

## Project Structure

```
src/
├── components/         # React components
│   ├── ChessBoard.tsx  # Chess board visualization
│   ├── MoveList.tsx    # Move history display
│   └── PgnImport.tsx   # PGN import interface
├── hooks/              # Custom React hooks
│   └── useChessGame.ts # Chess game state management
├── types/              # TypeScript type definitions
│   └── chess.ts        # Chess-related types
├── App.tsx            # Main application component
└── main.tsx           # Application entry point
```

## Future Enhancements

- Engine evaluation integration
- Evaluation bar visualization
- Variation trees for exploring different lines
- Analysis annotations
- Opening explorer
- Game database integration

## Verwendung

Nach dem Start der Anwendung können Sie:

1. **Züge ausführen**: Ziehen Sie Figuren mit Drag & Drop auf dem Brett
2. **Legale Züge anzeigen**: Mögliche Züge werden grün hervorgehoben
3. **Zughistorie navigieren**: Klicken Sie auf einen Zug in der Seitenleiste, um zu dieser Position zu springen
4. **PGN importieren**: Nutzen Sie den "Import PGN"-Button, um eine Partie zu laden
5. **PGN exportieren**: Nutzen Sie den "Copy PGN"-Button, um die aktuelle Partie zu kopieren

## Entwicklung

### Tests ausführen

```bash
# Unit-Tests ausführen
npm test

# Linting durchführen
npm run lint
```

### Build für Produktion

```bash
npm run build
```

Die kompilierten Dateien werden im `dist`-Verzeichnis gespeichert und können auf jedem Webserver bereitgestellt werden.

## Beitragen

Beiträge sind willkommen! Wenn Sie einen Fehler finden oder eine Funktion vorschlagen möchten, erstellen Sie bitte ein Issue oder einen Pull Request.

1. Fork des Repositories
2. Erstellen Sie einen Feature-Branch (`git checkout -b feature/amazing-feature`)
3. Commit Ihrer Änderungen (`git commit -m 'Add some amazing feature'`)
4. Push zum Branch (`git push origin feature/amazing-feature`)
5. Öffnen Sie einen Pull Request

## License

MIT
