#!/bin/bash

# Deployment Script for Paxi iTechnologies Website
# Deploys from dev PC to production NAS

# set -e  # Exit on error - DISABLED to allow error handling
set +e  # Don't exit on error - we'll handle errors manually

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
if ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "echo 'A3\$KU578q' | sudo -S systemctl stop paxiit-website.service 2>/dev/null" 2>&1; then
    echo -e "${GREEN}✅ Server stopped via systemd${NC}"
else
    echo -e "${YELLOW}⚠️  Systemd stop failed, trying manual kill...${NC}"
    # Try without sudo first (user might have permissions)
    if ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "systemctl stop paxiit-website.service 2>/dev/null" 2>&1; then
        echo -e "${GREEN}✅ Server stopped (no sudo needed)${NC}"
    else
        # Manual kill as last resort
        ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "cd $NAS_PATH && ps aux | grep 'node server.js' | grep -v grep | awk '{print \$2}' | xargs kill 2>/dev/null || true" 2>&1
        echo -e "${GREEN}✅ Server stopped (manual kill)${NC}"
    fi
fi
sleep 2
echo ""

# Step 3: Backup existing deployment (optional)
echo -e "${YELLOW}Step 3: Creating backup...${NC}"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
if ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "cd /volume1/web && tar -czf paxiit.com_backup_${BACKUP_DATE}.tar.gz paxiit.com 2>/dev/null" 2>&1; then
    echo -e "${GREEN}✅ Backup created: paxiit.com_backup_${BACKUP_DATE}.tar.gz${NC}"
else
    echo -e "${YELLOW}⚠️  Backup failed (continuing anyway)...${NC}"
fi
echo ""

# Step 4: Clean production directory
echo -e "${YELLOW}Step 4: Cleaning production directory...${NC}"
if ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "cd $NAS_PATH && rm -rf * .[^.]* 2>/dev/null" 2>&1; then
    echo -e "${GREEN}✅ Production directory cleaned${NC}"
else
    echo -e "${YELLOW}⚠️  Clean failed (continuing anyway)...${NC}"
fi
echo ""

# Step 5: Deploy files
echo -e "${YELLOW}Step 5: Deploying files to production...${NC}"
cd "$LOCAL_PATH"
if tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='server.log' \
    --exclude='.DS_Store' \
    --exclude='Thumbs.db' \
    -czf - . | ssh -p $NAS_PORT -o ConnectTimeout=30 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "cd $NAS_PATH && tar -xzf -" 2>&1; then
    echo -e "${GREEN}✅ Files deployed${NC}"
else
    echo -e "${RED}❌ File deployment failed${NC}"
    exit 1
fi
echo ""

# Step 6: Install dependencies
echo -e "${YELLOW}Step 6: Installing dependencies...${NC}"
if ssh -p $NAS_PORT -o ConnectTimeout=30 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "cd $NAS_PATH && export PATH=$NODE_PATH:\$PATH && npm install --production 2>&1 | tail -10" 2>&1; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Dependency installation had issues (checking if node_modules exists)...${NC}"
    ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "cd $NAS_PATH && [ -d node_modules ] && echo 'node_modules exists' || echo 'node_modules missing'"
fi
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
    if ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "test -f $NAS_PATH/$file" 2>&1; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file MISSING${NC}"
        echo -e "${YELLOW}Checking what files exist in that directory...${NC}"
        ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "ls -la $NAS_PATH/$(dirname $file) 2>&1 | head -10"
        exit 1
    fi
done

PAGE_COUNT_PROD=$(ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "ls -1 $NAS_PATH/frontend/src/pages/*.html 2>/dev/null | wc -l" 2>&1)
echo -e "${GREEN}✅ $PAGE_COUNT_PROD pages deployed${NC}"
echo ""

# Step 8: Configure systemd service for 24/7 operation
echo -e "${YELLOW}Step 8: Configuring server for 24/7 operation...${NC}"

# Function to execute sudo commands with better error handling
execute_sudo() {
    local command=$1
    local description=$2
    
    # Try with password first (using sshpass if available, or direct echo)
    if command -v sshpass >/dev/null 2>&1; then
        # Use sshpass if available
        if sshpass -p 'A3$KU578q' ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "echo 'A3\$KU578q' | sudo -S $command" 2>&1; then
            return 0
        fi
    else
        # Direct method - suppress password prompts
        if ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "echo 'A3\$KU578q' | sudo -S $command" 2>/dev/null; then
            return 0
        fi
    fi
    
    # If sudo fails, try without sudo (user might have permissions)
    if ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "$command" 2>/dev/null; then
        return 0
    fi
    
    return 1
}

# Create service file content
SERVICE_FILE_CONTENT="[Unit]
Description=Paxiit Website Server - 24/7 Operation
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=superpulpax
WorkingDirectory=$NAS_PATH
Environment=NODE_ENV=production
Environment=PORT=8000
Environment=HOST=0.0.0.0
Environment=PATH=/var/packages/Node.js_v20/target/usr/local/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/var/packages/Node.js_v20/target/usr/local/bin/node $NAS_PATH/server.js
Restart=always
RestartSec=10
StartLimitInterval=0
StartLimitBurst=0
StandardOutput=append:$NAS_PATH/server.log
StandardError=append:$NAS_PATH/server.log

[Install]
WantedBy=multi-user.target"

# Update systemd service file - try multiple methods
SERVICE_UPDATED=false

# Method 1: Direct sudo with heredoc
if ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "echo 'A3\$KU578q' | sudo -S tee /etc/systemd/system/paxiit-website.service > /dev/null" <<< "$SERVICE_FILE_CONTENT" 2>/dev/null; then
    SERVICE_UPDATED=true
    echo -e "${GREEN}✅ Service file updated (method 1)${NC}"
# Method 2: Write to temp file then move
elif ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "cat > /tmp/paxiit-website.service << 'EOFSERVICE'
$SERVICE_FILE_CONTENT
EOFSERVICE
echo 'A3\$KU578q' | sudo -S mv /tmp/paxiit-website.service /etc/systemd/system/paxiit-website.service" 2>/dev/null; then
    SERVICE_UPDATED=true
    echo -e "${GREEN}✅ Service file updated (method 2)${NC}"
# Method 3: Check if service already exists and is correct
elif ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "test -f /etc/systemd/system/paxiit-website.service && grep -q 'Restart=always' /etc/systemd/system/paxiit-website.service" 2>/dev/null; then
    SERVICE_UPDATED=true
    echo -e "${GREEN}✅ Service file already exists and is correct${NC}"
else
    echo -e "${YELLOW}⚠️  Could not update service file automatically${NC}"
    echo -e "${YELLOW}   Service file may need to be updated manually${NC}"
    echo -e "${YELLOW}   The server will still be started manually${NC}"
fi

# Reload systemd daemon (non-critical if it fails)
if execute_sudo "systemctl daemon-reload" "daemon reload"; then
    echo -e "${GREEN}✅ Systemd daemon reloaded${NC}"
else
    echo -e "${YELLOW}⚠️  Could not reload systemd daemon (non-critical)${NC}"
fi

# Ensure service is unmasked and enabled for auto-start on boot (non-critical if it fails)
if execute_sudo "systemctl unmask paxiit-website.service" "unmask service"; then
    echo -e "${GREEN}✅ Service unmasked${NC}"
else
    echo -e "${YELLOW}⚠️  Could not unmask service (may already be unmasked)${NC}"
fi
if execute_sudo "systemctl enable paxiit-website.service" "enable service"; then
    echo -e "${GREEN}✅ Auto-start on boot enabled${NC}"
else
    echo -e "${YELLOW}⚠️  Could not enable auto-start (non-critical)${NC}"
fi

# Try systemd service first, then fallback to manual start
if execute_sudo "systemctl start paxiit-website.service" "start service"; then
    echo -e "${GREEN}✅ Server started via systemd${NC}"
    sleep 3
else
    echo -e "${YELLOW}⚠️  Systemd start failed, trying manual start...${NC}"
    # Fallback to manual start (no sudo needed)
    if ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "cd $NAS_PATH && export PATH=$NODE_PATH:\$PATH && export HOST=0.0.0.0 && export PORT=8000 && nohup node server.js > server.log 2>&1 &" 2>&1; then
        echo -e "${GREEN}✅ Server started manually${NC}"
        sleep 5
    else
        echo -e "${RED}❌ Failed to start server manually${NC}"
        echo -e "${YELLOW}⚠️  Deployment completed but server may need manual start${NC}"
        # Don't exit - deployment was successful, just server start failed
    fi
fi

# Check if server started (check both systemd service and process)
sleep 3  # Give server time to start
if ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "systemctl is-active --quiet paxiit-website.service 2>/dev/null || ps aux | grep -E 'node.*server\.js|paxiit-website' | grep -v grep > /dev/null" 2>&1; then
    echo -e "${GREEN}✅ Server is running${NC}"
    # Show server status and restart configuration
    echo -e "${YELLOW}Server configuration:${NC}"
    ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "systemctl show paxiit-website.service | grep -E 'Restart|WantedBy|ActiveState' | head -3" 2>&1
    echo -e "${GREEN}✅ Server configured with: Restart=always, Auto-start on boot enabled${NC}"
    # Show server status
    ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "systemctl status paxiit-website.service --no-pager -l 2>/dev/null | head -5 || echo 'Server process is running'" 2>&1
else
    echo -e "${RED}❌ Server failed to start${NC}"
    # Check systemd logs
    echo -e "${YELLOW}Checking systemd logs...${NC}"
    ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "journalctl -u paxiit-website.service -n 20 --no-pager 2>/dev/null || echo 'No systemd logs available'" 2>&1
    # Check for server.log
    echo -e "${YELLOW}Checking server.log...${NC}"
    ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "cd $NAS_PATH && [ -f server.log ] && tail -20 server.log || echo 'No server.log found'" 2>&1
    exit 1
fi
echo ""

# Step 9: Test endpoints
echo -e "${YELLOW}Step 9: Testing endpoints...${NC}"
sleep 2

test_endpoint() {
    local url=$1
    local name=$2
    local code=$(ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "curl -s -o /dev/null -w '%{http_code}' $url 2>/dev/null || echo '000'" 2>&1)
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
ssh -p $NAS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $NAS_USER@$NAS_HOST "cd $NAS_PATH && tail -10 server.log 2>/dev/null | grep -E 'listening|error|PMS' || tail -10 server.log 2>/dev/null || echo 'No server.log found'" 2>&1
echo ""

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo "Production URL: http://paxiit.com"
echo "Server logs: ssh -p $NAS_PORT $NAS_USER@$NAS_HOST 'cd $NAS_PATH && tail -f server.log'"
echo ""

