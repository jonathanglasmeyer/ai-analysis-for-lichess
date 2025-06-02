#!/bin/bash
set -e

# Configuration
SERVER="hetzner"
REMOTE_DIR="/opt/ai-analysis-for-lichess"
APP_NAME="ai-analysis-for-lichess"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Fixing package.json on Hetzner server...${NC}"

# Copy just the package.json file
rsync -avz package.json $SERVER:$REMOTE_DIR/

# Restart the service
ssh $SERVER "
  cd $REMOTE_DIR
  
  # Show package.json content
  echo 'package.json content:'
  cat package.json
  
  # Restart the service
  sudo systemctl restart $APP_NAME
  
  # Wait a moment for the service to start
  sleep 2
  
  # Show status
  echo 'Service status:'
  sudo systemctl status $APP_NAME --no-pager
"

echo -e "${GREEN}Fix completed!${NC}"
echo -e "${YELLOW}To check logs: ssh $SERVER 'sudo journalctl -u $APP_NAME -f'${NC}"
