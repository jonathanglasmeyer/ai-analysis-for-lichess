#!/bin/bash
set -e

# Konfiguration
SERVER="hetzner"
REMOTE_DIR="/opt/ai-analysis-for-lichess"
DOMAIN="chess-analysis-api.quietloop.dev"  # Ändere dies zu deiner tatsächlichen Domain

# Farben für die Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up Nginx and SSL for $DOMAIN...${NC}"

# Kopiere nginx.conf zum Server
echo -e "${YELLOW}Copying nginx configuration to server...${NC}"
scp  nginx.conf $SERVER:/tmp/ai-analysis-for-lichess.conf

# Installiere und konfiguriere Nginx und Certbot
ssh  $SERVER "
  # Installiere Nginx und Certbot, falls nicht vorhanden
  if ! command -v nginx &> /dev/null; then
    echo 'Installing Nginx...'
    sudo apt-get update
    sudo apt-get install -y nginx
  fi
  
  if ! command -v certbot &> /dev/null; then
    echo 'Installing Certbot...'
    sudo apt-get install -y certbot python3-certbot-nginx
  fi
  
  # Konfiguriere Nginx
  echo 'Configuring Nginx...'
  sudo cp /tmp/ai-analysis-for-lichess.conf /etc/nginx/sites-available/ai-analysis-for-lichess
  sudo sed -i 's/dein-server.example.com/$DOMAIN/g' /etc/nginx/sites-available/ai-analysis-for-lichess
  
  # Aktiviere die Site
  sudo ln -sf /etc/nginx/sites-available/ai-analysis-for-lichess /etc/nginx/sites-enabled/
  
  # Teste die Nginx-Konfiguration
  sudo nginx -t
  
  # Starte Nginx neu
  sudo systemctl restart nginx
  
  # Konfiguriere SSL mit Certbot
  echo 'Setting up SSL with Certbot...'
  sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email glasmeyer@posteo.de
  
  # Konfiguriere automatische Erneuerung
  sudo systemctl enable certbot.timer
  sudo systemctl start certbot.timer
"

echo -e "${GREEN}Nginx and SSL setup completed!${NC}"
echo -e "${YELLOW}Your API is now accessible at https://$DOMAIN${NC}"
