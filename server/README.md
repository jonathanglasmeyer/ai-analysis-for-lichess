# Chess-GPT Backend API

A Bun-powered backend API for Chess-GPT that provides chess game analysis using Anthropic's API.

## Requirements

- [Bun](https://bun.sh/) runtime (v1.0.0 or newer)
- Anthropic API key

## Local Development

1. Clone the repository
2. Navigate to the server directory
3. Create a `.env` file based on `.env.example` and add your Anthropic API key
4. Install dependencies: `bun install`
5. Run the development server: `bun run dev`

The server will start on port 3001 by default (or the port specified in your .env file).

## API Endpoints

### Health Check
- **GET /**
- Returns: `{ status: 'ok', message: 'Chess-GPT API is running' }`

### Analyze Chess Game
- **POST /analyze**
- Body: `{ pgn: "1. e4 e5 2. Nf3 Nc6 ..." }`
- Returns: `{ ok: true, summary: "Analysis of the chess game" }`

## Deployment

This service is configured to deploy on [Render.com](https://render.com/) using the included `render.yaml` configuration and `Dockerfile`.

To deploy:
1. Connect your GitHub repository to Render.com
2. Render will automatically detect the `render.yaml` file
3. Set your environment variables in the Render dashboard
4. Deploy the service

## Environment Variables

- `PORT`: Port for the server (default: 3001)
- `ANTHROPIC_API_KEY`: Your Anthropic API key for AI analysis
