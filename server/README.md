# AI Analysis for Lichess - Server

A Bun-powered backend API that provides chess game analysis for Lichess using Anthropic's Claude API. This server handles the analysis of chess games in PGN format and caches results for improved performance.

## Requirements

- [Bun](https://bun.sh/) runtime (v1.0.0 or newer)
- Anthropic API key
- For production: A server (e.g., Hetzner) with SSH access

## Local Development

1. Clone the repository
2. Navigate to the server directory
3. Create a `.env` file with the following content:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   PORT=3001
   ```
4. Install dependencies: `bun install`
5. Run the development server: `bun run dev`

The server will start on port 3001 by default (or the port specified in your .env file).

## API Endpoints

### Health Check
- **GET /**
- Returns: `{ status: 'ok', message: 'AI Analysis for Lichess API is running' }`

### Check Cache
- **POST /check-cache**
- Body: `{ pgn: "1. e4 e5 2. Nf3 Nc6 ...", locale: "en" }`
- Headers: `Authorization: Bearer YOUR_API_KEY`
- Returns: `{ exists: true|false }`

### Analyze Chess Game
- **POST /analyze**
- Body: `{ pgn: "1. e4 e5 2. Nf3 Nc6 ...", locale: "en" }`
- Headers: `Authorization: Bearer YOUR_API_KEY`
- Returns: `{ ok: true, analysis: "Analysis of the chess game" }`

## Deployment on Hetzner Server

This project includes scripts for easy deployment to a Hetzner server.

### Initial Deployment

1. Configure SSH access to your Hetzner server with the hostname `hetzner` in your `~/.ssh/config`
2. Run the deployment script from the server directory:
   ```bash
   ./deploy.sh
   ```
3. Set up Nginx and SSL with the setup script:
   ```bash
   ./setup-nginx.sh
   ```
4. Update the Anthropic API key on the server:
   ```bash
   ssh hetzner "nano /opt/ai-analysis-for-lichess/.env"
   ```

### Updating the Server

For regular code updates (without reinstalling dependencies or reconfiguring services):

1. Run the update script from the project root or server directory:
   ```bash
   ./server/update.sh
   ```

This lightweight script will:
- Copy only the updated files to the server
- Restart the service
- Show the service status
5. Set up API key authentication:
   ```bash
   ./setup-api-key.sh
   ```
6. Restart the service:
   ```bash
   ssh hetzner "sudo systemctl restart ai-analysis-for-lichess"
   ```

### Server Management Commands

#### View Service Status
```bash
ssh hetzner "sudo systemctl status ai-analysis-for-lichess"
```

#### View Logs
```bash
ssh hetzner "sudo journalctl -u ai-analysis-for-lichess -f"
```

#### Restart Service
```bash
ssh hetzner "sudo systemctl restart ai-analysis-for-lichess"
```

#### Stop Service
```bash
ssh hetzner "sudo systemctl stop ai-analysis-for-lichess"
```

#### Start Service
```bash
ssh hetzner "sudo systemctl start ai-analysis-for-lichess"
```

#### View Cache Contents
```bash
ssh hetzner "ls -la /opt/ai-analysis-for-lichess/cache"
```

#### Clear Cache
```bash
ssh hetzner "rm -rf /opt/ai-analysis-for-lichess/cache/*"
```

#### Update Server Code
```bash
./deploy.sh
```

#### View Nginx Configuration
```bash
ssh hetzner "sudo nano /etc/nginx/sites-available/ai-analysis-for-lichess"
```

#### Test Nginx Configuration
```bash
ssh hetzner "sudo nginx -t"
```

#### Restart Nginx
```bash
ssh hetzner "sudo systemctl restart nginx"
```

#### Check SSL Certificate Status
```bash
ssh hetzner "sudo certbot certificates"
```

#### Renew SSL Certificates Manually
```bash
ssh hetzner "sudo certbot renew --dry-run"
```

## Environment Variables

- `PORT`: Port for the server (default: 3001)
- `ANTHROPIC_API_KEY`: Your Anthropic API key for AI analysis
- `CHESS_GPT_API_KEY`: API key for authenticating requests from the extension

## Troubleshooting

### API Key Issues
If you see authentication errors in the logs, check that your Anthropic API key is correctly set in the `.env` file on the server.

### Authentication Issues
If you see 401 Unauthorized errors:
1. Verify that the API key in the extension (`background.ts`) matches the one on the server
2. Check that the Authorization header is correctly formatted as `Bearer YOUR_API_KEY`
3. Run `setup-api-key.sh` again to reset the API key on the server

### Connection Issues
If the extension cannot connect to the server, verify:
1. The server is running (`systemctl status ai-analysis-for-lichess`)
2. Nginx is properly configured and running
3. The domain is correctly set in the extension's background.ts file

### Cache Problems
If analysis results are not being cached or retrieved properly:
1. Check the cache directory permissions: `ssh hetzner "ls -la /opt/ai-analysis-for-lichess/cache"`
2. Ensure the service has write access to the cache directory

### Redeployment
If you need to completely redeploy the application:
1. Stop the service: `ssh hetzner "sudo systemctl stop ai-analysis-for-lichess"`
2. Remove the existing installation: `ssh hetzner "sudo rm -rf /opt/ai-analysis-for-lichess"`
3. Run the deployment script again: `./deploy.sh`
4. Restart the service: `ssh hetzner "sudo systemctl start ai-analysis-for-lichess"`
