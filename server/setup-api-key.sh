#!/bin/bash

# Farben für die Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Der API-Key, der in der Extension verwendet wird
API_KEY="chess-gpt-extension-key-2022"

echo -e "${YELLOW}Setting up API key on the server...${NC}"

# 1. Füge den API-Key zur .env-Datei hinzu
echo -e "${YELLOW}Adding API key to .env file...${NC}"
ssh hetzner "sudo bash -c 'grep -q CHESS_GPT_API_KEY /opt/ai-analysis-for-lichess/.env && \
  sed -i "s/CHESS_GPT_API_KEY=.*/CHESS_GPT_API_KEY=${API_KEY}/g" /opt/ai-analysis-for-lichess/.env || \
  echo "CHESS_GPT_API_KEY=${API_KEY}" >> /opt/ai-analysis-for-lichess/.env'"

# 2. Füge den API-Key zur systemd-Service-Datei hinzu
echo -e "${YELLOW}Adding API key to systemd service...${NC}"
ssh hetzner "sudo mkdir -p /etc/systemd/system/ai-analysis-for-lichess.service.d/ && \
sudo bash -c 'cat > /etc/systemd/system/ai-analysis-for-lichess.service.d/override.conf << EOF
[Service]
Environment=\"CHESS_GPT_API_KEY=${API_KEY}\"
EOF'"

# 3. Lade die systemd-Konfiguration neu und starte den Service neu
echo -e "${YELLOW}Restarting service...${NC}"
ssh hetzner "sudo systemctl daemon-reload && sudo systemctl restart ai-analysis-for-lichess.service"

# 4. Überprüfe, ob die Umgebungsvariable im Prozess verfügbar ist
echo -e "${YELLOW}Verifying environment variable...${NC}"
ENV_CHECK=$(ssh hetzner "sudo bash -c 'ps -ef | grep bun | grep -v grep | head -1 | awk \'{print \$2}\' | xargs -I{} sudo cat /proc/{}/environ 2>/dev/null | tr "\\0" "\\n" | grep CHESS_GPT_API_KEY'")

if [[ -z "$ENV_CHECK" ]]; then
  echo -e "${RED}WARNING: CHESS_GPT_API_KEY not found in the running process!${NC}"
  echo -e "${RED}The API key authentication may not work correctly.${NC}"
else
  echo -e "${GREEN}Environment variable CHESS_GPT_API_KEY is set in the process.${NC}"
fi

# 5. Überprüfe den Status des Servers
echo -e "${YELLOW}Checking server status...${NC}"
ssh hetzner "sudo systemctl status ai-analysis-for-lichess.service | head -n 20"

echo -e "${GREEN}API key setup completed!${NC}"
echo -e "${YELLOW}The server now requires an API key for all requests.${NC}"
echo -e "${YELLOW}Make sure your extension is using the same API key: ${API_KEY}${NC}"
