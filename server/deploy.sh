#!/bin/bash
set -e

# Set working directory to the script's location for robustness
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Konfiguration
SERVER="hetzner"
REMOTE_DIR="/opt/ai-analysis-for-lichess"
APP_NAME="ai-analysis-for-lichess"

# Farben für die Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Deploying ai-analysis-for-lichess to Hetzner server...${NC}"
echo -e "${YELLOW}Working from directory: $(pwd)${NC}"

# Erstelle Remote-Verzeichnis, falls es nicht existiert
echo -e "${YELLOW}Creating remote directory if it doesn't exist...${NC}"
ssh $SERVER "sudo mkdir -p $REMOTE_DIR && sudo chown \$USER:\$USER $REMOTE_DIR"

# Kopiere Dateien zum Server
echo -e "${YELLOW}Copying files to server...${NC}"
rsync -avz --exclude 'node_modules' --exclude 'cache' --exclude '.env' . $SERVER:$REMOTE_DIR

# Erstelle .env Datei auf dem Server, falls sie nicht existiert
echo -e "${YELLOW}Setting up environment variables...${NC}"
ssh $SERVER "
  if [ ! -f $REMOTE_DIR/.env ]; then
    echo 'Creating .env file...'
    echo 'ANTHROPIC_API_KEY=your_api_key_here' > $REMOTE_DIR/.env
    echo 'PORT=3001' >> $REMOTE_DIR/.env
    echo 'Please update the ANTHROPIC_API_KEY in $REMOTE_DIR/.env'
  else
    echo '.env file already exists'
  fi
"

# Installiere Abhängigkeiten und starte den Server
echo -e "${YELLOW}Installing dependencies and setting up systemd service...${NC}"
ssh $SERVER "
  cd $REMOTE_DIR
  
  # Installiere benötigte Abhängigkeiten
  if ! command -v unzip &> /dev/null; then
    echo 'Installing unzip...'
    sudo apt-get update
    sudo apt-get install -y unzip
  fi

  # Installiere bun, falls nicht vorhanden
  if ! command -v bun &> /dev/null; then
    echo 'Installing bun...'
    curl -fsSL https://bun.sh/install | bash
    source ~/.bashrc
    export PATH="$HOME/.bun/bin:$PATH"
  fi
  
  # Installiere Abhängigkeiten
  echo 'Installing dependencies...'
  ~/.bun/bin/bun install
  
  # Erstelle systemd service file
  echo 'Creating systemd service...'
  sudo tee /etc/systemd/system/$APP_NAME.service > /dev/null << EOL
[Unit]
Description=AI Analysis for Lichess Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$REMOTE_DIR
ExecStart=/root/.bun/bin/bun run start
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

  # Aktiviere und starte den Service
  sudo systemctl daemon-reload
  sudo systemctl enable $APP_NAME
  sudo systemctl restart $APP_NAME
  
  # Erstelle Cache-Verzeichnis mit korrekten Berechtigungen
  mkdir -p $REMOTE_DIR/cache
  chmod 755 $REMOTE_DIR/cache
  
  # Zeige Status
  echo 'Service status:'
  sudo systemctl status $APP_NAME --no-pager
"

echo -e "${GREEN}Deployment completed!${NC}"
echo -e "${YELLOW}Don't forget to update the ANTHROPIC_API_KEY in $REMOTE_DIR/.env on the server${NC}"
echo -e "${YELLOW}To check logs: ssh $SERVER 'sudo journalctl -u $APP_NAME -f'${NC}"
