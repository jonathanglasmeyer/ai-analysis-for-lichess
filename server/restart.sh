#!/bin/bash
set -e

# Configuration
SERVER="hetzner"
APP_NAME="ai-analysis-for-lichess"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Restarting ai-analysis-for-lichess service on Hetzner server...${NC}"

# Restart the service
ssh $SERVER "
  sudo systemctl restart $APP_NAME
  
  # Show status
  echo 'Service status:'
  sudo systemctl status $APP_NAME --no-pager
"

echo -e "${GREEN}Restart completed!${NC}"
echo -e "${YELLOW}To check logs: ssh $SERVER 'sudo journalctl -u $APP_NAME -f'${NC}"
