# 🚀 Quick Start Guide - Paxiit Website Server

## Easiest Ways to Start the Server

### Windows Users

**Method 1: Double-click (Easiest)**
1. Navigate to the project folder: `C:\Users\PC-PAXIIT\Desktop\paxiit_website`
2. Double-click `start.bat`
3. Server will start automatically!

**Method 2: Command Prompt**
```cmd
cd C:\Users\PC-PAXIIT\Desktop\paxiit_website
npm start
```

**Method 3: PowerShell**
```powershell
cd C:\Users\PC-PAXIIT\Desktop\paxiit_website
npm start
```

### Linux/Mac Users

**Method 1: Using start script**
```bash
cd ~/Desktop/paxiit_website
chmod +x start.sh
./start.sh
```

**Method 2: Using npm**
```bash
cd ~/Desktop/paxiit_website
npm start
```

## Common Issues & Solutions

### ❌ "Port 8000 is already in use"

**Solution 1: Stop the other process**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID_NUMBER> /F

# Linux/Mac
lsof -ti:8000 | xargs kill
```

**Solution 2: Use a different port**
```bash
# Windows
set PORT=8001 && npm start

# Linux/Mac
PORT=8001 npm start
```

### ❌ "Node.js is not recognized"

**Solution:** Install Node.js from https://nodejs.org/
- Download the LTS version
- Install it
- Restart your terminal/command prompt
- Verify: `node --version`

### ❌ "npm is not recognized"

**Solution:** Node.js includes npm. If npm doesn't work:
1. Reinstall Node.js
2. Make sure to check "Add to PATH" during installation
3. Restart your terminal

### ❌ "Cannot find module"

**Solution:** Install dependencies first
```bash
npm install
```

## Server URLs

Once started, access:
- **Homepage**: http://localhost:8000
- **Admin Dashboard**: http://localhost:8000/admin.html
- **Services**: http://localhost:8000/services.html
- **Contact**: http://localhost:8000/contact.html

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

## Need Help?

Check the main README.md for more detailed information.

