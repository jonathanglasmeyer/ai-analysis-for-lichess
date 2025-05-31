#!/bin/bash

# Farben für die Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Updating auth middleware on the server...${NC}"

# Kopiere die Datei auf den Server
scp auth-middleware.ts hetzner:/tmp/

# Kopiere die Datei an den richtigen Ort und setze die Berechtigungen
ssh hetzner "sudo cp /tmp/auth-middleware.ts /opt/ai-analysis-for-lichess/ && sudo chown root:root /opt/ai-analysis-for-lichess/auth-middleware.ts"

# Starte den Server neu
echo -e "${YELLOW}Restarting server...${NC}"
ssh hetzner "sudo systemctl restart ai-analysis-for-lichess"

# Warte kurz, damit der Server starten kann
sleep 3

# Überprüfe die Logs
echo -e "${YELLOW}Checking server logs...${NC}"
ssh hetzner "sudo journalctl -u ai-analysis-for-lichess -n 20"

echo -e "${GREEN}Auth middleware updated!${NC}"
