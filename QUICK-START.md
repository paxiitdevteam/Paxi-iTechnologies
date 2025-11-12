# 🚀 QUICK START - Fix ERR_CONNECTION_REFUSED

## ❌ The Problem
**ERR_CONNECTION_REFUSED** = Server is NOT running

## ✅ The Solution

### Step 1: Start the Server

**Open a NEW terminal/command prompt** and run:

**Windows (CMD.exe):**
```batch
cd C:\Users\PC-PAXIIT\Desktop\paxiit_website
start.bat
```

**Linux/Mac:**
```bash
cd ~/Desktop/paxiit_website
./start.sh
```

**OR Manual:**
```bash
cd ~/Desktop/paxiit_website
node server.js
```

### Step 2: Wait for This Message

You should see:
```
==================================================
🚀 Development Server Started
==================================================
📍 Server running at: http://localhost:8000
...
```

### Step 3: Open Browser

**Open:** `http://localhost:8000`

**NOT:** `https://localhost:8000` (no HTTPS)
**NOT:** `localhost:8000` (missing http://)

### Step 4: Test Connection

Test API endpoint: `http://localhost:8000/api/test`
Test Database: `http://localhost:8000/api/database-test`

## ✅ Verification

- ✅ Server running: Check terminal for startup message
- ✅ Port 8000: Server listens on this port
- ✅ API works: `/api/test` endpoint responds
- ✅ All paths use PMS: Verified and working
- ❌ **NO DATABASE NEEDED**: This is a file server, not a database server

## 🔧 If Still Not Working

1. **Check terminal**: Is server running? Look for startup message
2. **Check port**: Is 8000 free? Try `PORT=8001 node server.js`
3. **Check browser**: Use `http://localhost:8000` (not https)
4. **Clear browser cache**: Ctrl+Shift+R (hard refresh)
5. **Check firewall**: Make sure port 8000 is not blocked

## 📝 Important

- **Server MUST be running** before accessing website
- **Keep terminal open** - closing it stops the server
- **No database** - this is a static file server with API routes
- **All paths use PMS** - verified and working

