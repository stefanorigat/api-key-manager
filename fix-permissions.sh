#!/bin/bash

# Fix Turbopack permission issues
echo "Fixing Next.js build cache permissions..."

cd "$(dirname "$0")"

# Kill any running Next.js processes
echo "Stopping Next.js dev server..."
pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null
sleep 2

# Remove .next directory
echo "Removing .next directory..."
if [ -d ".next" ]; then
    # Try regular rm first
    rm -rf .next 2>/dev/null
    
    # If that fails, try with sudo
    if [ -d ".next" ]; then
        echo "Regular removal failed, trying with sudo..."
        sudo rm -rf .next
    fi
fi

echo "Done! You can now run: npm run dev"

