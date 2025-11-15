#!/bin/bash
# Quick API Key Setup Script for AI Chat Agent
# Usage: ./setup-api-keys.sh

echo "🔑 AI Chat Agent - API Key Setup"
echo "================================="
echo ""

# Check if .env file exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

echo ""
echo "Choose your AI platform:"
echo "1) OpenAI (GPT-4o-mini) - Recommended"
echo "2) Anthropic (Claude 3 Haiku)"
echo "3) Skip (set manually later)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "📝 OpenAI Setup"
        echo "Get your API key from: https://platform.openai.com/api-keys"
        echo ""
        read -p "Enter your OpenAI API key: " api_key
        
        if [ -z "$api_key" ]; then
            echo "❌ API key cannot be empty!"
            exit 1
        fi
        
        cat > .env << EOF
# AI API Keys Configuration
AI_PLATFORM=openai
OPENAI_API_KEY=$api_key
NODE_ENV=development
PORT=8000
EOF
        
        echo ""
        echo "✅ OpenAI API key configured!"
        echo "📝 Saved to .env file"
        ;;
    2)
        echo ""
        echo "📝 Anthropic Setup"
        echo "Get your API key from: https://console.anthropic.com/"
        echo ""
        read -p "Enter your Anthropic API key: " api_key
        
        if [ -z "$api_key" ]; then
            echo "❌ API key cannot be empty!"
            exit 1
        fi
        
        cat > .env << EOF
# AI API Keys Configuration
AI_PLATFORM=anthropic
ANTHROPIC_API_KEY=$api_key
NODE_ENV=development
PORT=8000
EOF
        
        echo ""
        echo "✅ Anthropic API key configured!"
        echo "📝 Saved to .env file"
        ;;
    3)
        echo ""
        echo "⏭️  Skipped. You can set API keys manually:"
        echo "   - Create .env file (see .env.example)"
        echo "   - Or set environment variables"
        echo "   - See AI_API_KEYS_SETUP.md for details"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice!"
        exit 1
        ;;
esac

echo ""
echo "🔒 Security Note: .env file is already in .gitignore"
echo ""
echo "📖 Next steps:"
echo "   1. Restart your server: npm start"
echo "   2. Check console for: [AI Service] ... client initialized"
echo "   3. Test the chat widget on your website"
echo ""
echo "💡 For detailed instructions, see: AI_API_KEYS_SETUP.md"
echo ""

