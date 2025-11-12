#!/bin/bash

# Development Server Startup Script
# Starts the appropriate server based on available runtime

echo "🚀 Starting Paxiit Website Development Server..."
echo ""

# Check for Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js found: $(node --version)"
    echo "📍 Starting Node.js server..."
    echo ""
    node server.js
    exit 0
fi

# Check for Python 3
if command -v python3 &> /dev/null; then
    echo "✅ Python 3 found: $(python3 --version)"
    echo "📍 Starting Python server..."
    echo ""
    python3 server.py
    exit 0
fi

# Check for Python
if command -v python &> /dev/null; then
    echo "✅ Python found: $(python --version)"
    echo "📍 Starting Python server..."
    echo ""
    python server.py
    exit 0
fi

# No runtime found
echo "❌ Error: No suitable runtime found!"
echo ""
echo "Please install one of the following:"
echo "  - Node.js: https://nodejs.org/"
echo "  - Python 3: https://www.python.org/"
echo ""
exit 1

