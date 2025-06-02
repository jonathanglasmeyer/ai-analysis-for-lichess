#!/bin/bash
set -e

# Konfiguration
SERVER="hetzner"
REMOTE_DIR="/opt/ai-analysis-for-lichess"
APP_NAME="ai-analysis-for-lichess"

# Farben für die Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}DEBUG: Current directory: $(pwd)${NC}"
echo -e "${YELLOW}DEBUG: Server hostname: $SERVER${NC}"

echo -e "${YELLOW}Testing SSH connection...${NC}"
ssh $SERVER "echo 'SSH connection test successful'"

echo -e "${YELLOW}Deploying ai-analysis-for-lichess to Hetzner server...${NC}"

# Kopiere nur die index.ts Datei zum Server (minimal test)
echo -e "${YELLOW}Copying index.ts to server...${NC}"
rsync -avz --progress index.ts $SERVER:$REMOTE_DIR/

# Restart the service
echo -e "${YELLOW}Restarting service...${NC}"
ssh $SERVER "
  cd $REMOTE_DIR
  sudo systemctl restart $APP_NAME
  
  # Show status
  echo 'Service status:'
  sudo systemctl status $APP_NAME --no-pager
"

echo -e "${GREEN}Debug deployment completed!${NC}"
