# 🔑 Chat API Key Configuration Guide

## How the Configuration Works

The chat system uses a **two-layer configuration** approach:

### 1. **Environment Variables (.env file)**
- The `.env` file stores your API keys securely
- Located in the project root: `C:\Users\PC-PAXIIT\Desktop\paxiit_website\.env`
- Format: `OPENAI_API_KEY=sk-your-key-here`

### 2. **Configuration File (chat-config.js)**
- Reads from `process.env` (which loads from `.env` file)
- Located: `backend/config/chat-config.js`
- This file is loaded when the server starts

### 3. **AI Service (ai-service.js)**
- Uses the configuration to initialize OpenAI/Anthropic clients
- Located: `backend/services/ai-service.js`
- **Now reads dynamically** from `process.env` to get the latest API key value

---

## Configuration Flow

```
1. Server starts (server.js)
   ↓
2. Loads .env file → Sets process.env.OPENAI_API_KEY
   ↓
3. Routes load chat-config.js → Reads process.env.OPENAI_API_KEY
   ↓
4. Chat API calls ai-service.js → Reads process.env.OPENAI_API_KEY (dynamically)
   ↓
5. OpenAI client initialized with API key
```

---

## Setting Up Your API Key

### Step 1: Create/Edit .env File

Create a file named `.env` in the project root:

```bash
# Location: C:\Users\PC-PAXIIT\Desktop\paxiit_website\.env

# AI Platform Configuration
AI_PLATFORM=openai

# OpenAI API Key (get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-your-actual-api-key-here

# Server Configuration
NODE_ENV=development
PORT=8000
```

### Step 2: Get Your OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. Paste it in your `.env` file

### Step 3: Restart the Server

**IMPORTANT:** After setting the API key, you MUST restart the server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
./start.sh
# OR
node server.js
```

---

## Verification

### Check if API Key is Loaded

1. **Check server console** - You should see:
   ```
   [Server] ✅ Loaded environment variables from .env file
   [AI Service] ✅ OpenAI API key found and valid
   [AI Service] ✅ OpenAI client initialized successfully
   ```

2. **Check chat behavior**:
   - If API key is configured: Chat uses OpenAI API (intelligent responses)
   - If API key is NOT configured: Chat uses fallback knowledge base (pattern matching)

### Debug API Key Issues

If you see repeated messages, check:

1. **Is .env file in the correct location?**
   ```bash
   ls -la .env
   # Should show: .env file exists
   ```

2. **Does .env file have the API key?**
   ```bash
   cat .env | grep OPENAI_API_KEY
   # Should show: OPENAI_API_KEY=sk-...
   ```

3. **Is the server restarted?**
   - The server must be restarted after setting/changing the API key
   - Environment variables are loaded when the server starts

4. **Check server console logs:**
   - Look for: `[AI Service] ⚠️  OpenAI API key not configured or invalid`
   - Look for: `[AI Service] ✅ OpenAI API key found and valid`

---

## Troubleshooting

### Problem: Still getting repeated messages

**Solution:**
1. Verify `.env` file exists and has `OPENAI_API_KEY=sk-...`
2. **Restart the server** (this is critical!)
3. Check server console for API key status messages

### Problem: "API key not configured" error

**Solution:**
1. Check `.env` file format:
   - ✅ Correct: `OPENAI_API_KEY=sk-proj-...`
   - ❌ Wrong: `OPENAI_API_KEY = sk-proj-...` (spaces around =)
   - ❌ Wrong: `OPENAI_API_KEY="sk-proj-..."` (quotes not needed)

2. Make sure API key starts with `sk-`

3. Restart the server after making changes

### Problem: API key works but responses are still repetitive

**Solution:**
- This means the API key is working, but OpenAI is returning similar responses
- The system now uses dynamic API key reading, so this should be resolved
- If it persists, check OpenAI API quota/credits

---

## Current Implementation

The system now:
- ✅ Reads API key **dynamically** from `process.env` on each request
- ✅ Falls back to `chatConfig.openaiApiKey` if `process.env` is not available
- ✅ Provides detailed logging to help debug configuration issues
- ✅ Uses fallback knowledge base when API key is not configured (no more repeated error messages)

---

## Quick Setup Script

You can also use the setup script:

```bash
./setup-api-keys.sh
```

This will guide you through setting up your API key interactively.

---

## Summary

**Configuration Chain:**
1. `.env` file → `process.env` → `chat-config.js` → `ai-service.js`
2. All components now read dynamically from `process.env`
3. **Server restart required** after changing `.env` file
4. System automatically uses fallback knowledge base if API key is not configured

**Key Points:**
- ✅ API key is read from `.env` file
- ✅ System reads dynamically (no caching issues)
- ✅ Must restart server after setting API key
- ✅ Fallback system provides helpful responses even without API key

