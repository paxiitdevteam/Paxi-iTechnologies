#!/bin/bash

# Deployment Script for Paxi iTechnologies Website
# Deploys from dev PC to production NAS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAS_HOST="192.168.1.3"
NAS_PORT="2222"
NAS_USER="superpulpax"
NAS_PATH="/volume1/web/paxiit.com"
LOCAL_PATH="$(cd "$(dirname "$0")" && pwd)"
NODE_PATH="/volume1/@appstore/Node.js_v20/usr/local/bin:/usr/local/bin"

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}🚀 Paxi iTechnologies - Production Deployment${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""

# Step 1: Verify local files exist
echo -e "${YELLOW}Step 1: Verifying local files...${NC}"
if [ ! -f "server.js" ]; then
    echo -e "${RED}❌ Error: server.js not found${NC}"
    exit 1
fi
if [ ! -d "frontend/src/pages" ]; then
    echo -e "${RED}❌ Error: frontend/src/pages directory not found${NC}"
    exit 1
fi
PAGE_COUNT=$(ls -1 frontend/src/pages/*.html 2>/dev/null | wc -l)
echo -e "${GREEN}✅ Found $PAGE_COUNT HTML pages${NC}"
echo ""

# Step 2: Stop production server (using systemd if available)
echo -e "${YELLOW}Step 2: Stopping production server...${NC}"
# Try systemd service first, then fallback to manual kill
ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "echo 'A3\$KU578q' | sudo -S systemctl stop paxiit-website.service 2>/dev/null || true"
ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "cd $NAS_PATH && ps aux | grep 'node server.js' | grep -v grep | awk '{print \$2}' | xargs kill 2>/dev/null || true"
sleep 2
echo -e "${GREEN}✅ Server stopped${NC}"
echo ""

# Step 3: Backup existing deployment (optional)
echo -e "${YELLOW}Step 3: Creating backup...${NC}"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "cd /volume1/web && tar -czf paxiit.com_backup_${BACKUP_DATE}.tar.gz paxiit.com 2>/dev/null || true"
echo -e "${GREEN}✅ Backup created: paxiit.com_backup_${BACKUP_DATE}.tar.gz${NC}"
echo ""

# Step 4: Clean production directory
echo -e "${YELLOW}Step 4: Cleaning production directory...${NC}"
ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "cd $NAS_PATH && rm -rf * .[^.]* 2>/dev/null || true"
echo -e "${GREEN}✅ Production directory cleaned${NC}"
echo ""

# Step 5: Deploy files
echo -e "${YELLOW}Step 5: Deploying files to production...${NC}"
cd "$LOCAL_PATH"
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='server.log' \
    --exclude='.DS_Store' \
    --exclude='Thumbs.db' \
    -czf - . | ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "cd $NAS_PATH && tar -xzf -"
echo -e "${GREEN}✅ Files deployed${NC}"
echo ""

# Step 6: Install dependencies
echo -e "${YELLOW}Step 6: Installing dependencies...${NC}"
ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "cd $NAS_PATH && export PATH=$NODE_PATH:\$PATH && npm install --production 2>&1 | tail -3"
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 7: Verify deployment
echo -e "${YELLOW}Step 7: Verifying deployment...${NC}"
VERIFY_FILES=(
    "server.js"
    "package.json"
    "frontend/src/index.html"
    "frontend/src/pages/about.html"
    "frontend/src/pages/services.html"
    "frontend/src/components/header.html"
    "frontend/src/components/footer.html"
)

for file in "${VERIFY_FILES[@]}"; do
    if ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "test -f $NAS_PATH/$file"; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file MISSING${NC}"
        exit 1
    fi
done

PAGE_COUNT_PROD=$(ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "ls -1 $NAS_PATH/frontend/src/pages/*.html 2>/dev/null | wc -l")
echo -e "${GREEN}✅ $PAGE_COUNT_PROD pages deployed${NC}"
echo ""

# Step 8: Start production server (using systemd if available)
echo -e "${YELLOW}Step 8: Starting production server...${NC}"
# Try systemd service first, then fallback to manual start
if ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "echo 'A3\$KU578q' | sudo -S systemctl start paxiit-website.service 2>/dev/null"; then
    echo -e "${GREEN}✅ Server started via systemd${NC}"
    sleep 3
else
    # Fallback to manual start
    ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "cd $NAS_PATH && export PATH=$NODE_PATH:\$PATH && export HOST=0.0.0.0 && export PORT=8000 && nohup node server.js > server.log 2>&1 &"
    sleep 5
fi

# Check if server started (check both systemd service and process)
sleep 3  # Give server time to start
if ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "systemctl is-active --quiet paxiit-website.service 2>/dev/null || ps aux | grep -E 'node.*server\.js|paxiit-website' | grep -v grep > /dev/null"; then
    echo -e "${GREEN}✅ Server is running${NC}"
    # Show server status
    ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "systemctl status paxiit-website.service --no-pager -l | head -5 || echo 'Server process is running'"
else
    echo -e "${RED}❌ Server failed to start${NC}"
    # Check systemd logs
    ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "journalctl -u paxiit-website.service -n 20 --no-pager 2>/dev/null || echo 'No systemd logs available'"
    # Check for server.log
    ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "cd $NAS_PATH && [ -f server.log ] && tail -20 server.log || echo 'No server.log found'"
    exit 1
fi
echo ""

# Step 9: Test endpoints
echo -e "${YELLOW}Step 9: Testing endpoints...${NC}"
sleep 2

test_endpoint() {
    local url=$1
    local name=$2
    local code=$(ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "curl -s -o /dev/null -w '%{http_code}' $url 2>/dev/null || echo '000'")
    if [ "$code" = "200" ]; then
        echo -e "${GREEN}✅ $name: $code${NC}"
    else
        echo -e "${RED}❌ $name: $code${NC}"
        return 1
    fi
}

test_endpoint "http://localhost:8000/" "Homepage" || exit 1
test_endpoint "http://localhost:8000/about.html" "About" || exit 1
test_endpoint "http://localhost:8000/services.html" "Services" || exit 1
test_endpoint "http://localhost:8000/contact.html" "Contact" || exit 1
test_endpoint "http://localhost:8000/api/test" "API Test" || exit 1
echo ""

# Step 10: Show server status
echo -e "${YELLOW}Step 10: Server status...${NC}"
ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "cd $NAS_PATH && tail -10 server.log | grep -E 'listening|error|PMS' || tail -10 server.log"
echo ""

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo "Production URL: http://paxiit.com"
echo "Server logs: ssh -p $NAS_PORT $NAS_USER@$NAS_HOST 'cd $NAS_PATH && tail -f server.log'"
echo ""

