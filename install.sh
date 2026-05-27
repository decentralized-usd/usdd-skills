#!/bin/bash
set -e

echo "Installing USDD Skills..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js v20+ first."
    echo "  https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "Error: Node.js v20+ is required. Current version: $(node -v)"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo ""
    echo "Created .env from .env.example. Default NETWORK=mainnet."
else
    echo ".env file already exists, skipping."
fi

echo ""
echo "Installation complete!"
echo ""
echo "Usage:"
echo "  npm start                                       # Run analytics MCP server"
echo "  npm test                                        # Run unit tests"
echo "  node scripts/usdd_api.mjs total-supply          # CLI smoke test"
echo ""
echo "This repo's analytics MCP path:"
echo "  node $(pwd)/scripts/mcp_server.mjs"
echo ""
echo "For write operations, also install the official MCP:"
echo "  npm install -g @usdd/mcp-server-usdd"
