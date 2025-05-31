#!/bin/bash

# Farben für die Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Updating index.ts on the server...${NC}"

# Aktualisiere die API-Endpunkte, um die API-Key-Middleware einzubinden
ssh hetzner "sudo sed -i 's|app.post(\"/check-cache\", cacheLimiter.middleware(), async (c) => {|app.post(\"/check-cache\", apiKeyAuth(), cacheLimiter.middleware(), async (c) => {|g' /opt/ai-analysis-for-lichess/index.ts"
ssh hetzner "sudo sed -i 's|app.post(\"/analyze\", analyzeLimiter.middleware(), async (c) => {|app.post(\"/analyze\", apiKeyAuth(), analyzeLimiter.middleware(), async (c) => {|g' /opt/ai-analysis-for-lichess/index.ts"

# Überprüfe die Änderungen
echo -e "${YELLOW}Verifying changes...${NC}"
ssh hetzner "grep -n \"app.post(\" /opt/ai-analysis-for-lichess/index.ts"

# Starte den Server neu
echo -e "${YELLOW}Restarting server...${NC}"
ssh hetzner "sudo systemctl restart ai-analysis-for-lichess"

# Warte kurz, damit der Server starten kann
sleep 3

# Überprüfe die Logs
echo -e "${YELLOW}Checking server logs...${NC}"
ssh hetzner "sudo journalctl -u ai-analysis-for-lichess -n 20"

echo -e "${GREEN}API endpoints updated!${NC}"
