#!/bin/bash

# Script to ensure production server never goes off
# This script can be run manually or via cron to verify server is running

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAS_HOST="192.168.1.3"
NAS_PORT="2222"
NAS_USER="superpulpax"
SERVICE_NAME="paxiit-website.service"

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}🔧 Ensuring Production Server Never Goes Off${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""

# Check if service is running
echo -e "${YELLOW}Checking server status...${NC}"
STATUS=$(ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "systemctl is-active $SERVICE_NAME 2>&1")

if [ "$STATUS" = "active" ]; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${YELLOW}⚠️  Server is not running, starting now...${NC}"
    ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "echo 'A3\$KU578q' | sudo -S systemctl start $SERVICE_NAME 2>&1"
    sleep 3
    
    # Verify it started
    NEW_STATUS=$(ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "systemctl is-active $SERVICE_NAME 2>&1")
    if [ "$NEW_STATUS" = "active" ]; then
        echo -e "${GREEN}✅ Server started successfully${NC}"
    else
        echo -e "${RED}❌ Failed to start server${NC}"
        exit 1
    fi
fi

# Ensure service is enabled for auto-start on boot
echo -e "${YELLOW}Ensuring auto-start on boot is enabled...${NC}"
ENABLED=$(ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "systemctl is-enabled $SERVICE_NAME 2>&1")

if [ "$ENABLED" = "enabled" ]; then
    echo -e "${GREEN}✅ Auto-start on boot is enabled${NC}"
else
    echo -e "${YELLOW}⚠️  Enabling auto-start on boot...${NC}"
    ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "echo 'A3\$KU578q' | sudo -S systemctl enable $SERVICE_NAME 2>&1"
    echo -e "${GREEN}✅ Auto-start on boot enabled${NC}"
fi

# Show final status
echo ""
echo -e "${YELLOW}Final server status:${NC}"
ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "systemctl status $SERVICE_NAME --no-pager | head -10"

echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}✅ Server is configured to never go off${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo "Configuration:"
echo "  - Restart policy: always (auto-restart on crash)"
echo "  - Auto-start on boot: enabled"
echo "  - Restart delay: 10 seconds"
echo ""

