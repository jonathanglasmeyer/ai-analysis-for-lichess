# ChessGPT Lichess Integration - Chrome Extension

This Chrome extension integrates AI-powered chess analysis directly into Lichess.

## Development

1.  Navigate to the `extension` directory:
    ```bash
    cd path/to/your/project/chess-gpt/extension
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development build process (watches for changes and rebuilds):
    ```bash
    npm run dev
    ```
4.  Load the extension in Chrome:
    *   Open Chrome and go to `chrome://extensions/`.
    *   Enable "Developer mode".
    *   Click "Load unpacked".
    *   Select the `extension/public` directory.

## Production Build

To create a production build of the extension (which will use the production server URL configured in `src/config.ts`), run the following command in the `extension` directory:

```bash
NODE_ENV=production npm run build
```

This command sets the `NODE_ENV` environment variable to `production` for the build script, which then uses Rollup to create optimized production assets in the `extension/public` directory. The `CHESS_GPT_API_KEY` remains hardcoded as per the current configuration.

The `extension/public` directory will then contain the production-ready files that can be packaged for distribution (e.g., for the Chrome Web Store).

## Scripts

*   `npm run dev`: Starts Rollup in watch mode for development.
*   `npm run build`: Creates a production build.
*   `npm run check-types`: Runs the TypeScript compiler to check for type errors.
