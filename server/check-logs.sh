#!/bin/bash
set -e

# Configuration
SERVER="hetzner"
APP_NAME="ai-analysis-for-lichess"

# Colors for output
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Checking logs for ai-analysis-for-lichess service...${NC}"

# Get the logs
ssh $SERVER "sudo journalctl -u $APP_NAME -n 50 --no-pager"
