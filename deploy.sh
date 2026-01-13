#!/bin/bash

# Learning Hub - Deployment Script
# This script automates the deployment to GitHub Pages

echo "🚀 Starting deployment for Learning Hub..."

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Error: git is not installed."
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ Error: pnpm is not installed. Please install Node.js and pnpm."
    exit 1
fi

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit: Learning Hub Pro"
fi

# Ask for GitHub username if not already configured in remote
REMOTE_URL=$(git remote get-url origin 2>/dev/null)
if [ -z "$REMOTE_URL" ]; then
    echo "🔗 Configuring GitHub repository..."
    read -p "Enter your GitHub username: " USERNAME
    git remote add origin "https://github.com/$USERNAME/sap-btp-ai-hub.git"
    echo "✅ Remote origin added: https://github.com/$USERNAME/sap-btp-ai-hub.git"
else
    echo "✅ Remote origin already configured: $REMOTE_URL"
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build the project
echo "🏗️ Building project..."
pnpm build

# Deploy to GitHub Pages
echo "🚀 Deploying to GitHub Pages..."
echo "NOTE: You may be asked for your GitHub credentials."
pnpm deploy

echo "✨ Deployment complete!"
echo "🌐 Your website should be live at: https://$(git remote get-url origin | sed -E 's/.*github.com[:\/](.*)\/sap-btp-ai-hub.*/\1/').github.io/sap-btp-ai-hub"
