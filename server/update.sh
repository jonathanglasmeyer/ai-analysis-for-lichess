#!/bin/bash
set -e

# Set working directory to the script's location for robustness
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Configuration
SERVER="hetzner"
REMOTE_DIR="/opt/ai-analysis-for-lichess"
APP_NAME="ai-analysis-for-lichess"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Updating ai-analysis-for-lichess on server...${NC}"
echo -e "${YELLOW}Working from directory: $(pwd)${NC}"

# Copy files to server (only the necessary ones)
echo -e "${YELLOW}Copying updated files to server...${NC}"
rsync -avz --exclude 'node_modules' --exclude 'cache' --exclude '.env' \
  --exclude 'deploy.sh' --exclude 'update.sh' --exclude 'restart.sh' \
  --exclude 'check-logs.sh' --exclude 'fix-package.sh' \
  . $SERVER:$REMOTE_DIR

# Restart the service
echo -e "${YELLOW}Restarting service...${NC}"
ssh $SERVER "
  sudo systemctl restart $APP_NAME
  
  # Show status
  echo 'Service status:'
  sudo systemctl status $APP_NAME --no-pager
"

echo -e "${GREEN}Update completed!${NC}"
echo -e "${YELLOW}To check logs: ssh $SERVER 'sudo journalctl -u $APP_NAME -f'${NC}"
