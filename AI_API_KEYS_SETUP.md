# 🔑 AI API Keys Setup Guide

This guide will help you obtain and configure API keys for the AI Chat Agent.

## 📋 Quick Links

- **OpenAI Platform**: https://platform.openai.com/
- **Anthropic Console**: https://console.anthropic.com/

---

## 🤖 Option 1: OpenAI API Key

### Step 1: Create OpenAI Account
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Click **"Sign Up"** or **"Log In"**
3. Sign up using:
   - Email address, OR
   - Google/Microsoft/Apple account
4. Verify your email and phone number

### Step 2: Add Billing Information
1. Navigate to **"Billing"** in the left sidebar
2. Click **"Add payment method"**
3. Enter your credit/debit card details
4. (Optional) Set a spending cap to control costs

### Step 3: Purchase Credits
1. In **"Billing"** section, click **"Add credits"**
2. Select the amount you want to purchase
3. Complete the payment

**💡 Pricing Note**: OpenAI uses a pay-as-you-go model. GPT-4o-mini (used in this project) is cost-effective:
- Input: ~$0.15 per 1M tokens
- Output: ~$0.60 per 1M tokens

### Step 4: Generate API Key
1. Go to **"API keys"** section in the left sidebar
2. Click **"Create new secret key"**
3. Give it a name (e.g., "Paxiit Chat Agent")
4. Select key type: **"All"** (or "Read only" for security)
5. Click **"Create secret key"**
6. **⚠️ IMPORTANT**: Copy the key immediately - it's only shown once!
7. Store it securely

**Your OpenAI API Key will look like**: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 🧠 Option 2: Anthropic (Claude) API Key

### Step 1: Create Anthropic Account
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Click **"Sign Up"** or **"Log In"**
3. Sign up with your email address
4. Verify your email

### Step 2: Generate API Key
1. Click **"Get API Key"** in the dashboard
2. Provide your name
3. Select account type: **"Individual"** or **"Organization"**
4. Name your API key (e.g., "Paxiit Chat Agent")
5. Select the appropriate workspace
6. Click **"Create Key"**
7. **⚠️ IMPORTANT**: Copy the key immediately - it's only shown once!
8. Store it securely

**💡 Pricing Note**: Anthropic Claude 3 Haiku (used in this project) is cost-effective:
- Input: ~$0.25 per 1M tokens
- Output: ~$1.25 per 1M tokens

**Your Anthropic API Key will look like**: `sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## ⚙️ Configuration Steps

### Method 1: Environment Variables (Recommended)

#### For Windows (Git Bash):
```bash
# Set OpenAI API key
export OPENAI_API_KEY="sk-proj-your-key-here"

# OR set Anthropic API key
export ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"

# Verify it's set
echo $OPENAI_API_KEY
```

#### For Windows (PowerShell):
```powershell
# Set OpenAI API key
$env:OPENAI_API_KEY="sk-proj-your-key-here"

# OR set Anthropic API key
$env:ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"
```

#### For Linux/Mac:
```bash
# Add to ~/.bashrc or ~/.zshrc
export OPENAI_API_KEY="sk-proj-your-key-here"
export ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"

# Then reload
source ~/.bashrc  # or source ~/.zshrc
```

### Method 2: Create .env File (Alternative)

1. Create a file named `.env` in the project root:
```bash
# In Git Bash
touch .env
```

2. Add your API key to `.env`:
```env
# OpenAI API Key (choose one)
OPENAI_API_KEY=sk-proj-your-key-here

# OR Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# AI Platform Selection
AI_PLATFORM=openai
# OR
# AI_PLATFORM=anthropic
```

3. **⚠️ IMPORTANT**: Add `.env` to `.gitignore` to keep your keys secure:
```bash
echo ".env" >> .gitignore
```

### Method 3: Configure in chat-config.js

You can also set the API key directly in `backend/config/chat-config.js`:

```javascript
module.exports = {
    aiPlatform: 'openai', // or 'anthropic'
    openaiApiKey: 'sk-proj-your-key-here',
    anthropicApiKey: 'sk-ant-api03-your-key-here',
    // ... rest of config
};
```

**⚠️ WARNING**: This method is less secure. Use environment variables instead.

---

## 🎯 Choose Your Platform

Edit `backend/config/chat-config.js`:

```javascript
aiPlatform: process.env.AI_PLATFORM || 'openai', // 'openai' or 'anthropic'
```

Or set environment variable:
```bash
export AI_PLATFORM=openai  # or 'anthropic'
```

---

## ✅ Verify Setup

1. **Start the server**:
```bash
npm start
```

2. **Check console logs**:
   - ✅ Success: `[AI Service] OpenAI client initialized`
   - ❌ Error: `[AI Service] OpenAI API key not configured`

3. **Test the chat widget**:
   - Open your website
   - Click the chat widget
   - Send a test message
   - You should receive an AI-generated response!

---

## 🔒 Security Best Practices

1. **Never commit API keys to Git**
   - Add `.env` to `.gitignore`
   - Never share keys in code or documentation

2. **Use environment variables**
   - More secure than hardcoding
   - Easy to change without code changes

3. **Rotate keys regularly**
   - Regenerate keys periodically
   - Revoke old/unused keys

4. **Monitor usage**
   - Check API usage dashboard regularly
   - Set spending limits/alerts
   - Watch for unusual activity

5. **Use read-only keys when possible**
   - Limits damage if key is compromised
   - Only grants necessary permissions

---

## 💰 Cost Management

### Set Spending Limits

**OpenAI**:
1. Go to [OpenAI Billing](https://platform.openai.com/account/billing)
2. Set **"Hard limit"** or **"Soft limit"**
3. Configure alerts

**Anthropic**:
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Navigate to **"Billing"**
3. Set spending limits and alerts

### Monitor Usage

- Check usage dashboards regularly
- Review API logs for unusual patterns
- Set up email alerts for high usage

---

## 🆘 Troubleshooting

### "API key not configured"
- ✅ Check environment variable is set: `echo $OPENAI_API_KEY`
- ✅ Verify key is correct (no extra spaces)
- ✅ Restart server after setting environment variable

### "Invalid API key"
- ✅ Check key is copied correctly (no missing characters)
- ✅ Verify key hasn't been revoked
- ✅ Ensure billing is set up (OpenAI requires credits)

### "Rate limit exceeded"
- ✅ Check API usage limits
- ✅ Wait a few minutes and try again
- ✅ Consider upgrading your plan

### "AI service not available"
- ✅ Check internet connection
- ✅ Verify API service status
- ✅ Check server logs for detailed errors

---

## 📞 Support

- **OpenAI Support**: https://help.openai.com/
- **Anthropic Support**: https://support.anthropic.com/
- **Project Issues**: Check project documentation or contact developer

---

## 🎉 Next Steps

Once API keys are configured:
1. Restart the server
2. Test the chat widget
3. Monitor API usage
4. Enjoy your AI-powered chat agent!

**Happy Chatting! 💬**

